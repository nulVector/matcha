"use client";

import { useState, useRef, useEffect } from "react";
import { useWS } from "@/providers/wsProvider";
import { EventType } from "@matcha/shared";
import { Textarea } from "@matcha/ui/components/textarea"; 
import { Button } from "@matcha/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@matcha/ui/components/popover";
import { Send, HelpCircle, ArchiveX, UserX } from "lucide-react";
import { useOutboxStore } from "@/store/useOutboxStore";
import { TargetUser } from "@/types/models";

export function MessageInput({ 
  connectionId, 
  receiverId, 
  targetUser, 
  isMatched, 
  isArchived 
}: { 
  connectionId: string, 
  receiverId: string, 
  targetUser: TargetUser | null, 
  isMatched: boolean, 
  isArchived?: boolean 
}) {
  const [content, setContent] = useState("");
  const { sendMessage } = useWS();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addMessageToOutbox = useOutboxStore((state) => state.addMessage);
  const markMessageFailed = useOutboxStore((state) => state.markFailed);
  const isDeactivated = targetUser?.isActive === false;

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        sendMessage(EventType.STOP_TYPING, { connectionId, receiverId });
      }
    };
  }, [isTyping, connectionId, receiverId, sendMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      sendMessage(EventType.START_TYPING, {
        connectionId,
        receiverId,
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendMessage(EventType.STOP_TYPING, { connectionId, receiverId });
    }, 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isArchived || isDeactivated) return;
    const messageText = content.trim();
    setContent("");
    const localId = addMessageToOutbox({
      connectionId,
      receiverId,
      content: messageText
    });
    sendMessage(EventType.SEND_MESSAGE, {
      connectionId,
      receiverId,
      content: messageText
    });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    sendMessage(EventType.STOP_TYPING, { connectionId, receiverId });

    setTimeout(() => {
      markMessageFailed(localId);
    }, 5000);
  };

  return (
    <div className="p-4 bg-background/95 backdrop-blur-md border-t border-border/50 shrink-0">
      {isArchived || isDeactivated ? (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
            {isDeactivated ? (
              <>
                <UserX className="size-4" />
                You cannot reply to a deactivated account.
              </>
            ) : (
              <>
                <ArchiveX className="size-4" />
                This chat is archived. You can no longer reply.
              </>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="relative flex-1 flex items-end bg-background border rounded-xl focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-primary transition-all duration-200 shadow-sm">
            <Textarea 
              value={content}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..." 
              className="w-full resize-none border-0 shadow-none focus-visible:ring-0 min-h-11 bg-transparent py-3 pl-4 pr-12 no-scrollbar"
              minRows={1}
              maxRows={5}
            /> 
            
            {isMatched && targetUser?.openingQues && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    aria-label="View opening question"
                    className="absolute right-1 bottom-1 size-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <HelpCircle className="size-4.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" className="w-auto max-w-sm text-sm p-4 mb-2 shadow-lg rounded-xl">
                  <span className="font-semibold text-foreground">{targetUser.username} asked:</span>
                  <p className="italic text-muted-foreground mt-1.5 leading-relaxed text-pretty">"{targetUser.openingQues}"</p>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <Button 
            type="submit" 
            size="icon" 
            disabled={!content.trim()}
            aria-label="Send message"
            className="size-11 shrink-0 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Send className="size-5 ml-0.5" /> 
          </Button>
        </form>
      )}
    </div>
  );
}
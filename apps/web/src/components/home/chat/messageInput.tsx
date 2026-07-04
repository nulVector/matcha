"use client";

import { useMe } from "@/hooks/queries/useMe";
import { useWS } from "@/providers/wsProvider";
import { useOutboxStore } from "@/store/useOutboxStore";
import { TargetUser } from "@/types/models";
import { EventType } from "@matcha/shared";
import { Button } from "@matcha/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@matcha/ui/components/popover";
import { Textarea } from "@matcha/ui/components/textarea";
import { ArchiveX, HelpCircle, Send, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function MessageInput({
  connectionId,
  receiverId,
  targetUser,
  isMatched,
  isArchived,
}: {
  connectionId: string;
  receiverId: string;
  targetUser: TargetUser | null;
  isMatched: boolean;
  isArchived?: boolean;
}) {
  const [content, setContent] = useState("");
  const { sendMessage } = useWS();
  const [isTyping, setIsTyping] = useState(false);
  const isTypingRef = useRef(isTyping);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addMessageToOutbox = useOutboxStore((state) => state.addMessage);
  const markMessageFailed = useOutboxStore((state) => state.markFailed);
  const isDeactivated = targetUser?.isActive === false;

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) {
        sendMessage(EventType.STOP_TYPING, { connectionId, receiverId });
      }
    };
  }, [connectionId, receiverId, sendMessage]);

  useEffect(() => {
    if (isArchived || isDeactivated) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) {
        setIsTyping(false);
        sendMessage(EventType.STOP_TYPING, { connectionId, receiverId });
      }
    }
  }, [isArchived, isDeactivated, connectionId, receiverId, sendMessage]);

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

  const { data: profile } = useMe();
  const myId = profile?.id;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isArchived || isDeactivated || !myId) return;
    const messageText = content.trim();
    setContent("");
    const localId = addMessageToOutbox({
      connectionId,
      receiverId,
      senderId: myId,
      content: messageText,
    });
    sendMessage(EventType.SEND_MESSAGE, {
      connectionId,
      receiverId,
      content: messageText,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      setIsTyping(false);
      sendMessage(EventType.STOP_TYPING, { connectionId, receiverId });
    }

    setTimeout(() => {
      markMessageFailed(localId);
    }, 5000);
  };
  return (
    <div className="px-4 pb-6 shrink-0 bg-transparent relative z-20">
      {isArchived || isDeactivated ? (
        <div className="flex justify-center max-w-4xl mx-auto">
          <div className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg text-muted-foreground text-sm font-medium">
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
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 max-w-4xl mx-auto bg-background/85 backdrop-blur-xl border border-border/50 shadow-lg rounded-lg p-1.5 transition-all duration-300 focus-within:bg-background/95"
        >
          <div className="relative flex-1 flex items-end">
            <Textarea
              value={content}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="w-full resize-none border-0 shadow-none focus-visible:ring-0 min-h-12 bg-transparent dark:bg-transparent focus:bg-muted/40 dark:focus:bg-input/40 transition-colors duration-200 py-3.5 pl-5 pr-12 no-scrollbar"
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
                    className="absolute right-1 bottom-1 size-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 active:scale-[0.98] focus-visible:outline-none"
                  >
                    <HelpCircle className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="top"
                  className="w-auto max-w-sm text-sm p-4 mb-2 shadow-lg rounded-xl"
                >
                  <span className="font-semibold text-foreground">
                    {targetUser.username} asked:
                  </span>
                  <p className="italic text-muted-foreground mt-1.5 leading-relaxed text-pretty">
                    &quot;{targetUser.openingQues}&quot;
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={!content.trim()}
            aria-label="Send message"
            className="size-12 shrink-0 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] focus-visible:outline-none extend-touch-target"
          >
            <Send className="size-6 translate-y-0.5" />
          </Button>
        </form>
      )}
    </div>
  );
}

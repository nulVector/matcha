"use client";

import { ChatHeader } from "@/components/home/chat/chatHeader";
import { MessageInput } from "@/components/home/chat/messageInput";
import { Doodle } from "@/components/shared/doodle";
import { useMe } from "@/hooks/queries/useMe";
import { useChatScroll } from "@/hooks/useChatScroll";
import { api } from "@/lib/axios";
import { useWS } from "@/providers/wsProvider";
import { useOutboxStore } from "@/store/useOutboxStore";
import { EventType } from "@matcha/shared";
import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import { cn } from "@matcha/ui/lib/utils";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

export default function ActiveChatPage() {
  const params = useParams();
  const connectionId = params.connectionId as string;
  const { sendMessage } = useWS();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isMeLoading } = useMe();
  const myId = profile?.id;

  const allOutboxMessages = useOutboxStore((state) => state.messages);
  const retryOutboxMessage = useOutboxStore((state) => state.retryMessage);
  const removeOutboxMessage = useOutboxStore((state) => state.removeMessage);
  const markMessageFailed = useOutboxStore((state) => state.markFailed);

  const { 
    data: history, 
    isLoading: isHistoryLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["messages", connectionId],
    queryFn: async ({ pageParam }) => {
      const res = await api.get(
        `/messages/${connectionId}?limit=50${pageParam ? `&cursor=${pageParam}` : ""}`,
      );
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const messages = useMemo(() => {
    const serverMessages = history?.pages
      ? [...history.pages].reverse().flatMap((page) => page.data)
      : [];
    const activeOutbox = allOutboxMessages.filter(
      (m) => m.connectionId === connectionId,
    );

    const mappedOutbox = activeOutbox.map((m) => ({
      id: m.localId,
      content: m.content,
      senderId: myId,
      createdAt: new Date(m.createdAt).toISOString(),
      type: "TEXT",
      isOutbox: true,
      status: m.status,
    }));

    return [...serverMessages, ...mappedOutbox];
  }, [history?.pages, allOutboxMessages, myId, connectionId]);

  const firstFetchedPage = history?.pages.find((page) => page.meta);
  const chatPartner = firstFetchedPage?.meta || null;
  const matchData = firstFetchedPage?.matchData || null;

  const serverMessagesOnly = messages.filter((m) => !m.isOutbox);
  const lastMessageId =
    serverMessagesOnly.length > 0
      ? serverMessagesOnly[serverMessagesOnly.length - 1].id
      : undefined;

  const {
    bottomRef,
    scrollContainerRef,
    handleScroll,
    scrollToBottom,
    showScrollButton,
    unreadBelow,
  } = useChatScroll(
    messages, 
    myId,
    () => {
      if (!isFetchingNextPage) fetchNextPage();
    },
    hasNextPage
  );

  const matchStatusRef = useRef(matchData?.status);
  useEffect(() => {
    matchStatusRef.current = matchData?.status;
  }, [matchData?.status]);

  const { data: partnerStatus } = useQuery({
    queryKey: ["partner_status", connectionId],
    queryFn: () => "ONLINE",
    initialData: "ONLINE",
  });

  useEffect(() => {
    if (!chatPartner?.id || !connectionId) return;
    
    sendMessage(EventType.VIEW_CHAT, {
      connectionId,
      receiverId: chatPartner.id,
      lastMessageId,
    });

    queryClient.setQueryData(
      ["unreadCounts"],
      (oldCounts: Record<string, number> | undefined) => {
        if (!oldCounts) return oldCounts;
        return { ...oldCounts, [connectionId]: 0 };
      },
    );
    return () => {
      if (matchStatusRef.current === "MATCHED") {
        api.delete(`/connections/${connectionId}`).catch(() => {});
      }
      sendMessage(EventType.LEAVE_CHAT, { connectionId });
      queryClient.invalidateQueries({ queryKey: ["messages", connectionId] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    };
  }, [connectionId, chatPartner?.id]);

  if (isHistoryLoading || isMeLoading || !myId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-background animate-in fade-in duration-300">
      <ChatHeader
        connectionId={connectionId}
        targetUser={chatPartner || { username: "Loading...", avatarUrl: "" }}
        matchData={matchData || { id: connectionId, status: "LOADING" }}
      />

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <svg className="h-full w-full">
            <defs>
              <pattern 
                id="doodle-bg" 
                width="894"
                height="590"
                patternUnits="userSpaceOnUse"
                patternTransform="scale(0.6)"
              >
                <Doodle className="text-foreground/25 dark:text-muted-foreground/15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#doodle-bg)" />
          </svg>
        </div>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative z-10 h-full overflow-y-auto p-4 md:p-6 no-scrollbar [overflow-anchor:none]"
        >
          <div className="flex flex-col min-h-full pb-2">
            <div className="flex-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4 mb-2">
                <Loader inline className="size-5 text-muted-foreground" />
              </div>
            )}

            {messages.map((msg: any, index: number) => {
              const isMe = msg.senderId === myId;
              const prevMsg = messages[index - 1];
              const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    isMe ? "justify-end" : "justify-start",
                    isConsecutive ? "mt-1" : "mt-4",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] md:max-w-[70%] px-4 py-2 text-[15px] shadow-sm flex items-end gap-2.5",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                        : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-sm",
                      msg.status === "failed" && "opacity-80",
                    )}
                  >
                    <span className="wrap-break-word whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </span>

                    {isMe && (
                      <div className="shrink-0 -mb-0.5 -mr-1 flex items-center gap-1">
                        {msg.isOutbox ? (
                          msg.status === "pending" ? (
                            <Check className="size-3.5 opacity-60" />
                          ) : (
                            <div className="flex items-center gap-1.5 ml-1">
                              <button
                                onClick={() => {
                                  retryOutboxMessage(msg.id);
                                  sendMessage(EventType.SEND_MESSAGE, {
                                    connectionId,
                                    receiverId: chatPartner?.id || "",
                                    content: msg.content,
                                  });
                                  setTimeout(
                                    () => markMessageFailed(msg.id),
                                    5000,
                                  );
                                }}
                                className="text-destructive hover:text-red-400 transition-colors active:scale-90 outline-none"
                                title="Failed to send. Click to retry."
                              >
                                <AlertCircle className="size-4 drop-shadow-sm" />
                              </button>

                              <button
                                onClick={() => removeOutboxMessage(msg.id)}
                                className="text-primary-foreground/50 hover:text-primary-foreground transition-colors active:scale-90 outline-none"
                                title="Delete message"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )
                        ) : (
                          <CheckCheck
                            className={cn(
                              "size-4 transition-all duration-300",
                              msg.isRead ? "opacity-100" : "opacity-40",
                            )}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-1 shrink-0" />
          </div>
        </div>

        {showScrollButton && (
          <div className="absolute bottom-4 right-4 z-20 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative">
              {unreadBelow > 0 && (
                <div className="absolute -top-1.5 -right-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background animate-in zoom-in duration-200">
                  {unreadBelow > 99 ? "99+" : unreadBelow}
                </div>
              )}

              <Button
                size="icon"
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
                className="size-10 rounded-full shadow-lg bg-background text-foreground border border-border/50 hover:bg-muted transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <ArrowDown className="size-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {partnerStatus === "OFFLINE" && matchData?.status === "MATCHED" && (
        <div className="bg-destructive/10 border-t border-destructive/20 px-4 py-2 flex items-center justify-center gap-2 text-sm text-destructive font-medium shrink-0 animate-in slide-in-from-bottom-2">
          <Loader inline className="size-4 text-destructive" />
          Partner lost connection. Waiting for them to return...
        </div>
      )}
      <MessageInput
        connectionId={connectionId}
        receiverId={chatPartner?.id || "unknown"}
        targetUser={chatPartner}
        isMatched={matchData?.status === "MATCHED"}
        isArchived={
          matchData?.status === "ARCHIVED" || matchData?.status === "ENDED"
        }
      />
    </div>
  );
}
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";

interface ScrollableMessage {
  id: string;
  senderId?: string | null;
}

export function useChatScroll<T extends ScrollableMessage>(
  messages: T[], 
  myUserId?: string,
  onLoadMore?: () => void,
  shouldLoadMore?: boolean
) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadBelow, setUnreadBelow] = useState(0); 
  const prevLastMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const oldestMessageIdRef = useRef<string | null>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop < 50 && shouldLoadMore && onLoadMore) {
      onLoadMore();
    }
    const atBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadBelow(0);
    }
  }, [shouldLoadMore, onLoadMore]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !messages.length) return;
    const currentOldest = messages[0];
    if (!currentOldest) return;
    const didLoadOlderMessages = oldestMessageIdRef.current !== currentOldest.id;
    if (prevScrollHeightRef.current > 0 && prevScrollHeightRef.current !== container.scrollHeight && didLoadOlderMessages) {
      const heightDifference = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += heightDifference;
    }
    prevScrollHeightRef.current = container.scrollHeight;
    oldestMessageIdRef.current = currentOldest.id;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadBelow(0);
  }, []);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    const isNewMessageAtBottom = lastMessage.id !== prevLastMessageIdRef.current;
    prevLastMessageIdRef.current = lastMessage.id;
    if (isNewMessageAtBottom) {
      const isMyMessage = lastMessage?.senderId === myUserId;
      if (isAtBottom || isMyMessage) {
        setTimeout(() => scrollToBottom(), 50); 
      } else {
        setUnreadBelow((prev) => prev + 1);
      }
    }
  }, [messages, isAtBottom, myUserId, scrollToBottom]);

  return { 
    bottomRef, 
    scrollContainerRef, 
    handleScroll, 
    scrollToBottom, 
    showScrollButton: !isAtBottom, 
    unreadBelow 
  };
}
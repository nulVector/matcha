import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EventType, SystemAction } from "@matcha/shared";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useOutboxStore } from "@/store/useOutboxStore";
import { useMe } from "./queries/useMe";

export function useWebsocket() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  
  const acknowledgeMessage = useOutboxStore((state) => state.acknowledgeMessage);
  const { data: profile } = useMe();
  const myId = profile?.id;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const intentionalDisconnectRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    intentionalDisconnectRef.current = false;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);

        switch (type) {
          case EventType.CHAT_MESSAGE:
            if (payload.senderId === myId) {
              acknowledgeMessage(payload.connectionId, payload.content);
            }
            const oldData: any = queryClient.getQueryData(["messages", payload.connectionId]);
            if (!oldData || !oldData.pages || oldData.pages.length === 0) {
              queryClient.invalidateQueries({ queryKey: ["messages", payload.connectionId] });
            } else {
              queryClient.setQueryData(["messages", payload.connectionId], (old: any) => {
                const newPages = [...old.pages];
                const serverMsg = { ...payload, isRead: false }; 
                const updatedData = [...(newPages[0].data || []), serverMsg];
                if (updatedData.length > 200) updatedData.shift(); 
                newPages[0] = { ...newPages[0], data: updatedData };
                return { ...old, pages: newPages };
              });
            }
            if (!pathnameRef.current?.includes(`/home/chat/${payload.connectionId}`)) {
              queryClient.setQueryData(["unreadCounts"], (oldCounts: Record<string, number> | undefined) => {
                const counts = oldCounts || {};
                return {
                  ...counts,
                  [payload.connectionId]: (counts[payload.connectionId] || 0) + 1
                };
              });
            } else {
              if (payload.senderId !== myId && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                  type: "VIEWING_CHAT",
                  payload: {
                    connectionId: payload.connectionId,
                    receiverId: payload.senderId,
                    lastMessageId: payload.id
                  }
                }));
              }
            }
            break;

          case EventType.MATCH_FOUND:
            queryClient.setQueryData(["currentMatch"], payload);
            break;

          case EventType.MATCH_EXPIRED:
            if (window.location.pathname.includes(`/home/chat/${payload.connectionId}`)) {
              queryClient.invalidateQueries({ queryKey: ["messages", payload.connectionId] });
              queryClient.invalidateQueries({ queryKey: ["connections"] });
              router.push("/home/match");
            }
            break;

          case EventType.SYSTEM_EVENT:
            if (payload.event === SystemAction.EXTEND_REQUESTED) {
              queryClient.setQueryData(["pending_request", payload.connectionId], "EXTEND");
            } 
            else if (payload.event === SystemAction.CONVERT_REQUESTED) {
              queryClient.setQueryData(["pending_request", payload.connectionId], "CONVERT");
            } 
            else if (payload.event === SystemAction.EXTEND_ACCEPTED) {
              queryClient.setQueryData(["pending_request", payload.connectionId], null);
              queryClient.setQueryData(["messages", payload.connectionId], (old: any) => {
                if (!old || !old.pages || !old.pages[0]) return old;
                const newPages = [...old.pages];
                newPages[0] = {
                  ...newPages[0],
                  matchData: { ...newPages[0].matchData, expiresAt: payload.expiresAt }
                };
                return { ...old, pages: newPages };
              });
            }
            else if (payload.event === SystemAction.CONVERT_ACCEPTED) {
              queryClient.setQueryData(["pending_request", payload.connectionId], null);
              queryClient.setQueryData(["messages", payload.connectionId], (old: any) => {
                if (!old || !old.pages || !old.pages[0]) return old;
                const newPages = [...old.pages];
                newPages[0] = {
                  ...newPages[0],
                  matchData: { ...newPages[0].matchData, status: "FRIEND", expiresAt: null }
                };
                return { ...old, pages: newPages };
              });
              queryClient.invalidateQueries({ queryKey: ["connections"] });
            }
           else if (payload.event === SystemAction.CHAT_ENDED) {
              if (window.location.pathname.includes(`/home/chat/${payload.connectionId}`)) {
                queryClient.setQueryData(["messages", payload.connectionId], (old: any) => {
                  if (!old || !old.pages || !old.pages[0]) return old;
                  const newPages = [...old.pages];
                  newPages[0] = {
                    ...newPages[0],
                    matchData: { ...newPages[0].matchData, status: "ARCHIVED", expiresAt: null }
                  };
                  return { ...old, pages: newPages };
                });
                queryClient.setQueryData(["chat_ended_alert", payload.connectionId], true);
              }
            }
            break;

          case EventType.USER_TYPING:
          case EventType.STOPPED_TYPING:
            queryClient.setQueryData(["typing", payload.connectionId], type === EventType.USER_TYPING);
            break;
            
          case EventType.MESSAGE_READ:
            queryClient.setQueryData(["unreadCounts"], (oldCounts: Record<string, number> | undefined) => {
              if (!oldCounts) return { [payload.connectionId]: 0 };
              return {
                ...oldCounts,
                [payload.connectionId]: 0
              };
            });
            queryClient.setQueryData(["messages", payload.connectionId], (old: any) => {
              if (!old || !old.pages || old.pages.length === 0) return old;
              const newPages = old.pages.map((page: any) => ({
                ...page,
                data: page.data.map((msg: any) => ({
                  ...msg,
                  isRead: true
                }))
              }));
              return { ...old, pages: newPages };
            });
            break;

          case EventType.NOTIFICATION_UPDATE:
            const category = payload.category?.toUpperCase();
            if (category === "NEW_FRIEND_REQUEST") {
              queryClient.setQueryData(["notifications"], (old: any) => {
                if (!old) return { has_new_requests: true };
                return { ...old, has_new_requests: true };
              });
              queryClient.invalidateQueries({ queryKey: ["requests"] });
            } 
            else if (category === "FRIEND_REQUEST_ACCEPTED") {
              queryClient.invalidateQueries({ queryKey: ["connections"] });
              queryClient.invalidateQueries({ queryKey: ["requests"] });
              queryClient.invalidateQueries({ queryKey: ["messages"] }); 
              queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            }
            break;

          default:
            console.warn("Unhandled WebSocket event:", type);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null;
      if (intentionalDisconnectRef.current) return;
      const scheduleReconnect = () => {
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const baseTimeout = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          const jitter = Math.floor(Math.random() * 1000); 
          const timeout = baseTimeout + jitter;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, timeout);
        }
      };

      if (event.code === 1006) {
        fetch('/api/v1/users/me')
          .then((res) => {
            if (res.status === 401) {
              window.location.href = '/login?expired=true';
            } else {
              scheduleReconnect();
            }
          })
          .catch(() => scheduleReconnect());
        return;
      }
      if (event.code !== 1000 && event.code !== 1008 && event.code !== 1001) {
        scheduleReconnect();
      }
    };
    socketRef.current = ws;
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      intentionalDisconnectRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null; 
        socketRef.current.onmessage = null;
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((type: EventType, payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn("Cannot send message, WebSocket is not open.");
    }
  }, []);

  return { isConnected, sendMessage };
}
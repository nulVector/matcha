import { useEffect, useRef, useState, useCallback } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { CachedMessage, EventType, SystemAction } from "@matcha/shared";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useOutboxStore } from "@/store/useOutboxStore";
import { useMe } from "./queries/useMe";
import { SocketMessage } from "@matcha/zod";

interface MessagesQueryData {
  pages: {
    data: CachedMessage[];
    matchData?: { status: string; expiresAt?: string | null };
  }[];
}
interface ConnectionsQueryData {
  pages: {
    data: { connectionId: string; timestamp: number; [key: string]: unknown }[];
  }[];
}

const updateMessagesCache = (queryClient: QueryClient, payload: CachedMessage) => {
  const oldData= queryClient.getQueryData<MessagesQueryData>(["messages", payload.connectionId]);
  if (!oldData || !oldData.pages || oldData.pages.length === 0) {
    queryClient.invalidateQueries({ queryKey: ["messages", payload.connectionId] });
    return;
  } 
  queryClient.setQueryData(["messages", payload.connectionId], (old: MessagesQueryData | undefined) => {
    if (!old) return old;
    const newPages = [...old.pages];
    if (!newPages[0]) return old;
    const serverMsg = { ...payload, isRead: false }; 
    const updatedData = [...(newPages[0].data || []), serverMsg];
    if (updatedData.length > 200) updatedData.shift(); 
    newPages[0] = { ...newPages[0], data: updatedData };
    return { ...old, pages: newPages };
  });
};

const handleUnreadOrReceipt = (
  queryClient: QueryClient, 
  payload: CachedMessage, 
  myId: string, 
  pathname: string, 
  socketRef: React.RefObject<WebSocket | null>
) => {
  if (!pathname.includes(`/home/chat/${payload.connectionId}`)) {
    queryClient.setQueryData(["unreadCounts"], (oldCounts: Record<string, number> | undefined) => ({
      ...(oldCounts || {}),
      [payload.connectionId]: ((oldCounts || {})[payload.connectionId] || 0) + 1
    }));
  } else {
    if (payload.senderId !== myId && socketRef.current?.readyState === WebSocket.OPEN) {
      const traceId = crypto.randomUUID();
      socketRef.current.send(JSON.stringify({
        type: EventType.VIEW_CHAT,
        payload: {
          connectionId: payload.connectionId,
          receiverId: payload.senderId,
          lastMessageId: payload.id
        },
        traceId
      }));
    }
  }
};

const updateConnectionsCache = (queryClient: QueryClient, payload: CachedMessage) => {
  let connectionExists = false;
  queryClient.setQueriesData({ queryKey: ["connections"] }, (oldConnData: ConnectionsQueryData | undefined) => {
    if (!oldConnData || !oldConnData.pages) return oldConnData;
    let targetConn = null;
    let foundPageIndex = -1;
    let foundItemIndex = -1;

    for (let p = 0; p < oldConnData.pages.length; p++) {
      const page = oldConnData.pages[p];
      if (!page) continue;
      foundItemIndex = page.data.findIndex((c) => c.connectionId === payload.connectionId);
      if (foundItemIndex !== -1) {
        foundPageIndex = p;
        targetConn = { 
          ...page.data[foundItemIndex], 
          connectionId: page.data[foundItemIndex]!.connectionId!, 
          timestamp: Date.now() 
        };
        connectionExists = true;
        break;
      }
    }

    if (!targetConn || foundPageIndex === -1) return oldConnData;
    const newPages = [...oldConnData.pages];
    const sourcePage = newPages[foundPageIndex];
    if (!sourcePage) return oldConnData;
    const sourcePageData = [...sourcePage.data];
    sourcePageData.splice(foundItemIndex, 1);
    
    if (foundPageIndex === 0) {
      sourcePageData.unshift(targetConn);
      newPages[0] = { ...newPages[0], data: sourcePageData };
    } else {
      newPages[foundPageIndex] = { ...sourcePage, data: sourcePageData };
      if (newPages[0]) {
        const firstPageData = [...newPages[0].data];
        firstPageData.unshift(targetConn);
        newPages[0] = { ...newPages[0], data: firstPageData };
      }
    }
    return { ...oldConnData, pages: newPages };
  });
  if (!connectionExists) {
    queryClient.invalidateQueries({ queryKey: ["connections"] });
  }
};

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
  const myIdRef = useRef(myId);
  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const intentionalDisconnectRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN 
      || socketRef.current?.readyState === WebSocket.CONNECTING ) return;
    intentionalDisconnectRef.current = false;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      try {
        const outboxStore = useOutboxStore.getState();
        const pendingMessages = outboxStore.messages.filter((m) => m.status === 'pending');

        if (pendingMessages.length > 0) {
          pendingMessages.forEach((msg) => {
            const traceId = crypto.randomUUID();
            ws.send(
              JSON.stringify({
                type: EventType.SEND_MESSAGE,
                payload: {
                  connectionId: msg.connectionId,
                  receiverId: msg.receiverId,
                  content: msg.content,
                },
                traceId
              })
            );
            setTimeout(() => {
              useOutboxStore.getState().markFailed(msg.localId);
            }, 5000);
          });
        }
      } catch (err) {
        console.error("Failed to sync outbox:", err);
      }
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        const currentMyId = myIdRef.current;
        switch (type) {
          case EventType.NEW_MESSAGE:
            if (payload.senderId === currentMyId) {
              acknowledgeMessage(payload.connectionId, payload.content);
            }
            updateMessagesCache(queryClient, payload);
            handleUnreadOrReceipt(queryClient, payload, currentMyId, pathnameRef.current || "", socketRef);
            updateConnectionsCache(queryClient, payload);
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
              queryClient.setQueryData(["messages", payload.connectionId], (old: MessagesQueryData | undefined) => {
                if (!old || !old.pages || !old.pages[0]) return old;
                const newPages = [...old.pages];
                if (!newPages[0]) return old;
                const oldMatchData = newPages[0].matchData || { status: 'UNKNOWN' };
                newPages[0] = {
                  ...newPages[0],
                  matchData: { ...oldMatchData, expiresAt: payload.expiresAt }
                };
                return { ...old, pages: newPages };
              });
            }
            else if (payload.event === SystemAction.CONVERT_ACCEPTED) {
              queryClient.setQueryData(["pending_request", payload.connectionId], null);
              queryClient.setQueryData(["messages", payload.connectionId], (old: MessagesQueryData | undefined) => {
                if (!old || !old.pages || !old.pages[0]) return old;
                const newPages = [...old.pages];
                if (!newPages[0]) return old;
                const oldMatchData = newPages[0].matchData || { status: 'UNKNOWN' };
                newPages[0] = {
                  ...newPages[0],
                  matchData: { ...oldMatchData, status: "FRIEND", expiresAt: null }
                };
                return { ...old, pages: newPages };
              });
              queryClient.invalidateQueries({ queryKey: ["connections"] });
            }
            else if (payload.event === SystemAction.CHAT_ENDED) {
              if (window.location.pathname.includes(`/home/chat/${payload.connectionId}`)) {
                queryClient.setQueryData(["messages", payload.connectionId], (old: MessagesQueryData | undefined) => {
                  if (!old || !old.pages || !old.pages[0]) return old;
                  const newPages = [...old.pages];
                  if (!newPages[0]) return old;
                  const oldMatchData = newPages[0].matchData || { status: 'UNKNOWN' };
                  newPages[0] = {
                    ...newPages[0],
                    matchData: { ...oldMatchData, status: "ARCHIVED", expiresAt: null }
                  };
                  return { ...old, pages: newPages };
                });
                queryClient.setQueryData(["chat_ended_alert", payload.connectionId], true);
              }
            } else if (payload.event === SystemAction.PARTNER_OFFLINE) {
              queryClient.setQueryData(["partner_status", payload.connectionId], "OFFLINE");
            }
            else if (payload.event === SystemAction.PARTNER_ONLINE) {
              queryClient.setQueryData(["partner_status", payload.connectionId], "ONLINE");
            }
            else if (
              payload.event === SystemAction.REQUEST_ACCEPTED || 
              payload.event === SystemAction.REQUEST_DECLINED || 
              payload.event === SystemAction.REQUEST_CANCELLED
            ) {
              if (payload.event === SystemAction.REQUEST_ACCEPTED) {
                queryClient.invalidateQueries({ queryKey: ["connections"] });
                queryClient.invalidateQueries({ queryKey: ["messages"] }); 
              }
              queryClient.invalidateQueries({ queryKey: ["requests"] });
              queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            }
            else if (
              payload.event === SystemAction.UNFRIENDED || 
              payload.event === SystemAction.CHAT_DELETED
            ) {
              queryClient.invalidateQueries({ queryKey: ["connections"] });
              if (payload.connectionId && window.location.pathname.includes(`/home/chat/${payload.connectionId}`)) {
                router.push("/home");
              }
            }
            break;

          case EventType.USER_TYPING:
          case EventType.USER_STOPPED_TYPING:
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
            queryClient.setQueryData(["messages", payload.connectionId], (old: MessagesQueryData | undefined) => {
              if (!old || !old.pages || old.pages.length === 0) return old;
              const newPages = old.pages.map((page) => ({
                ...page,
                data: page.data.map((msg) => ({
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
              queryClient.setQueryData(["notifications"], (old: { has_new_requests: boolean } | undefined) => {
                if (!old) return { has_new_requests: true };
                return { ...old, has_new_requests: true };
              });
              queryClient.invalidateQueries({ queryKey: ["requests"] });
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
      const ws = socketRef.current;
      if (ws) {
        ws.onclose = null; 
        ws.onmessage = null;
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            ws.close(1000, "Component unmounting (Aborted connection)");
          };
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "Component unmounting");
        }
        socketRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    const reviveApp = () => {
      if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries(); 
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reviveApp();
      }
    };
    window.addEventListener("online", reviveApp);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", reviveApp);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connect, queryClient]);

  const sendMessage = useCallback(<T extends SocketMessage["type"]>(
    type: T, 
    payload: Extract<SocketMessage, { type: T }>["payload"]
  ) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const traceId = crypto.randomUUID();
      if (process.env.NODE_ENV === 'development') {
        console.log(`WS out - ${traceId}_${type}`)
      }
      socketRef.current.send(JSON.stringify({ type, payload, traceId }));
    } else {
      console.warn("Cannot send message, WebSocket is not open.");
    }
  }, []);

  return { isConnected, sendMessage };
}
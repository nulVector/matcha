"use client";

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useWebsocket } from "@/hooks/useWebsocket";
import { EventType } from "@matcha/shared";
import type { SocketMessage } from "@matcha/zod";

interface WsContextType {
  isConnected: boolean;
  sendMessage: <T extends EventType>(
    type: T, 
    payload: Extract<SocketMessage, { type: T }>["payload"]
  ) => void;
}

const WsContext = createContext<WsContextType | undefined>(undefined);

export function WsProvider({ children }: { children: ReactNode }) {
  const { isConnected, sendMessage } = useWebsocket();
  const contextValue = useMemo<WsContextType>(() => ({
    isConnected,
    sendMessage: sendMessage as WsContextType["sendMessage"]
  }), [isConnected, sendMessage]);
  return (
    <WsContext.Provider value={contextValue}>
      {children}
    </WsContext.Provider>
  );
}

export function useWS() {
  const context = useContext(WsContext);
  if (context === undefined) {
    throw new Error("useWS must be used within a WsProvider");
  }
  return context;
}
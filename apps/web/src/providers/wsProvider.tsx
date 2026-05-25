"use client";

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useWebsocket } from "@/hooks/useWebsocket";
import { EventType } from "@matcha/shared";

interface WsContextType {
  isConnected: boolean;
  sendMessage: (type: EventType, payload: any) => void;
}

const WsContext = createContext<WsContextType | undefined>(undefined);

export function WsProvider({ children }: { children: ReactNode }) {
  const { isConnected, sendMessage } = useWebsocket();
  const contextValue = useMemo(()=>({
    isConnected,
    sendMessage
  }), [isConnected,sendMessage]);
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
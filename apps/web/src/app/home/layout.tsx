"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { WsProvider, useWS } from "@/providers/wsProvider";
import { Sidebar } from "@/components/home/sidebar";
import { MiddlePane } from "@/components/home/middlePane";
import { cn } from "@matcha/ui/lib/utils";
import { WifiOff } from "lucide-react";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isConnected } = useWS();
  const isDetailView = pathname.includes("/chat/") || pathname.includes("/match");

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background relative">
      {!isConnected && (
        <div 
          className="absolute top-0 left-0 right-0 z-50 flex justify-center animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div 
            className="bg-destructive text-destructive-foreground text-xs font-semibold px-4 py-1.5 rounded-b-md shadow-md flex items-center gap-2"
          >
            <WifiOff className="size-3.5" />
            Connecting to server...
          </div>
        </div>
      )}

      <div className={cn(
        "h-full shrink-0 border-r border-border/50",
        isDetailView ? "hidden md:flex" : "flex w-full md:w-auto"
      )}>
        <Sidebar />
        <MiddlePane className="flex-1 md:flex-none md:w-80 lg:w-96" />
      </div>
      <main className={cn(
        "relative bg-muted/40 h-full",
        isDetailView ? "flex flex-1 w-full" : "hidden md:flex md:flex-1"
      )}>
        {children}
      </main>
    </div>
  );
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <WsProvider>
      <LayoutContent>{children}</LayoutContent>
    </WsProvider>
  );
}
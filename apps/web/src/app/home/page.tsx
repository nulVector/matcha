"use client";

import { EmptyState } from "@matcha/ui/components/emptyState";
import { Radar } from "lucide-react";

export default function HomeEmptyState() {
  return (
    <div 
      className="flex h-full w-full items-center justify-center animate-in fade-in zoom-in-95 duration-500 ease-out"
    >
      <EmptyState
        icon={<Radar className="size-8 text-primary/80 animate-pulse" />} 
        title="Welcome to Matcha"
        description="Select a conversation from the sidebar or join the matchmaking radar to begin."
      />
    </div>
  );
}
"use client";

import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
import { MatchState } from "@/types/models";
import { Button } from "@matcha/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Radar, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function MatchmakingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { key: joinKey, resetKey: resetJoinKey } = useIdempotency();
  const { key: leaveKey, resetKey: resetLeaveKey } = useIdempotency();
  const [isQueued, setIsQueued] = useState(false);
  const isQueuedRef = useRef(isQueued);

  useEffect(() => {
    isQueuedRef.current = isQueued;
  }, [isQueued]);
  
  useEffect(() => {
    const shouldAutoQueue = queryClient.getQueryData(["auto_queue"]);
    if (shouldAutoQueue) {
      queryClient.setQueryData(["auto_queue"], null);
      joinQueue();
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (isQueuedRef.current) {
        api.post(
          "/connections/queue/leave", 
          {},
          { headers: { "x-idempotency-key": leaveKey } }
        ).catch(console.error);
      }
    };
  }, []);

  const { data: match } = useQuery<MatchState | null>({
    queryKey: ["currentMatch"],
    queryFn: () => queryClient.getQueryData(["currentMatch"]) || null,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (match?.connectionId) {
      isQueuedRef.current = false;
      queryClient.setQueryData(["currentMatch"], null);
      router.push(`/home/chat/${match.connectionId}`);
    }
  }, [match?.connectionId, queryClient, router]);

  const { mutate: joinQueue, isPending: isJoining } = useMutation({
    mutationFn: async () => {
      await api.post(
        "/connections/queue/join",
        {},
        { headers: { "x-idempotency-key": joinKey } },
      );
    },
    onSuccess: () => setIsQueued(true),
    onSettled: () => resetJoinKey(),
  });

  const { mutate: leaveQueue, isPending: isLeaving } = useMutation({
    mutationFn: async () => {
      await api.post(
        "/connections/queue/leave",
        {},
        { headers: { "x-idempotency-key": leaveKey } },
      );
    },
    onSuccess: () => setIsQueued(false),
    onSettled: () => resetLeaveKey(),
  });

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to home"
        className="absolute top-4 left-4 md:hidden z-10 rounded-full transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        onClick={() => router.push("/home")}
      >
        <ChevronLeft className="size-6" />
      </Button>

      {!isQueued ? (
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 px-6 max-w-sm">
          <div className="size-24 rounded-full bg-background flex items-center justify-center mb-6 shadow-sm border border-border/50">
            <Radar className="size-10 text-primary/80" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center text-foreground">
            Ready to connect?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 text-center leading-relaxed text-balance">
            Join the queue to be matched with someone based on your shared
            interests and vibe.
          </p>
          <Button
            size="lg"
            className="w-48 rounded-full h-12 text-base font-medium shadow-md transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => joinQueue()}
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Queue"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 px-6 max-w-sm">
          <div className="relative flex items-center justify-center size-32 mb-8">
            <div
              className="absolute size-full rounded-full bg-primary/20 animate-ping"
              style={{ animationDuration: "3s" }}
            />
            <div
              className="absolute size-24 rounded-full bg-primary/30 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <div className="relative size-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Radar className="size-8 text-primary-foreground animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center text-foreground">
            Finding a match...
          </h2>
          <p className="text-sm text-muted-foreground mb-8 text-center leading-relaxed text-balance">
            Our algorithm is scanning the network for your ideal connection.
          </p>

          <Button
            variant="outline"
            size="lg"
            className="w-48 rounded-full h-12 text-base font-medium gap-2 shadow-sm transition-all duration-200 active:scale-[0.98] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30"
            onClick={() => leaveQueue()}
            disabled={isLeaving}
          >
            <X className="size-4" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

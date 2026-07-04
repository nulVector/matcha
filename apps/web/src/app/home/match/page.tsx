"use client";

import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
import { MatchState } from "@/types/models";
import { Button } from "@matcha/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@matcha/ui/components/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ChevronLeft, Radar, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MatchmakingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { key: joinKey, resetKey: resetJoinKey } = useIdempotency();
  const { key: leaveKey, resetKey: resetLeaveKey } = useIdempotency();
  const [isQueued, setIsQueued] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const isQueuedRef = useRef(isQueued);

  useEffect(() => {
    isQueuedRef.current = isQueued;
  }, [isQueued]);
  
  useEffect(() => {
    const shouldAutoQueue = queryClient.getQueryData(["auto_queue"]);
    if (shouldAutoQueue) {
      queryClient.setQueryData(["auto_queue"], null);
      setIsQueued(true);
    }
  }, [queryClient]);
  
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
  }, [leaveKey]);

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
    onError: (err: AxiosError<{ message: string }>) => {
      if (err.response?.status === 400 && err.response?.data?.message.includes("already in the queue")) {
        setIsQueued(true);
      }
    },
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
    <>
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to home"
          className="absolute top-4 left-4 lg:hidden z-10 rounded-full transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={() => {
            if (isQueued) {
              setShowLeaveWarning(true);
            } else {
              router.push("/home");
            }
          }}
        >
          <ChevronLeft className="size-6" />
        </Button>

        <AnimatePresence mode="wait">
          {!isQueued ? (
            <motion.div 
              key="unqueued"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center px-6 max-w-sm"
            >
              <div className="size-24 rounded-full bg-background flex items-center justify-center mb-6 shadow-sm border border-border/50">
                <Radar className="size-10 text-primary/80" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center text-foreground">
                Ready for your Blend?
              </h2>
              <p className="text-sm text-muted-foreground mb-8 text-center leading-relaxed text-balance">
                Step in to find people nearby who share your interests.
              </p>
              <Button
                size="lg"
                className="w-48 rounded-full h-12 text-base font-medium shadow-md transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={() => joinQueue()}
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Find a Match"}
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="queued"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center px-6 max-w-sm"
            >
              <div className="relative flex items-center justify-center size-32 mb-8">
                <motion.div
                  className="absolute size-16 rounded-full bg-primary/30"
                  animate={{ scale: [1, 2.5, 4], opacity: [0.8, 0.3, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0 }}
                />
                <motion.div
                  className="absolute size-16 rounded-full bg-primary/30"
                  animate={{ scale: [1, 2.5, 4], opacity: [0.8, 0.3, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1.25 }}
                />
                <div className="relative size-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Radar className="size-8 text-primary-foreground animate-spin-ccw" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center text-foreground">
                Brewing your match...
              </h2>
              <p className="text-sm text-muted-foreground mb-8 text-center leading-relaxed text-balance">
                Searching for someone with shared interests.
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Stop searching?
            </DialogTitle>
            <DialogDescription className="mt-2 text-balance">
              You&apos;re currently looking for a match. If you leave now, you&apos;ll lose your spot. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex w-full flex-col-reverse sm:flex-row gap-3 mt-4 sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto min-w-24"
              onClick={() => setShowLeaveWarning(false)}
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto min-w-24"
              onClick={() => {
                setShowLeaveWarning(false);
                router.push("/home");
              }}
            >
              Yes, Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
"use client";

import { UserAvatar } from "@/components/shared/userAvatar";
import { useUser } from "@/hooks/queries/useUser";
import { useIdempotency } from "@/hooks/useIdempotency";
import { api, getServerTime } from "@/lib/axios";
import { Badge } from "@matcha/ui/components/badge";
import { Button } from "@matcha/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@matcha/ui/components/dialog";
import { Loader } from "@matcha/ui/components/loader";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@matcha/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@matcha/ui/components/tooltip";
import { cn } from "@matcha/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  Check,
  ChevronLeft,
  Clock,
  FastForward,
  Inbox,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ChatHeader({
  connectionId,
  targetUser,
  matchData,
}: {
  connectionId: string;
  targetUser: any;
  matchData: any;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { key: extendKey, resetKey: resetExtendKey } = useIdempotency();
  const { key: convertKey, resetKey: resetConvertKey } = useIdempotency();
  const { key: skipKey, resetKey: resetSkipKey } = useIdempotency();
  const { key: unfriendKey, resetKey: resetUnfriendKey } = useIdempotency();
  const { key: requestKey, resetKey: resetRequestKey } = useIdempotency();

  const { data: pendingRequest } = useQuery({
    queryKey: ["pending_request", connectionId],
    queryFn: () => null,
    initialData: null,
  });

  const { data: isTyping } = useQuery({
    queryKey: ["typing", connectionId],
    queryFn: () => false,
    initialData: false,
  });

  const { data: showEndedAlert } = useQuery({
    queryKey: ["chat_ended_alert", connectionId],
    queryFn: () => false,
    initialData: false,
  });

  const isMatched = matchData?.status === "MATCHED";
  const isDeactivated = targetUser?.isActive === false;
  const [timeLeft, setTimeLeft] = useState<string>("00:00");
  const [iRequestedExtend, setIRequestedExtend] = useState(false);
  const [iRequestedAdd, setIRequestedAdd] = useState(false);

  useEffect(() => {
    if (!isMatched || !matchData?.expiresAt) return;

    const interval = setInterval(() => {
      const rawDiff = new Date(matchData.expiresAt).getTime() - getServerTime();
      const diff = Math.max(0, rawDiff);
      if (diff === 0) {
        clearInterval(interval);
        setTimeLeft("00:00");
      } else {
        const m = Math.floor((diff / 1000 / 60) % 60)
          .toString()
          .padStart(2, "0");
        const s = Math.floor((diff / 1000) % 60)
          .toString()
          .padStart(2, "0");
        setTimeLeft(`${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [matchData?.expiresAt, isMatched]);

  useEffect(() => {
    if (!isMatched || !matchData) return;
    if (matchData.iRequestedExtend) setIRequestedExtend(true);
    if (matchData.iRequestedConvert) setIRequestedAdd(true);
    if (matchData.partnerRequested) {
      const currentReq = queryClient.getQueryData(["pending_request", connectionId]);
      if (currentReq !== matchData.partnerRequested) {
        queryClient.setQueryData(["pending_request", connectionId], matchData.partnerRequested);
      }
    }
  }, [matchData, connectionId, isMatched, queryClient]);

  const { data: fullProfile, isLoading: isLoadingProfile } = useUser(
    targetUser?.username,
  );

  const { mutate: unfriendUser, isPending: isUnfriending } = useMutation({
    mutationFn: async () => {
      await api.patch(
        `/users/${fullProfile.id}/unfriend`,
        {},
        { headers: { "x-idempotency-key": unfriendKey } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      if (targetUser?.username) {
        queryClient.invalidateQueries({ queryKey: ["userProfile", targetUser.username] });
      }
      router.push("/home");
    },
    onSettled: () => resetUnfriendKey(),
  });

  const { mutate: sendRequest, isPending: isSending } = useMutation({
    mutationFn: async () => {
      await api.post(
        `/users/${fullProfile.id}/request`,
        {
          origin: "ARCHIVE",
          connectionId: connectionId,
        },
        { headers: { "x-idempotency-key": requestKey } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userProfile", targetUser?.username],
      });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onSettled: () => resetRequestKey(),
  });

  const { mutate: extendChat, isPending: isExtending } = useMutation({
    mutationFn: async ( { action }: { action: "ACCEPT" | "REJECT" }) =>
      await api.patch(
        `/connections/${connectionId}/extend`,
        { action },
        { headers: { "x-idempotency-key": extendKey } },
      ),
    onSuccess: (_, variables) => {
      if (variables.action === "ACCEPT") {
        setIRequestedExtend(true);
      }
      queryClient.setQueryData(["pending_request", connectionId], null);
    },
    onSettled: () => resetExtendKey(),
  });

  const { mutate: convertChat, isPending: isConverting } = useMutation({
    mutationFn: async ({ action } : { action: "ACCEPT" | "REJECT" }) =>
      await api.patch(
        `/connections/${connectionId}/convert`,
        { action },
        { headers: { "x-idempotency-key": convertKey } },
      ),
    onSuccess: (_, variables) => {
      if (variables.action === "ACCEPT") {
        setIRequestedAdd(true);
      }
      queryClient.setQueryData(["pending_request", connectionId], null);
    },
    onSettled: () => resetConvertKey(),
  });

  const { mutate: skipChat } = useMutation({
    mutationFn: async () =>
      await api.delete(`/connections/${connectionId}`, {
        headers: { "x-idempotency-key": skipKey },
      }),
    onSuccess: () => {
      queryClient.setQueryData(["auto_queue"], true);
      queryClient.invalidateQueries({ queryKey: ["messages", connectionId] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      router.push("/home/match");
    },
    onSettled: () => resetSkipKey(),
  });

  const renderRelationshipButton = () => {
    if (!fullProfile?.relationship) return null;
    const { relationship } = fullProfile;

    if (relationship.status === "FRIEND") {
      return (
        <Button
          variant="destructive"
          className="w-full mt-2"
          onClick={() => unfriendUser()}
          disabled={isUnfriending}
        >
          {isUnfriending ? (
            <Loader inline className="size-4 mr-2" />
          ) : (
            <UserMinus className="size-4 mr-2" />
          )}
          Unfriend
        </Button>
      );
    }

    if (relationship.hasPendingRequest) {
      if (relationship.iAmTheSender) {
        return (
          <Button className="w-full mt-2" disabled variant="secondary">
            <Check className="size-4 mr-2" />
            Request Sent
          </Button>
        );
      } else {
        return (
          <Button className="w-full mt-2" disabled variant="outline">
            <Inbox className="size-4 mr-2" />
            They sent you a request
          </Button>
        );
      }
    }

    if (
      relationship.status === "ARCHIVED" ||
      matchData?.status === "ARCHIVED"
    ) {
      return (
        <Button
          className="w-full mt-2"
          onClick={() => sendRequest()}
          disabled={isSending}
        >
          {isSending ? (
            <Loader inline className="size-4 mr-2" />
          ) : (
            <UserPlus className="size-4 mr-2" />
          )}
          Send Friend Request
        </Button>
      );
    }

    return null;
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-md px-4 md:px-6 shadow-sm z-30 relative">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2 shrink-0 transition-all duration-200 active:scale-[0.98]"
            onClick={() => router.push("/home")}
            aria-label="Back to messages"
          >
            <ChevronLeft className="size-6" />
          </Button>

          <Popover>
            <PopoverTrigger className="group flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all duration-200 active:scale-[0.98] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-md p-1 -ml-1">
              <UserAvatar
                avatarUrl={targetUser?.avatarUrl}
                username={targetUser?.username}
                className={cn(
                  "size-10 transition-all duration-300",
                  isDeactivated && "grayscale opacity-50 border-dashed"
                )}
              />
              <div className="hidden flex-col justify-center sm:flex">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-semibold text-base leading-none transition-colors",
                      isDeactivated
                        ? "text-muted-foreground/70 italic"
                        : "text-foreground group-hover:text-primary"
                    )}
                  >
                    {targetUser?.username}
                  </span>
                  {isDeactivated && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-muted/80 text-muted-foreground shrink-0 border border-border/40 mt-0.5">
                      Deactivated
                    </span>
                  )}
                </div>
                {isTyping && !isDeactivated && (
                  <span className="text-xs font-medium text-primary animate-pulse mt-1">
                    typing...
                  </span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-4 space-y-4">
              {isLoadingProfile || !fullProfile ? (
                <Loader />
              ) : (
                <>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">About me</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {fullProfile.aboutMe || "No bio provided."}
                    </p>
                  </div>

                  {fullProfile.interest && fullProfile.interest.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-sm">Interests</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {fullProfile.interest.map((i: string) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="font-normal text-xs bg-muted hover:bg-muted/80 transition-colors"
                          >
                            {i}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t">
                    {renderRelationshipButton()}
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {isMatched && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border bg-background/85 backdrop-blur-md p-1.5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <Badge
            variant="secondary"
            className="h-8 px-3 gap-1.5 text-sm font-medium bg-muted/50 hover:bg-muted/50"
          >
            <Clock className="size-4 text-primary" />{" "}
            <span className="tabular-nums w-10 text-center">{timeLeft}</span>
          </Badge>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-muted transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={
                  iRequestedExtend || pendingRequest === "EXTEND" || isExtending
                }
                onClick={() => extendChat({ action: "ACCEPT" })}
                aria-label="Extend Chat"
              >
                {isExtending ? (
                  <Loader inline className="size-4" />
                ) : (
                  <AlarmClock className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Extend Chat (+30m)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-muted text-primary transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={
                  iRequestedAdd || pendingRequest === "CONVERT" || isConverting
                }
                onClick={() => convertChat({ action: "ACCEPT" })}
                aria-label="Send Friend Request"
              >
                {isConverting ? (
                  <Loader inline className="size-4" />
                ) : (
                  <UserPlus className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Friend</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground px-3 ml-1 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30"
            onClick={() => skipChat()}
          >
            Skip <FastForward className="size-3.5 ml-1.5" />
          </Button>
        </div>
      )}

      <Dialog
        open={pendingRequest === "EXTEND"}
        onOpenChange={(isOpen) => {
          if (!isOpen)
            queryClient.setQueryData(["pending_request", connectionId], null);
        }}
      >
        <DialogContent 
          className="sm:max-w-md [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Time Extension Requested</DialogTitle>
            <DialogDescription className="mt-2 text-balance">
              <span className="font-medium text-foreground">
                {targetUser?.username}
              </span>{" "}
              wants to extend this chat for another 30 minutes. Do you agree?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex w-full flex-col-reverse sm:flex-row gap-3 mt-4 sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto min-w-35"
              disabled={isExtending}
              onClick={() => extendChat({ action: "REJECT" })}
            >
              Decline
            </Button>
            <Button
              className="w-full sm:w-auto min-w-35"
              onClick={() => extendChat({ action: "ACCEPT" })}
              disabled={isExtending}
            >
              {isExtending ? (
                <Loader
                  inline
                  className="mr-2 size-4 text-primary-foreground"
                />
              ) : (
                <AlarmClock className="mr-2 size-4" />
              )}
              Accept Extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingRequest === "CONVERT"}
        onOpenChange={(isOpen) => {
          if (!isOpen)
            queryClient.setQueryData(["pending_request", connectionId], null);
        }}
      >
        <DialogContent 
          className="sm:max-w-md [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Friend Request</DialogTitle>
            <DialogDescription className="mt-2 text-balance">
              <span className="font-medium text-foreground">
                {targetUser?.username}
              </span>{" "}
              wants to add you as a friend. If you accept, this chat will become
              permanent!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex w-full flex-col-reverse sm:flex-row gap-3 mt-4 sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto min-w-35"
              disabled={isConverting}
              onClick={() => convertChat({ action: "REJECT" })}
            >
              Decline
            </Button>
            <Button
              className="w-full sm:w-auto min-w-35"
              onClick={() => convertChat({ action: "ACCEPT" })}
              disabled={isConverting}
            >
              {isConverting ? (
                <Loader
                  inline
                  className="mr-2 size-4 text-primary-foreground"
                />
              ) : (
                <UserPlus className="mr-2 size-4" />
              )}
              Accept Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!showEndedAlert}
        onOpenChange={() =>
          queryClient.setQueryData(["chat_ended_alert", connectionId], false)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="size-5 text-destructive" />
              Chat Ended
            </DialogTitle>
            <DialogDescription className="mt-2 text-balance">
              <span className="font-medium text-foreground">
                {targetUser?.username}
              </span>{" "}
              has left the chat. You can return to home or find a new match.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex w-full flex-col-reverse sm:flex-row gap-3 mt-4 sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto min-w-35"
              onClick={() => {
                queryClient.setQueryData(
                  ["chat_ended_alert", connectionId],
                  false,
                );
                router.push("/home");
              }}
            >
              Go to Home
            </Button>
            <Button
              className="w-full sm:w-auto min-w-35"
              onClick={() => {
                queryClient.setQueryData(
                  ["chat_ended_alert", connectionId],
                  false,
                );
                router.push("/home/match");
              }}
            >
              Find New Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

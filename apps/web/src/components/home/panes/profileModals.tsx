"use client";

import { UserAvatar } from "@/components/shared/userAvatar";
import { useUser } from "@/hooks/queries/useUser";
import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
import { FriendRequestItem, UserSettingsProfile } from "@/types/models";
import { Badge } from "@matcha/ui/components/badge";
import { Button } from "@matcha/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@matcha/ui/components/dialog";
import { Loader } from "@matcha/ui/components/loader";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Inbox,
  MessageSquare,
  UserMinus,
  UserPlus,
  X as XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

function SharedProfileInfo({
  profile,
  extraBadge,
}: {
  profile: Pick<
    UserSettingsProfile,
    "username" | "avatarUrl" | "aboutMe" | "interest"
  >;
  extraBadge?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-3 pt-2">
        <UserAvatar
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          className="size-24"
        />
        <div className="text-center space-y-1.5">
          <h3 className="text-xl font-semibold">{profile.username}</h3>
          {extraBadge}
        </div>
      </div>

      <div className="space-y-4">
        {profile.aboutMe && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              About
            </h4>
            <p className="text-sm bg-muted/30 p-3 rounded-lg border leading-relaxed text-pretty">
              {profile.aboutMe}
            </p>
          </div>
        )}

        {profile.interest && profile.interest.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Interests
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {profile.interest.map((item: string) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="font-normal text-xs bg-muted hover:bg-muted/80 transition-colors"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface SearchProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export function SearchProfileModal({
  isOpen,
  onClose,
  username,
}: SearchProfileModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { key: requestKey, resetKey: resetRequestKey } = useIdempotency();

  const { data: fullProfile, isLoading: isLoadingProfile } = useUser(
    username,
    isOpen,
  );

  const { mutate: sendRequest, isPending: isSending } = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(
        `/users/${userId}/request`,
        { origin: "SEARCH" },
        { headers: { "x-idempotency-key": requestKey } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", username] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onSettled: () => resetRequestKey(),
  });

  const renderRelationshipButton = () => {
    if (!fullProfile) return null;
    const { relationship } = fullProfile;

    if (
      relationship.status === "FRIEND" ||
      relationship.status === "ARCHIVED"
    ) {
      return (
        <Button
          className="w-full align-middle"
          onClick={() => {
            onClose();
            if (relationship.connectionId) {
              router.push(`/home/chat/${relationship.connectionId}`);
            }
          }}
        >
          <MessageSquare className="size-4 mr-1" />
          Message
        </Button>
      );
    }

    if (relationship.hasPendingRequest) {
      if (relationship.iAmTheSender) {
        return (
          <Button className="w-full" disabled variant="secondary">
            <Check className="size-4 mr-1" />
            Request Sent
          </Button>
        );
      } else {
        return (
          <Button className="w-full" disabled variant="outline">
            <Inbox className="size-4 mr-1" />
            They sent you a request
          </Button>
        );
      }
    }

    return (
      <Button
        className="w-full"
        onClick={() => sendRequest(fullProfile.id)}
        disabled={isSending}
      >
        {isSending ? (
          <Loader inline className="size-4 mr-1" />
        ) : (
          <UserPlus className="size-4 mr-1" />
        )}
        Send Friend Request
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6 overflow-hidden">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
            User Profile
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details and actions for the searched user profile.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProfile || !fullProfile ? (
          <div className="flex justify-center p-8">
            <Loader />
          </div>
        ) : (
          <div className="space-y-6">
            <SharedProfileInfo profile={fullProfile} />
            <div className="pt-2">{renderRelationshipButton()}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RequestDetailsModalProps {
  request: FriendRequestItem | null;
  onClose: () => void;
}

export function RequestDetailsModal({
  request,
  onClose,
}: RequestDetailsModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { key: handleKey, resetKey: resetHandleKey } = useIdempotency();
  const { key: cancelKey, resetKey: resetCancelKey } = useIdempotency();
  const targetUsername = request?.user?.username;
  const { data: fullProfile, isLoading: isLoadingProfile } = useUser(
    targetUsername,
    !!request,
  );

  const { mutate: handleRequest, isPending: isHandling } = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "ACCEPT" | "REJECT";
    }) => {
      await api.post(
        `/users/${requestId}/handle-request`,
        { action },
        { headers: { "x-idempotency-key": handleKey } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      if (targetUsername) {
        queryClient.invalidateQueries({
          queryKey: ["userProfile", targetUsername],
        });
      }
      onClose();
    },
    onSettled: () => resetHandleKey(),
  });

  const { mutate: cancelRequest, isPending: isCanceling } = useMutation({
    mutationFn: async (requestId: string) => {
      await api.delete(`/users/${requestId}/cancel`, {
        headers: { "x-idempotency-key": cancelKey },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      if (targetUsername) {
        queryClient.invalidateQueries({
          queryKey: ["userProfile", targetUsername],
        });
      }
      onClose();
    },
    onSettled: () => resetCancelKey(),
  });

  const renderModalActions = () => {
    if (!request) return null;
    const isIncoming = request.type === "INCOMING";

    return (
      <div className="flex flex-col gap-2 pt-2">
        {isIncoming ? (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                handleRequest({
                  requestId: request.requestId,
                  action: "ACCEPT",
                })
              }
              disabled={isHandling}
            >
              {isHandling ? (
                <Loader inline className="size-4 mr-1" />
              ) : (
                <Check className="size-4 mr-1" />
              )}
              Accept
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() =>
                handleRequest({
                  requestId: request.requestId,
                  action: "REJECT",
                })
              }
              disabled={isHandling}
            >
              {isHandling ? (
                <Loader inline className="size-4 mr-1" />
              ) : (
                <XIcon className="size-4 mr-1" />
              )}
              Reject
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => cancelRequest(request.requestId)}
            disabled={isCanceling}
          >
            {isCanceling ? (
              <Loader
                inline
                className="size-4 mr-1 text-destructive-foreground"
              />
            ) : (
              <UserMinus className="size-4 mr-1" />
            )}
            Cancel Request
          </Button>
        )}

        {request.origin === "ARCHIVE" && request.connectionId && (
          <Button
            variant="secondary"
            className="w-full mt-2"
            onClick={() => {
              onClose();
              router.push(`/home/chat/${request.connectionId}`);
            }}
          >
            <MessageSquare className="size-4 mr-1" />
            Go to Archived Chat
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6 overflow-hidden">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Request Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Actions for the selected friend request.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProfile || !fullProfile ? (
          <div className="flex justify-center p-8">
            <Loader />
          </div>
        ) : (
          <div className="space-y-6">
            <SharedProfileInfo
              profile={fullProfile}
              extraBadge={
                <Badge
                  variant="secondary"
                  className="text-xs font-normal bg-muted text-muted-foreground pb-0.5"
                >
                  Origin: {request?.origin}
                </Badge>
              }
            />
            {renderModalActions()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { UserAvatar } from "@/components/shared/userAvatar";
import { api } from "@/lib/axios";
import { Badge } from "@matcha/ui/components/badge";
import { Button } from "@matcha/ui/components/button";
import { EmptyState } from "@matcha/ui/components/emptyState";
import { Loader } from "@matcha/ui/components/loader";
import { SegmentedControl } from "@matcha/ui/components/segmentedControl";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Inbox, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { RequestDetailsModal } from "./profileModals";
import { FriendRequestItem } from "@/types/models";

export function RequestsPane() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"incoming" | "outgoing">("incoming");
  const [selectedRequest, setSelectedRequest] = useState<FriendRequestItem | null>(null);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data.data;
    },
  });

  const { mutate: clearNotification } = useMutation({
    mutationFn: async () => {
      await api.patch(`/notifications/new_friend_request/read`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData(["notifications"]);
      queryClient.setQueryData(["notifications"], (old: { has_new_requests: boolean } | undefined) => {
        if (!old) return old;
        return { ...old, has_new_requests: false };
      });
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (view === "incoming" && notifications?.has_new_requests) {
      clearNotification();
    }
  }, [view, notifications?.has_new_requests, clearNotification]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["requests", view],
      queryFn: async ({ pageParam }) => {
        const res = await api.get(
          `/users/me/requests?type=${view}&limit=20${pageParam ? `&cursor=${pageParam}` : ""}`,
        );
        return res.data;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const requestsList = data?.pages.flatMap((page) => page.data) || [];
  useEffect(() => {
    if (selectedRequest) {
      const requestStillExists = requestsList.some(
        (req: FriendRequestItem) => req.requestId === selectedRequest.requestId
      );
      if (!requestStillExists) {
        setSelectedRequest(null);
      }
    }
  }, [requestsList, selectedRequest]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 border-b border-border/50 pb-4 shrink-0">
        <h2 className="text-2xl font-semibold tracking-tight">Requests</h2>
        <SegmentedControl<"incoming" | "outgoing">
          value={view}
          onChange={(val) => setView(val)}
          options={[
            {
              label: (
                <div className="flex items-center justify-center gap-2">
                  <Inbox className="size-4" /> Received
                </div>
              ),
              value: "incoming",
            },
            {
              label: (
                <div className="flex items-center justify-center gap-2">
                  <Send className="size-4" /> Sent
                </div>
              ),
              value: "outgoing",
            },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col no-scrollbar">
        {isLoading && (
          <div className="flex justify-center mt-4">
            <Loader />
          </div>
        )}

        {!isLoading && requestsList.length === 0 && (
          <div className="my-auto">
            <EmptyState
              icon={
                view === "incoming" ? (
                  <Inbox className="size-8" />
                ) : (
                  <Send className="size-8" />
                )
              }
              title={`No ${view} requests`}
              description={
                view === "incoming"
                  ? "You're all caught up!"
                  : "You haven't sent any requests."
              }
            />
          </div>
        )}

        <div className="space-y-1">
          {requestsList.map((req: FriendRequestItem) => (
            <button
              key={req.requestId}
              type="button"
              onClick={() => setSelectedRequest(req)}
              aria-label={`View request from ${req.user.username}`}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 text-left"
            >
              <UserAvatar
                avatarUrl={req.user.avatarUrl}
                username={req.user.username}
                className="size-12"
              />
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate text-foreground">
                  {req.user.username}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">Via:</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 font-medium uppercase text-muted-foreground border-border/60"
                  >
                    {req.origin}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>

        {hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-[0.98]"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader inline className="size-3 mr-2" />}
            Load more
          </Button>
        )}
      </div>

      <RequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

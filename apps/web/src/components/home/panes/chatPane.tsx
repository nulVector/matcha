"use client";

import { UserAvatar } from "@/components/shared/userAvatar";
import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@matcha/ui/components/dropdown-menu";
import { EmptyState } from "@matcha/ui/components/emptyState";
import { Input } from "@matcha/ui/components/input";
import { Loader } from "@matcha/ui/components/loader";
import { cn } from "@matcha/ui/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Archive,
  Edit,
  MessageSquare,
  MoreVertical,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { NewChatPanel } from "./newChatPanel";
import { ConnectionItem } from "@/types/models";

export function ChatPane() {
  const params = useParams();
  const router = useRouter();
  const activeConnectionId = params?.connectionId as string | undefined;
  const queryClient = useQueryClient();
  const [view, setView] = useState<"FRIEND" | "ARCHIVED">("FRIEND");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectionToDelete, setConnectionToDelete] = useState<ConnectionItem | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const { key: deleteKey, resetKey: resetDeleteKey } = useIdempotency();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["connections", view],
      queryFn: async ({ pageParam }) => {
        const res = await api.get(
          `/users/me/connections?status=${view}&limit=20${pageParam ? `&cursor=${pageParam}` : ""}`,
        );
        return res.data;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const { data: unreadMap } = useQuery({
    queryKey: ["unreadCounts"],
    queryFn: async () => {
      const res = await api.get("/messages/unread");
      return res.data.data as Record<string, number>;
    },
    staleTime: 1000 * 60,
  });

  const { mutate: deleteChat, isPending: isDeleting } = useMutation({
    mutationFn: async (connectionId: string) => {
      await api.patch(
        `/users/me/connections/${connectionId}`,
        {},
        { headers: { "x-idempotency-key": deleteKey } },
      );
    },
    onSuccess: () => {
      setConnectionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
    onSettled: () => resetDeleteKey(),
  });

  const connections = data?.pages.flatMap((page) => page.data) || [];

  const filteredConnections = connections.filter((conn: ConnectionItem) =>
    conn.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="p-4 space-y-4 border-b border-border/50 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNewChatOpen(true)}
            className="size-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200 active:scale-[0.98]"
            aria-label="New Chat"
          >
            <Edit className="size-4.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            aria-label="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/30 border-transparent shadow-none focus-visible:border-primary h-9"
          />
        </div>
        <Button
          variant={view === "ARCHIVED" ? "secondary" : "outline"}
          className={cn(
            "w-full justify-start gap-3 h-10 font-normal shadow-xs transition-all duration-200 active:scale-[0.98]",
            view === "FRIEND" && "bg-background hover:bg-muted/50",
          )}
          onClick={() => {
            setView(view === "FRIEND" ? "ARCHIVED" : "FRIEND");
            setSearchQuery("");
          }}
        >
          {view === "FRIEND" ? (
            <Archive className="size-4 opacity-70" />
          ) : (
            <MessageSquare className="size-4 opacity-70" />
          )}
          {view === "FRIEND" ? "View Archived" : "View Active Chats"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {isLoading && <Loader className="mt-4" />}

        {!isLoading && connections.length === 0 && (
          <EmptyState
            icon={
              view === "FRIEND" ? (
                <MessageSquare className="size-8" />
              ) : (
                <Archive className="size-8" />
              )
            }
            title={`No ${view.toLowerCase()} chats`}
            description={
              view === "FRIEND"
                ? "Go to the matchmaking radar to find new people!"
                : "You have no archived conversations."
            }
          />
        )}

        {!isLoading &&
          connections.length > 0 &&
          filteredConnections.length === 0 && (
            <div className="py-8 text-center px-4">
              <p className="text-sm text-muted-foreground">
                No conversations found matching "{searchQuery}"
              </p>
            </div>
          )}

        {filteredConnections.map((conn: ConnectionItem) => {
          const unreadCount = unreadMap?.[conn.connectionId] || 0;
          const isActiveChat = activeConnectionId === conn.connectionId;

          return (
            <div
              key={conn.connectionId}
              className={cn(
                "relative flex items-center gap-2 p-1.5 rounded-xl transition-all duration-200 active:scale-[0.98] group",
                isActiveChat ? "bg-accent" : "hover:bg-muted/50",
              )}
            >
              <Link
                href={`/home/chat/${conn.connectionId}`}
                className="flex items-center gap-3 flex-1 overflow-hidden p-1.5 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    avatarUrl={conn.avatarUrl}
                    username={conn.username}
                    className={cn(
                      "size-12 transition-all duration-300",
                      !conn.isActive && "grayscale opacity-50 border-dashed"
                    )}
                  />
                </div>
                <div className="flex-1 overflow-hidden flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm truncate transition-colors",
                        !conn.isActive 
                          ? "italic text-muted-foreground/70"
                          : unreadCount > 0
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground",
                        isActiveChat && conn.isActive && "text-foreground font-semibold",
                      )}
                    >
                      {conn.username}
                    </p>
                    {!conn.isActive && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-muted/80 text-muted-foreground shrink-0 border border-border/40">
                        Deactivated
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0 pr-1">
                {unreadCount > 0 && (
                  <Badge className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      aria-label="Chat options"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                      onClick={() => setConnectionToDelete(conn)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {hasNextPage && !searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all duration-200"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader inline className="mr-2 size-3" />}
            Load more
          </Button>
        )}
      </div>

      <Dialog
        open={!!connectionToDelete}
        onOpenChange={(isOpen) => !isOpen && setConnectionToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription className="mt-2 text-balance">
              Are you sure you want to delete your chat with{" "}
              <span className="font-semibold text-foreground">
                {connectionToDelete?.username}
              </span>
              ? This action will remove them from your active chats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setConnectionToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (connectionToDelete) deleteChat(connectionToDelete.connectionId);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader
                  inline
                  className="mr-2 size-4 text-destructive-foreground"
                />
              ) : (
                <Trash2 className="size-4 mr-2" />
              )}
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NewChatPanel
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
}

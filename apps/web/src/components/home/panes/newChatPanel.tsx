"use client";

import { UserAvatar } from "@/components/shared/userAvatar";
import { api } from "@/lib/axios";
import { ConnectionItem } from "@/types/models";
import { Button } from "@matcha/ui/components/button";
import { EmptyState } from "@matcha/ui/components/emptyState";
import { Input } from "@matcha/ui/components/input";
import { Loader } from "@matcha/ui/components/loader";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatPanel({ isOpen, onClose }: NewChatPanelProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["friendsList"],
      queryFn: async ({ pageParam }) => {
        const res = await api.get(
          `/users/me/friends?limit=20${pageParam ? `&cursor=${pageParam}` : ""}`,
        );
        return res.data;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: isOpen,
    });

  const friends = data?.pages.flatMap((page) => page.data) || [];
  const filteredFriends = friends.filter((friend: ConnectionItem) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectFriend = (connectionId: string) => {
    onClose();
    router.push(`/home/chat/${connectionId}`);
  };

  return (
    <motion.div
      initial={false}
      animate={{ x: isOpen ? "0%" : "-100%" }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      className="absolute inset-0 z-50 flex flex-col bg-background shadow-2xl"
    >
      <div className="flex flex-col gap-3 p-4 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 transition-all duration-200 active:scale-95 -ml-2"
            onClick={onClose}
            aria-label="Go back"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">New Chat</h2>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            aria-label="Search friends"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/30 border-transparent shadow-none focus-visible:border-primary h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 no-scrollbar bg-background">
        {isLoading && (
          <div className="flex justify-center mt-4">
            <Loader />
          </div>
        )}

        {!isLoading && friends.length === 0 && (
          <div className="my-auto">
            <EmptyState
              icon={<Users className="size-8" />}
              title="No connections yet"
              description="Head over to The Blend to meet new people."
            />
          </div>
        )}

        {!isLoading && friends.length > 0 && filteredFriends.length === 0 && (
          <div className="py-8 text-center px-4">
            <p className="text-sm text-muted-foreground">
              No friends found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {filteredFriends.map((friend: ConnectionItem) => (
          <button
            key={friend.connectionId}
            type="button"
            onClick={() => handleSelectFriend(friend.connectionId)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 text-left group active:scale-[0.98] cursor-pointer"
          >
            <UserAvatar
              avatarUrl={friend.avatarUrl}
              username={friend.username}
              className="size-12"
            />
            <div className="flex-1 overflow-hidden flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {friend.username}
              </h3>
            </div>
          </button>
        ))}

        {hasNextPage && !searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.98]"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader inline className="size-3 mr-1" />}
            Load more
          </Button>
        )}
      </div>
    </motion.div>
  );
}

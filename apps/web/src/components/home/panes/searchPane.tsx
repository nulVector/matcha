"use client";

import { api } from "@/lib/axios";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@matcha/ui/components/avatar";
import { Button } from "@matcha/ui/components/button";
import { EmptyState } from "@matcha/ui/components/emptyState";
import { Input } from "@matcha/ui/components/input";
import { Loader } from "@matcha/ui/components/loader";
import { useMutation } from "@tanstack/react-query";
import { Ghost, Search, UserSearch } from "lucide-react";
import { useState } from "react";
import { SearchProfileModal } from "./profileModals";

export function SearchPane() {
  const [searchInput, setSearchInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const {
    mutate: searchUser,
    data: searchResult,
    isPending: isSearching,
    error: searchError,
    reset: resetSearch,
  } = useMutation({
    mutationFn: async (username: string) => {
      const res = await api.get(`/users/search?username=${username}`);
      return res.data.data;
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 border-b border-border/50 pb-4 shrink-0">
        <h2 className="text-2xl font-semibold tracking-tight">Find Users</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchInput.length >= 5) searchUser(searchInput);
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Exact username..."
              aria-label="Search for an exact username"
              className="pl-9 bg-muted/30 border-transparent shadow-none focus-visible:border-primary h-9"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (searchResult || searchError) resetSearch();
              }}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <Button
            type="submit"
            variant="default"
            disabled={isSearching || searchInput.length < 5}
            className="h-9 px-4 w-25 transition-all"
          >
            {isSearching && <Loader inline className="size-4 mr-2" />}
            Search
          </Button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {!searchResult && !searchError && !isSearching && (
          <div className="m-auto">
            <EmptyState
              icon={<UserSearch className="size-8" />}
              title="Search for friends"
              description="Enter an exact username to find their profile."
            />
          </div>
        )}

        {searchError && (
          <div className="m-auto">
            <EmptyState
              icon={<Ghost className="size-8 text-destructive/50" />}
              title="No user found"
              description="They might not exist, or they have turned off discoverability."
            />
          </div>
        )}

        {searchResult && !searchError && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`View ${searchResult.username}'s profile`}
            className="flex items-center gap-4 p-3 border rounded-xl hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 w-full text-left"
          >
            <Avatar className="size-12 shadow-sm border border-border/50">
              <AvatarImage
                src={searchResult.avatarUrl}
                alt={`${searchResult.username}'s avatar`}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {(searchResult.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-medium text-foreground">
              {searchResult.username}
            </h3>
          </button>
        )}
      </div>

      <SearchProfileModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        username={searchResult?.username}
      />
    </div>
  );
}

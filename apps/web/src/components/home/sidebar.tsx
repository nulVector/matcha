"use client";

import { api } from "@/lib/axios";
import { SidebarTab, useAppStore } from "@/store/useAppStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@matcha/ui/components/tooltip";
import { cn } from "@matcha/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Radar,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnimatedMatchaIcon } from "../shared/animatedMatchaIcon";

interface NavButtonProps {
  tab: SidebarTab;
  icon: LucideIcon;
  label: string;
  hasNotification?: boolean;
  isActive: boolean;
  onClick: () => void;
}

const NavButton = ({
  tab,
  icon: Icon,
  label,
  hasNotification,
  isActive,
  onClick,
}: NavButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "relative flex size-12 items-center justify-center rounded-xl transition-colors duration-200 outline-none active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50 z-0",
            isActive
              ? "text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-tab"
              className="absolute inset-0 bg-muted shadow-sm rounded-xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            />
          )}

          <span className="sr-only">{label}</span>
          <Icon
            className="size-6 relative z-10"
            strokeWidth={isActive ? 2.5 : 2}
            aria-hidden="true"
          />

          {hasNotification && (
            <span className="absolute right-2.5 top-2.5 flex size-2.5 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2.5 bg-destructive border-2 border-background"></span>
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="hidden lg:block">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/home" || pathname.includes("/home/match")) {
      setActiveTab("chat");
    }
  }, [pathname, setActiveTab]);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data.data;
    },
  });
  const hasPendingRequests = notifications?.has_new_requests;

  return (
    <div className="flex h-full w-16 lg:w-20 shrink-0 flex-col items-center justify-between border-r border-border/50 bg-background py-6 z-20">
      <div className="flex flex-col items-center gap-4 w-full">
        <button
          type="button"
          onClick={() => {
            setActiveTab("chat");
            router.push("/home");
          }}
          className="flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50 rounded-xl"
          aria-label="Return to Home"
        >
          <AnimatedMatchaIcon className="size-11 text-primary" />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => router.push("/home/match")}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl transition-all duration-200 outline-none active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                pathname.includes("/home/match")
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="sr-only">The Blend</span>
              <Radar
                className="size-6"
                strokeWidth={pathname.includes("/home/match") ? 2.5 : 2}
                aria-hidden="true"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="hidden lg:block"
          >
            <p>The Blend</p>
          </TooltipContent>
        </Tooltip>
        <div
          className="w-10 h-0.5 rounded-full bg-border/80 shrink-0"
          aria-hidden="true"
        />

        <NavButton
          tab="chat"
          label="Messages"
          icon={MessageSquare}
          isActive={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        />
        <NavButton
          tab="search"
          label="Search"
          icon={Plus}
          isActive={activeTab === "search"}
          onClick={() => setActiveTab("search")}
        />
        <NavButton
          tab="requests"
          label="Requests"
          icon={Users}
          hasNotification={hasPendingRequests}
          isActive={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
        />
      </div>
      <div className="flex flex-col gap-4">
        <NavButton
          tab="settings"
          label="My Profile"
          icon={User}
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </div>
    </div>
  );
}

"use client";

import { useAppStore, SidebarTab } from "@/store/useAppStore";
import { MessageSquare, Plus, Users, User, Radar, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@matcha/ui/components/tooltip";
import { cn } from "@matcha/ui/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query"; 
import { api } from "@/lib/axios"; 
import { useEffect } from "react";
import { MatchaIcon } from "@/components/shared/icons";

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/home" && !activeTab) {
      setActiveTab("chat");
    }
  }, [pathname, activeTab, setActiveTab]);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications"); 
      return res.data.data;
    },
  });
  const hasPendingRequests = notifications?.has_new_requests;

  const NavButton = ({ 
    tab, 
    icon: Icon, 
    label, 
    hasNotification 
  }: { 
    tab: SidebarTab; 
    icon: LucideIcon; 
    label: string;
    hasNotification?: boolean; 
  }) => {
    const isActive = activeTab === tab && !pathname.includes("/home/match");
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              setActiveTab(tab);
            }}
            className={cn(
              "relative flex size-12 items-center justify-center rounded-xl transition-all duration-200 outline-none active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50", 
              isActive 
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span className="sr-only">{label}</span>
            <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
            
            {hasNotification && (
              <span className="absolute right-2.5 top-2.5 flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-destructive border-2 border-background"></span>
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="hidden md:block">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex h-full w-16 md:w-20 shrink-0 flex-col items-center justify-between border-r border-border/50 bg-background py-6 z-20">
      
      <div className="flex flex-col items-center gap-4 w-full">
        <button
          type="button"
          onClick={() => {
            setActiveTab("chat");
            router.push("/home");
          }}
          className="mb-4 flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50 rounded-xl"
          aria-label="Return to Home"
        >
          <MatchaIcon className="size-10 text-primary" /> 
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => router.push("/home/match")}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl transition-all duration-200 mb-2 outline-none active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                pathname.includes("/home/match")
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <span className="sr-only">Matchmaking</span>
              <Radar className="size-6" strokeWidth={pathname.includes("/home/match") ? 2.5 : 2} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="hidden md:block">
            <p>Matchmaking</p>
          </TooltipContent>
        </Tooltip>
        <NavButton tab="chat" label="Messages" icon={MessageSquare} />
        <NavButton tab="search" label="Search" icon={Plus} />
        <NavButton tab="requests" label="Requests" icon={Users} hasNotification={hasPendingRequests} />
      </div>
      <div className="flex flex-col gap-4">
        <NavButton tab="settings" label="Settings" icon={User} />
      </div>
    </div>
  );
}
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@matcha/ui/lib/utils";
import { ChatPane } from "./panes/chatPane";
import { SearchPane } from "./panes/searchPane";
import { RequestsPane } from "./panes/requestsPane";
import { SettingsPane } from "./panes/settingsPane";

export function MiddlePane({ className }: { className?: string }) {
  const { activeTab } = useAppStore();

  return (
    <aside 
      aria-label="Application Menu"
      className={cn(
        "flex h-full flex-col border-r border-border/50 bg-background shrink-0 overflow-hidden", 
        className
      )}
    >
      <div 
        key={activeTab} 
        className="flex h-full w-full flex-col animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
      >
        {activeTab === "chat" && <ChatPane />}
        {activeTab === "search" && <SearchPane />}
        {activeTab === "requests" && <RequestsPane />}
        {activeTab === "settings" && <SettingsPane />}
      </div>
    </aside>
  );
}
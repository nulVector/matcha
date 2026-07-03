import { useAppStore } from "@/store/useAppStore";
import { cn } from "@matcha/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChatPane } from "./panes/chatPane";
import { RequestsPane } from "./panes/requestsPane";
import { SearchPane } from "./panes/searchPane";
import { SettingsPane } from "./panes/settingsPane";

export function MiddlePane({ className }: { className?: string }) {
  const { activeTab } = useAppStore();

  return (
    <aside
      aria-label="Application Menu"
      className={cn(
        "flex h-full flex-col border-r border-border/50 bg-background shrink-0 overflow-hidden",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex h-full w-full flex-col"
        >
          {activeTab === "chat" && <ChatPane />}
          {activeTab === "search" && <SearchPane />}
          {activeTab === "requests" && <RequestsPane />}
          {activeTab === "settings" && <SettingsPane />}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

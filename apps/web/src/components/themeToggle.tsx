"use client";

import { Button } from "@matcha/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@matcha/ui/components/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import * as React from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === "/") {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <div className="fixed top-5.5 right-4 z-100">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg bg-background/80 backdrop-blur-md border-border/50 opacity-50"
          disabled
        >
          <span className="sr-only">Loading theme</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-5.5 lg:top-4 right-4 z-100">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={
              "relative rounded-full shadow-lg bg-background/80 backdrop-blur-md border-border/50 hover:bg-accent transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 extend-touch-target"
            }
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? "dark" : "light"}
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {isDark ? (
                  <Moon className="size-[1.2rem] text-foreground" />
                ) : (
                  <Sun className="size-[1.2rem] text-foreground" />
                )}
              </motion.div>
            </AnimatePresence>

            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10} className="hidden lg:block">
          <p className="text-xs font-medium flex items-center">
            Toggle theme
            <kbd className="ml-2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase font-mono text-foreground shadow-sm">
              Shift+D
            </kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

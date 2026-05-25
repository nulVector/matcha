"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@matcha/ui/components/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@matcha/ui/components/tooltip"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <div className="fixed top-4 right-4 z-100">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className={
              "rounded-full shadow-lg bg-background/80 backdrop-blur-md border-border/50 hover:bg-accent transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            }
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-slate-200" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>
          <p className="text-xs font-medium flex items-center">
            Toggle theme 
            <kbd className="ml-2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase font-mono text-foreground shadow-sm">
              Shift+D
            </kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
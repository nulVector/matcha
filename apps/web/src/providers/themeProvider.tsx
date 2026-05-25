"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
  if (target.closest('[role="textbox"]')) return true;
  return false;
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()
  
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "d") return;
      if (isTypingTarget(event.target)) return;
      
      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])
  
  return null
}

export { ThemeProvider }

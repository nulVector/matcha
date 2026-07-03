"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "./input"
import { cn } from "../lib/utils"

function PasswordInput({ 
  className, 
  disabled,
  ...props 
}: React.ComponentProps<"input">) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="relative" data-slot="password-input-wrapper">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowPassword((prev) => !prev)}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-all duration-200",
          "hover:text-foreground active:scale-95 cursor-pointer extend-touch-target",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        aria-pressed={showPassword}
      >
        {showPassword ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only">
          {showPassword ? "Hide password" : "Show password"}
        </span>
      </button>
    </div>
  )
}

export { PasswordInput }
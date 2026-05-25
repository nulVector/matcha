"use client"

import * as React from "react"
import TextareaAutosize, { TextareaAutosizeProps } from "react-textarea-autosize"
import { cn } from "@matcha/ui/lib/utils"

function Textarea({ 
  className, 
  ref, 
  ...props 
}: TextareaAutosizeProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <TextareaAutosize
      data-slot="textarea"
      ref={ref}
      className={cn(
        "flex min-h-16 w-full resize-none leading-relaxed rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30",
        "transition-all duration-200 hover:border-muted-foreground/50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
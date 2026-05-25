"use client";

import * as React from "react";
import { cn } from "../lib/utils";

interface Option<T> {
  label: React.ReactNode;
  value: T;
}

interface SegmentedControlProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T>({ 
  options, 
  value, 
  onChange, 
  disabled,
  className 
}: SegmentedControlProps<T>) {
  return (
    <div 
      role="group"
      className={cn("flex w-full rounded-md border bg-muted/30 p-1", disabled && "opacity-50 pointer-events-none", className)}
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        
        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isSelected
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
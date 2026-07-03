"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";

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
  const layoutId = React.useId(); 

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
              "relative flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 z-0",
              isSelected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={`segment-pill-${layoutId}`}
                className="absolute inset-0 bg-background shadow-sm rounded-sm -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 block">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
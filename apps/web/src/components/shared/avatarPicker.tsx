"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@matcha/ui/components/avatar";
import { Button } from "@matcha/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@matcha/ui/components/popover";
import { cn } from "@matcha/ui/lib/utils";
import { ChevronDown, UserSquare2 } from "lucide-react";

interface AvatarPickerProps {
  value: string;
  onChange: (url: string) => void;
  avatars: { id: string; url: string }[];
}

export function AvatarPicker({ value, onChange, avatars }: AvatarPickerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 p-1.5 transition-colors hover:border-primary/50">
        <Avatar className="size-20 shadow-sm">
          <AvatarImage src={value} alt="Selected profile avatar" />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <UserSquare2 className="size-8 opacity-50" />
          </AvatarFallback>
        </Avatar>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-48 justify-between bg-background shadow-xs hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] [&[data-state=open]>svg]:rotate-180"
          >
            <span className="truncate">
              {value ? "Change avatar" : "Select an avatar"}
            </span>
            <ChevronDown className="size-4 opacity-50 shrink-0 transition-transform duration-200" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="center" sideOffset={8}>
          <div
            role="radiogroup"
            aria-label="Choose an avatar"
            className="grid grid-cols-4 gap-4 max-h-60 overflow-y-auto no-scrollbar p-5"
          >
            {avatars.map((av, index) => {
              const isSelected = value === av.url;

              return (
                <button
                  key={av.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Select avatar ${index + 1}`}
                  onClick={() => onChange(av.url)}
                  className={cn(
                    "relative flex items-center justify-center rounded-full transition-all duration-200 outline-none active:scale-[0.98]",
                    "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:z-10",
                    isSelected
                      ? "ring-[3px] ring-primary ring-offset-2 ring-offset-background z-10"
                      : "hover:ring-[3px] hover:ring-primary/40 hover:ring-offset-2 hover:ring-offset-background hover:scale-105 hover:z-10",
                  )}
                >
                  <Avatar className="size-full aspect-square">
                    <AvatarImage
                      src={av.url}
                      alt={`Avatar option ${index + 1}`}
                    />
                    <AvatarFallback className="text-[10px]">AV</AvatarFallback>
                  </Avatar>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

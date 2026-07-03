"use client";

import { Button } from "@matcha/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@matcha/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@matcha/ui/components/popover";
import { cn } from "@matcha/ui/lib/utils";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";

interface LocationComboBoxProps {
  value: string;
  onChange: (name: string, lat: number, lng: number) => void;
  locations: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }[];
}

export function LocationComboBox({
  value,
  onChange,
  locations,
}: LocationComboBoxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal shadow-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            !value && "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="size-4 opacity-50 shrink-0" />
            <span className="truncate">{value || "Select a city"}</span>
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search city..." className="h-9" />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto p-1 no-scrollbar">
              {locations.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.name}
                  onSelect={() => {
                    onChange(loc.name, loc.latitude, loc.longitude);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-75"
                >
                  <Check
                    className={cn(
                      "mr-1 size-4 text-primary transition-opacity duration-200",
                      value === loc.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {loc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

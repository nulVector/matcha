"use client";

import { InterestMetadata } from "@/types/models";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@matcha/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@matcha/ui/components/dialog";
import { cn } from "@matcha/ui/lib/utils";
import { ChevronDown, GripHorizontal, X } from "lucide-react";
import { useMemo } from "react";

interface InterestManagerProps {
  value: string[];
  onChange: (interests: string[]) => void;
  metadataInterests: InterestMetadata[];
}

function SortableInterestBadge({
  id,
  onRemove,
  isInvalid,
}: {
  id: string;
  onRemove: () => void;
  isInvalid: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium transition-colors select-none",
        isInvalid
          ? "border-transparent bg-destructive/10 text-destructive"
          : "border-transparent bg-secondary text-secondary-foreground",
        isDragging &&
          "opacity-80 scale-105 border-primary border-dashed bg-background shadow-sm",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1.5 mr-1 hover:bg-foreground/10 rounded-sm transition-colors"
        aria-label={`Drag to reorder ${id}`}
      >
        <GripHorizontal className="size-3.5 opacity-50" />
      </div>
      {id}
      <button
        type="button"
        aria-label={`Remove ${id}`}
        className="rounded-full hover:bg-foreground/10 p-1 ml-1.5 transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="size-3 opacity-70 hover:opacity-100" />
      </button>
    </div>
  );
}

export function InterestManager({
  value,
  onChange,
  metadataInterests,
}: InterestManagerProps) {
  const selectedCount = value.length;
  const isInterestValid = selectedCount >= 3 && selectedCount <= 10;
  const needed = Math.max(0, 3 - selectedCount);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categorizedInterests = useMemo(() => {
    return metadataInterests.reduce(
      (acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category]!.push(item);
        return acc;
      },
      {} as Record<string, InterestMetadata[]>,
    );
  }, [metadataInterests]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(active.id as string);
      const newIndex = value.indexOf(over.id as string);
      onChange(arrayMove(value, oldIndex, newIndex));
    }
  }

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between font-normal shadow-xs transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selectedCount === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : "Select interests (min 3)"}
            </span>
            <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg max-h-[75vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle>What are you into?</DialogTitle>
            <DialogDescription
              className={cn(
                "text-sm font-medium transition-colors duration-200 mt-1",
                !isInterestValid
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {!isInterestValid
                ? selectedCount < 3
                  ? `Please select at least ${needed} more.`
                  : "Maximum 10 interests allowed."
                : `Great! ${selectedCount}/10 selected.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-2">
            {Object.entries(categorizedInterests).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => {
                    const isSelected = value.includes(item.name);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={isSelected}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          isSelected
                            ? "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                            : "border-border bg-background text-foreground hover:bg-muted",
                        )}
                        onClick={() => {
                          if (isSelected)
                            onChange(value.filter((i) => i !== item.name));
                          else if (value.length < 10)
                            onChange([...value, item.name]);
                        }}
                      >
                        <span className="mr-2 text-base leading-none">
                          {item.emoji}
                        </span>
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {!isInterestValid && selectedCount > 0 && (
        <div className="text-xs font-medium text-destructive mt-1 px-1 animate-in fade-in duration-200">
          {selectedCount < 3
            ? `Please select at least ${needed} more.`
            : "You can only select up to 10 interests."}
        </div>
      )}

      {selectedCount > 0 && (
        <div
          className={cn(
            "space-y-3 p-4 rounded-xl border transition-colors duration-200",
            !isInterestValid
              ? "border-destructive/30 bg-destructive/5"
              : "bg-muted/30",
          )}
        >
          <p
            className={cn(
              "text-xs flex items-center gap-1.5 font-medium transition-colors duration-200",
              !isInterestValid ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <GripHorizontal className="size-3.5 opacity-70" /> Drag to rank
            priority
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={value} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {value.map((interestName) => (
                  <SortableInterestBadge
                    key={interestName}
                    id={interestName}
                    isInvalid={!isInterestValid}
                    onRemove={() =>
                      onChange(value.filter((i) => i !== interestName))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

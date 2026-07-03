"use client";

import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import { cn } from "@matcha/ui/lib/utils";

interface OnboardingProgressProps {
  step: 1 | 2 | 3;
}

interface OnboardingHeaderProps {
  title: string;
  description: string;
}

interface OnboardingNavProps {
  onNext?: () => void;
  onBack?: () => void;
  isSubmit?: boolean;
  isPending?: boolean;
  backText?: string;
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  return (
    <div className="mb-5 flex h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-muted/50">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-500 ease-in-out",
          step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full",
        )}
      />
    </div>
  );
}

export function OnboardingHeader({
  title,
  description,
}: OnboardingHeaderProps) {
  return (
    <div className="text-center lg:text-left">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground text-balance">
        {description}
      </p>
    </div>
  );
}

export function OnboardingNav({
  onNext,
  onBack,
  isSubmit = false,
  isPending = false,
  backText,
}: OnboardingNavProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <Button
        type={isSubmit ? "submit" : "button"}
        className="w-full h-10"
        onClick={isSubmit ? undefined : onNext}
        disabled={isPending}
      >
        {isPending && <Loader inline className="mr-1 size-4" />}
        {isSubmit ? "Complete Setup" : "Continue"}
      </Button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm py-1 disabled:opacity-50"
        >
          &larr; {backText || "Back"}
        </button>
      )}
    </div>
  );
}

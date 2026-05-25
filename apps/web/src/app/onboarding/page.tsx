import React from "react";
import { OnboardingForm } from "@/components/onboarding/onboardingForm";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center overflow-x-hidden bg-muted/20 p-4 sm:p-8 bg-pattern">
      <div 
        className="flex w-full max-w-240 flex-col md:flex-row overflow-hidden rounded-2xl bg-background shadow-xl border h-[600px] animate-in fade-in zoom-in-95 duration-500 ease-out" 
      >
        <div 
          className="hidden w-1/2 border-r border-border/50 md:block h-full opacity-90 bg-pattern-onboarding" 
        />
        <div className="flex w-full md:w-1/2 flex-col p-6 lg:p-8 relative">
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
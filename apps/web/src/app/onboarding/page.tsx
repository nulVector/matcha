import { OnboardingForm } from "@/components/onboarding/onboardingForm";
import type { Metadata } from "next";
import Image from "next/image";
import bgImage from "./../../../public/background.jpeg";

export const metadata: Metadata = {
  title: "Complete Profile",
};

export default function OnboardingPage() {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden p-4 sm:p-8">
      <Image
        src={bgImage}
        alt="Matcha background"
        fill
        sizes="100vw"
        className="object-cover object-center -z-10"
        priority
        placeholder="blur"
      />
      <div className="flex w-full max-w-140 flex-col overflow-hidden rounded-2xl bg-background shadow-2xl border h-150 animate-in fade-in zoom-in-95 duration-500 ease-out">
        <div className="flex w-full h-full flex-col p-6 sm:p-8 relative">
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}

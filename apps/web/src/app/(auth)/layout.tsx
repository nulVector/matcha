import { MagneticEye } from "@/components/shared/magneticEye";
import Image from "next/image";
import React from "react";
import bgImage from "./../../../public/background.jpeg";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden bg-background">
      <div className="hidden lg:block lg:w-3/5 relative border-r border-border/50 overflow-hidden">
        <Image
          src={bgImage}
          alt="Authentication background"
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
          placeholder="blur"
        />
        <div className="absolute bottom-0 left-0 z-10">
          <MagneticEye className="size-125 -translate-x-8.75 translate-y-8.75" />
        </div>
      </div>
      <div className="flex w-full lg:w-2/5 items-center justify-center p-6 sm:p-8 xl:p-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {children}
        </div>
      </div>
    </div>
  );
}

import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden bg-background" >
      <div className="hidden lg:block lg:w-3/5 bg-pattern-auth border-r border-border/50" />
      <div className="flex w-full lg:w-2/5 items-center justify-center p-6 sm:p-8 xl:p-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out" >
          {children}
        </div>
      </div>
    </div>
  );
}
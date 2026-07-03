"use client";

import { GoogleIcon } from "@/components/shared/icons";
import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import { Separator } from "@matcha/ui/components/separator";
import Link from "next/link";
import { useState } from "react";

interface AuthHeaderProps {
  title: string;
  description: string;
}

interface AuthSuccessProps {
  message?: string | null;
}

interface AuthFooterLinkProps {
  text: string;
  linkText: string;
  href: string;
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground text-balance">
        {description}
      </p>
    </div>
  );
}

export function AuthSuccess({ message }: AuthSuccessProps) {
  if (!message) return null;

  return (
    <div className="rounded-md bg-emerald-500/10 p-3 border border-emerald-500/20 text-center animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        {message}
      </p>
    </div>
  );
}

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20 text-center animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
      {message}
    </div>
  );
}

export function OAuthSection() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="space-y-4">
      <div className="relative flex items-center gap-3 py-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Or continue with
        </span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full bg-background text-foreground hover:bg-muted"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader inline className="mr-1 size-4" />
        ) : (
          <GoogleIcon className="mr-1 size-4" />
        )}
        Google
      </Button>
    </div>
  );
}

export function AuthFooterLink({ text, linkText, href }: AuthFooterLinkProps) {
  return (
    <div className="text-center text-sm text-muted-foreground pt-4">
      {text}{" "}
      <Link
        href={href}
        className="font-medium text-primary hover:underline underline-offset-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"
      >
        {linkText}
      </Link>
    </div>
  );
}

"use client";

import { useMe } from "@/hooks/queries/useMe";
import { Loader } from "@matcha/ui/components/loader";
import { AxiosError } from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute =
    pathname.startsWith("/home") || pathname.startsWith("/onboarding");

  const { data, error, isLoading } = useMe({
    enabled: isProtectedRoute,
    retry: false,
  });

  const isMissingProfile =
    error && (error as AxiosError).response?.status === 403;
  const isUnauthorized =
    error && (error as AxiosError).response?.status === 401;
  const hasProfile = !!data && !error;

  useEffect(() => {
    if (!isLoading && isProtectedRoute) {
      if (isMissingProfile && pathname !== "/onboarding") {
        router.push("/onboarding");
      } else if (hasProfile && pathname === "/onboarding") {
        router.push("/home");
      }
    }
  }, [
    isLoading,
    isProtectedRoute,
    isMissingProfile,
    hasProfile,
    pathname,
    router,
  ]);

  if (isProtectedRoute) {
    if (isLoading) return <Loader fullScreen />;
    if (isMissingProfile && pathname !== "/onboarding")
      return <Loader fullScreen />;
    if (hasProfile && pathname === "/onboarding") return <Loader fullScreen />;
    if (isUnauthorized) return <Loader fullScreen />;
  }

  return children;
}

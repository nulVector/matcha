"use client";

import { useMe } from "@/hooks/queries/useMe";
import { Loader } from "@matcha/ui/components/loader";
import { AxiosError } from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute =
    pathname.startsWith("/home") || pathname.startsWith("/onboarding");
  const [hasInitialCheck, setHasInitialCheck] = useState(false);
  
  const { data, error, isLoading } = useMe({
    enabled: isProtectedRoute,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setHasInitialCheck(true);
    }
  }, [isLoading]);
  
  useEffect(() => {
    if (!isLoading && isProtectedRoute) {
      const isMissingProfile = error && (error as AxiosError).response?.status === 403;
      const hasProfile = !!data && !error;
      if (isMissingProfile && pathname !== "/onboarding") {
        router.push("/onboarding");
      } else if (hasProfile && pathname === "/onboarding") {
        router.push("/home");
      }
    }
  }, [data, error, isLoading, pathname, router, isProtectedRoute]);

  if (!hasInitialCheck && isLoading && isProtectedRoute) {
    return <Loader fullScreen />;
  }

  return <>{children}</>;
}
// providers/authProvider.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/axios';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute = pathname.startsWith('/home') || pathname.startsWith('/onboarding');

  const { data, error, isFetching } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
    enabled: isProtectedRoute, 
  });

  useEffect(() => {
    if (!isFetching && isProtectedRoute) {
      const isMissingProfile = error && (error as any).response?.status === 403;
      const hasProfile = data?.success;
      if (isMissingProfile && pathname !== '/onboarding') {
        router.push('/onboarding');
      }
      if (hasProfile && pathname === '/onboarding') {
        router.push('/home');
      }
    }
  }, [data, error, isFetching, pathname, router, isProtectedRoute]);

  if (isFetching && isProtectedRoute) {
    //TODO - add loader
    return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
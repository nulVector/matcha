import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

interface UseMeOptions {
  enabled?: boolean;
  retry?: boolean | number;
}

export function useMe(options?: UseMeOptions) {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data?.data ?? null;
    },
    enabled: options?.enabled ?? true,
    retry: options?.retry, 
    staleTime: 1000 * 60 * 5, 
  });
}
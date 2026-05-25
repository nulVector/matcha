import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export function useUser(username?: string, isEnabled: boolean = true) {
  return useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}`);
      return res.data.data;
    },
    enabled: !!username && isEnabled, 
    staleTime: 1000 * 60 * 5, 
  });
}
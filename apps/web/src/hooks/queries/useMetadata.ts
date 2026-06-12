import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Metadata } from "@/types/models";

interface MetadataResponse {
  success: boolean;
  data: Metadata;
}

export function useMetadata() {
  return useQuery({
    queryKey: ["metadata"],
    queryFn: async () => {
      const { data } = await api.get<MetadataResponse>("/users/get-metadata");
      return data.data;
    },
    staleTime: Infinity,
  });
}
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface LocationMetadata {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface InterestMetadata {
  id: string;
  name: string;
  category: string;
  emoji: string;
}

export interface AvatarMetadata {
  id: string;
  url: string;
}

interface MetadataResponse {
  success: boolean;
  data: {
    locations: LocationMetadata[];
    interests: InterestMetadata[];
    avatars: AvatarMetadata[];
  };
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
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface HealthStatus {
  status: string;
  database?: string;
  timestamp: string;
  version: string;
  service: string;
}

export const healthKeys = {
  all: ["health"] as const,
};

/**
 * Hook to check API service health status
 */
export function useHealth() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: () => apiClient.get<HealthStatus>("/api/health"),
    staleTime: 30_000,
    retry: 1,
  });
}

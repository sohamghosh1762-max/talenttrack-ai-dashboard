import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface ApplicationQueryFilters {
  jobId?: string;
  stage?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const applicationKeys = {
  all: ["applications"] as const,
  lists: () => [...applicationKeys.all, "list"] as const,
  list: (filters: ApplicationQueryFilters) => [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, "detail"] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
};

/**
 * Standard TanStack Query pattern for Applications API (Phase 6 Foundation)
 */
export function useApplications(
  filters: ApplicationQueryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () =>
      apiClient.get<unknown>("/api/applications", {
        params: filters as Record<string, string | number>,
      }),
    enabled: options.enabled ?? false,
    staleTime: 60_000,
  });
}

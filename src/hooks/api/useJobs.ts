import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface JobQueryFilters {
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: JobQueryFilters) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

/**
 * Standard TanStack Query pattern for Jobs API (Phase 4 Foundation)
 */
export function useJobs(filters: JobQueryFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: () =>
      apiClient.get<unknown>("/api/jobs", { params: filters as Record<string, string | number> }),
    enabled: options.enabled ?? false, // Default false until Phase 4 live API implementation
    staleTime: 60_000,
  });
}

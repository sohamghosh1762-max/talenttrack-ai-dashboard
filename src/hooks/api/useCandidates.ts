import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface CandidateQueryFilters {
  search?: string;
  status?: string;
  stage?: string;
  page?: number;
  limit?: number;
}

export const candidateKeys = {
  all: ["candidates"] as const,
  lists: () => [...candidateKeys.all, "list"] as const,
  list: (filters: CandidateQueryFilters) => [...candidateKeys.lists(), filters] as const,
  details: () => [...candidateKeys.all, "detail"] as const,
  detail: (id: string) => [...candidateKeys.details(), id] as const,
};

/**
 * Standard TanStack Query pattern for Candidates API (Phase 4 Foundation)
 */
export function useCandidates(
  filters: CandidateQueryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: candidateKeys.list(filters),
    queryFn: () =>
      apiClient.get<unknown>("/api/candidates", {
        params: filters as Record<string, string | number>,
      }),
    enabled: options.enabled ?? false,
    staleTime: 60_000,
  });
}

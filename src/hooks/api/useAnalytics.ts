import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type { RecruiterAnalyticsResponse } from "../../server/types/application-types.ts";

export interface AnalyticsQueryFilters {
  range?: "7d" | "30d" | "90d" | "all" | string | undefined;
  jobId?: string | undefined;
}

export const analyticsKeys = {
  all: ["analytics"] as const,
  recruiter: (filters: AnalyticsQueryFilters = {}) =>
    [...analyticsKeys.all, "recruiter", filters] as const,
};

/**
 * Hook to retrieve real recruiter dashboard KPIs and metrics computed from MongoDB
 */
export function useRecruiterAnalytics(
  filters: AnalyticsQueryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<RecruiterAnalyticsResponse>({
    queryKey: analyticsKeys.recruiter(filters),
    queryFn: async () => {
      const res = await apiClient.get<RecruiterAnalyticsResponse>("/api/recruiter/analytics", {
        params: filters as Record<string, string | number>,
      });
      return res;
    },
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

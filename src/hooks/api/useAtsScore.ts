import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type { AtsScoreResponse } from "../../server/types/ats-types.ts";

export const atsKeys = {
  all: ["applicant", "ats-score"] as const,
};

/**
 * TanStack Query hook to fetch the applicant's current ATS resume score & analysis
 */
export function useAtsScore(options: { enabled?: boolean } = {}) {
  return useQuery<AtsScoreResponse>({
    queryKey: atsKeys.all,
    queryFn: async () => {
      const res = await apiClient.get<AtsScoreResponse>("/api/applicant/ats-score");
      return res;
    },
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
  });
}

/**
 * TanStack Mutation hook to trigger re-analysis of applicant's resume
 */
export function useAnalyzeAtsScore() {
  const queryClient = useQueryClient();

  return useMutation<AtsScoreResponse, Error>({
    mutationFn: async () => {
      const res = await apiClient.post<AtsScoreResponse>("/api/applicant/ats-score/analyze");
      return res;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(atsKeys.all, data);
      queryClient.invalidateQueries({ queryKey: atsKeys.all });
    },
  });
}

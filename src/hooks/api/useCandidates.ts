import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface CandidateItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  phone?: string;
  skills: string[];
  experience: string;
  initials: string;
  score: number;
  job: string;
  jobId?: string;
  status: string;
  currentStage: string;
  appliedDate: string;
  resumeId?: string;
  createdAt: string;
}

export interface CandidatesResponse {
  candidates: CandidateItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CandidateQueryFilters {
  search?: string | undefined;
  skill?: string | undefined;
  location?: string | undefined;
  status?: string | undefined;
  stage?: string | undefined;
  jobId?: string | undefined;
  minScore?: number | undefined;
  maxScore?: number | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export const candidateKeys = {
  all: ["candidates"] as const,
  lists: () => [...candidateKeys.all, "list"] as const,
  list: (filters: CandidateQueryFilters) => [...candidateKeys.lists(), filters] as const,
  details: () => [...candidateKeys.all, "detail"] as const,
  detail: (id: string) => [...candidateKeys.details(), id] as const,
};

/**
 * TanStack Query hook for Candidates API
 */
export function useCandidates(
  filters: CandidateQueryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<CandidatesResponse>({
    queryKey: candidateKeys.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<CandidatesResponse>("/api/candidates", {
        params: filters as Record<string, string | number>,
      });
      return res;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * TanStack Query hook for Single Candidate Details API
 */
export function useCandidate(id: string | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<any>({
    queryKey: candidateKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Candidate ID is required");
      return apiClient.get<any>(`/api/candidates/${id}`);
    },
    enabled: Boolean(id) && (options.enabled ?? true),
    staleTime: 30_000,
  });
}

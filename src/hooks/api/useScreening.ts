import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RankedCandidatesResponse,
  JobMatchExplanation,
  SemanticSearchResponse,
  ApplicantJobRecommendationsResponse,
} from "@/server/types/screening-types";

interface RankedFilters {
  minScore?: number | undefined;
  search?: string | undefined;
  stage?: string | undefined;
}

/**
 * Fetch ranked candidate pool evaluated against a specific job opening
 */
export function useRankedCandidates(jobId?: string, filters: RankedFilters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.minScore !== undefined) queryParams.set("minScore", String(filters.minScore));
  if (filters.search) queryParams.set("search", filters.search);
  if (filters.stage) queryParams.set("stage", filters.stage);

  const queryString = queryParams.toString();
  const url = `/api/screening/jobs/${jobId}/candidates/ranked${queryString ? `?${queryString}` : ""}`;

  return useQuery<RankedCandidatesResponse>({
    queryKey: ["screening-ranked", jobId, filters],
    queryFn: async () => {
      if (!jobId) throw new Error("jobId is required");
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load ranked candidates");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(jobId),
  });
}

/**
 * Fetch deep explainability breakdown for a specific candidate against a job
 */
export function useCandidateExplanation(jobId?: string, candidateId?: string) {
  return useQuery<{
    jobId: string;
    jobTitle: string;
    candidateId: string;
    candidateName: string;
    explanation: JobMatchExplanation;
  }>({
    queryKey: ["screening-explanation", jobId, candidateId],
    queryFn: async () => {
      if (!jobId || !candidateId) throw new Error("jobId and candidateId are required");
      const res = await fetch(`/api/screening/jobs/${jobId}/candidates/${candidateId}/explanation`);
      if (!res.ok) {
        throw new Error("Failed to load candidate match explanation");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(jobId && candidateId),
  });
}

/**
 * Natural language semantic candidate search
 */
export function useSemanticCandidateSearch(query: string) {
  return useQuery<SemanticSearchResponse>({
    queryKey: ["screening-semantic-search", query],
    queryFn: async () => {
      const res = await fetch(`/api/screening/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        throw new Error("Failed to execute semantic candidate search");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(query.trim().length >= 2),
  });
}

/**
 * Applicant resume recommendations for a target job
 */
export function useApplicantJobRecommendations(jobId?: string) {
  return useQuery<ApplicantJobRecommendationsResponse>({
    queryKey: ["screening-recommendations", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("jobId is required");
      const res = await fetch(`/api/screening/jobs/${jobId}/recommendations`);
      if (!res.ok) {
        throw new Error("Failed to load resume recommendations");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(jobId),
  });
}

/**
 * Recruiter human review override mutation
 */
export function useRecordHumanReviewOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      decision,
      notes,
    }: {
      applicationId: string;
      decision: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/screening/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, decision, notes }),
      });
      if (!res.ok) {
        throw new Error("Failed to record human review override");
      }
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["screening-ranked"] });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

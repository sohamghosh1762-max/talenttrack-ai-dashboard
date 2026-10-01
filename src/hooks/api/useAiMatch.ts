import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface CandidateAiMatchResult {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: string;
  educationMatch: string;
  projectRelevance: string;
  explanation: string;
  confidence: number;
  analyzedAt: string;
}

export function useAiMatch() {
  const queryClient = useQueryClient();

  return useMutation<CandidateAiMatchResult, Error, string>({
    mutationFn: async (applicationId: string) => {
      return apiClient.post<CandidateAiMatchResult>(`/api/recruiter/applications/${applicationId}/ai-match`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter", "dashboard"] });
    },
  });
}

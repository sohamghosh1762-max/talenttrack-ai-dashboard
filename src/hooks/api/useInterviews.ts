import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface RecruiterInterview {
  id: string;
  jobId?: string;
  applicantId?: string;
  candidateName: string;
  candidateEmail?: string;
  candidateInitials?: string;
  jobRole: string;
  stage: string;
  interviewer: string;
  dateTime: string;
  interviewType?: string;
  meetingLink: string;
  location?: string;
  notes?: string;
  feedbackNotes?: string;
  score?: number;
  status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled" | "Pending Feedback";
}

export const interviewKeys = {
  all: ["interviews"] as const,
  lists: () => [...interviewKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...interviewKeys.lists(), filters] as const,
};

export function useInterviews(filters: { search?: string; status?: string } = {}, options: { enabled?: boolean } = {}) {
  return useQuery<RecruiterInterview[]>({
    queryKey: interviewKeys.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<RecruiterInterview[]>("/api/recruiter/interviews", {
        params: filters as Record<string, string>,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation<RecruiterInterview, Error, Partial<RecruiterInterview>>({
    mutationFn: async (payload) => {
      return apiClient.post<RecruiterInterview>("/api/recruiter/interviews", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ["recruiter", "dashboard"] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation<RecruiterInterview, Error, { id: string; data: Partial<RecruiterInterview> }>({
    mutationFn: async ({ id, data }) => {
      return apiClient.patch<RecruiterInterview>(`/api/recruiter/interviews/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ["recruiter", "dashboard"] });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: async (id) => {
      return apiClient.delete<{ deleted: boolean }>(`/api/recruiter/interviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ["recruiter", "dashboard"] });
    },
  });
}

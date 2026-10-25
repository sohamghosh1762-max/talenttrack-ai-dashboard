import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  IInterview,
  CreateInterviewInput,
  UpdateInterviewInput,
  InterviewQueryParams,
  InterviewStatus,
} from "../../server/types/interview-types.ts";

export const interviewKeys = {
  all: ["interviews"] as const,
  my: (status?: string) => [...interviewKeys.all, "my", { status: status || "ALL" }] as const,
  lists: () => [...interviewKeys.all, "list"] as const,
  list: (params?: InterviewQueryParams) => [...interviewKeys.lists(), params ?? {}] as const,
  details: () => [...interviewKeys.all, "detail"] as const,
  detail: (id: string) => [...interviewKeys.details(), id] as const,
};

/**
 * Hook to retrieve scheduled interviews for the authenticated applicant
 */
export function useMyInterviews(
  options: { status?: InterviewStatus | "ALL" | undefined; enabled?: boolean } = {},
) {
  return useQuery<IInterview[]>({
    queryKey: interviewKeys.my(options.status),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (options.status && options.status !== "ALL") {
        params["status"] = options.status;
      }
      const res = await apiClient.get<IInterview[]>("/api/interviews/my", { params });
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  });
}

/**
 * Hook to retrieve scheduled interviews (Recruiter / Hiring Manager / Admin)
 */
export function useInterviews(params?: InterviewQueryParams, options: { enabled?: boolean } = {}) {
  return useQuery<IInterview[]>({
    queryKey: interviewKeys.list(params),
    queryFn: async () => {
      const res = await apiClient.get<IInterview[]>("/api/interviews", {
        params: (params || {}) as Record<string, string | number>,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  });
}

/**
 * Hook to retrieve a single interview by ID
 */
export function useInterview(id: string | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<IInterview>({
    queryKey: interviewKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Interview ID is required");
      return apiClient.get<IInterview>(`/api/interviews/${id}`);
    },
    enabled: Boolean(id) && (options.enabled ?? true),
    staleTime: 15_000,
  });
}

/**
 * Hook to schedule a new interview (Recruiter / Hiring Manager / Admin)
 */
export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation<IInterview, Error, CreateInterviewInput>({
    mutationFn: async (input) => {
      return apiClient.post<IInterview>("/api/interviews", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.all });
    },
  });
}

/**
 * Hook to update an interview (Recruiter / Hiring Manager / Admin)
 */
export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation<IInterview, Error, { id: string; data: UpdateInterviewInput }>({
    mutationFn: async ({ id, data }) => {
      return apiClient.patch<IInterview>(`/api/interviews/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: interviewKeys.all });
    },
  });
}

/**
 * Hook to delete / cancel an interview
 */
export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: boolean; id: string }, Error, string>({
    mutationFn: async (id) => {
      return apiClient.delete<{ deleted: boolean; id: string }>(`/api/interviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.all });
    },
  });
}

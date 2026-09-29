import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  IApplication,
  CreateApplicationInput,
  UpdateApplicationStatusInput,
} from "../../server/types/application-types.ts";

export interface ApplicationQueryFilters {
  jobId?: string | undefined;
  stage?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export const applicationKeys = {
  all: ["applications"] as const,
  lists: () => [...applicationKeys.all, "list"] as const,
  list: (filters: ApplicationQueryFilters) => [...applicationKeys.lists(), filters] as const,
  my: () => [...applicationKeys.all, "my"] as const,
  recruiter: (filters: ApplicationQueryFilters) => [...applicationKeys.all, "recruiter", filters] as const,
  details: () => [...applicationKeys.all, "detail"] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
};

/**
 * Hook to get personal submitted applications for the authenticated applicant
 */
export function useMyApplications(options: { enabled?: boolean } = {}) {
  return useQuery<IApplication[]>({
    queryKey: applicationKeys.my(),
    queryFn: async () => {
      const res = await apiClient.get<IApplication[]>("/api/applications/my");
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * Hook to get applications for jobs owned by the authenticated recruiter
 */
export function useRecruiterApplications(
  filters: ApplicationQueryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<IApplication[]>({
    queryKey: applicationKeys.recruiter(filters),
    queryFn: async () => {
      const res = await apiClient.get<IApplication[]>("/api/recruiter/applications", {
        params: filters as Record<string, string | number>,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * General TanStack Query hook for Applications API
 */
export function useApplications(
  filters: ApplicationQueryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<IApplication[]>({
    queryKey: applicationKeys.list(filters),
    queryFn: async () => {
      const res = await apiClient.get<IApplication[]>("/api/applications", {
        params: filters as Record<string, string | number>,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * TanStack Query hook to get single application by ID
 */
export function useApplication(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<IApplication>({
    queryKey: applicationKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Application ID is required");
      const res = await apiClient.get<{ application: IApplication } | IApplication>(`/api/applications/${id}`);
      if (res && "application" in res) {
        return res.application;
      }
      return res as IApplication;
    },
    enabled: !!id && (options.enabled ?? true),
    staleTime: 60_000,
  });
}

/**
 * TanStack Mutation hook to submit a new job application
 */
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation<
    IApplication,
    Error,
    { jobId: string; resumeId?: string | undefined; coverLetter?: string | undefined; notes?: string | undefined }
  >({
    mutationFn: async (payload) => {
      const res = await apiClient.post<
        { application: IApplication; id: string } | IApplication
      >("/api/applications", payload);

      if (res && "application" in res) {
        return res.application;
      }
      return res as IApplication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/**
 * TanStack Mutation hook to update candidate application status
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    IApplication,
    Error,
    { id: string; status: string; currentStage?: string; aiScore?: number; notes?: string }
  >({
    mutationFn: async ({ id, ...payload }) => {
      const res = await apiClient.patch<{ application: IApplication } | IApplication>(
        `/api/applications/${id}`,
        payload,
      );
      if (res && "application" in res) {
        return res.application;
      }
      return res as IApplication;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.id) });
    },
  });
}

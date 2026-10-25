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
  recruiter: (filters: ApplicationQueryFilters) =>
    [...applicationKeys.all, "recruiter", filters] as const,
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
      const res = await apiClient.get<{ application: IApplication } | IApplication>(
        `/api/applications/${id}`,
      );
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
    {
      jobId: string;
      resumeId?: string | undefined;
      coverLetter?: string | undefined;
      notes?: string | undefined;
    }
  >({
    mutationFn: async (payload) => {
      const res = await apiClient.post<{ application: IApplication; id: string } | IApplication>(
        "/api/applications",
        payload,
      );

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

/**
 * TanStack Mutation hook to update candidate application pipeline stage
 * Sends PATCH /api/recruiter/applications/:id/stage
 * Updates MongoDB and synchronizes React Query cache
 */
export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();

  return useMutation<
    IApplication,
    Error,
    { applicationId?: string; id?: string; stage: string; reason?: string }
  >({
    mutationFn: async ({ applicationId, id, stage, reason }) => {
      const targetId = applicationId || id;
      if (!targetId) throw new Error("Application ID is required");

      const res = await apiClient.patch<
        { application: IApplication; stage: string; status: string } | IApplication
      >(`/api/recruiter/applications/${targetId}/stage`, { stage, reason });

      if (res && "application" in res) {
        return res.application;
      }
      return res as IApplication;
    },
    onSuccess: (data, variables) => {
      const targetId = variables.applicationId || variables.id || data?.id;
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(targetId) });
      }
    },
  });
}

/**
 * TanStack Mutation hook to add a persistent internal recruiter note to an application
 */
export function useAddApplicationNote() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { applicationId: string; text: string; isInternal?: boolean }>({
    mutationFn: async ({ applicationId, text, isInternal = true }) => {
      return await apiClient.post(`/api/applications/${applicationId}/notes`, {
        text,
        isInternal,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.applicationId) });
    },
  });
}

/**
 * TanStack Mutation hook to add structured recruiter/interview feedback to an application
 */
export function useAddApplicationFeedback() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      applicationId: string;
      stage?: string;
      overallRecommendation: "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO";
      rating: number;
      strengths?: string[];
      concerns?: string[];
      notes: string;
    }
  >({
    mutationFn: async ({ applicationId, ...payload }) => {
      return await apiClient.post(`/api/applications/${applicationId}/feedback`, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.applicationId) });
    },
  });
}

/**
 * TanStack Mutation hook for batch operations on applications (bulk stage change, notes, export)
 */
export function useBulkApplicationAction() {
  const queryClient = useQueryClient();

  return useMutation<
    {
      action: string;
      totalRequested: number;
      successCount: number;
      failureCount: number;
      results: any[];
    },
    Error,
    {
      action: "UPDATE_STAGE" | "ADD_NOTE" | "ARCHIVE";
      applicationIds: string[];
      stage?: string;
      note?: string;
      reason?: string;
    }
  >({
    mutationFn: async (payload) => {
      return await apiClient.post<{
        action: string;
        totalRequested: number;
        successCount: number;
        failureCount: number;
        results: any[];
      }>("/api/recruiter/applications/bulk", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

/**
 * Utility to trigger CSV download of candidates / applications with formula-injection protection
 */
export async function downloadCandidatesCsv(
  params: Record<string, string | number | undefined> = {},
) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      query.set(k, String(v));
    }
  }

  // Retrieve auth token for download
  let token = "";
  if (typeof window !== "undefined") {
    try {
      const raw =
        localStorage.getItem("talenttrack_applicant_auth_session_v1") ||
        sessionStorage.getItem("talenttrack_applicant_auth_session_v1") ||
        localStorage.getItem("talenttrack_legacy_auth_session_v1") ||
        sessionStorage.getItem("talenttrack_legacy_auth_session_v1") ||
        localStorage.getItem("talenttrack_auth_session_v1") ||
        sessionStorage.getItem("talenttrack_auth_session_v1") ||
        localStorage.getItem("talenttrack_auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) token = parsed.token;
      }
    } catch {
      // ignore
    }
  }

  const url = `/api/recruiter/export/candidates?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `talenttrack-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

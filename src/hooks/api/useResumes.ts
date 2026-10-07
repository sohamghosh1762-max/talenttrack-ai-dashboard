import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type { IResume, ResumePresignedUrlResponse } from "../../server/types/resume-types.ts";

export const resumeKeys = {
  all: ["resumes"] as const,
  details: () => [...resumeKeys.all, "detail"] as const,
  detail: (id: string) => [...resumeKeys.details(), id] as const,
  urls: () => [...resumeKeys.all, "url"] as const,
  url: (id: string) => [...resumeKeys.urls(), id] as const,
};

/**
 * TanStack Mutation hook to upload a resume file (PDF or DOCX)
 */
export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation<IResume, Error, File | FormData>({
    mutationFn: async (payload: File | FormData) => {
      let formData: FormData;

      if (payload instanceof FormData) {
        formData = payload;
      } else {
        formData = new FormData();
        formData.append("resume", payload);
      }

      const res = await apiClient.post<{ resume?: IResume } | IResume>("/api/resumes", formData);
      if (res && typeof res === "object" && "resume" in res && res.resume) {
        return res.resume as IResume;
      }
      return res as IResume;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      queryClient.invalidateQueries({ queryKey: ["applicant", "ats-score"] });
    },
  });
}

/**
 * TanStack Query hook to fetch resume metadata by ID
 */
export function useResume(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<IResume>({
    queryKey: resumeKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Resume ID is required");
      const res = await apiClient.get<{ resume: IResume } | IResume>(`/api/resumes/${id}`);
      if (res && "resume" in res) {
        return res.resume;
      }
      return res as IResume;
    },
    enabled: !!id && (options.enabled ?? true),
    staleTime: 60_000,
  });
}

/**
 * TanStack Query hook to get time-limited presigned S3 download URL
 */
export function useResumeDownloadUrl(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<ResumePresignedUrlResponse>({
    queryKey: resumeKeys.url(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Resume ID is required");
      const res = await apiClient.get<ResumePresignedUrlResponse>(`/api/resumes/${id}/download`);
      return res;
    },
    enabled: !!id && (options.enabled ?? true),
    staleTime: 5 * 60_000, // 5 minutes cache for 15-minute presigned URLs
  });
}

/**
 * TanStack Mutation hook to parse resume and extract structured profile via Gemini AI
 */
export function useParseResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const res = await apiClient.post<any>(`/api/resumes/${resumeId}/parse`);
      return res;
    },
    onSuccess: (_data, resumeId) => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      queryClient.invalidateQueries({ queryKey: resumeKeys.detail(resumeId) });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applicant", "ats-score"] });
    },
  });
}

/**
 * TanStack Mutation hook to delete a resume
 */
export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ deleted: boolean }>(`/api/resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      queryClient.invalidateQueries({ queryKey: ["applicant", "ats-score"] });
    },
  });
}


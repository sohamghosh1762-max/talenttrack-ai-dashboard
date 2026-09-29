import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  IJob,
  JobQueryParams,
  PaginatedJobsResponse,
  CreateJobInput,
  UpdateJobInput,
} from "../../server/types/job-types.ts";

export type { JobQueryParams } from "../../server/types/job-types.ts";

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: JobQueryParams) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

/**
 * TanStack Query hook to fetch paginated jobs list
 */
export function useJobs(filters: JobQueryParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery<PaginatedJobsResponse>({
    queryKey: jobKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined | null> = {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        status: filters.status,
        department: filters.department,
        location: filters.location,
        employmentType: filters.employmentType,
        recruiterId: filters.recruiterId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const res = await apiClient.get<PaginatedJobsResponse>("/api/jobs", { params });
      return res;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * TanStack Query hook to fetch single job details by ID
 */
export function useJob(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<IJob>({
    queryKey: jobKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Job ID is required");
      const res = await apiClient.get<{ job: IJob } | IJob>(`/api/jobs/${id}`);
      if (res && "job" in res) {
        return res.job;
      }
      return res as IJob;
    },
    enabled: !!id && (options.enabled ?? true),
    staleTime: 30_000,
  });
}

/**
 * TanStack Mutation hook to create a new job opening
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const res = await apiClient.post<{ job: IJob } | IJob>("/api/jobs", input);
      if (res && "job" in res) {
        return res.job;
      }
      return res as IJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

/**
 * TanStack Mutation hook to update an existing job opening
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateJobInput }) => {
      const res = await apiClient.patch<{ job: IJob } | IJob>(`/api/jobs/${id}`, data);
      if (res && "job" in res) {
        return res.job;
      }
      return res as IJob;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.id) });
    },
  });
}

/**
 * TanStack Mutation hook to soft-archive a job opening
 */
export function useArchiveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<{ job: IJob } | IJob>(`/api/jobs/${id}/archive`);
      if (res && "job" in res) {
        return res.job;
      }
      return res as IJob;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(id) });
    },
  });
}

/**
 * TanStack Mutation hook to delete a job opening
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ deleted: boolean }>(`/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

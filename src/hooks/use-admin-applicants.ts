import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchAdminApplicants,
  fetchAdminApplicantById,
  fetchAdminApplicantApplications,
  fetchAdminApplicantInterviews,
  fetchAdminApplicantConversations,
  fetchAdminApplicantNotifications,
  fetchAdminApplicantPreferences,
} from "@/lib/admin-api";
import type { AdminApplicantQueryParams } from "@/server/types/user-types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const adminApplicantsKeys = {
  all: ["admin", "applicants"] as const,
  list: (params: AdminApplicantQueryParams) => ["admin", "applicants", "list", params] as const,
  detail: (id: string) => ["admin", "applicants", "detail", id] as const,
  applications: (id: string, params?: Record<string, unknown>) =>
    ["admin", "applicants", "detail", id, "applications", params] as const,
  interviews: (id: string) => ["admin", "applicants", "detail", id, "interviews"] as const,
  conversations: (id: string) => ["admin", "applicants", "detail", id, "conversations"] as const,
  notifications: (id: string) => ["admin", "applicants", "detail", id, "notifications"] as const,
  preferences: (id: string) => ["admin", "applicants", "detail", id, "preferences"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Paginated & filtered applicant list hook
 */
export function useAdminApplicants(params: AdminApplicantQueryParams = {}) {
  return useQuery({
    queryKey: adminApplicantsKeys.list(params),
    queryFn: () => fetchAdminApplicants(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 2,
  });
}

/**
 * Single applicant detail hook (includes full profile, resumes, applications, interviews, conversations metadata, notifications, preferences)
 */
export function useAdminApplicant(id: string | null) {
  return useQuery({
    queryKey: adminApplicantsKeys.detail(id ?? ""),
    queryFn: () => fetchAdminApplicantById(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Applicant applications with resolved Job relationships hook
 */
export function useAdminApplicantApplications(
  id: string | null,
  params: {
    page?: number;
    limit?: number;
    status?: string;
    stage?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
  } = {},
) {
  return useQuery({
    queryKey: adminApplicantsKeys.applications(id ?? "", params),
    queryFn: () => fetchAdminApplicantApplications(id!, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Real interview records for applicant hook
 */
export function useAdminApplicantInterviews(id: string | null) {
  return useQuery({
    queryKey: adminApplicantsKeys.interviews(id ?? ""),
    queryFn: () => fetchAdminApplicantInterviews(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Messaging / Conversation metadata hook (read-only, no private message bodies)
 */
export function useAdminApplicantConversations(id: string | null) {
  return useQuery({
    queryKey: adminApplicantsKeys.conversations(id ?? ""),
    queryFn: () => fetchAdminApplicantConversations(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Applicant notifications hook (read-only, does not mark read)
 */
export function useAdminApplicantNotifications(id: string | null) {
  return useQuery({
    queryKey: adminApplicantsKeys.notifications(id ?? ""),
    queryFn: () => fetchAdminApplicantNotifications(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Applicant preferences hook (read-only)
 */
export function useAdminApplicantPreferences(id: string | null) {
  return useQuery({
    queryKey: adminApplicantsKeys.preferences(id ?? ""),
    queryFn: () => fetchAdminApplicantPreferences(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

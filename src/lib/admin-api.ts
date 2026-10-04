import { authStorage } from "@/auth/auth-storage";
import type {
  PaginatedUsersResponse,
  SafeUser,
  UserRole,
  UserStatus,
  BulkUpdateStatusResult,
  UserActivityItem,
  AdminApplicantQueryParams,
  AdminApplicantItem,
  PaginatedAdminApplicantsResponse,
} from "@/server/types/user-types";

// ─── Query Params ────────────────────────────────────────────────────────────

export interface AdminUsersQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  role?: UserRole | "" | undefined;
  status?: UserStatus | "" | undefined;
  emailVerified?: boolean | "" | undefined;
  sortBy?: "createdAt" | "name" | "email" | "role" | "status" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

export interface AdminUserDetailResponse {
  user: SafeUser;
}

export interface AdminUpdateStatusResponse {
  user: SafeUser;
  message: string;
}

export interface AdminUserActivityResponse {
  activity: UserActivityItem[];
}

export interface AdminApplicantDetailResponse {
  applicant: AdminApplicantItem;
  resumes: any[];
  applications: any[];
  interviews?: any[];
  conversations?: any[];
  notifications?: any[];
  preferences?: any;
}

export interface AdminApplicantInterviewsResponse {
  interviews: any[];
}

export interface AdminApplicantConversationsResponse {
  conversations: any[];
}

export interface AdminApplicantNotificationsResponse {
  notifications: any[];
}

export interface AdminApplicantPreferencesResponse {
  preferences: any;
}

// ─── Token Helper ─────────────────────────────────────────────────────────────

function getAuthToken(): string {
  const session = authStorage.getSession();
  if (!session?.token) {
    throw new Error("No active session. Please log in as an administrator.");
  }
  return session.token;
}

// ─── Fetch Wrapper ─────────────────────────────────────────────────────────────

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) errorMessage = body.error;
    } catch {
      // ignore JSON parse errors on error responses
    }

    if (res.status === 401) {
      authStorage.clearSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("talenttrack:auth-session-expired"));
      }
      errorMessage = "Your administrative session has expired. Please sign in again.";
    } else if (res.status === 403) {
      errorMessage = errorMessage || "Access denied. Administrator privileges required.";
    }

    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Fetch a paginated, filtered user list.
 */
export async function fetchAdminUsers(
  params: AdminUsersQueryParams = {},
): Promise<PaginatedUsersResponse> {
  const qs = new URLSearchParams();

  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  if (params.status) qs.set("status", params.status);
  if (params.emailVerified !== "" && params.emailVerified != null) {
    qs.set("emailVerified", String(params.emailVerified));
  }
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);

  const query = qs.toString();
  return adminFetch<PaginatedUsersResponse>(`/api/admin/users${query ? `?${query}` : ""}`);
}

/**
 * GET /api/admin/users/:id
 * Fetch a single user's full safe profile.
 */
export async function fetchAdminUserById(id: string): Promise<AdminUserDetailResponse> {
  return adminFetch<AdminUserDetailResponse>(`/api/admin/users/${id}`);
}

/**
 * GET /api/admin/users/:id/activity
 * Fetch activity history log for a user.
 */
export async function fetchAdminUserActivity(id: string): Promise<AdminUserActivityResponse> {
  return adminFetch<AdminUserActivityResponse>(`/api/admin/users/${id}/activity`);
}

/**
 * PATCH /api/admin/users/:id/status
 * Update a user's account status.
 */
export async function updateAdminUserStatus(
  id: string,
  status: UserStatus,
): Promise<AdminUpdateStatusResponse> {
  return adminFetch<AdminUpdateStatusResponse>(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * PATCH /api/admin/users/bulk-status
 * Update multiple users' account statuses in a single request.
 */
export async function bulkUpdateAdminUserStatus(
  userIds: string[],
  status: UserStatus,
): Promise<BulkUpdateStatusResult> {
  return adminFetch<BulkUpdateStatusResult>(`/api/admin/users/bulk-status`, {
    method: "PATCH",
    body: JSON.stringify({ userIds, status }),
  });
}

/**
 * GET /api/admin/applicants
 * Fetch a paginated, filtered applicant list.
 */
export async function fetchAdminApplicants(
  params: AdminApplicantQueryParams = {},
): Promise<PaginatedAdminApplicantsResponse> {
  const qs = new URLSearchParams();

  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (typeof params.emailVerified === "boolean") {
    qs.set("emailVerified", String(params.emailVerified));
  }
  if (params.skills) qs.set("skills", params.skills);
  if (params.location) qs.set("location", params.location);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);

  const query = qs.toString();
  return adminFetch<PaginatedAdminApplicantsResponse>(
    `/api/admin/applicants${query ? `?${query}` : ""}`,
  );
}

/**
 * GET /api/admin/applicants/:id
 * Fetch a single applicant's full details, resumes, and applications.
 */
export async function fetchAdminApplicantById(id: string): Promise<AdminApplicantDetailResponse> {
  return adminFetch<AdminApplicantDetailResponse>(`/api/admin/applicants/${id}`);
}

export interface AdminApplicantApplicationsResponse {
  applications: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  applicant: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * GET /api/admin/applicants/:id/applications
 * Fetch an applicant's applications with resolved Job relationships and pagination.
 */
export async function fetchAdminApplicantApplications(
  applicantId: string,
  params: {
    page?: number;
    limit?: number;
    status?: string;
    stage?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
  } = {},
): Promise<AdminApplicantApplicationsResponse> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.status) qs.set("status", params.status);
  if (params.stage) qs.set("stage", params.stage);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  if (params.search) qs.set("search", params.search);

  const query = qs.toString();
  return adminFetch<AdminApplicantApplicationsResponse>(
    `/api/admin/applicants/${applicantId}/applications${query ? `?${query}` : ""}`,
  );
}

/**
 * GET /api/admin/applicants/:id/interviews
 * Fetch real interview records for a specific applicant.
 */
export async function fetchAdminApplicantInterviews(
  applicantId: string,
): Promise<AdminApplicantInterviewsResponse> {
  return adminFetch<AdminApplicantInterviewsResponse>(
    `/api/admin/applicants/${applicantId}/interviews`,
  );
}

/**
 * GET /api/admin/applicants/:id/conversations
 * Fetch conversation metadata for a specific applicant.
 */
export async function fetchAdminApplicantConversations(
  applicantId: string,
): Promise<AdminApplicantConversationsResponse> {
  return adminFetch<AdminApplicantConversationsResponse>(
    `/api/admin/applicants/${applicantId}/conversations`,
  );
}

/**
 * GET /api/admin/applicants/:id/notifications
 * Fetch notifications for a specific applicant (read-only).
 */
export async function fetchAdminApplicantNotifications(
  applicantId: string,
): Promise<AdminApplicantNotificationsResponse> {
  return adminFetch<AdminApplicantNotificationsResponse>(
    `/api/admin/applicants/${applicantId}/notifications`,
  );
}

/**
 * GET /api/admin/applicants/:id/preferences
 * Fetch configured preferences for a specific applicant.
 */
export async function fetchAdminApplicantPreferences(
  applicantId: string,
): Promise<AdminApplicantPreferencesResponse> {
  return adminFetch<AdminApplicantPreferencesResponse>(
    `/api/admin/applicants/${applicantId}/preferences`,
  );
}

/**
 * GET /api/admin/dashboard
 * Fetch live DB-driven admin dashboard analytics and overview metrics.
 */
export async function fetchAdminDashboard(params: {
  range?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<any> {
  const qs = new URLSearchParams();
  if (params.range) qs.set("range", params.range);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);

  const query = qs.toString();
  return adminFetch<any>(`/api/admin/dashboard${query ? `?${query}` : ""}`);
}


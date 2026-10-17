import { authStorage } from "@/auth/auth-storage";
import type {
  PaginatedUsersResponse,
  SafeUser,
  UserRole,
  UserStatus,
  BulkUpdateStatusResult,
  UserActivityItem,
  CreateUserInput,
  UpdateUserInput,
  AdminApplicantQueryParams,
  AdminApplicantItem,
  PaginatedAdminApplicantsResponse,
} from "@/server/types/user-types";
import type {
  IOrganization,
  IDepartment,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  AssignMemberInput,
  OrganizationQueryParams,
  PaginatedOrganizationsResponse,
} from "@/server/types/organization-types";
import type {
  AuditLogQueryParams,
  PaginatedAuditLogsResponse,
} from "@/server/services/audit-service";

// ─── Query Params ────────────────────────────────────────────────────────────

export interface AdminUsersQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  role?: UserRole | "" | undefined;
  status?: UserStatus | "" | undefined;
  organizationId?: string | undefined;
  departmentId?: string | undefined;
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
export async function fetchAdminDashboard(
  params: {
    range?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<any> {
  const qs = new URLSearchParams();
  if (params.range) qs.set("range", params.range);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);

  const query = qs.toString();
  return adminFetch<any>(`/api/admin/dashboard${query ? `?${query}` : ""}`);
}

// ─── User Mutations ──────────────────────────────────────────────────────────

/**
 * POST /api/admin/users
 */
export async function createAdminUser(
  data: CreateUserInput,
): Promise<{ user: SafeUser; message: string }> {
  return adminFetch<{ user: SafeUser; message: string }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PATCH /api/admin/users/:id
 */
export async function updateAdminUser(
  id: string,
  data: UpdateUserInput,
): Promise<{ user: SafeUser; message: string }> {
  return adminFetch<{ user: SafeUser; message: string }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE /api/admin/users/:id
 */
export async function deleteAdminUser(id: string): Promise<{ success: boolean; message: string }> {
  return adminFetch<{ success: boolean; message: string }>(`/api/admin/users/${id}`, {
    method: "DELETE",
  });
}

// ─── Organizations & Departments API ─────────────────────────────────────────

/**
 * GET /api/admin/organizations
 */
export async function fetchAdminOrganizations(
  params: OrganizationQueryParams = {},
): Promise<PaginatedOrganizationsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.plan && params.plan !== "All") qs.set("plan", params.plan);
  if (params.status && params.status !== "All") qs.set("status", params.status);

  const query = qs.toString();
  return adminFetch<PaginatedOrganizationsResponse>(
    `/api/admin/organizations${query ? `?${query}` : ""}`,
  );
}

/**
 * GET /api/admin/organizations/:id
 */
export async function fetchAdminOrganizationById(
  id: string,
): Promise<{ organization: IOrganization; departments: IDepartment[] }> {
  return adminFetch<{ organization: IOrganization; departments: IDepartment[] }>(
    `/api/admin/organizations/${id}`,
  );
}

/**
 * POST /api/admin/organizations
 */
export async function createAdminOrganization(
  data: CreateOrganizationInput,
): Promise<{ organization: IOrganization; message: string }> {
  return adminFetch<{ organization: IOrganization; message: string }>("/api/admin/organizations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PATCH /api/admin/organizations/:id
 */
export async function updateAdminOrganization(
  id: string,
  data: UpdateOrganizationInput,
): Promise<{ organization: IOrganization; message: string }> {
  return adminFetch<{ organization: IOrganization; message: string }>(
    `/api/admin/organizations/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

/**
 * DELETE /api/admin/organizations/:id
 */
export async function deleteAdminOrganization(id: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/api/admin/organizations/${id}`, {
    method: "DELETE",
  });
}

/**
 * GET /api/admin/organizations/:id/departments
 */
export async function fetchAdminDepartments(
  organizationId: string,
): Promise<{ departments: IDepartment[] }> {
  return adminFetch<{ departments: IDepartment[] }>(
    `/api/admin/organizations/${organizationId}/departments`,
  );
}

/**
 * POST /api/admin/organizations/:id/departments
 */
export async function createAdminDepartment(
  organizationId: string,
  data: CreateDepartmentInput,
): Promise<{ department: IDepartment; message: string }> {
  return adminFetch<{ department: IDepartment; message: string }>(
    `/api/admin/organizations/${organizationId}/departments`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

/**
 * PATCH /api/admin/departments/:id
 */
export async function updateAdminDepartment(
  departmentId: string,
  data: UpdateDepartmentInput,
): Promise<{ department: IDepartment; message: string }> {
  return adminFetch<{ department: IDepartment; message: string }>(
    `/api/admin/departments/${departmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

/**
 * DELETE /api/admin/departments/:id
 */
export async function deleteAdminDepartment(departmentId: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/api/admin/departments/${departmentId}`, {
    method: "DELETE",
  });
}

/**
 * POST /api/admin/organizations/:id/members
 */
export async function assignAdminOrganizationMember(
  organizationId: string,
  data: AssignMemberInput,
): Promise<{ success: boolean; message: string; organization: IOrganization }> {
  return adminFetch<{ success: boolean; message: string; organization: IOrganization }>(
    `/api/admin/organizations/${organizationId}/members`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

// ─── Audit Logs & Roles API ──────────────────────────────────────────────────

/**
 * GET /api/admin/audit-logs
 */
export async function fetchAdminAuditLogs(
  params: AuditLogQueryParams = {},
): Promise<PaginatedAuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.category && params.category !== "All") qs.set("category", params.category);
  if (params.action && params.action !== "All") qs.set("action", params.action);
  if (params.status && params.status !== "All") qs.set("status", params.status);
  if (params.organizationId) qs.set("organizationId", params.organizationId);

  const query = qs.toString();
  return adminFetch<PaginatedAuditLogsResponse>(`/api/admin/audit-logs${query ? `?${query}` : ""}`);
}

/**
 * GET /api/admin/roles
 */
export async function fetchAdminRoles(): Promise<{ roles: any[] }> {
  return adminFetch<{ roles: any[] }>("/api/admin/roles");
}

/**
 * GET /api/admin/permissions
 */
export async function fetchAdminPermissions(): Promise<{ permissions: any[] }> {
  return adminFetch<{ permissions: any[] }>("/api/admin/permissions");
}

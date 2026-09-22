export type UserRole = "ADMIN" | "RECRUITER" | "APPLICANT";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export interface RecruiterProfileInfo {
  companyName: string;
  jobTitle: string;
  department?: string | undefined;
}

export interface ApplicantProfileInfo {
  headline?: string | undefined;
  location?: string | undefined;
  phone?: string | undefined;
  skills?: string[] | undefined;
  experienceYears?: string | undefined;
  resumeFileName?: string | undefined;
}

export interface AdminProfileInfo {
  platformRole?: string | undefined;
  permissions?: string[] | undefined;
  lastLogin?: string | undefined;
}

export interface IUser {
  id: string; // 24-character hexadecimal MongoDB ObjectId
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive?: string | undefined;
  recruiterProfile?: RecruiterProfileInfo | undefined;
  applicantProfile?: ApplicantProfileInfo | undefined;
  adminProfile?: AdminProfileInfo | undefined;
}

export type SafeUser = Omit<IUser, "passwordHash">;

export interface UserQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  role?: UserRole | undefined;
  status?: UserStatus | undefined;
  emailVerified?: boolean | undefined;
  sortBy?: "createdAt" | "name" | "email" | "role" | "status" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface UserPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserSummaryStats {
  totalUsers: number;
  admins: number;
  recruiters: number;
  applicants: number;
  suspended: number;
  active: number;
  inactive: number;
  verified: number;
  unverified: number;
  newThisMonth: number;
}

export interface PaginatedUsersResponse {
  users: SafeUser[];
  pagination: UserPaginationInfo;
  summary: UserSummaryStats;
}

export interface UpdateUserStatusInput {
  status: UserStatus;
}

export interface BulkUpdateStatusInput {
  userIds: string[];
  status: UserStatus;
}

export interface BulkUpdateStatusResult {
  updatedCount: number;
  failedCount: number;
  failedUserIds: string[];
  message: string;
}

export interface UserActivityItem {
  id: string;
  action: string;
  targetId: string;
  performedBy: string;
  performedByRole: string;
  details?: Record<string, unknown> | undefined;
  timestamp: string;
}

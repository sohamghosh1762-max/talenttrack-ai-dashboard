export type UserRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "RECRUITER"
  | "HIRING_MANAGER"
  | "INTERVIEWER"
  | "APPLICANT"
  | "ADMIN"; // Legacy alias

export type UserStatus =
  "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "LOCKED" | "DEACTIVATED" | "INACTIVE"; // Legacy alias

export interface RecruiterProfileInfo {
  companyName: string;
  jobTitle: string;
  department?: string | undefined;
}

export interface ApplicantExperienceItem {
  id?: string | undefined;
  title: string;
  company: string;
  location?: string | undefined;
  period?: string | undefined;
  description?: string | undefined;
}

export interface ApplicantEducationItem {
  id?: string | undefined;
  degree: string;
  institution: string;
  period?: string | undefined;
  grade?: string | undefined;
}

export interface ApplicantCertificationItem {
  id?: string | undefined;
  name: string;
  issuer: string;
  year?: string | undefined;
}

export interface ApplicantProjectItem {
  id?: string | undefined;
  name: string;
  tech?: string | undefined;
  description?: string | undefined;
}

export interface ApplicantProfileInfo {
  headline?: string | undefined;
  location?: string | undefined;
  phone?: string | undefined;
  bio?: string | undefined;
  summary?: string | undefined;
  skills?: string[] | undefined;
  experienceYears?: string | undefined;
  resumeFileName?: string | undefined;
  resumeId?: string | undefined;
  firebaseUid?: string | undefined;
  experiences?: ApplicantExperienceItem[] | undefined;
  education?: ApplicantEducationItem[] | undefined;
  certifications?: ApplicantCertificationItem[] | undefined;
  projects?: ApplicantProjectItem[] | undefined;
}

export interface ApplicantProfileResponse {
  id: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  phone: string;
  bio: string;
  summary: string;
  skills: string[];
  experiences: ApplicantExperienceItem[];
  education: ApplicantEducationItem[];
  certifications: ApplicantCertificationItem[];
  projects: ApplicantProjectItem[];
  applicantProfile?: ApplicantProfileInfo | undefined;
  resume: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    parsingStatus: string;
    extractedSkillsCount: number;
    atsScore: number | null;
  } | null;
}

export interface UpdateApplicantProfileInput {
  name?: string | undefined;
  headline?: string | undefined;
  location?: string | undefined;
  phone?: string | undefined;
  bio?: string | undefined;
  summary?: string | undefined;
  skills?: string[] | undefined;
  experiences?: ApplicantExperienceItem[] | undefined;
  education?: ApplicantEducationItem[] | undefined;
  certifications?: ApplicantCertificationItem[] | undefined;
  projects?: ApplicantProjectItem[] | undefined;
}

export interface AdminProfileInfo {
  platformRole?: string | undefined;
  permissions?: string[] | undefined;
  lastLogin?: string | undefined;
}

export interface IUser {
  id: string; // 24-character hexadecimal MongoDB ObjectId
  name: string;
  email: string; // Normalized lowercase
  passwordHash: string; // Hashed password
  role: UserRole;
  status: UserStatus;
  firebaseUid?: string | undefined; // Firebase Authentication UID for Applicants
  emailVerified: boolean;
  emailVerifiedAt?: string | undefined;
  avatarUrl?: string | undefined;
  lastLoginAt?: string | undefined;
  failedLoginAttempts?: number | undefined;
  lockedUntil?: string | null | undefined;
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

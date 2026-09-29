export type CanonicalRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "RECRUITER"
  | "HIRING_MANAGER"
  | "INTERVIEWER"
  | "APPLICANT"
  | "ADMIN";

export type UserRole = CanonicalRole | "recruiter" | "applicant" | "admin";

export interface RecruiterProfile {
  companyName: string;
  jobTitle: string;
  department?: string | undefined;
}

export interface ApplicantProfile {
  headline?: string | undefined;
  location?: string | undefined;
  phone?: string | undefined;
  skills?: string[] | undefined;
  experienceYears?: string | undefined;
  resumeFileName?: string | undefined;
}

export interface AdminProfile {
  platformRole?: string | undefined;
  permissions?: string[] | undefined;
  lastLogin?: string | undefined;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string | undefined;
  emailVerified?: boolean | undefined;
  avatarUrl?: string | undefined;
  recruiterProfile?: RecruiterProfile | undefined;
  applicantProfile?: ApplicantProfile | undefined;
  adminProfile?: AdminProfile | undefined;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean | undefined;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string | undefined;
  role: UserRole;
  // Recruiter fields
  companyName?: string | undefined;
  jobTitle?: string | undefined;
  department?: string | undefined;
  // Applicant fields
  headline?: string | undefined;
  location?: string | undefined;
  phone?: string | undefined;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string | undefined;
  user?: User | undefined;
  token?: string | undefined;
}

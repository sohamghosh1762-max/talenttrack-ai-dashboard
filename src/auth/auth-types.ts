export type UserRole = "recruiter" | "applicant" | "admin";

export interface RecruiterProfile {
  companyName: string;
  jobTitle: string;
  department?: string;
}

export interface ApplicantProfile {
  headline?: string;
  location?: string;
  phone?: string;
  skills?: string[];
  experienceYears?: string;
  resumeFileName?: string;
}

export interface AdminProfile {
  platformRole?: string;
  permissions?: string[];
  lastLogin?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | undefined;
  recruiterProfile?: RecruiterProfile | undefined;
  applicantProfile?: ApplicantProfile | undefined;
  adminProfile?: AdminProfile | undefined;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: UserRole;
  // Recruiter fields
  companyName?: string;
  jobTitle?: string;
  // Applicant fields
  headline?: string;
  location?: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

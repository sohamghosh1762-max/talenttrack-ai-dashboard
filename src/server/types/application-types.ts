export type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN"
  | "Shortlisted"
  | "Under Review";

export type ApplicationStage =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationJobInfo {
  id: string;
  title: string;
  department?: string | undefined;
  location?: string | undefined;
  type?: string | undefined;
  company?: string | undefined;
  status?: string | undefined;
}

export interface ApplicationApplicantInfo {
  id: string;
  name: string;
  email: string;
  phone?: string | undefined;
  location?: string | undefined;
  skills?: string[] | undefined;
  initials?: string | undefined;
}

export interface ApplicationResumeInfo {
  id: string;
  originalFileName: string;
  mimeType?: string | undefined;
  fileSize?: number | undefined;
  uploadedAt?: string | undefined;
}

export interface IApplication {
  id: string; // 24-character hexadecimal MongoDB ObjectId
  jobId: string; // Ref to Job
  applicantId: string; // Ref to User / Applicant
  recruiterId: string; // Ref to User / Recruiter
  resumeId?: string | undefined;
  coverLetter?: string | undefined;
  status: ApplicationStatus;
  currentStage: ApplicationStage;
  aiScore?: number | undefined;
  notes?: string | undefined;
  appliedAt: string;
  updatedAt: string;
  jobTitle?: string | undefined;
  applicantName?: string | undefined;
  applicantEmail?: string | undefined;
  job?: ApplicationJobInfo | undefined;
  applicant?: ApplicationApplicantInfo | undefined;
  resume?: ApplicationResumeInfo | undefined;
}

export interface ApplicationQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  jobId?: string | undefined;
  applicantId?: string | undefined;
  recruiterId?: string | undefined;
  status?: ApplicationStatus | string | undefined;
  currentStage?: ApplicationStage | string | undefined;
  stage?: string | undefined;
  search?: string | undefined;
  sortBy?: ("appliedAt" | "aiScore" | "status") | string | undefined;
  sortOrder?: ("asc" | "desc") | string | undefined;
}

export interface PaginatedApplicationsResponse {
  applications: IApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateApplicationInput {
  jobId: string;
  applicantId: string;
  recruiterId?: string | undefined;
  resumeId?: string | undefined;
  coverLetter?: string | undefined;
  notes?: string | undefined;
}

export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
  currentStage?: ApplicationStage | undefined;
  aiScore?: number | undefined;
  notes?: string | undefined;
}

export type JobStatus =
  "DRAFT" | "PUBLISHED" | "ARCHIVED" | "CLOSED" | "Active" | "Paused" | "Closed";

export type EmploymentType =
  | "Full-Time"
  | "Part-Time"
  | "Contract"
  | "Remote"
  | "Internship"
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "REMOTE"
  | "INTERNSHIP";

export interface SalaryRange {
  min?: number | undefined;
  max?: number | undefined;
  currency?: string | undefined;
  isNegotiable?: boolean | undefined;
}

export interface IJob {
  id: string; // 24-character hexadecimal MongoDB ObjectId
  title: string;
  description: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  experienceRequired?: string | undefined;
  skills: string[];
  salaryRange?: SalaryRange | undefined;
  recruiterId: string; // Ref to User / Recruiter
  company?: string | undefined;
  companyName?: string | undefined;
  hiringManagerId?: string | undefined; // Ref to User / Hiring Manager
  hiringManagerIds?: string[] | undefined;
  status: JobStatus;
  applicationsCount?: number | undefined;
  deadline?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicantJobMatchResponse {
  jobId: string;
  hasResume: boolean;
  hasProfile: boolean;
  isAvailable: boolean;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: boolean | null;
  summary: string;
  tier?: string;
}

export interface JobQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  status?: JobStatus | undefined;
  department?: string | undefined;
  location?: string | undefined;
  employmentType?: (EmploymentType | string) | undefined;
  recruiterId?: string | undefined;
  hiringManagerId?: string | undefined;
  sortBy?: ("createdAt" | "title" | "department" | "applicationsCount") | undefined;
  sortOrder?: ("asc" | "desc") | undefined;
}

export interface PaginatedJobsResponse {
  jobs: IJob[];
  data: IJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateJobInput {
  title: string;
  description: string;
  department: string;
  location: string;
  employmentType?: EmploymentType | undefined;
  experienceRequired?: string | undefined;
  skills?: string[] | undefined;
  salaryRange?: SalaryRange | undefined;
  recruiterId: string;
  company?: string | undefined;
  companyName?: string | undefined;
  hiringManagerId?: string | undefined;
  hiringManagerIds?: string[] | undefined;
  status?: JobStatus | undefined;
  deadline?: string | undefined;
}

export interface UpdateJobInput {
  title?: string | undefined;
  description?: string | undefined;
  department?: string | undefined;
  location?: string | undefined;
  employmentType?: EmploymentType | undefined;
  experienceRequired?: string | undefined;
  skills?: string[] | undefined;
  salaryRange?: SalaryRange | undefined;
  company?: string | undefined;
  companyName?: string | undefined;
  hiringManagerId?: string | undefined;
  hiringManagerIds?: string[] | undefined;
  status?: JobStatus | undefined;
  deadline?: string | undefined;
}

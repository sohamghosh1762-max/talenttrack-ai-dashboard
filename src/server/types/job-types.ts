export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED"
  | "CLOSED"
  | "Active"
  | "Paused"
  | "Closed";

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
  education?: string | undefined;
  skills: string[];
  preferredSkills?: string[] | undefined;
  salaryRange?: SalaryRange | undefined;
  recruiterId: string; // Ref to User / Recruiter
  status: JobStatus;
  applicationsCount?: number | undefined;
  deadline?: string | undefined;
  createdAt: string;
  updatedAt: string;
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
  education?: string | undefined;
  skills?: string[] | undefined;
  preferredSkills?: string[] | undefined;
  salaryRange?: SalaryRange | undefined;
  recruiterId: string;
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
  education?: string | undefined;
  skills?: string[] | undefined;
  preferredSkills?: string[] | undefined;
  salaryRange?: SalaryRange | undefined;
  status?: JobStatus | undefined;
  deadline?: string | undefined;
}

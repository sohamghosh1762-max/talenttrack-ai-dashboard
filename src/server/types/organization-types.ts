export type OrganizationPlan = "Enterprise" | "Growth" | "Starter";

export type OrganizationStatus =
  | "Active"
  | "Pending Verification"
  | "Suspended"
  | "ACTIVE"
  | "PENDING"
  | "PENDING_VERIFICATION"
  | "SUSPENDED";

export interface OrganizationSettings {
  maxMembers?: number | undefined;
  allowedDomains?: string[] | undefined;
  requireTwoFactor?: boolean | undefined;
}

export interface IOrganization {
  id: string; // 24-char ObjectId or org-X
  name: string;
  domain: string;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  membersCount: number;
  departmentsCount: number;
  jobsCount: number;
  applicationsCount: number;
  description?: string | undefined;
  website?: string | undefined;
  departments?: IDepartment[] | undefined;
  settings?: OrganizationSettings | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface IDepartment {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | undefined;
  managerUserId?: string | undefined;
  managerName?: string | undefined;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  domain: string;
  description?: string | undefined;
  website?: string | undefined;
  plan?: OrganizationPlan | undefined;
  status?: OrganizationStatus | undefined;
  settings?: OrganizationSettings | undefined;
}

export interface UpdateOrganizationInput {
  name?: string | undefined;
  domain?: string | undefined;
  description?: string | undefined;
  website?: string | undefined;
  plan?: OrganizationPlan | undefined;
  status?: OrganizationStatus | undefined;
  settings?: OrganizationSettings | undefined;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string | undefined;
  managerUserId?: string | undefined;
  managerName?: string | undefined;
}

export interface UpdateDepartmentInput {
  name?: string | undefined;
  code?: string | undefined;
  description?: string | undefined;
  managerUserId?: string | undefined;
  managerName?: string | undefined;
}

export interface AssignMemberInput {
  userId: string;
  departmentId?: string | undefined;
  role?: string | undefined;
}

export interface OrganizationQueryParams {
  search?: string | undefined;
  plan?: string | undefined;
  status?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: "name" | "createdAt" | "membersCount" | "jobsCount" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface PaginatedOrganizationsResponse {
  organizations: IOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalOrganizations: number;
    activeOrganizations: number;
    pendingOrganizations: number;
    suspendedOrganizations: number;
    enterpriseCount: number;
    growthCount: number;
    starterCount: number;
  };
}

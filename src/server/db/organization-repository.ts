import { auditService } from "../services/audit-service.ts";
import { userRepository } from "./user-repository.ts";
import { Organization, Department } from "../models/index.ts";
import { isDatabaseConnected } from "./mongodb.ts";
import type {
  IOrganization,
  IDepartment,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  OrganizationQueryParams,
  PaginatedOrganizationsResponse,
  OrganizationStatus,
} from "../types/organization-types.ts";

export const DEFAULT_SEED_ORGANIZATIONS: IOrganization[] = [
  {
    id: "org-1",
    name: "TalentTrack Technologies Inc.",
    domain: "talenttrack.ai",
    plan: "Enterprise",
    status: "Active",
    membersCount: 18,
    departmentsCount: 4,
    jobsCount: 12,
    applicationsCount: 248,
    settings: {
      maxMembers: 100,
      allowedDomains: ["talenttrack.ai"],
      requireTwoFactor: true,
    },
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "org-2",
    name: "CloudScale Systems",
    domain: "cloudscale.io",
    plan: "Enterprise",
    status: "Active",
    membersCount: 32,
    departmentsCount: 5,
    jobsCount: 24,
    applicationsCount: 512,
    settings: {
      maxMembers: 200,
      allowedDomains: ["cloudscale.io"],
      requireTwoFactor: true,
    },
    createdAt: "2025-02-02T00:00:00.000Z",
    updatedAt: "2025-02-02T00:00:00.000Z",
  },
  {
    id: "org-3",
    name: "Nexus AI Labs",
    domain: "nexusai.tech",
    plan: "Growth",
    status: "Active",
    membersCount: 8,
    departmentsCount: 3,
    jobsCount: 6,
    applicationsCount: 94,
    settings: {
      maxMembers: 50,
      allowedDomains: ["nexusai.tech"],
      requireTwoFactor: false,
    },
    createdAt: "2025-03-10T00:00:00.000Z",
    updatedAt: "2025-03-10T00:00:00.000Z",
  },
  {
    id: "org-4",
    name: "Innovate Global Corp",
    domain: "innovateglobal.com",
    plan: "Growth",
    status: "Pending Verification",
    membersCount: 4,
    departmentsCount: 2,
    jobsCount: 2,
    applicationsCount: 16,
    settings: {
      maxMembers: 50,
      allowedDomains: ["innovateglobal.com"],
      requireTwoFactor: false,
    },
    createdAt: "2025-09-20T00:00:00.000Z",
    updatedAt: "2025-09-20T00:00:00.000Z",
  },
  {
    id: "org-5",
    name: "Apex HyperScale",
    domain: "apexscale.net",
    plan: "Starter",
    status: "Suspended",
    membersCount: 2,
    departmentsCount: 1,
    jobsCount: 0,
    applicationsCount: 3,
    settings: {
      maxMembers: 10,
      allowedDomains: ["apexscale.net"],
      requireTwoFactor: false,
    },
    createdAt: "2025-06-12T00:00:00.000Z",
    updatedAt: "2025-06-12T00:00:00.000Z",
  },
];

export const DEFAULT_SEED_DEPARTMENTS: IDepartment[] = [
  // Departments for TalentTrack Technologies (org-1)
  {
    id: "dept-1",
    organizationId: "org-1",
    name: "Engineering",
    code: "ENG",
    managerUserId: "65f1a2b3c4d5e6f7a8b9c020",
    managerName: "Sarah Chen",
    memberCount: 8,
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: "2025-01-16T00:00:00.000Z",
  },
  {
    id: "dept-2",
    organizationId: "org-1",
    name: "Product & Design",
    code: "PROD",
    memberCount: 4,
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: "2025-01-16T00:00:00.000Z",
  },
  {
    id: "dept-3",
    organizationId: "org-1",
    name: "Talent Acquisition",
    code: "TA",
    managerUserId: "65f1a2b3c4d5e6f7a8b9c010",
    managerName: "David Miller",
    memberCount: 4,
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: "2025-01-16T00:00:00.000Z",
  },
  {
    id: "dept-4",
    organizationId: "org-1",
    name: "Human Resources",
    code: "HR",
    memberCount: 2,
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: "2025-01-16T00:00:00.000Z",
  },

  // Departments for CloudScale Systems (org-2)
  {
    id: "dept-5",
    organizationId: "org-2",
    name: "Cloud Infrastructure",
    code: "CLOUD",
    memberCount: 14,
    createdAt: "2025-02-03T00:00:00.000Z",
    updatedAt: "2025-02-03T00:00:00.000Z",
  },
  {
    id: "dept-6",
    organizationId: "org-2",
    name: "DevOps & SRE",
    code: "DEVOPS",
    memberCount: 10,
    createdAt: "2025-02-03T00:00:00.000Z",
    updatedAt: "2025-02-03T00:00:00.000Z",
  },
  {
    id: "dept-7",
    organizationId: "org-2",
    name: "Recruitment",
    code: "REC",
    memberCount: 8,
    createdAt: "2025-02-03T00:00:00.000Z",
    updatedAt: "2025-02-03T00:00:00.000Z",
  },

  // Departments for Nexus AI Labs (org-3)
  {
    id: "dept-8",
    organizationId: "org-3",
    name: "Machine Learning Research",
    code: "MLR",
    memberCount: 5,
    createdAt: "2025-03-11T00:00:00.000Z",
    updatedAt: "2025-03-11T00:00:00.000Z",
  },
  {
    id: "dept-9",
    organizationId: "org-3",
    name: "AI Solutions",
    code: "AIS",
    memberCount: 3,
    createdAt: "2025-03-11T00:00:00.000Z",
    updatedAt: "2025-03-11T00:00:00.000Z",
  },
];

class OrganizationRepository {
  private organizations = new Map<string, IOrganization>();
  private departments = new Map<string, IDepartment>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    this.organizations.clear();
    for (const org of DEFAULT_SEED_ORGANIZATIONS) {
      this.organizations.set(org.id, { ...org });
    }

    this.departments.clear();
    for (const dept of DEFAULT_SEED_DEPARTMENTS) {
      this.departments.set(dept.id, { ...dept });
    }
  }

  public resetToDefault(): void {
    this.seed();
  }

  public resetToDefaults(): void {
    this.seed();
  }

  // ─── Organization Queries ──────────────────────────────────────────────────

  public findAll(params: OrganizationQueryParams = {}): PaginatedOrganizationsResponse {
    let orgs = Array.from(this.organizations.values());

    if (params.search && params.search.trim() !== "") {
      const q = params.search.toLowerCase().trim();
      orgs = orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.domain.toLowerCase().includes(q) ||
          o.plan.toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q),
      );
    }

    if (params.plan && params.plan !== "All") {
      orgs = orgs.filter((o) => o.plan.toLowerCase() === params.plan!.toLowerCase());
    }

    if (params.status && params.status !== "All") {
      orgs = orgs.filter((o) => o.status.toLowerCase() === params.status!.toLowerCase());
    }

    // Sort
    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";
    orgs.sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const total = orgs.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginated = orgs.slice((page - 1) * limit, page * limit);

    const all = Array.from(this.organizations.values());
    return {
      organizations: paginated,
      pagination: { page, limit, total, totalPages },
      summary: {
        totalOrganizations: all.length,
        activeOrganizations: all.filter((o) => o.status === "Active").length,
        pendingOrganizations: all.filter((o) => o.status === "Pending Verification").length,
        suspendedOrganizations: all.filter((o) => o.status === "Suspended").length,
        enterpriseCount: all.filter((o) => o.plan === "Enterprise").length,
        growthCount: all.filter((o) => o.plan === "Growth").length,
        starterCount: all.filter((o) => o.plan === "Starter").length,
      },
    };
  }

  public findById(id: string): IOrganization | null {
    const org = this.organizations.get(id);
    return org ? { ...org } : null;
  }

  public findByDomain(domain: string): IOrganization | null {
    const norm = domain.toLowerCase().trim();
    for (const org of this.organizations.values()) {
      if (org.domain.toLowerCase() === norm) return { ...org };
    }
    return null;
  }

  public findByName(name: string): IOrganization | null {
    const norm = name.toLowerCase().trim();
    for (const org of this.organizations.values()) {
      if (org.name.toLowerCase() === norm) return { ...org };
    }
    return null;
  }

  // ─── Organization Mutations ────────────────────────────────────────────────

  public create(input: CreateOrganizationInput, actorId: string): IOrganization {
    // 1. Validate required fields
    if (!input.name || input.name.trim().length < 2) {
      throw new Error("Organization name must be at least 2 characters long.");
    }
    if (!input.domain || !input.domain.includes(".")) {
      throw new Error("A valid corporate domain (e.g. company.com) is required.");
    }

    // 2. Validate uniqueness
    if (this.findByName(input.name.trim())) {
      throw new Error(`An organization with the name "${input.name.trim()}" already exists.`);
    }
    if (this.findByDomain(input.domain.trim())) {
      throw new Error(
        `The domain "${input.domain.trim().toLowerCase()}" is already registered to another organization.`,
      );
    }

    const id = `org-${Date.now().toString(36)}`;
    const newOrg: IOrganization = {
      id,
      name: input.name.trim(),
      domain: input.domain.trim().toLowerCase(),
      plan: input.plan || "Growth",
      status: input.status || "Active",
      membersCount: 0,
      departmentsCount: 0,
      jobsCount: 0,
      applicationsCount: 0,
      settings: input.settings || {
        maxMembers: 50,
        allowedDomains: [input.domain.trim().toLowerCase()],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.organizations.set(id, newOrg);

    if (isDatabaseConnected()) {
      Organization.create({
        name: newOrg.name,
        domain: newOrg.domain,
        plan: newOrg.plan,
        status: newOrg.status,
        description: input.description,
        website: input.website,
        settings: newOrg.settings,
        membersCount: newOrg.membersCount,
        departmentsCount: newOrg.departmentsCount,
        jobsCount: newOrg.jobsCount,
        applicationsCount: newOrg.applicationsCount,
      }).catch((err) =>
        console.warn("[OrganizationRepository] MongoDB organization write error:", err.message),
      );
    }

    // Audit log
    auditService.recordEvent({
      action: "ORGANIZATION_CREATED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "ORGANIZATION",
      targetName: newOrg.name,
      organizationId: id,
      organizationName: newOrg.name,
      details: `Created organization ${newOrg.name} (${newOrg.domain}) on ${newOrg.plan} plan`,
      status: "Success",
      metadata: { plan: newOrg.plan, domain: newOrg.domain },
    });

    return { ...newOrg };
  }

  public update(id: string, input: UpdateOrganizationInput, actorId: string): IOrganization {
    const org = this.organizations.get(id);
    if (!org) {
      throw new Error(`Organization with ID "${id}" not found.`);
    }

    // Check duplicate name
    if (input.name && input.name.trim() !== org.name) {
      const existing = this.findByName(input.name.trim());
      if (existing && existing.id !== id) {
        throw new Error(`An organization with the name "${input.name.trim()}" already exists.`);
      }
      org.name = input.name.trim();
    }

    // Check duplicate domain
    if (input.domain && input.domain.trim().toLowerCase() !== org.domain) {
      const existing = this.findByDomain(input.domain.trim().toLowerCase());
      if (existing && existing.id !== id) {
        throw new Error(
          `The domain "${input.domain.trim().toLowerCase()}" is already registered to another organization.`,
        );
      }
      org.domain = input.domain.trim().toLowerCase();
    }

    if (input.plan) org.plan = input.plan;
    if (input.status) org.status = input.status;
    if (input.settings) org.settings = { ...org.settings, ...input.settings };

    org.updatedAt = new Date().toISOString();
    this.organizations.set(id, org);

    if (isDatabaseConnected()) {
      Organization.updateOne(
        { $or: [{ _id: id }, { domain: org.domain }] },
        {
          $set: {
            name: org.name,
            domain: org.domain,
            plan: org.plan,
            status: org.status,
            ...(input.description ? { description: input.description } : {}),
            ...(input.website ? { website: input.website } : {}),
            ...(org.settings ? { settings: org.settings } : {}),
            updatedAt: new Date(),
          },
        },
      ).catch((err) =>
        console.warn("[OrganizationRepository] MongoDB organization update error:", err.message),
      );
    }

    // Audit log
    auditService.recordEvent({
      action: "ORGANIZATION_UPDATED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "ORGANIZATION",
      targetName: org.name,
      organizationId: id,
      organizationName: org.name,
      details: `Updated organization details for ${org.name}`,
      status: "Success",
      metadata: { plan: org.plan, status: org.status },
    });

    return { ...org };
  }

  public updateStatus(id: string, status: OrganizationStatus, actorId: string): IOrganization {
    const org = this.organizations.get(id);
    if (!org) {
      throw new Error(`Organization with ID "${id}" not found.`);
    }

    const prev = org.status;
    org.status = status;
    org.updatedAt = new Date().toISOString();
    this.organizations.set(id, org);

    if (isDatabaseConnected()) {
      Organization.updateOne(
        { $or: [{ _id: id }, { domain: org.domain }] },
        { $set: { status, updatedAt: new Date() } },
      ).catch(() => {});
    }

    // Audit log
    auditService.recordEvent({
      action: "ORGANIZATION_STATUS_CHANGED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "ORGANIZATION",
      targetName: org.name,
      organizationId: id,
      organizationName: org.name,
      details: `Changed organization status from ${prev} to ${status}`,
      status: "Success",
      metadata: { previousStatus: prev, newStatus: status },
    });

    return { ...org };
  }

  public delete(id: string, actorId: string): boolean {
    const org = this.organizations.get(id);
    if (!org) {
      throw new Error(`Organization with ID "${id}" not found.`);
    }

    // Safety check: Prevent deletion of primary platform organization
    if (id === "org-1") {
      throw new Error("Cannot delete primary system organization 'TalentTrack Technologies Inc.'.");
    }

    // Remove departments associated with this organization
    for (const [deptId, dept] of this.departments.entries()) {
      if (dept.organizationId === id) {
        this.departments.delete(deptId);
      }
    }

    this.organizations.delete(id);

    if (isDatabaseConnected()) {
      Organization.deleteOne({ $or: [{ _id: id }, { domain: org.domain }] }).catch(() => {});
      Department.deleteMany({ organizationId: id }).catch(() => {});
    }

    // Audit log
    auditService.recordEvent({
      action: "ORGANIZATION_DELETED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "ORGANIZATION",
      targetName: org.name,
      details: `Deleted organization ${org.name} and purged associated departments`,
      status: "Warning",
    });

    return true;
  }

  // ─── Department Operations ─────────────────────────────────────────────────

  public findDepartments(organizationId: string): IDepartment[] {
    const depts: IDepartment[] = [];
    for (const dept of this.departments.values()) {
      if (dept.organizationId === organizationId) {
        depts.push({ ...dept });
      }
    }
    return depts.sort((a, b) => a.name.localeCompare(b.name));
  }

  public findDepartmentById(id: string): IDepartment | null {
    const dept = this.departments.get(id);
    return dept ? { ...dept } : null;
  }

  public createDepartment(
    organizationId: string,
    input: CreateDepartmentInput,
    actorId: string,
  ): IDepartment {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization "${organizationId}" does not exist.`);
    }

    if (!input.name || input.name.trim().length < 2) {
      throw new Error("Department name must be at least 2 characters long.");
    }
    if (!input.code || input.code.trim().length < 2) {
      throw new Error("Department code must be at least 2 characters long.");
    }

    const trimmedName = input.name.trim();
    const normalizedCode = input.code.trim().toUpperCase();

    // Check duplicate name or code within the same organization
    for (const d of this.departments.values()) {
      if (d.organizationId === organizationId) {
        if (d.name.toLowerCase() === trimmedName.toLowerCase()) {
          throw new Error(
            `A department named "${trimmedName}" already exists in this organization.`,
          );
        }
        if (d.code === normalizedCode) {
          throw new Error(
            `A department with code "${normalizedCode}" already exists in this organization.`,
          );
        }
      }
    }

    const id = `dept-${Date.now().toString(36)}`;
    const newDept: IDepartment = {
      id,
      organizationId,
      name: trimmedName,
      code: normalizedCode,
      managerUserId: input.managerUserId || undefined,
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.departments.set(id, newDept);

    // Update organization departmentsCount
    org.departmentsCount = this.findDepartments(organizationId).length;
    this.organizations.set(organizationId, org);

    if (isDatabaseConnected()) {
      Department.create({
        organizationId: newDept.organizationId,
        name: newDept.name,
        code: newDept.code,
        description: input.description,
        managerUserId: newDept.managerUserId,
        managerName: input.managerName,
        memberCount: newDept.memberCount,
      }).catch((err) =>
        console.warn("[OrganizationRepository] MongoDB department write error:", err.message),
      );

      Organization.updateOne(
        { $or: [{ _id: organizationId }, { domain: org.domain }] },
        { $set: { departmentsCount: org.departmentsCount, updatedAt: new Date() } },
      ).catch(() => {});
    }

    // Audit log
    auditService.recordEvent({
      action: "DEPARTMENT_CREATED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "DEPARTMENT",
      targetName: newDept.name,
      organizationId,
      organizationName: org.name,
      details: `Created department ${newDept.name} (${newDept.code}) in ${org.name}`,
      status: "Success",
      metadata: { code: newDept.code },
    });

    return { ...newDept };
  }

  public updateDepartment(id: string, input: UpdateDepartmentInput, actorId: string): IDepartment {
    const dept = this.departments.get(id);
    if (!dept) {
      throw new Error(`Department with ID "${id}" not found.`);
    }

    const org = this.organizations.get(dept.organizationId);

    if (input.name && input.name.trim() !== dept.name) {
      const trimmed = input.name.trim();
      for (const d of this.departments.values()) {
        if (
          d.organizationId === dept.organizationId &&
          d.id !== id &&
          d.name.toLowerCase() === trimmed.toLowerCase()
        ) {
          throw new Error(`A department named "${trimmed}" already exists in this organization.`);
        }
      }
      dept.name = trimmed;
    }

    if (input.code && input.code.trim().toUpperCase() !== dept.code) {
      const normCode = input.code.trim().toUpperCase();
      for (const d of this.departments.values()) {
        if (d.organizationId === dept.organizationId && d.id !== id && d.code === normCode) {
          throw new Error(
            `A department with code "${normCode}" already exists in this organization.`,
          );
        }
      }
      dept.code = normCode;
    }

    if (input.managerUserId !== undefined) {
      dept.managerUserId = input.managerUserId || undefined;
    }

    dept.updatedAt = new Date().toISOString();
    this.departments.set(id, dept);

    if (isDatabaseConnected()) {
      Department.updateOne(
        { $or: [{ _id: id }, { organizationId: dept.organizationId, code: dept.code }] },
        {
          $set: {
            name: dept.name,
            code: dept.code,
            ...(dept.managerUserId ? { managerUserId: dept.managerUserId } : {}),
            ...(input.managerName ? { managerName: input.managerName } : {}),
            ...(input.description ? { description: input.description } : {}),
            updatedAt: new Date(),
          },
        },
      ).catch(() => {});
    }

    // Audit log
    auditService.recordEvent({
      action: "DEPARTMENT_UPDATED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "DEPARTMENT",
      targetName: dept.name,
      organizationId: dept.organizationId,
      organizationName: org?.name,
      details: `Updated department ${dept.name} (${dept.code})`,
      status: "Success",
    });

    return { ...dept };
  }

  public deleteDepartment(id: string, actorId: string): boolean {
    const dept = this.departments.get(id);
    if (!dept) {
      throw new Error(`Department with ID "${id}" not found.`);
    }

    const org = this.organizations.get(dept.organizationId);
    this.departments.delete(id);

    if (org) {
      org.departmentsCount = this.findDepartments(org.id).length;
      this.organizations.set(org.id, org);
    }

    if (isDatabaseConnected()) {
      Department.deleteOne({
        $or: [{ _id: id }, { organizationId: dept.organizationId, code: dept.code }],
      }).catch(() => {});
      if (org) {
        Organization.updateOne(
          { $or: [{ _id: org.id }, { domain: org.domain }] },
          { $set: { departmentsCount: org.departmentsCount, updatedAt: new Date() } },
        ).catch(() => {});
      }
    }

    // Audit log
    auditService.recordEvent({
      action: "DEPARTMENT_DELETED",
      category: "organization",
      actorId,
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "DEPARTMENT",
      targetName: dept.name,
      organizationId: dept.organizationId,
      organizationName: org?.name,
      details: `Deleted department ${dept.name} from ${org?.name || dept.organizationId}`,
      status: "Warning",
    });

    return true;
  }

  // ─── Member Assignment ─────────────────────────────────────────────────────

  public assignMember(
    organizationId: string,
    userId: string,
    departmentId?: string,
    role?: string,
    actorId?: string,
  ): { success: boolean; message: string; organization: IOrganization } {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization with ID "${organizationId}" not found.`);
    }

    const user = userRepository.findFullUserById(userId);
    if (!user) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    // Verify department belongs to this organization if provided
    let deptName: string | undefined = undefined;
    if (departmentId) {
      const dept = this.departments.get(departmentId);
      if (!dept || dept.organizationId !== organizationId) {
        throw new Error("Specified department does not belong to this organization.");
      }
      deptName = dept.name;
      dept.memberCount += 1;
      this.departments.set(departmentId, dept);
    }

    // Update user entity in persistent store
    userRepository.updateUser(
      userId,
      {
        organizationId,
        departmentId: departmentId || undefined,
        role: role as any,
      },
      actorId || "admin",
    );

    // Increment org membersCount if not already a member
    const allUsersInOrg = userRepository
      .findAllInternalUsers()
      .filter((u) => u.organizationId === organizationId);
    org.membersCount = allUsersInOrg.length;
    this.organizations.set(organizationId, org);

    // Audit log
    auditService.recordEvent({
      action: "MEMBER_ASSIGNED_TO_ORG",
      category: "organization",
      actorId: actorId || "admin",
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: user.id,
      targetType: "USER",
      targetName: user.name,
      organizationId,
      organizationName: org.name,
      details: `Assigned user ${user.name} to ${org.name}${deptName ? ` (Department: ${deptName})` : ""}${role ? ` as ${role}` : ""}`,
      status: "Success",
      metadata: { departmentId, role },
    });

    return {
      success: true,
      message: `User ${user.name} successfully assigned to ${org.name}`,
      organization: { ...org },
    };
  }

  /**
   * Sync persisted organizations and departments from MongoDB Atlas into in-memory repository cache
   */
  public async syncFromDatabase(): Promise<{ organizations: number; departments: number }> {
    if (!isDatabaseConnected()) return { organizations: 0, departments: 0 };
    try {
      const [orgDocs, deptDocs] = await Promise.all([
        Organization.find({}).lean(),
        Department.find({}).lean(),
      ]);

      let orgCount = 0;
      let deptCount = 0;

      if (orgDocs && orgDocs.length > 0) {
        for (const doc of orgDocs) {
          const id = (doc._id as any)?.toString?.() || String(doc._id);
          const mappedOrg: IOrganization = {
            id,
            name: doc.name,
            domain: doc.domain,
            plan: doc.plan as any,
            status: doc.status as any,
            description: doc.description,
            website: doc.website,
            settings: doc.settings as any,
            membersCount: doc.membersCount || 0,
            departmentsCount: doc.departmentsCount || 0,
            jobsCount: doc.jobsCount || 0,
            applicationsCount: doc.applicationsCount || 0,
            createdAt: doc.createdAt
              ? new Date(doc.createdAt).toISOString()
              : new Date().toISOString(),
            updatedAt: doc.updatedAt
              ? new Date(doc.updatedAt).toISOString()
              : new Date().toISOString(),
          };
          this.organizations.set(id, mappedOrg);
          orgCount++;
        }
      }

      if (deptDocs && deptDocs.length > 0) {
        for (const doc of deptDocs) {
          const id = (doc._id as any)?.toString?.() || String(doc._id);
          const mappedDept: IDepartment = {
            id,
            organizationId: doc.organizationId,
            name: doc.name,
            code: doc.code,
            description: doc.description,
            managerUserId: doc.managerUserId,
            managerName: doc.managerName,
            memberCount: doc.memberCount || 0,
            createdAt: doc.createdAt
              ? new Date(doc.createdAt).toISOString()
              : new Date().toISOString(),
            updatedAt: doc.updatedAt
              ? new Date(doc.updatedAt).toISOString()
              : new Date().toISOString(),
          };
          this.departments.set(id, mappedDept);
          deptCount++;
        }
      }

      return { organizations: orgCount, departments: deptCount };
    } catch (err: any) {
      console.warn("[OrganizationRepository] syncFromDatabase error:", err.message);
      return { organizations: 0, departments: 0 };
    }
  }
}

export const organizationRepository = new OrganizationRepository();

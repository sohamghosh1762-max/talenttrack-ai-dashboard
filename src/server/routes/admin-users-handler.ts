import { userRepository, isValidObjectId } from "../db/user-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { conversationRepository } from "../repositories/conversation.repository.ts";
import { notificationRepository } from "../repositories/notification.repository.ts";
import { applicantPreferencesRepository } from "../repositories/applicant-preferences.repository.ts";
import { handleGetAdminDashboard } from "./admin-dashboard-handler.ts";
import { auditService } from "../services/audit-service.ts";
import { authenticate, requireRole, AuthError } from "../middleware/auth-middleware.ts";
import { hashPassword } from "../auth/password.ts";
import {
  handleGetOrganizations,
  handleCreateOrganization,
  handleGetOrganizationById,
  handleUpdateOrganization,
  handleDeleteOrganization,
  handleGetDepartments,
  handleCreateDepartment,
  handleUpdateDepartment,
  handleDeleteDepartment,
  handleAssignOrganizationMember,
} from "./admin-org-handler.ts";
import { handleGetAuditLogs, handleGetRoles, handleGetPermissions } from "./admin-audit-handler.ts";
import type { UserRole, UserStatus, AdminApplicantItem } from "../types/user-types.ts";

// Standard JSON response helper
function jsonResponse(data: unknown, status: number = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

const ALLOWED_ROLES: UserRole[] = [
  "ADMIN",
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "RECRUITER",
  "HIRING_MANAGER",
  "INTERVIEWER",
  "APPLICANT",
];
const ALLOWED_STATUSES: UserStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
  "PENDING_VERIFICATION",
  "LOCKED",
  "DEACTIVATED",
];
const ALLOWED_SORT_FIELDS = ["createdAt", "name", "email", "role", "status"];

/**
 * GET /api/admin/users
 */
export async function handleGetUsers(req: Request): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN", "ORG_ADMIN")(admin);

  // 2. Query parameter extraction & validation
  const url = new URL(req.url);
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const searchParam = url.searchParams.get("search");
  const roleParam = url.searchParams.get("role");
  const statusParam = url.searchParams.get("status");
  const emailVerifiedParam = url.searchParams.get("emailVerified");
  const sortByParam = url.searchParams.get("sortBy");
  const sortOrderParam = url.searchParams.get("sortOrder");
  const dateFromParam = url.searchParams.get("dateFrom");
  const dateToParam = url.searchParams.get("dateTo");
  const departmentParam = url.searchParams.get("departmentId") || undefined;

  // Tenant Isolation: Force organizationId to caller's org if caller is ORG_ADMIN
  const normalizedCallerRole = admin.role.toUpperCase();
  let organizationParam = url.searchParams.get("organizationId") || undefined;
  if (normalizedCallerRole === "ORG_ADMIN") {
    organizationParam = admin.organizationId;
  }

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  if (isNaN(page) || page < 1) {
    return jsonResponse({ error: "Invalid 'page' parameter: must be a positive integer" }, 400);
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return jsonResponse(
      { error: "Invalid 'limit' parameter: must be an integer between 1 and 100" },
      400,
    );
  }

  let role: UserRole | undefined = undefined;
  if (roleParam) {
    const normalizedRole = roleParam.toUpperCase() as UserRole;
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return jsonResponse(
        {
          error: `Invalid role parameter. Allowed values: ${ALLOWED_ROLES.join(", ")}`,
        },
        400,
      );
    }
    role = normalizedRole;
  }

  let status: UserStatus | undefined = undefined;
  if (statusParam) {
    const normalizedStatus = statusParam.toUpperCase() as UserStatus;
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return jsonResponse(
        {
          error: `Invalid status parameter. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
        },
        400,
      );
    }
    status = normalizedStatus;
  }

  let emailVerified: boolean | undefined = undefined;
  if (emailVerifiedParam !== null && emailVerifiedParam !== undefined) {
    if (emailVerifiedParam === "true") emailVerified = true;
    else if (emailVerifiedParam === "false") emailVerified = false;
    else {
      return jsonResponse(
        { error: "Invalid 'emailVerified' parameter: must be 'true' or 'false'" },
        400,
      );
    }
  }

  let sortBy: "createdAt" | "name" | "email" | "role" | "status" | undefined = undefined;
  if (sortByParam) {
    if (!ALLOWED_SORT_FIELDS.includes(sortByParam)) {
      return jsonResponse(
        { error: `Invalid 'sortBy' parameter. Allowed values: ${ALLOWED_SORT_FIELDS.join(", ")}` },
        400,
      );
    }
    sortBy = sortByParam as "createdAt" | "name" | "email" | "role" | "status";
  }

  let sortOrder: "asc" | "desc" | undefined = undefined;
  if (sortOrderParam) {
    const normalizedOrder = sortOrderParam.toLowerCase();
    if (normalizedOrder !== "asc" && normalizedOrder !== "desc") {
      return jsonResponse({ error: "Invalid 'sortOrder' parameter: must be 'asc' or 'desc'" }, 400);
    }
    sortOrder = normalizedOrder as "asc" | "desc";
  }

  // 3. Query repository
  const result = userRepository.findAll({
    page,
    limit,
    search: searchParam || undefined,
    role,
    status,
    emailVerified,
    sortBy,
    sortOrder,
    organizationId: organizationParam,
    departmentId: departmentParam,
    dateFrom: dateFromParam || undefined,
    dateTo: dateToParam || undefined,
  });

  return jsonResponse({ success: true, ...result }, 200);
}

/**
 * GET /api/admin/users/:id
 */
export async function handleGetUserById(req: Request, id: string): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Validate MongoDB ObjectId
  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid user ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  // 3. Find user
  const user = userRepository.findById(id);
  if (!user) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  return jsonResponse({ user }, 200);
}

/**
 * GET /api/admin/users/:id/activity
 */
export async function handleGetUserActivity(req: Request, id: string): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Validate ObjectId
  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid user ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  // 3. Find user
  const user = userRepository.findById(id);
  if (!user) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  const activity = userRepository.getUserActivity(id);
  return jsonResponse({ activity }, 200);
}

/**
 * PATCH /api/admin/users/bulk-status
 */
export async function handleBulkUpdateUserStatus(req: Request): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Parse JSON body
  let body: { userIds?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  const { userIds, status } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return jsonResponse(
      { error: "Missing or invalid 'userIds' field: must be a non-empty array of user ID strings" },
      400,
    );
  }

  if (typeof status !== "string") {
    return jsonResponse(
      {
        error: `Missing or invalid 'status' field. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      },
      400,
    );
  }

  const normalizedStatus = status.toUpperCase() as UserStatus;
  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return jsonResponse(
      {
        error: `Invalid status value '${status}'. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      },
      400,
    );
  }

  // 3. Perform bulk update
  const result = userRepository.bulkUpdateStatus(userIds as string[], normalizedStatus, admin.id);

  return jsonResponse(result, 200);
}

/**
 * PATCH /api/admin/users/:id/status
 */
export async function handleUpdateUserStatus(req: Request, id: string): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Validate MongoDB ObjectId
  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid user ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  // 3. Parse JSON body
  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  const requestedStatus = body.status;
  if (typeof requestedStatus !== "string") {
    return jsonResponse(
      {
        error: `Missing or invalid 'status' field. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      },
      400,
    );
  }

  const normalizedStatus = requestedStatus.toUpperCase() as UserStatus;
  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return jsonResponse(
      {
        error: `Invalid status value '${requestedStatus}'. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      },
      400,
    );
  }

  // 4. Execute status update with safeguard
  try {
    const { user: updatedUser, previousStatus } = userRepository.updateStatus(
      id,
      normalizedStatus,
      admin.id,
    );

    // 5. Record audit log
    auditService.recordStatusChange({
      adminId: admin.id,
      targetUserId: id,
      previousStatus,
      newStatus: normalizedStatus,
      metadata: {
        adminEmail: admin.email,
        targetEmail: updatedUser.email,
        timestamp: new Date().toISOString(),
      },
    });

    return jsonResponse(
      {
        user: updatedUser,
        message: `User status successfully updated to ${normalizedStatus}`,
      },
      200,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user status";
    if (message.includes("Cannot deactivate or suspend the only active administrator account")) {
      return jsonResponse({ error: message }, 400);
    }
    if (message.includes("User not found")) {
      return jsonResponse({ error: "User not found" }, 404);
    }
    return jsonResponse({ error: "Failed to update user status" }, 500);
  }
}

/**
 * POST /api/admin/users
 */
export async function handleCreateUser(req: Request): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN", "ORG_ADMIN")(admin);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  // Validation
  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    return jsonResponse({ error: "User name must be at least 2 characters long." }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || typeof body.email !== "string" || !emailRegex.test(body.email.trim())) {
    return jsonResponse({ error: "A valid email address is required." }, 400);
  }

  const requestedRole = (body.role || "APPLICANT").toUpperCase() as UserRole;
  if (!ALLOWED_ROLES.includes(requestedRole)) {
    return jsonResponse(
      { error: `Invalid role parameter. Allowed values: ${ALLOWED_ROLES.join(", ")}` },
      400,
    );
  }

  const requestedStatus = (body.status || "ACTIVE").toUpperCase() as UserStatus;
  if (!ALLOWED_STATUSES.includes(requestedStatus)) {
    return jsonResponse(
      { error: `Invalid status parameter. Allowed values: ${ALLOWED_STATUSES.join(", ")}` },
      400,
    );
  }

  // Privilege escalation check & Tenant isolation
  const normalizedAdminRole = admin.role.toUpperCase();
  if (normalizedAdminRole === "ORG_ADMIN") {
    if (requestedRole === "ADMIN" || requestedRole === "SUPER_ADMIN") {
      return jsonResponse(
        { error: "Organization administrators cannot grant platform administrative privileges." },
        403,
      );
    }
    body.organizationId = admin.organizationId;
  }

  try {
    const rawPassword = body.password || "Temporary123!";
    const passwordHash = hashPassword(rawPassword);

    const created = userRepository.createUser({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      passwordHash,
      role: requestedRole,
      status: requestedStatus,
      emailVerified: body.emailVerified ?? true,
      organizationId: body.organizationId || undefined,
      departmentId: body.departmentId || undefined,
    } as any);

    auditService.recordEvent({
      action: "USER_CREATED",
      category: "user",
      actorId: admin.id,
      actorName: admin.name,
      actorEmail: admin.email,
      actorRole: admin.role,
      targetId: created.id,
      targetType: "USER",
      targetName: created.name,
      organizationId: created.organizationId,
      details: `Created new user account for ${created.name} (${created.email}) with role ${created.role}`,
      status: "Success",
      metadata: { role: created.role, organizationId: created.organizationId },
    });

    const { passwordHash: _hash, ...safe } = created;
    return jsonResponse(
      {
        success: true,
        user: safe,
        message: `User account for ${created.name} successfully created.`,
      },
      201,
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to create user account" }, 400);
  }
}

/**
 * PATCH /api/admin/users/:id
 */
export async function handleUpdateUser(req: Request, id: string): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN", "ORG_ADMIN")(admin);

  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid user ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  const existingUser = userRepository.findFullUserById(id);
  if (!existingUser) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  // Tenant isolation check
  const normalizedAdminRole = admin.role.toUpperCase();
  if (normalizedAdminRole === "ORG_ADMIN") {
    if (!existingUser.organizationId || existingUser.organizationId !== admin.organizationId) {
      throw new AuthError(
        "Cross-organization access forbidden: tenant isolation boundary enforced.",
        403,
      );
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  if (body.role) {
    const normRole = body.role.toUpperCase() as UserRole;
    if (!ALLOWED_ROLES.includes(normRole)) {
      return jsonResponse(
        { error: `Invalid role parameter. Allowed values: ${ALLOWED_ROLES.join(", ")}` },
        400,
      );
    }
    if (
      normalizedAdminRole === "ORG_ADMIN" &&
      (normRole === "ADMIN" || normRole === "SUPER_ADMIN")
    ) {
      return jsonResponse(
        { error: "Organization administrators cannot grant platform administrative privileges." },
        403,
      );
    }
    body.role = normRole;
  }

  if (body.status) {
    const normStatus = body.status.toUpperCase() as UserStatus;
    if (!ALLOWED_STATUSES.includes(normStatus)) {
      return jsonResponse(
        { error: `Invalid status parameter. Allowed values: ${ALLOWED_STATUSES.join(", ")}` },
        400,
      );
    }
    body.status = normStatus;
  }

  try {
    const updated = userRepository.updateUser(id, body, admin.id);
    return jsonResponse(
      {
        success: true,
        user: updated,
        message: `User profile for ${updated.name} successfully updated.`,
      },
      200,
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to update user" }, 400);
  }
}

/**
 * DELETE /api/admin/users/:id
 */
export async function handleDeleteUser(req: Request, id: string): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN", "ORG_ADMIN")(admin);

  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid user ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  const existingUser = userRepository.findFullUserById(id);
  if (!existingUser) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  // Tenant isolation check
  const normalizedAdminRole = admin.role.toUpperCase();
  if (normalizedAdminRole === "ORG_ADMIN") {
    if (!existingUser.organizationId || existingUser.organizationId !== admin.organizationId) {
      throw new AuthError(
        "Cross-organization access forbidden: tenant isolation boundary enforced.",
        403,
      );
    }
  }

  try {
    const result = userRepository.deleteUser(id, admin.id);
    return jsonResponse(result, 200);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to remove user account" }, 400);
  }
}

const ALLOWED_APPLICANT_STATUSES: UserStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
  "PENDING_VERIFICATION",
  "LOCKED",
  "DEACTIVATED",
];
const ALLOWED_APPLICANT_SORT_FIELDS = [
  "createdAt",
  "name",
  "email",
  "status",
  "headline",
  "lastActive",
];

/**
 * GET /api/admin/applicants
 */
export async function handleGetApplicants(req: Request): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Query parameter extraction & validation
  const url = new URL(req.url);
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const searchParam = url.searchParams.get("search");
  const statusParam = url.searchParams.get("status");
  const emailVerifiedParam = url.searchParams.get("emailVerified");
  const skillsParam = url.searchParams.get("skills") || url.searchParams.get("skill");
  const locationParam = url.searchParams.get("location");
  const sortByParam = url.searchParams.get("sortBy");
  const sortOrderParam = url.searchParams.get("sortOrder");
  const dateFromParam = url.searchParams.get("dateFrom");
  const dateToParam = url.searchParams.get("dateTo");

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  if (isNaN(page) || page < 1) {
    return jsonResponse({ error: "Invalid 'page' parameter: must be a positive integer" }, 400);
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return jsonResponse(
      { error: "Invalid 'limit' parameter: must be an integer between 1 and 100" },
      400,
    );
  }

  let status: UserStatus | undefined = undefined;
  if (statusParam) {
    const normalizedStatus = statusParam.toUpperCase() as UserStatus;
    if (!ALLOWED_APPLICANT_STATUSES.includes(normalizedStatus)) {
      return jsonResponse(
        {
          error: `Invalid status parameter. Allowed values: ${ALLOWED_APPLICANT_STATUSES.join(", ")}`,
        },
        400,
      );
    }
    status = normalizedStatus;
  }

  let emailVerified: boolean | undefined = undefined;
  if (emailVerifiedParam !== null && emailVerifiedParam !== undefined) {
    if (emailVerifiedParam === "true") emailVerified = true;
    else if (emailVerifiedParam === "false") emailVerified = false;
    else {
      return jsonResponse(
        { error: "Invalid 'emailVerified' parameter: must be 'true' or 'false'" },
        400,
      );
    }
  }

  let sortBy: "createdAt" | "name" | "email" | "status" | "headline" | "lastActive" | undefined =
    undefined;
  if (sortByParam) {
    if (!ALLOWED_APPLICANT_SORT_FIELDS.includes(sortByParam)) {
      return jsonResponse(
        {
          error: `Invalid 'sortBy' parameter. Allowed values: ${ALLOWED_APPLICANT_SORT_FIELDS.join(", ")}`,
        },
        400,
      );
    }
    sortBy = sortByParam as "createdAt" | "name" | "email" | "status" | "headline" | "lastActive";
  }

  let sortOrder: "asc" | "desc" | undefined = undefined;
  if (sortOrderParam) {
    const normalizedOrder = sortOrderParam.toLowerCase();
    if (normalizedOrder !== "asc" && normalizedOrder !== "desc") {
      return jsonResponse({ error: "Invalid 'sortOrder' parameter: must be 'asc' or 'desc'" }, 400);
    }
    sortOrder = normalizedOrder as "asc" | "desc";
  }

  // 3. Query repository
  const result = userRepository.findApplicants({
    page,
    limit,
    search: searchParam || undefined,
    status,
    emailVerified,
    skills: skillsParam || undefined,
    location: locationParam || undefined,
    sortBy,
    sortOrder,
    dateFrom: dateFromParam || undefined,
    dateTo: dateToParam || undefined,
  });

  // 4. Enrich with real resume and application counts from repositories
  for (const app of result.applicants) {
    try {
      const resumes = await resumeRepository.findByApplicantId(app.id);
      const latestResume = resumes.find((r) => r.parsingStatus === "COMPLETED") || resumes[0];
      if (latestResume) {
        app.resume = {
          id: latestResume.id,
          fileName: latestResume.originalFileName,
          fileSize: latestResume.fileSize,
          mimeType: latestResume.mimeType,
          uploadedAt: latestResume.uploadedAt,
          parsingStatus: latestResume.parsingStatus,
          atsScore:
            latestResume.atsScore !== undefined && latestResume.atsScore !== null
              ? latestResume.atsScore
              : null,
        };
      }
    } catch {
      // Keep existing resume object if error
    }

    try {
      const userApps = await applicationRepository.findAll({ applicantId: app.id });
      app.applicationsCount =
        userApps.pagination?.total || (userApps.applications ? userApps.applications.length : 0);

      // If resume ATS score is not yet populated from resume, inspect applications for existing aiScore
      if (
        (!app.resume || app.resume.atsScore === null || app.resume.atsScore === undefined) &&
        userApps.applications &&
        userApps.applications.length > 0
      ) {
        const appWithScore = userApps.applications.find(
          (a: any) => typeof a.aiScore === "number" && a.aiScore > 0,
        );
        if (appWithScore) {
          if (app.resume) {
            app.resume.atsScore = appWithScore.aiScore;
          } else {
            app.resume = {
              id: appWithScore.resume?.id || "",
              fileName:
                appWithScore.resume?.originalFileName ||
                app.applicantProfile?.resumeFileName ||
                "Resume.pdf",
              fileSize: 0,
              mimeType: "application/pdf",
              uploadedAt: appWithScore.appliedAt || app.createdAt,
              parsingStatus: "COMPLETED",
              atsScore: appWithScore.aiScore,
            };
          }
        }
      }
    } catch {
      // Keep 0 if error
    }
  }

  return jsonResponse(result, 200);
}

/**
 * GET /api/admin/applicants/:id
 */
export async function handleGetApplicantById(req: Request, id: string): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Validate MongoDB ObjectId
  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid applicant ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  // 3. Find user
  const user = userRepository.findFullUserById(id);
  if (!user || user.role !== "APPLICANT") {
    return jsonResponse({ error: "Applicant not found" }, 404);
  }

  const p = user.applicantProfile || {};
  let resume: AdminApplicantItem["resume"] = null;
  let applicationsCount = 0;
  let applications: any[] = [];
  let resumes: any[] = [];

  try {
    resumes = await resumeRepository.findByApplicantId(id);
    const latest = resumes.find((r) => r.parsingStatus === "COMPLETED") || resumes[0];
    if (latest) {
      resume = {
        id: latest.id,
        fileName: latest.originalFileName,
        fileSize: latest.fileSize,
        mimeType: latest.mimeType,
        uploadedAt: latest.uploadedAt,
        parsingStatus: latest.parsingStatus,
        atsScore:
          latest.atsScore !== undefined && latest.atsScore !== null ? latest.atsScore : null,
      };
    }
  } catch {
    // Ignore
  }

  try {
    const userApps = await applicationRepository.findAll({ applicantId: id });
    applications = userApps.applications || [];
    applicationsCount = userApps.pagination?.total || applications.length;

    // Check if any application has an existing aiScore
    if (
      (!resume || resume.atsScore === null || resume.atsScore === undefined) &&
      applications.length > 0
    ) {
      const appWithScore = applications.find(
        (a: any) => typeof a.aiScore === "number" && a.aiScore > 0,
      );
      if (appWithScore) {
        if (resume) {
          resume.atsScore = appWithScore.aiScore;
        } else {
          resume = {
            id: appWithScore.resume?.id || "",
            fileName: appWithScore.resume?.originalFileName || p.resumeFileName || "Resume.pdf",
            fileSize: 0,
            mimeType: "application/pdf",
            uploadedAt: appWithScore.appliedAt || user.createdAt,
            parsingStatus: "COMPLETED",
            atsScore: appWithScore.aiScore,
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  let interviews: any[] = [];
  let conversations: any[] = [];
  let notifications: any[] = [];
  let preferences: any = null;

  try {
    interviews = await interviewRepository.findApplicantInterviews(id);
  } catch {
    // Ignore
  }

  try {
    const rawConversations = await conversationRepository.findUserConversations(id);
    // Expose metadata only (privacy protection: message bodies are not exposed to admin)
    conversations = rawConversations.map((c: any) => ({
      id: c.id,
      participantIds: c.participantIds,
      participant: c.participant
        ? {
            id: c.participant.id,
            name: c.participant.name,
            email: c.participant.email,
            role: c.participant.role,
          }
        : undefined,
      jobId: c.jobId,
      job: c.job
        ? {
            id: c.job.id,
            title: c.job.title,
            company: c.job.company,
            department: c.job.department,
            location: c.job.location,
          }
        : undefined,
      applicationId: c.applicationId,
      unreadCount: c.unreadCount || 0,
      lastMessageAt: c.lastMessageAt || c.updatedAt || c.createdAt,
      lastMessageSenderId: c.lastMessageSenderId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  } catch {
    // Ignore
  }

  try {
    const notifs = await notificationRepository.findUserNotifications(id);
    notifications = notifs.notifications || [];
  } catch {
    // Ignore
  }

  try {
    preferences = await applicantPreferencesRepository.findByUserId(id);
  } catch {
    // Ignore
  }

  const applicantItem: AdminApplicantItem = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "APPLICANT",
    status: user.status,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    avatarUrl: user.avatarUrl,
    headline: p.headline || "",
    location: p.location || "",
    phone: p.phone || "",
    summary: p.summary || p.bio || "",
    bio: p.bio || p.summary || "",
    skills: p.skills || [],
    experienceYears: p.experienceYears || "",
    experiences: p.experiences || [],
    education: p.education || [],
    certifications: p.certifications || [],
    projects: p.projects || [],
    applicantProfile: { ...p },
    resume,
    applicationsCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastActive: user.lastActive,
  };

  return jsonResponse(
    {
      applicant: applicantItem,
      resumes,
      applications,
      interviews,
      conversations,
      notifications,
      preferences,
    },
    200,
  );
}

/**
 * GET /api/admin/applicants/:id/applications
 * Returns paginated applications for a specific applicant with resolved Job details
 */
export async function handleGetApplicantApplications(req: Request, id: string): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  // 2. Validate MongoDB ObjectId
  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid applicant ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  // 3. Find applicant user
  const user = userRepository.findById(id);
  if (!user || user.role !== "APPLICANT") {
    return jsonResponse({ error: "Applicant not found" }, 404);
  }

  // 4. Parse query parameters
  const url = new URL(req.url);
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const statusParam = url.searchParams.get("status");
  const stageParam = url.searchParams.get("stage") || url.searchParams.get("currentStage");
  const sortByParam = url.searchParams.get("sortBy");
  const sortOrderParam = url.searchParams.get("sortOrder");
  const searchParam = url.searchParams.get("search");

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  // 5. Query applications for this applicant
  const result = await applicationRepository.findAll({
    applicantId: id,
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: isNaN(limit) || limit < 1 || limit > 100 ? 20 : limit,
    status: statusParam || undefined,
    stage: stageParam || undefined,
    sortBy: sortByParam || undefined,
    sortOrder: sortOrderParam === "asc" || sortOrderParam === "desc" ? sortOrderParam : undefined,
    search: searchParam || undefined,
  });

  return jsonResponse(
    {
      applications: result.applications,
      pagination: result.pagination,
      applicant: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    },
    200,
  );
}

/**
 * GET /api/admin/applicants/:id/interviews
 * Returns real interview records for a specific applicant
 */
export async function handleGetApplicantInterviews(req: Request, id: string): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid applicant ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  const user = userRepository.findById(id);
  if (!user || user.role !== "APPLICANT") {
    return jsonResponse({ error: "Applicant not found" }, 404);
  }

  const interviews = await interviewRepository.findApplicantInterviews(id);
  return jsonResponse({ interviews }, 200);
}

/**
 * GET /api/admin/applicants/:id/conversations
 * Returns messaging metadata for a specific applicant (message bodies excluded for privacy)
 */
export async function handleGetApplicantConversations(req: Request, id: string): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid applicant ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  const user = userRepository.findById(id);
  if (!user || user.role !== "APPLICANT") {
    return jsonResponse({ error: "Applicant not found" }, 404);
  }

  const rawConversations = await conversationRepository.findUserConversations(id);
  const conversations = rawConversations.map((c: any) => ({
    id: c.id,
    participantIds: c.participantIds,
    participant: c.participant
      ? {
          id: c.participant.id,
          name: c.participant.name,
          email: c.participant.email,
          role: c.participant.role,
        }
      : undefined,
    jobId: c.jobId,
    job: c.job
      ? {
          id: c.job.id,
          title: c.job.title,
          company: c.job.company,
          department: c.job.department,
          location: c.job.location,
        }
      : undefined,
    applicationId: c.applicationId,
    unreadCount: c.unreadCount || 0,
    lastMessageAt: c.lastMessageAt || c.updatedAt || c.createdAt,
    lastMessageSenderId: c.lastMessageSenderId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return jsonResponse({ conversations }, 200);
}

/**
 * GET /api/admin/applicants/:id/notifications
 * Returns notifications for a specific applicant in read-only mode (does not mark as read)
 */
export async function handleGetApplicantNotifications(req: Request, id: string): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid applicant ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  const user = userRepository.findById(id);
  if (!user || user.role !== "APPLICANT") {
    return jsonResponse({ error: "Applicant not found" }, 404);
  }

  const result = await notificationRepository.findUserNotifications(id);
  return jsonResponse({ notifications: result.notifications || [] }, 200);
}

/**
 * GET /api/admin/applicants/:id/preferences
 * Returns configured applicant preferences in read-only mode
 */
export async function handleGetApplicantPreferences(req: Request, id: string): Promise<Response> {
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

  if (!isValidObjectId(id)) {
    return jsonResponse(
      { error: "Invalid applicant ID format. Must be a 24-character hexadecimal ObjectId." },
      400,
    );
  }

  const user = userRepository.findById(id);
  if (!user || user.role !== "APPLICANT") {
    return jsonResponse({ error: "Applicant not found" }, 404);
  }

  const preferences = await applicantPreferencesRepository.findByUserId(id);
  return jsonResponse({ preferences }, 200);
}

/**
 * Universal dispatcher for /api/admin/* endpoints
 */
export async function handleAdminApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Only handle /api/admin/ endpoints
  if (!pathname.startsWith("/api/admin")) {
    return null;
  }

  try {
    // 1. GET /api/admin/dashboard (including /stats and /analytics sub-paths)
    if (
      (pathname === "/api/admin/dashboard" ||
        pathname === "/api/admin/dashboard/stats" ||
        pathname === "/api/admin/dashboard/analytics") &&
      req.method === "GET"
    ) {
      return await handleGetAdminDashboard(req);
    }

    // 2. PATCH /api/admin/users/bulk-status
    if (pathname === "/api/admin/users/bulk-status" && req.method === "PATCH") {
      return await handleBulkUpdateUserStatus(req);
    }

    // 3. GET /api/admin/applicants
    if (pathname === "/api/admin/applicants" && req.method === "GET") {
      return await handleGetApplicants(req);
    }

    // 3. GET /api/admin/applicants/:id/applications (Must match before /:id)
    const applicationsMatch = pathname.match(/^\/api\/admin\/applicants\/([^/]+)\/applications$/);
    if (applicationsMatch && req.method === "GET") {
      const id = applicationsMatch[1]!;
      return await handleGetApplicantApplications(req, id);
    }

    // 4. GET /api/admin/applicants/:id/interviews
    const interviewsMatch = pathname.match(/^\/api\/admin\/applicants\/([^/]+)\/interviews$/);
    if (interviewsMatch && req.method === "GET") {
      const id = interviewsMatch[1]!;
      return await handleGetApplicantInterviews(req, id);
    }

    // 5. GET /api/admin/applicants/:id/conversations
    const conversationsMatch = pathname.match(/^\/api\/admin\/applicants\/([^/]+)\/conversations$/);
    if (conversationsMatch && req.method === "GET") {
      const id = conversationsMatch[1]!;
      return await handleGetApplicantConversations(req, id);
    }

    // 6. GET /api/admin/applicants/:id/notifications
    const notificationsMatch = pathname.match(/^\/api\/admin\/applicants\/([^/]+)\/notifications$/);
    if (notificationsMatch && req.method === "GET") {
      const id = notificationsMatch[1]!;
      return await handleGetApplicantNotifications(req, id);
    }

    // 7. GET /api/admin/applicants/:id/preferences
    const preferencesMatch = pathname.match(/^\/api\/admin\/applicants\/([^/]+)\/preferences$/);
    if (preferencesMatch && req.method === "GET") {
      const id = preferencesMatch[1]!;
      return await handleGetApplicantPreferences(req, id);
    }

    // 8. GET /api/admin/applicants/:id
    const applicantMatch = pathname.match(/^\/api\/admin\/applicants\/([^/]+)$/);
    if (applicantMatch && req.method === "GET") {
      const id = applicantMatch[1]!;
      return await handleGetApplicantById(req, id);
    }

    // 9. POST /api/admin/users (Create User)
    if (pathname === "/api/admin/users" && req.method === "POST") {
      return await handleCreateUser(req);
    }

    // 10. GET /api/admin/users
    if (pathname === "/api/admin/users" && req.method === "GET") {
      return await handleGetUsers(req);
    }

    // 11. GET /api/admin/users/:id/activity
    const activityMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/activity$/);
    if (activityMatch && req.method === "GET") {
      const id = activityMatch[1]!;
      return await handleGetUserActivity(req, id);
    }

    // 12. PATCH /api/admin/users/:id/status
    const statusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && req.method === "PATCH") {
      const id = statusMatch[1]!;
      return await handleUpdateUserStatus(req, id);
    }

    // 13. PATCH / PUT /api/admin/users/:id (Profile/Role update)
    const updateUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (updateUserMatch && (req.method === "PATCH" || req.method === "PUT")) {
      const id = updateUserMatch[1]!;
      return await handleUpdateUser(req, id);
    }

    // 14. DELETE /api/admin/users/:id (Delete user)
    const deleteUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteUserMatch && req.method === "DELETE") {
      const id = deleteUserMatch[1]!;
      return await handleDeleteUser(req, id);
    }

    // 15. GET /api/admin/users/:id
    const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userMatch && req.method === "GET") {
      const id = userMatch[1]!;
      return await handleGetUserById(req, id);
    }

    // 16. Organizations & Departments API
    const orgDeptNestedMatch = pathname.match(
      /^\/api\/admin\/organizations\/([^/]+)\/departments\/([^/]+)$/,
    );
    if (orgDeptNestedMatch) {
      const deptId = orgDeptNestedMatch[2]!;
      if (req.method === "PATCH" || req.method === "PUT")
        return await handleUpdateDepartment(req, deptId);
      if (req.method === "DELETE") return await handleDeleteDepartment(req, deptId);
    }

    const orgDeptMatch = pathname.match(/^\/api\/admin\/organizations\/([^/]+)\/departments$/);
    if (orgDeptMatch) {
      const orgId = orgDeptMatch[1]!;
      if (req.method === "GET") return await handleGetDepartments(req, orgId);
      if (req.method === "POST") return await handleCreateDepartment(req, orgId);
    }

    const orgMemberMatch = pathname.match(/^\/api\/admin\/organizations\/([^/]+)\/members$/);
    if (orgMemberMatch && req.method === "POST") {
      const orgId = orgMemberMatch[1]!;
      return await handleAssignOrganizationMember(req, orgId);
    }

    const orgIdMatch = pathname.match(/^\/api\/admin\/organizations\/([^/]+)$/);
    if (orgIdMatch) {
      const orgId = orgIdMatch[1]!;
      if (req.method === "GET") return await handleGetOrganizationById(req, orgId);
      if (req.method === "PATCH" || req.method === "PUT")
        return await handleUpdateOrganization(req, orgId);
      if (req.method === "DELETE") return await handleDeleteOrganization(req, orgId);
    }

    if (pathname === "/api/admin/organizations") {
      if (req.method === "GET") return await handleGetOrganizations(req);
      if (req.method === "POST") return await handleCreateOrganization(req);
    }

    const deptIdMatch = pathname.match(/^\/api\/admin\/departments\/([^/]+)$/);
    if (deptIdMatch) {
      const deptId = deptIdMatch[1]!;
      if (req.method === "PATCH" || req.method === "PUT")
        return await handleUpdateDepartment(req, deptId);
      if (req.method === "DELETE") return await handleDeleteDepartment(req, deptId);
    }

    // 17. Audit Logs API
    if (pathname === "/api/admin/audit-logs" && req.method === "GET") {
      return await handleGetAuditLogs(req);
    }

    // 18. Roles & Permissions API
    if (pathname === "/api/admin/roles" && req.method === "GET") {
      return await handleGetRoles(req);
    }

    if (pathname === "/api/admin/permissions" && req.method === "GET") {
      return await handleGetPermissions(req);
    }

    // Fallthrough for unmatched /api/admin/* route
    return jsonResponse({ error: "Admin endpoint not found" }, 404);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    console.error("Unexpected Admin API Error:", err);
    return jsonResponse({ error: "Internal server error occurred." }, 500);
  }
}

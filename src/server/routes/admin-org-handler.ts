import { organizationRepository } from "../db/organization-repository.ts";
import { userRepository } from "../db/user-repository.ts";
import { authenticate, requireRole, AuthError } from "../middleware/auth-middleware.ts";
import { auditService } from "../services/audit-service.ts";
import type { AuthenticatedUser } from "../middleware/auth-middleware.ts";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Enforces tenant isolation for organization-scoped operations
 */
function assertOrganizationTenantScope(
  user: AuthenticatedUser,
  targetOrgId: string,
  actionDesc: string,
): void {
  const normalizedRole = user.role.toUpperCase();
  if (normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN") {
    return; // Platform administrators have global multi-tenant access
  }

  // ORG_ADMIN or other roles must match organizationId
  if (!user.organizationId || user.organizationId !== targetOrgId) {
    auditService.recordEvent({
      action: "SECURITY_ACCESS_DENIED",
      category: "security",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: targetOrgId,
      targetType: "ORGANIZATION",
      organizationId: user.organizationId,
      details: `Forbidden cross-tenant ${actionDesc} attempt on organization ${targetOrgId}`,
      status: "Failure",
      metadata: { targetOrgId, userOrgId: user.organizationId },
    });

    throw new AuthError(
      "Cross-organization access forbidden: tenant isolation boundary enforced.",
      403,
    );
  }
}

/**
 * GET /api/admin/organizations
 */
export async function handleGetOrganizations(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const normalizedRole = user.role.toUpperCase();

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const plan = url.searchParams.get("plan") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const page = url.searchParams.get("page") ? parseInt(url.searchParams.get("page")!, 10) : 1;
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 20;

  // Tenant Isolation: If caller is ORG_ADMIN, only return their own organization
  if (normalizedRole === "ORG_ADMIN") {
    if (!user.organizationId) {
      return jsonResponse(
        { organizations: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } },
        200,
      );
    }
    const myOrg = organizationRepository.findById(user.organizationId);
    return jsonResponse({
      organizations: myOrg ? [myOrg] : [],
      pagination: { page: 1, limit, total: myOrg ? 1 : 0, totalPages: 1 },
      summary: {
        totalOrganizations: myOrg ? 1 : 0,
        activeOrganizations: myOrg?.status === "Active" ? 1 : 0,
        pendingOrganizations: myOrg?.status === "Pending Verification" ? 1 : 0,
        suspendedOrganizations: myOrg?.status === "Suspended" ? 1 : 0,
        enterpriseCount: myOrg?.plan === "Enterprise" ? 1 : 0,
        growthCount: myOrg?.plan === "Growth" ? 1 : 0,
        starterCount: myOrg?.plan === "Starter" ? 1 : 0,
      },
    });
  }

  // Platform Admins can list all organizations
  requireRole("ADMIN")(user);
  const result = organizationRepository.findAll({ search, plan, status, page, limit });
  return jsonResponse({ success: true, ...result }, 200);
}

/**
 * POST /api/admin/organizations
 */
export async function handleCreateOrganization(req: Request): Promise<Response> {
  const user = await authenticate(req);
  requireRole("ADMIN")(user); // Only Platform Admins can provision new organizations

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  try {
    const org = organizationRepository.create(body, user.id);
    return jsonResponse(
      {
        success: true,
        organization: org,
        message: `Organization ${org.name} successfully created.`,
      },
      201,
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to create organization" }, 400);
  }
}

/**
 * GET /api/admin/organizations/:id
 */
export async function handleGetOrganizationById(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  assertOrganizationTenantScope(user, id, "read");

  const org = organizationRepository.findById(id);
  if (!org) {
    return jsonResponse({ error: `Organization with ID "${id}" not found.` }, 404);
  }

  const departments = organizationRepository.findDepartments(id);
  return jsonResponse({ success: true, organization: org, departments }, 200);
}

/**
 * PATCH /api/admin/organizations/:id
 */
export async function handleUpdateOrganization(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  assertOrganizationTenantScope(user, id, "update");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  try {
    const updated = organizationRepository.update(id, body, user.id);
    return jsonResponse(
      { success: true, organization: updated, message: "Organization updated successfully." },
      200,
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to update organization" }, 400);
  }
}

/**
 * DELETE /api/admin/organizations/:id
 */
export async function handleDeleteOrganization(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  requireRole("ADMIN")(user); // Only Platform Admins can delete organizations

  try {
    organizationRepository.delete(id, user.id);
    return jsonResponse({ success: true, message: "Organization successfully removed." }, 200);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to delete organization" }, 400);
  }
}

/**
 * GET /api/admin/organizations/:id/departments
 */
export async function handleGetDepartments(
  req: Request,
  organizationId: string,
): Promise<Response> {
  const user = await authenticate(req);
  assertOrganizationTenantScope(user, organizationId, "departments read");

  const departments = organizationRepository.findDepartments(organizationId);
  return jsonResponse({ success: true, departments }, 200);
}

/**
 * POST /api/admin/organizations/:id/departments
 */
export async function handleCreateDepartment(
  req: Request,
  organizationId: string,
): Promise<Response> {
  const user = await authenticate(req);
  assertOrganizationTenantScope(user, organizationId, "departments create");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  try {
    const dept = organizationRepository.createDepartment(organizationId, body, user.id);
    return jsonResponse(
      { success: true, department: dept, message: `Department ${dept.name} created.` },
      201,
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to create department" }, 400);
  }
}

/**
 * PATCH /api/admin/departments/:id
 */
export async function handleUpdateDepartment(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  const dept = organizationRepository.findDepartmentById(id);
  if (!dept) {
    return jsonResponse({ error: "Department not found." }, 404);
  }
  assertOrganizationTenantScope(user, dept.organizationId, "department update");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  try {
    const updated = organizationRepository.updateDepartment(id, body, user.id);
    return jsonResponse(
      { success: true, department: updated, message: "Department updated successfully." },
      200,
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to update department" }, 400);
  }
}

/**
 * DELETE /api/admin/departments/:id
 */
export async function handleDeleteDepartment(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  const dept = organizationRepository.findDepartmentById(id);
  if (!dept) {
    return jsonResponse({ error: "Department not found." }, 404);
  }
  assertOrganizationTenantScope(user, dept.organizationId, "department delete");

  try {
    organizationRepository.deleteDepartment(id, user.id);
    return jsonResponse({ success: true, message: "Department removed successfully." }, 200);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to delete department" }, 400);
  }
}

/**
 * POST /api/admin/organizations/:id/members
 */
export async function handleAssignOrganizationMember(
  req: Request,
  organizationId: string,
): Promise<Response> {
  const user = await authenticate(req);
  assertOrganizationTenantScope(user, organizationId, "member assignment");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  if (!body.userId) {
    return jsonResponse({ error: "Missing required 'userId' field." }, 400);
  }

  try {
    const result = organizationRepository.assignMember(
      organizationId,
      body.userId,
      body.departmentId,
      body.role,
      user.id,
    );
    const assignedUser = userRepository.findById(body.userId);
    return jsonResponse({ ...result, user: assignedUser }, 200);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to assign member" }, 400);
  }
}

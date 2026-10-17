import { auditService } from "../services/audit-service.ts";
import { ROLE_PERMISSIONS } from "../permissions/roles.ts";
import { PERMISSIONS } from "../permissions/definitions.ts";
import { authenticate, requireRole, AuthError } from "../middleware/auth-middleware.ts";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * GET /api/admin/audit-logs
 */
export async function handleGetAuditLogs(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const normalizedRole = user.role.toUpperCase();

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const action = url.searchParams.get("action") || undefined;
  const actorId = url.searchParams.get("actorId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const page = url.searchParams.get("page") ? parseInt(url.searchParams.get("page")!, 10) : 1;
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 20;

  // Tenant Isolation:
  // If caller is ORG_ADMIN, force organizationId to caller's organizationId
  let organizationId = url.searchParams.get("organizationId") || undefined;
  if (normalizedRole === "ORG_ADMIN") {
    organizationId = user.organizationId;
  } else {
    // Platform Admins
    requireRole("ADMIN")(user);
  }

  const result = auditService.queryLogs({
    search,
    category,
    action,
    actorId,
    organizationId,
    status,
    page,
    limit,
  });

  return jsonResponse({ success: true, ...result }, 200);
}

/**
 * GET /api/admin/roles
 */
export async function handleGetRoles(req: Request): Promise<Response> {
  const user = await authenticate(req);
  requireRole("ADMIN", "ORG_ADMIN")(user);

  const roleDescriptions: Record<string, string> = {
    SUPER_ADMIN: "Global platform super-administrator with unrestricted access across all tenants.",
    ADMIN:
      "Platform administrator with comprehensive platform, user, and security management privileges.",
    ORG_ADMIN:
      "Organization administrator with scoped control over company users, departments, and jobs.",
    RECRUITER:
      "Talent acquisition professional managing job postings, candidate pipelines, and screenings.",
    HIRING_MANAGER:
      "Department hiring leader reviewing shortlisted candidates, interviews, and giving feedback.",
    INTERVIEWER:
      "Technical or panel interviewer assessing assigned candidates and conducting interviews.",
    APPLICANT:
      "External job applicant searching positions, submitting resumes, and tracking applications.",
  };

  const roles = Object.entries(ROLE_PERMISSIONS).map(([name, permissions]) => ({
    name,
    description: roleDescriptions[name] || `${name} role`,
    permissions,
    permissionCount: permissions.length,
    isElevated: name === "ADMIN" || name === "SUPER_ADMIN" || name === "ORG_ADMIN",
  }));

  return jsonResponse({ success: true, roles }, 200);
}

/**
 * GET /api/admin/permissions
 */
export async function handleGetPermissions(req: Request): Promise<Response> {
  const user = await authenticate(req);
  requireRole("ADMIN", "ORG_ADMIN")(user);

  const permissions = Object.entries(PERMISSIONS).map(([key, value]) => {
    const [domain, action] = value.split(".");
    return {
      key,
      id: value,
      domain: domain || "general",
      action: action || "access",
    };
  });

  return jsonResponse({ success: true, permissions }, 200);
}

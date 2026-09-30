import { userRepository, isValidObjectId } from "../db/user-repository.ts";
import { auditService } from "../services/audit-service.ts";
import { authenticate, requireRole, AuthError } from "../middleware/auth-middleware.ts";
import type { UserRole, UserStatus } from "../types/user-types.ts";

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

const ALLOWED_ROLES: UserRole[] = ["ADMIN", "RECRUITER", "APPLICANT"];
const ALLOWED_STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED", "INACTIVE"];
const ALLOWED_SORT_FIELDS = ["createdAt", "name", "email", "role", "status"];

/**
 * GET /api/admin/users
 */
export async function handleGetUsers(req: Request): Promise<Response> {
  // 1. Authorization
  const admin = await authenticate(req);
  requireRole("ADMIN")(admin);

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
    dateFrom: dateFromParam || undefined,
    dateTo: dateToParam || undefined,
  });

  return jsonResponse(result, 200);
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
    // 1. PATCH /api/admin/users/bulk-status
    if (pathname === "/api/admin/users/bulk-status" && req.method === "PATCH") {
      return await handleBulkUpdateUserStatus(req);
    }

    // 2. GET /api/admin/users
    if (pathname === "/api/admin/users" && req.method === "GET") {
      return await handleGetUsers(req);
    }

    // 3. GET /api/admin/users/:id/activity
    const activityMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/activity$/);
    if (activityMatch && req.method === "GET") {
      const id = activityMatch[1]!;
      return await handleGetUserActivity(req, id);
    }

    // 4. PATCH /api/admin/users/:id/status
    const statusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && req.method === "PATCH") {
      const id = statusMatch[1]!;
      return await handleUpdateUserStatus(req, id);
    }

    // 5. GET /api/admin/users/:id
    const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userMatch && req.method === "GET") {
      const id = userMatch[1]!;
      return await handleGetUserById(req, id);
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

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { auditService } from "../services/audit-service.ts";
import { handleAdminApiRequest } from "../routes/admin-users-handler.ts";

function createRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const init: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new Request(url, init);
}

const ADMIN_TOKEN = "mock_admin_token"; // Admin 65f1a2b3c4d5e6f7a8b9c001
const RECRUITER_TOKEN = "mock_recruiter_token"; // Recruiter 65f1a2b3c4d5e6f7a8b9c003

describe("Admin User Management & Administrator Protection Suite", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    auditService.clearLogs();

    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", ADMIN_TOKEN);
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c003", RECRUITER_TOKEN);
  });

  it("should create a new user account with hashed credentials that are never exposed", async () => {
    const req = createRequest("https://app.talenttrack.ai/api/admin/users", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Devon Clark",
        email: "devon.clark@cloudscale.io",
        password: "SecurePassword123!",
        role: "RECRUITER",
        status: "ACTIVE",
        organizationId: "org-2",
        emailVerified: true,
      },
    });

    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.name, "Devon Clark");
    assert.equal(body.user.email, "devon.clark@cloudscale.io");
    assert.equal(body.user.role, "RECRUITER");
    assert.equal(body.user.organizationId, "org-2");

    // Critical security check: password and passwordHash must NEVER be exposed
    assert.equal(body.user.password, undefined);
    assert.equal(body.user.passwordHash, undefined);
    assert.equal(body.user.token, undefined);
  });

  it("should reject creation of a duplicate user email", async () => {
    const req = createRequest("https://app.talenttrack.ai/api/admin/users", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Duplicate User",
        email: "admin@talenttrack.ai", // Existing admin email
        password: "Password123!",
        role: "APPLICANT",
      },
    });

    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /already exists|already registered/i);
  });

  it("should list users with pagination, search, and role filtering", async () => {
    const req = createRequest(
      "https://app.talenttrack.ai/api/admin/users?role=RECRUITER&page=1&limit=5",
      {
        method: "GET",
        token: ADMIN_TOKEN,
      },
    );

    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.users));
    assert(body.users.every((u: any) => u.role === "RECRUITER"));
    assert(body.pagination.total >= 1);
  });

  it("should update user profile details safely without leaking credentials", async () => {
    const targetUserId = "65f1a2b3c4d5e6f7a8b9c003"; // Sarah Jenkins
    const req = createRequest(`https://app.talenttrack.ai/api/admin/users/${targetUserId}`, {
      method: "PUT",
      token: ADMIN_TOKEN,
      body: {
        name: "Sarah Jenkins-Smith",
        role: "ORG_ADMIN",
        status: "ACTIVE",
        organizationId: "org-1",
      },
    });

    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.name, "Sarah Jenkins-Smith");
    assert.equal(body.user.role, "ORG_ADMIN");
    assert.equal(body.user.password, undefined);
    assert.equal(body.user.passwordHash, undefined);
  });

  it("should safeguard the last active administrator against deactivation or suspension", async () => {
    // In our test seed, find all active admins
    const activeAdmins = userRepository
      .findAllInternalUsers()
      .filter((u) => (u.role === "ADMIN" || u.role === "SUPER_ADMIN") && u.status === "ACTIVE");
    assert.ok(activeAdmins.length > 0);
    const lastAdmin = activeAdmins[0]!;

    // Deactivate/suspend all other admins except one
    for (let i = 1; i < activeAdmins.length; i++) {
      userRepository.updateStatus(activeAdmins[i]!.id, "INACTIVE");
    }

    // Attempt to suspend the last active administrator
    const suspendReq = createRequest(
      `https://app.talenttrack.ai/api/admin/users/${lastAdmin.id}/status`,
      {
        method: "PATCH",
        token: ADMIN_TOKEN,
        body: { status: "SUSPENDED" },
      },
    );

    const suspendRes = await handleAdminApiRequest(suspendReq);
    assert.ok(suspendRes);
    assert.equal(suspendRes.status, 400);
    const suspendBody = await suspendRes.json();
    assert.match(suspendBody.error, /only active administrator/i);

    // Attempt to deactivate the last active administrator
    const deactReq = createRequest(
      `https://app.talenttrack.ai/api/admin/users/${lastAdmin.id}/status`,
      {
        method: "PATCH",
        token: ADMIN_TOKEN,
        body: { status: "INACTIVE" },
      },
    );

    const deactRes = await handleAdminApiRequest(deactReq);
    assert.ok(deactRes);
    assert.equal(deactRes.status, 400);
    const deactBody = await deactRes.json();
    assert.match(deactBody.error, /only active administrator/i);
  });

  it("should safeguard the last active administrator against role demotion", async () => {
    const activeAdmins = userRepository
      .findAllInternalUsers()
      .filter((u) => (u.role === "ADMIN" || u.role === "SUPER_ADMIN") && u.status === "ACTIVE");
    assert.ok(activeAdmins.length > 0);
    const lastAdmin = activeAdmins[0]!;

    for (let i = 1; i < activeAdmins.length; i++) {
      userRepository.updateStatus(activeAdmins[i]!.id, "INACTIVE");
    }

    const demoteReq = createRequest(`https://app.talenttrack.ai/api/admin/users/${lastAdmin.id}`, {
      method: "PUT",
      token: ADMIN_TOKEN,
      body: { role: "RECRUITER" },
    });

    const demoteRes = await handleAdminApiRequest(demoteReq);
    assert.ok(demoteRes);
    assert.equal(demoteRes.status, 400);
    const demoteBody = await demoteRes.json();
    assert.match(demoteBody.error, /demote the only active administrator/i);
  });

  it("should safeguard the last active administrator against deletion", async () => {
    const activeAdmins = userRepository
      .findAllInternalUsers()
      .filter((u) => (u.role === "ADMIN" || u.role === "SUPER_ADMIN") && u.status === "ACTIVE");
    assert.ok(activeAdmins.length > 0);
    const lastAdmin = activeAdmins[0]!;

    for (let i = 1; i < activeAdmins.length; i++) {
      userRepository.updateStatus(activeAdmins[i]!.id, "INACTIVE");
    }

    const deleteReq = createRequest(`https://app.talenttrack.ai/api/admin/users/${lastAdmin.id}`, {
      method: "DELETE",
      token: ADMIN_TOKEN,
    });

    const deleteRes = await handleAdminApiRequest(deleteReq);
    assert.ok(deleteRes);
    assert.equal(deleteRes.status, 400);
    const deleteBody = await deleteRes.json();
    assert.match(deleteBody.error, /delete the only active administrator/i);
  });

  it("should successfully delete a regular user account and record audit log", async () => {
    const targetUserId = "65f1a2b3c4d5e6f7a8b9c004"; // Michael Chang (Recruiter)

    const deleteReq = createRequest(`https://app.talenttrack.ai/api/admin/users/${targetUserId}`, {
      method: "DELETE",
      token: ADMIN_TOKEN,
    });

    const deleteRes = await handleAdminApiRequest(deleteReq);
    assert.ok(deleteRes);
    assert.equal(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.success, true);

    // Verify user no longer exists in repository
    assert.equal(userRepository.findById(targetUserId), null);
  });

  it("should block non-administrators from accessing admin user management APIs", async () => {
    const req = createRequest("https://app.talenttrack.ai/api/admin/users", {
      method: "GET",
      token: RECRUITER_TOKEN,
    });

    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Access denied|Insufficient/i);
  });
});

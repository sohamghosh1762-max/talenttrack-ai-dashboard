import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { auditService } from "../services/audit-service.ts";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
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

const ADMIN_TOKEN = "mock_admin_token";

describe("Audit Logging & RBAC Discovery Suite", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    auditService.clearLogs();

    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", ADMIN_TOKEN);
  });

  it("should record sensitive events with full actor and organization context", async () => {
    auditService.recordEvent({
      actorId: "65f1a2b3c4d5e6f7a8b9c001",
      actorName: "System Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      action: "USER_STATUS_UPDATED",
      targetId: "65f1a2b3c4d5e6f7a8b9c008",
      targetType: "USER",
      category: "user",
      details: "Updated user status",
      status: "Success",
      organizationId: "org-1",
      metadata: { previousStatus: "ACTIVE", newStatus: "SUSPENDED" },
    });

    const res = auditService.queryLogs();
    const logs = res.logs;
    assert.equal(logs.length, 1);
    assert.ok(logs[0]);
    assert.equal(logs[0].action, "USER_STATUS_UPDATED");
    assert.equal(logs[0].actorEmail, "admin@talenttrack.ai");
    assert.equal(logs[0].actorRole, "ADMIN");
    assert.equal(logs[0].targetId, "65f1a2b3c4d5e6f7a8b9c008");
    assert.equal(logs[0].organizationId, "org-1");
    assert.equal(logs[0].metadata?.["newStatus"], "SUSPENDED");
    assert(logs[0].timestamp !== undefined);
  });

  it("should strictly sanitize passwords, hashes, and tokens from audit metadata", async () => {
    auditService.recordEvent({
      actorId: "65f1a2b3c4d5e6f7a8b9c001",
      actorName: "System Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      action: "USER_CREATED",
      targetId: "user-test",
      targetType: "USER",
      category: "user",
      details: "Created test user",
      status: "Success",
      metadata: {
        email: "test@example.com",
        password: "SuperSecretPassword123!",
        passwordHash: "$2a$12$eX4mP1eH4sH...",
        token: "bearer_xyz123",
        nested: {
          secret: "hidden_secret",
          apiKey: "api_key_456",
          legitField: "visible",
        },
      },
    });

    const res = auditService.queryLogs();
    const logs = res.logs;
    assert.equal(logs.length, 1);
    assert.ok(logs[0]);
    const meta = logs[0].metadata as any;

    // Sensitive keys must be redacted to [REDACTED]
    assert.equal(meta.password, "[REDACTED]");
    assert.equal(meta.passwordHash, "[REDACTED]");
    assert.equal(meta.token, "[REDACTED]");
    assert.equal(meta.nested.secret, "[REDACTED]");
    assert.equal(meta.nested.apiKey, "[REDACTED]");
    assert.equal(meta.nested.legitField, "visible");
    assert.equal(meta.email, "test@example.com");
  });

  it("should support query filtering by action and date range via the API", async () => {
    // Add multiple events
    auditService.recordEvent({
      actorId: "actor-1",
      actorName: "Admin 1",
      actorEmail: "a1@test.com",
      actorRole: "ADMIN",
      action: "ROLE_CHANGED",
      targetId: "target-1",
      targetType: "ROLE",
      category: "role",
      details: "Changed role",
      status: "Success",
    });

    auditService.recordEvent({
      actorId: "actor-2",
      actorName: "Admin 2",
      actorEmail: "a2@test.com",
      actorRole: "ADMIN",
      action: "ORGANIZATION_CREATED",
      targetId: "target-2",
      targetType: "ORGANIZATION",
      category: "organization",
      details: "Created organization",
      status: "Success",
    });

    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/audit-logs?action=ROLE_CHANGED", {
        method: "GET",
        token: ADMIN_TOKEN,
      }),
    );

    assert.ok(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.logs.length, 1);
    assert.equal(body.logs[0].action, "ROLE_CHANGED");
  });

  it("should expose RBAC roles and permissions discovery endpoints", async () => {
    // Roles endpoint
    const rolesRes = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/roles", {
        method: "GET",
        token: ADMIN_TOKEN,
      }),
    );
    assert.ok(rolesRes);
    assert.equal(rolesRes.status, 200);
    const rolesBody = await rolesRes.json();
    assert.equal(rolesBody.success, true);
    assert(Array.isArray(rolesBody.roles));
    assert(rolesBody.roles.length >= 7);

    // Permissions endpoint
    const permsRes = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/permissions", {
        method: "GET",
        token: ADMIN_TOKEN,
      }),
    );
    assert.ok(permsRes);
    assert.equal(permsRes.status, 200);
    const permsBody = await permsRes.json();
    assert.equal(permsBody.success, true);
    assert(Array.isArray(permsBody.permissions));
    assert(permsBody.permissions.some((p: any) => p.id === "users.read"));
    assert(permsBody.permissions.some((p: any) => p.id === "organizations.create"));
    assert(permsBody.permissions.some((p: any) => p.id === "admin.audit_logs"));
  });
});

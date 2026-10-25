import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { organizationRepository } from "../db/organization-repository.ts";
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

const GLOBAL_ADMIN_TOKEN = "global_admin_token";
const ORG1_ADMIN_TOKEN = "org1_admin_token";
const ORG2_ADMIN_TOKEN = "org2_admin_token";

describe("Tenant Isolation & Cross-Organization Security Suite", () => {
  beforeEach(() => {
    organizationRepository.resetToDefaults();
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    auditService.clearLogs();

    // 1. Setup Global Platform Administrator (unrestricted)
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", GLOBAL_ADMIN_TOKEN);

    // 2. Setup Org 1 Administrator
    const org1Admin = userRepository.createUser({
      name: "Org1 Lead",
      email: "leader@talenttrack.ai",
      passwordHash: "Password123!",
      role: "ORG_ADMIN",
      status: "ACTIVE",
      organizationId: "org-1",
      emailVerified: true,
    });
    sessionRepository.createSession(org1Admin.id, ORG1_ADMIN_TOKEN);

    // 3. Setup Org 2 Administrator
    const org2Admin = userRepository.createUser({
      name: "Org2 Lead",
      email: "leader@cloudscale.io",
      passwordHash: "Password123!",
      role: "ORG_ADMIN",
      status: "ACTIVE",
      organizationId: "org-2",
      emailVerified: true,
    });
    sessionRepository.createSession(org2Admin.id, ORG2_ADMIN_TOKEN);
  });

  it("should allow platform administrator to access any organization and its resources", async () => {
    const resOrg1 = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/organizations/org-1", {
        method: "GET",
        token: GLOBAL_ADMIN_TOKEN,
      }),
    );
    assert.ok(resOrg1);
    assert.equal(resOrg1.status, 200);

    const resOrg2 = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/organizations/org-2", {
        method: "GET",
        token: GLOBAL_ADMIN_TOKEN,
      }),
    );
    assert.ok(resOrg2);
    assert.equal(resOrg2.status, 200);
  });

  it("should allow ORG_ADMIN to view their own organization", async () => {
    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/organizations/org-1", {
        method: "GET",
        token: ORG1_ADMIN_TOKEN,
      }),
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.organization.id, "org-1");
  });

  it("should strictly reject ORG_ADMIN accessing another organization with 403 Forbidden", async () => {
    // Org 1 admin tries to access Org 2
    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/organizations/org-2", {
        method: "GET",
        token: ORG1_ADMIN_TOKEN,
      }),
    );
    assert.ok(res);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Cross-organization|tenant isolation|Tenant access denied/i);

    // Verify security access violation event was recorded in audit log
    const auditLogs = auditService.queryLogs();
    const securityDenial = auditLogs.logs.find(
      (l) => l.action === "SECURITY_ACCESS_DENIED" && l.targetId === "org-2",
    );
    assert(securityDenial !== undefined, "Expected SECURITY_ACCESS_DENIED audit log entry");
  });

  it("should strictly reject ORG_ADMIN updating another organization with 403 Forbidden", async () => {
    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/organizations/org-2", {
        method: "PUT",
        token: ORG1_ADMIN_TOKEN,
        body: { name: "Hijacked Org Name" },
      }),
    );
    assert.ok(res);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Cross-organization|tenant isolation|Tenant access denied/i);
  });

  it("should strictly reject ORG_ADMIN managing departments in another organization", async () => {
    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/organizations/org-2/departments", {
        method: "POST",
        token: ORG1_ADMIN_TOKEN,
        body: { name: "Unauthorized Dept", code: "UNAUTH" },
      }),
    );
    assert.ok(res);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Cross-organization|tenant isolation|Tenant access denied/i);
  });

  it("should strictly scope audit log queries to the caller's organization for ORG_ADMIN", async () => {
    // Record events for org-1 and org-2
    auditService.recordEvent({
      actorId: "actor-1",
      actorName: "Org 1 Lead",
      actorEmail: "org1@test.com",
      actorRole: "ORG_ADMIN",
      action: "DEPARTMENT_CREATED",
      targetId: "dept-1",
      targetType: "DEPARTMENT",
      category: "organization",
      details: "Created department dept-1",
      status: "Success",
      organizationId: "org-1",
    });

    auditService.recordEvent({
      actorId: "actor-2",
      actorName: "Org 2 Lead",
      actorEmail: "org2@test.com",
      actorRole: "ORG_ADMIN",
      action: "DEPARTMENT_CREATED",
      targetId: "dept-2",
      targetType: "DEPARTMENT",
      category: "organization",
      details: "Created department dept-2",
      status: "Success",
      organizationId: "org-2",
    });

    // Org 1 admin queries audit logs
    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/audit-logs", {
        method: "GET",
        token: ORG1_ADMIN_TOKEN,
      }),
    );

    assert.ok(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert(body.success);
    // Org 1 admin must only see org-1 logs, NEVER org-2 logs
    assert(body.logs.length > 0);
    assert(body.logs.every((l: any) => l.organizationId === "org-1"));
  });

  it("should prevent privilege escalation by rejecting regular users assigning ADMIN roles", async () => {
    // Org 1 admin attempts to create a global SUPER_ADMIN
    const res = await handleAdminApiRequest(
      createRequest("https://app.talenttrack.ai/api/admin/users", {
        method: "POST",
        token: ORG1_ADMIN_TOKEN,
        body: {
          name: "Escalated User",
          email: "escalate@test.com",
          password: "Password123!",
          role: "SUPER_ADMIN",
        },
      }),
    );

    // Only platform ADMIN/SUPER_ADMIN can manage global users
    assert.ok(res);
    assert.equal(res.status, 403);
  });
});

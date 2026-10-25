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

const ADMIN_TOKEN = "mock_admin_token";

describe("Organization & Department Management Suite", () => {
  beforeEach(() => {
    organizationRepository.resetToDefaults();
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    auditService.clearLogs();

    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", ADMIN_TOKEN);
  });

  it("should create a new organization with valid input", async () => {
    const req = createRequest("https://app.talenttrack.ai/api/admin/organizations", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Acme HyperScale Solutions",
        domain: "acmesolutions.io",
        plan: "Enterprise",
        status: "ACTIVE",
        website: "https://acmesolutions.io",
      },
    });

    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.organization.name, "Acme HyperScale Solutions");
    assert.equal(body.organization.domain, "acmesolutions.io");
    assert.equal(body.organization.plan, "Enterprise");
    assert.equal(body.organization.status, "ACTIVE");
  });

  it("should reject creation of organization with duplicate domain or name", async () => {
    // Existing org has domain 'talenttrack.ai' and name 'TalentTrack Technologies Inc.'
    const duplicateDomainReq = createRequest("https://app.talenttrack.ai/api/admin/organizations", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Different Name",
        domain: "talenttrack.ai",
        plan: "Growth",
      },
    });

    const dupRes = await handleAdminApiRequest(duplicateDomainReq);
    assert.ok(dupRes);
    assert.equal(dupRes.status, 400);
    const dupBody = await dupRes.json();
    assert.match(dupBody.error, /already registered/i);

    const duplicateNameReq = createRequest("https://app.talenttrack.ai/api/admin/organizations", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "TalentTrack Technologies Inc.",
        domain: "newtalenttrack.com",
        plan: "Growth",
      },
    });

    const dupNameRes = await handleAdminApiRequest(duplicateNameReq);
    assert.ok(dupNameRes);
    assert.equal(dupNameRes.status, 400);
    const dupNameBody = await dupNameRes.json();
    assert.match(dupNameBody.error, /already exists/i);
  });

  it("should list all organizations with search filter", async () => {
    const req = createRequest(
      "https://app.talenttrack.ai/api/admin/organizations?search=CloudScale",
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
    assert.equal(body.organizations.length, 1);
    assert.equal(body.organizations[0].name, "CloudScale Systems");
  });

  it("should update organization attributes and status", async () => {
    const orgId = "org-2"; // CloudScale Systems
    const updateReq = createRequest(`https://app.talenttrack.ai/api/admin/organizations/${orgId}`, {
      method: "PUT",
      token: ADMIN_TOKEN,
      body: {
        name: "CloudScale Systems International",
        plan: "Enterprise",
        status: "SUSPENDED",
      },
    });

    const res = await handleAdminApiRequest(updateReq);
    assert.ok(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.organization.name, "CloudScale Systems International");
    assert.equal(body.organization.status, "SUSPENDED");
  });

  it("should create, update, and delete departments inside an organization", async () => {
    const orgId = "org-1";

    // 1. Create Department
    const createDeptReq = createRequest(
      `https://app.talenttrack.ai/api/admin/organizations/${orgId}/departments`,
      {
        method: "POST",
        token: ADMIN_TOKEN,
        body: {
          name: "Artificial Intelligence Research",
          code: "AIR",
          description: "Core AI and LLM evaluation team",
        },
      },
    );

    const createRes = await handleAdminApiRequest(createDeptReq);
    assert.ok(createRes);
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    assert.equal(createBody.success, true);
    assert.equal(createBody.department.name, "Artificial Intelligence Research");
    assert.equal(createBody.department.code, "AIR");

    const deptId = createBody.department.id;

    // 2. Reject Duplicate Code
    const dupCodeReq = createRequest(
      `https://app.talenttrack.ai/api/admin/organizations/${orgId}/departments`,
      {
        method: "POST",
        token: ADMIN_TOKEN,
        body: {
          name: "Another Team",
          code: "AIR",
        },
      },
    );
    const dupRes = await handleAdminApiRequest(dupCodeReq);
    assert.ok(dupRes);
    assert.equal(dupRes.status, 400);

    // 3. Update Department
    const updateDeptReq = createRequest(
      `https://app.talenttrack.ai/api/admin/organizations/${orgId}/departments/${deptId}`,
      {
        method: "PUT",
        token: ADMIN_TOKEN,
        body: {
          name: "Applied AI Research",
          code: "AAIR",
        },
      },
    );
    const updateRes = await handleAdminApiRequest(updateDeptReq);
    assert.ok(updateRes);
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.department.name, "Applied AI Research");
    assert.equal(updateBody.department.code, "AAIR");

    // 4. Delete Department
    const deleteDeptReq = createRequest(
      `https://app.talenttrack.ai/api/admin/organizations/${orgId}/departments/${deptId}`,
      {
        method: "DELETE",
        token: ADMIN_TOKEN,
      },
    );
    const deleteRes = await handleAdminApiRequest(deleteDeptReq);
    assert.ok(deleteRes);
    assert.equal(deleteRes.status, 200);
  });

  it("should assign a user to an organization and department with role updates", async () => {
    const orgId = "org-1";
    const deptId = "dept-1"; // Engineering
    const userId = "65f1a2b3c4d5e6f7a8b9c004"; // Michael Chang

    const assignReq = createRequest(
      `https://app.talenttrack.ai/api/admin/organizations/${orgId}/members`,
      {
        method: "POST",
        token: ADMIN_TOKEN,
        body: {
          userId,
          role: "HIRING_MANAGER",
          departmentId: deptId,
        },
      },
    );

    const assignRes = await handleAdminApiRequest(assignReq);
    assert.ok(assignRes);
    assert.equal(assignRes.status, 200);
    const assignBody = await assignRes.json();
    assert.equal(assignBody.success, true);
    assert.equal(assignBody.user.organizationId, orgId);
    assert.equal(assignBody.user.departmentId, deptId);
    assert.equal(assignBody.user.role, "HIRING_MANAGER");

    // Verify user in repository
    const updatedUser = userRepository.findById(userId);
    assert.equal(updatedUser?.organizationId, orgId);
    assert.equal(updatedUser?.departmentId, deptId);
  });
});

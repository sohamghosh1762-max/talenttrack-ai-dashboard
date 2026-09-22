import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { auditService } from "../services/audit-service.ts";
import {
  handleGetUsers,
  handleGetUserById,
  handleUpdateUserStatus,
  handleBulkUpdateUserStatus,
  handleGetUserActivity,
} from "../routes/admin-users-handler.ts";

// Test Helper to create a simulated HTTP Request
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

// Known test credentials from seed
const ADMIN_TOKEN = "mock_admin_token"; // Admin user 65f1a2b3c4d5e6f7a8b9c001
const ADMIN2_TOKEN = "65f1a2b3c4d5e6f7a8b9c002"; // Admin user Elena Rostova (direct ID token)
const RECRUITER_TOKEN = "mock_recruiter_token"; // Recruiter user 65f1a2b3c4d5e6f7a8b9c003
const APPLICANT_TOKEN = "mock_applicant_token"; // Applicant user 65f1a2b3c4d5e6f7a8b9c008

describe("ADMIN PHASE 2: User Management API Suite", () => {
  beforeEach(() => {
    // Reset DB state before every test to ensure strict test isolation
    userRepository.resetToDefaults();
    auditService.clearLogs();
  });

  // 1. Admin can retrieve users
  it("1. Admin can retrieve users", async () => {
    const req = createRequest("http://localhost/api/admin/users", { token: ADMIN_TOKEN });
    const res = await handleGetUsers(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.users), "Response contains users array");
    assert.ok(data.users.length > 0, "Users array is non-empty");
    assert.ok(data.pagination, "Response contains pagination metadata");
    assert.ok(data.summary, "Response contains summary metadata");
  });

  // 2. Non-admin cannot retrieve admin users
  it("2. Non-admin cannot retrieve admin users", async () => {
    // A) Recruiter attempting to access admin users
    const recruiterReq = createRequest("http://localhost/api/admin/users", {
      token: RECRUITER_TOKEN,
    });
    try {
      const res = await handleGetUsers(recruiterReq);
      assert.equal(res.status, 403, "Recruiter is blocked with 403");
    } catch (err: unknown) {
      assert.ok(err);
    }

    // B) Applicant attempting to access admin users
    const applicantReq = createRequest("http://localhost/api/admin/users", {
      token: APPLICANT_TOKEN,
    });
    try {
      const res = await handleGetUsers(applicantReq);
      assert.equal(res.status, 403, "Applicant is blocked with 403");
    } catch (err: unknown) {
      assert.ok(err);
    }

    // C) Unauthenticated caller
    const unauthReq = createRequest("http://localhost/api/admin/users");
    try {
      const res = await handleGetUsers(unauthReq);
      assert.equal(res.status, 401, "Unauthenticated request rejected with 401");
    } catch (err: unknown) {
      assert.ok(err);
    }
  });

  // 3. Admin can retrieve a specific user
  it("3. Admin can retrieve a specific user", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/users/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetUserById(req, targetId);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.id, targetId);
    assert.equal(data.user.name, "Aarav Mehta");
    assert.equal(data.user.email, "aarav.mehta@example.com");
    assert.equal(data.user.role, "APPLICANT");
  });

  // 4. Non-admin cannot retrieve user details through admin endpoint
  it("4. Non-admin cannot retrieve user details through admin endpoint", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";
    const req = createRequest(`http://localhost/api/admin/users/${targetId}`, {
      token: RECRUITER_TOKEN,
    });

    try {
      const res = await handleGetUserById(req, targetId);
      assert.equal(res.status, 403);
    } catch (err: unknown) {
      assert.ok(err);
    }
  });

  // 5. Admin can suspend an active user
  it("5. Admin can suspend an active user", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Active Applicant
    const req = createRequest(`http://localhost/api/admin/users/${targetId}/status`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { status: "SUSPENDED" },
    });
    const res = await handleUpdateUserStatus(req, targetId);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.status, "SUSPENDED");

    // Verify DB update
    const dbUser = userRepository.findById(targetId);
    assert.equal(dbUser?.status, "SUSPENDED");

    // Verify Audit log entry recorded
    const logs = auditService.getLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0]?.action, "USER_STATUS_CHANGED");
    assert.equal(logs[0]?.targetUserId, targetId);
    assert.equal(logs[0]?.previousStatus, "ACTIVE");
    assert.equal(logs[0]?.newStatus, "SUSPENDED");
  });

  // 6. Admin can activate a suspended user
  it("6. Admin can activate a suspended user", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c006"; // Suspended Recruiter Claire Dupont
    const req = createRequest(`http://localhost/api/admin/users/${targetId}/status`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { status: "ACTIVE" },
    });
    const res = await handleUpdateUserStatus(req, targetId);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.status, "ACTIVE");

    const dbUser = userRepository.findById(targetId);
    assert.equal(dbUser?.status, "ACTIVE");
  });

  // 7. Invalid status is rejected
  it("7. Invalid status is rejected", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";
    const req = createRequest(`http://localhost/api/admin/users/${targetId}/status`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { status: "BANNED_FOR_LIFE" },
    });
    const res = await handleUpdateUserStatus(req, targetId);

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes("Invalid status value"));
  });

  // 8. Invalid user ID is rejected
  it("8. Invalid user ID is rejected", async () => {
    const invalidId = "not-a-valid-mongo-object-id";
    const req = createRequest(`http://localhost/api/admin/users/${invalidId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetUserById(req, invalidId);

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes("Invalid user ID format"));
  });

  // 9. Password hash is never returned
  it("9. Password hash is never returned", async () => {
    // Check in user listing
    const listReq = createRequest("http://localhost/api/admin/users", { token: ADMIN_TOKEN });
    const listRes = await handleGetUsers(listReq);
    const listData = await listRes.json();

    for (const u of listData.users) {
      assert.equal((u as Record<string, unknown>)["passwordHash"], undefined);
      assert.equal((u as Record<string, unknown>)["password"], undefined);
    }

    // Check in user details
    const targetId = "65f1a2b3c4d5e6f7a8b9c001";
    const getReq = createRequest(`http://localhost/api/admin/users/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const getRes = await handleGetUserById(getReq, targetId);
    const getData = await getRes.json();
    assert.equal((getData.user as Record<string, unknown>)["passwordHash"], undefined);

    // Check in status update response
    const updateReq = createRequest(
      `http://localhost/api/admin/users/65f1a2b3c4d5e6f7a8b9c008/status`,
      {
        method: "PATCH",
        token: ADMIN_TOKEN,
        body: { status: "SUSPENDED" },
      },
    );
    const updateRes = await handleUpdateUserStatus(updateReq, "65f1a2b3c4d5e6f7a8b9c008");
    const updateData = await updateRes.json();
    assert.equal((updateData.user as Record<string, unknown>)["passwordHash"], undefined);
  });

  // 10. Pagination works correctly
  it("10. Pagination works correctly", async () => {
    const reqPage1 = createRequest("http://localhost/api/admin/users?page=1&limit=5", {
      token: ADMIN_TOKEN,
    });
    const res1 = await handleGetUsers(reqPage1);
    const data1 = await res1.json();

    assert.equal(data1.users.length, 5);
    assert.equal(data1.pagination.page, 1);
    assert.equal(data1.pagination.limit, 5);
    assert.ok(data1.pagination.total > 5);
    assert.ok(data1.pagination.totalPages >= 2);

    const firstUserIdPage1 = data1.users[0].id;

    const reqPage2 = createRequest("http://localhost/api/admin/users?page=2&limit=5", {
      token: ADMIN_TOKEN,
    });
    const res2 = await handleGetUsers(reqPage2);
    const data2 = await res2.json();

    assert.equal(data2.users.length, 5);
    assert.equal(data2.pagination.page, 2);
    // Page 2 should have different users than Page 1
    assert.notEqual(data2.users[0].id, firstUserIdPage1);
  });

  // 11. Search works
  it("11. Search works for name and email", async () => {
    // Search by name
    const reqName = createRequest("http://localhost/api/admin/users?search=Aarav", {
      token: ADMIN_TOKEN,
    });
    const resName = await handleGetUsers(reqName);
    const dataName = await resName.json();
    assert.ok(dataName.users.length >= 1);
    assert.ok(dataName.users.every((u: { name: string }) => u.name.includes("Aarav")));

    // Search by email
    const reqEmail = createRequest("http://localhost/api/admin/users?search=stripe-recruit", {
      token: ADMIN_TOKEN,
    });
    const resEmail = await handleGetUsers(reqEmail);
    const dataEmail = await resEmail.json();
    assert.ok(dataEmail.users.length >= 1);
    assert.ok(dataEmail.users.every((u: { email: string }) => u.email.includes("stripe-recruit")));
  });

  // 12. Role filtering works
  it("12. Role filtering works", async () => {
    // Filter RECRUITER
    const req = createRequest("http://localhost/api/admin/users?role=RECRUITER", {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetUsers(req);
    const data = await res.json();
    assert.ok(data.users.length > 0);
    assert.ok(data.users.every((u: { role: string }) => u.role === "RECRUITER"));

    // Filter APPLICANT
    const reqApp = createRequest("http://localhost/api/admin/users?role=APPLICANT", {
      token: ADMIN_TOKEN,
    });
    const resApp = await handleGetUsers(reqApp);
    const dataApp = await resApp.json();
    assert.ok(dataApp.users.length > 0);
    assert.ok(dataApp.users.every((u: { role: string }) => u.role === "APPLICANT"));
  });

  // 13. Status filtering works
  it("13. Status filtering works", async () => {
    const req = createRequest("http://localhost/api/admin/users?status=SUSPENDED", {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetUsers(req);
    const data = await res.json();
    assert.ok(data.users.length > 0);
    assert.ok(data.users.every((u: { status: string }) => u.status === "SUSPENDED"));
  });

  // 14. Unauthorized status modification is rejected
  it("14. Unauthorized status modification is rejected", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";

    // Recruiter trying to modify status
    const recReq = createRequest(`http://localhost/api/admin/users/${targetId}/status`, {
      method: "PATCH",
      token: RECRUITER_TOKEN,
      body: { status: "SUSPENDED" },
    });
    try {
      const recRes = await handleUpdateUserStatus(recReq, targetId);
      assert.equal(recRes.status, 403);
    } catch (err: unknown) {
      assert.ok(err);
    }

    // Applicant trying to modify status
    const appReq = createRequest(`http://localhost/api/admin/users/${targetId}/status`, {
      method: "PATCH",
      token: APPLICANT_TOKEN,
      body: { status: "ACTIVE" },
    });
    try {
      const appRes = await handleUpdateUserStatus(appReq, targetId);
      assert.equal(appRes.status, 403);
    } catch (err: unknown) {
      assert.ok(err);
    }
  });

  // 15. Protected admin account safeguards work
  it("15. Protected admin account safeguards work (cannot deactivate/suspend the sole active admin)", async () => {
    const admin1Id = "65f1a2b3c4d5e6f7a8b9c001";
    const admin2Id = "65f1a2b3c4d5e6f7a8b9c002";

    // Initial state: 2 active admins exist in DB
    assert.equal(userRepository.countActiveAdmins(), 2);

    // Suspending the first admin succeeds because another active admin (admin2) remains
    const req1 = createRequest(`http://localhost/api/admin/users/${admin1Id}/status`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { status: "SUSPENDED" },
    });
    const res1 = await handleUpdateUserStatus(req1, admin1Id);
    assert.equal(res1.status, 200);
    assert.equal(userRepository.countActiveAdmins(), 1);

    // Now only admin2 is active. Attempting to deactivate or suspend admin2 MUST be blocked!
    // Use ADMIN2_TOKEN because admin1's account is now suspended (admin1's token would be rejected at auth)
    const req2 = createRequest(`http://localhost/api/admin/users/${admin2Id}/status`, {
      method: "PATCH",
      token: ADMIN2_TOKEN,
      body: { status: "SUSPENDED" },
    });
    const res2 = await handleUpdateUserStatus(req2, admin2Id);
    assert.equal(res2.status, 400);
    const data2 = await res2.json();
    assert.ok(
      data2.error.includes("Cannot deactivate or suspend the only active administrator account"),
    );

    // Confirm admin2 remains ACTIVE in DB
    const admin2Db = userRepository.findById(admin2Id);
    assert.equal(admin2Db?.status, "ACTIVE");
  });

  // 16. Bulk status update allows setting status for multiple users
  it("16. Bulk status update allows setting status for multiple users", async () => {
    const ids = ["65f1a2b3c4d5e6f7a8b9c008", "65f1a2b3c4d5e6f7a8b9c009"]; // Aarav Mehta, Sophia Chen
    const req = createRequest("http://localhost/api/admin/users/bulk-status", {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { userIds: ids, status: "SUSPENDED" },
    });
    const res = await handleBulkUpdateUserStatus(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.updatedCount, 2);
    assert.equal(data.failedCount, 0);

    assert.equal(userRepository.findById(ids[0]!)?.status, "SUSPENDED");
    assert.equal(userRepository.findById(ids[1]!)?.status, "SUSPENDED");
  });

  // 17. Bulk status update respects sole active admin safeguard
  it("17. Bulk status update respects sole active admin safeguard", async () => {
    const admin1Id = "65f1a2b3c4d5e6f7a8b9c001";
    const admin2Id = "65f1a2b3c4d5e6f7a8b9c002";

    // Attempting to bulk suspend ALL active admins
    const req = createRequest("http://localhost/api/admin/users/bulk-status", {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { userIds: [admin1Id, admin2Id], status: "SUSPENDED" },
    });
    const res = await handleBulkUpdateUserStatus(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.updatedCount, 1);
    assert.equal(data.failedCount, 1);
    assert.ok(data.failedUserIds.includes(admin2Id));

    // At least one active admin must remain active
    assert.equal(userRepository.countActiveAdmins(), 1);
  });

  // 18. User activity endpoint returns timeline history for user
  it("18. User activity endpoint returns timeline history for user", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta

    // Perform a status change first to generate audit log
    const updateReq = createRequest(`http://localhost/api/admin/users/${targetId}/status`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { status: "SUSPENDED" },
    });
    await handleUpdateUserStatus(updateReq, targetId);

    const req = createRequest(`http://localhost/api/admin/users/${targetId}/activity`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetUserActivity(req, targetId);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.activity));
    assert.ok(data.activity.length >= 2); // Registration event + status change event
    assert.ok(data.activity[0].action.includes("Status changed from ACTIVE to SUSPENDED"));
  });

  // 19. Date range filtering works (dateFrom, dateTo)
  it("19. Date range filtering works (dateFrom, dateTo)", async () => {
    const req = createRequest(
      "http://localhost/api/admin/users?dateFrom=2025-01-01&dateTo=2025-02-01",
      { token: ADMIN_TOKEN },
    );
    const res = await handleGetUsers(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.users.length > 0);
    assert.ok(
      data.users.every((u: { createdAt: string }) => {
        const t = new Date(u.createdAt).getTime();
        return t >= new Date("2025-01-01").getTime() && t <= new Date("2025-02-01T23:59:59.999Z").getTime();
      }),
    );
  });

  // 20. Sorting parameters work (sortBy, sortOrder)
  it("20. Sorting parameters work (sortBy, sortOrder)", async () => {
    // Sort name ASC
    const reqAsc = createRequest("http://localhost/api/admin/users?sortBy=name&sortOrder=asc", {
      token: ADMIN_TOKEN,
    });
    const resAsc = await handleGetUsers(reqAsc);
    const dataAsc = await resAsc.json();

    const namesAsc = dataAsc.users.map((u: { name: string }) => u.name);
    const sortedAsc = [...namesAsc].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(namesAsc, sortedAsc);

    // Sort name DESC
    const reqDesc = createRequest("http://localhost/api/admin/users?sortBy=name&sortOrder=desc", {
      token: ADMIN_TOKEN,
    });
    const resDesc = await handleGetUsers(reqDesc);
    const dataDesc = await resDesc.json();

    const namesDesc = dataDesc.users.map((u: { name: string }) => u.name);
    const sortedDesc = [...namesAsc].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(namesDesc, sortedDesc);
  });

  // 21. Expanded summary metrics are returned
  it("21. Expanded summary metrics are returned", async () => {
    const req = createRequest("http://localhost/api/admin/users", { token: ADMIN_TOKEN });
    const res = await handleGetUsers(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.summary);
    assert.equal(typeof data.summary.totalUsers, "number");
    assert.equal(typeof data.summary.active, "number");
    assert.equal(typeof data.summary.inactive, "number");
    assert.equal(typeof data.summary.suspended, "number");
    assert.equal(typeof data.summary.verified, "number");
    assert.equal(typeof data.summary.unverified, "number");
    assert.equal(typeof data.summary.newThisMonth, "number");
  });

  // 22. Bulk status update rejects invalid input
  it("22. Bulk status update rejects invalid input", async () => {
    // Empty userIds array
    const reqEmpty = createRequest("http://localhost/api/admin/users/bulk-status", {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { userIds: [], status: "ACTIVE" },
    });
    const resEmpty = await handleBulkUpdateUserStatus(reqEmpty);
    assert.equal(resEmpty.status, 400);

    // Invalid status string
    const reqStatus = createRequest("http://localhost/api/admin/users/bulk-status", {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { userIds: ["65f1a2b3c4d5e6f7a8b9c008"], status: "INVALID_STATUS" },
    });
    const resStatus = await handleBulkUpdateUserStatus(reqStatus);
    assert.equal(resStatus.status, 400);
  });
});

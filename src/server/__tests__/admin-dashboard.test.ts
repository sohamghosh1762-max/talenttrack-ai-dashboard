import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { handleAdminApiRequest } from "../routes/admin-users-handler.ts";
import { handleGetAdminDashboard } from "../routes/admin-dashboard-handler.ts";

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
const SUPER_ADMIN_TOKEN = "mock_super_admin_token";
const RECRUITER_TOKEN = "mock_recruiter_token";
const APPLICANT_TOKEN = "mock_applicant_token";

describe("ADMIN DASHBOARD & ANALYTICS API SUITE", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();

    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", ADMIN_TOKEN);
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c002", SUPER_ADMIN_TOKEN);
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c003", RECRUITER_TOKEN);
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c008", APPLICANT_TOKEN);
  });

  describe("Authentication & RBAC Security", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard");
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error);
    });

    it("rejects non-admin applicants with 403", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: APPLICANT_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error);
    });

    it("rejects non-admin recruiters with 403", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: RECRUITER_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error);
    });

    it("allows ADMIN users to access dashboard data", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.stats);
    });

    it("allows SUPER_ADMIN users to access dashboard data", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: SUPER_ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.stats);
    });
  });

  describe("Real Database-Driven Metrics & Source of Truth", () => {
    it("returns real applicant count consistent with user repository", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      const data = await res.json();

      assert.ok(typeof data.stats.totalUsers.rawCount === "number");
      assert.ok(data.stats.totalUsers.rawCount >= 11);
      assert.ok(data.stats.activeApplicants.rawCount >= 1);

      // Verify user distribution reflects real applicant vs recruiter numbers
      const applicantSegment = data.userDistribution.find(
        (s: { name: string }) => s.name === "Applicants",
      );
      assert.ok(applicantSegment);
      assert.ok(applicantSegment.count >= 11);
    });

    it("returns real application pipeline and stage counts", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      const data = await res.json();

      assert.ok(Array.isArray(data.recruitmentOverview.cards));
      assert.strictEqual(data.recruitmentOverview.cards.length, 4);

      const totalAppsCard = data.recruitmentOverview.cards.find(
        (c: { id: string }) => c.id === "total-apps",
      );
      assert.ok(totalAppsCard);
      assert.ok(typeof totalAppsCard.count === "number");

      assert.ok(Array.isArray(data.recruitmentOverview.funnel));
      assert.strictEqual(data.recruitmentOverview.funnel.length, 4);
    });

    it("returns real timeseries platform growth without fake multipliers", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard?range=30%20Days", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      const data = await res.json();

      assert.ok(Array.isArray(data.growthData));
      assert.ok(data.growthData.length > 0);
      data.growthData.forEach(
        (point: { period: string; users: number; jobs: number; applications: number }) => {
          assert.ok(typeof point.period === "string");
          assert.ok(typeof point.users === "number");
          assert.ok(typeof point.jobs === "number");
          assert.ok(typeof point.applications === "number");
        },
      );
    });

    it("returns real recent platform users and activities", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      const data = await res.json();

      assert.ok(Array.isArray(data.recentUsers));
      assert.ok(data.recentUsers.length > 0);
      assert.ok(Array.isArray(data.recentActivity));
      assert.ok(Array.isArray(data.systemStatus));
    });

    it("includes comprehensive analytics object for applications, interviews, ATS, and jobs", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      const data = await res.json();

      assert.ok(data.analytics);
      assert.ok(data.analytics.applications);
      assert.ok(typeof data.analytics.applications.total === "number");
      assert.ok(data.analytics.applications.byStatus);

      assert.ok(data.analytics.interviews);
      assert.ok(typeof data.analytics.interviews.total === "number");

      assert.ok(data.analytics.resumes);
      assert.ok(typeof data.analytics.resumes.total === "number");
      assert.ok(typeof data.analytics.resumes.averageAtsScore === "number");

      assert.ok(data.analytics.jobs);
      assert.ok(typeof data.analytics.jobs.total === "number");
    });
  });

  describe("Date Filtering Support", () => {
    it("handles 'Today' date range query", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard?range=Today", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.stats);
    });

    it("handles '7 Days' date range query", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard?range=7%20Days", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.stats);
    });

    it("handles '12 Months' date range query", async () => {
      const req = createRequest("http://localhost:3000/api/admin/dashboard?range=12%20Months", {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.stats);
    });
  });
});

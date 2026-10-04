import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { conversationRepository } from "../repositories/conversation.repository.ts";
import { notificationRepository } from "../repositories/notification.repository.ts";
import { applicantPreferencesRepository } from "../repositories/applicant-preferences.repository.ts";
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

const ADMIN_TOKEN = "sec_test_admin_token";
const SUPER_ADMIN_TOKEN = "sec_test_super_admin_token";
const RECRUITER_TOKEN = "sec_test_recruiter_token";
const APPLICANT_TOKEN = "sec_test_applicant_token";
const HIRING_MANAGER_TOKEN = "sec_test_hm_token";
const SUSPENDED_USER_TOKEN = "sec_test_suspended_token";

const TEST_APPLICANT_ID = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
const TEST_JOB_ID = "65f1a2b3c4d5e6f7a8b9c101";

describe("PROMPT 7: ADMIN SECURITY, AUTHORIZATION & INTEGRATION TEST SUITE", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    applicationRepository.resetToDefaults();
    jobRepository.resetToDefaults();
    interviewRepository.resetToDefaults();
    conversationRepository.resetToDefaults();
    notificationRepository.resetToDefaults();
    applicantPreferencesRepository.resetToDefaults();

    // 1. Admin session
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", ADMIN_TOKEN);

    // 2. Super Admin session
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c002", SUPER_ADMIN_TOKEN);

    // 3. Recruiter session
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c003", RECRUITER_TOKEN);

    // 4. Applicant session
    sessionRepository.createSession(TEST_APPLICANT_ID, APPLICANT_TOKEN);

    // 5. Hiring Manager session
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c005", HIRING_MANAGER_TOKEN);

    // 6. Suspended User session
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c017", SUSPENDED_USER_TOKEN);
  });

  describe("1. CROSS-ROLE AUTHORIZATION MATRIX (ALL ADMIN ENDPOINTS)", () => {
    const endpoints: Array<{ name: string; url: string; method?: string; body?: unknown }> = [
      { name: "Dashboard", url: "http://localhost:3000/api/admin/dashboard" },
      { name: "Users List", url: "http://localhost:3000/api/admin/users" },
      { name: "User Detail", url: `http://localhost:3000/api/admin/users/${TEST_APPLICANT_ID}` },
      { name: "User Activity", url: `http://localhost:3000/api/admin/users/${TEST_APPLICANT_ID}/activity` },
      { name: "Applicants List", url: "http://localhost:3000/api/admin/applicants" },
      { name: "Applicant Detail", url: `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}` },
      { name: "Applicant Applications", url: `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/applications` },
      { name: "Applicant Interviews", url: `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/interviews` },
      { name: "Applicant Conversations", url: `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/conversations` },
      { name: "Applicant Notifications", url: `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/notifications` },
      { name: "Applicant Preferences", url: `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/preferences` },
      {
        name: "User Status Update",
        url: `http://localhost:3000/api/admin/users/${TEST_APPLICANT_ID}/status`,
        method: "PATCH",
        body: { status: "ACTIVE" },
      },
    ];

    for (const ep of endpoints) {
      describe(`Endpoint: ${ep.name} [${ep.method || "GET"} ${ep.url.replace("http://localhost:3000", "")}]`, () => {
        it("allows ADMIN (200 OK)", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: ADMIN_TOKEN,
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 200);
        });

        it("allows SUPER_ADMIN (200 OK)", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: SUPER_ADMIN_TOKEN,
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 200);
        });

        it("rejects unauthenticated request with 401 Unauthorized", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 401);
          const data = await res.json();
          assert.ok(data.error);
        });

        it("rejects invalid/expired token with 401 Unauthorized", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: "completely_bogus_token",
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 401);
        });

        it("rejects APPLICANT role with 403 Forbidden", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: APPLICANT_TOKEN,
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 403);
          const data = await res.json();
          assert.ok(data.error);
        });

        it("rejects RECRUITER role with 403 Forbidden", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: RECRUITER_TOKEN,
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 403);
        });

        it("rejects HIRING_MANAGER role with 403 Forbidden", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: HIRING_MANAGER_TOKEN,
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 403);
        });

        it("rejects SUSPENDED user token with 403 Forbidden", async () => {
          const req = createRequest(ep.url, {
            method: ep.method || "GET",
            token: SUSPENDED_USER_TOKEN,
            body: ep.body,
          });
          const res = await handleAdminApiRequest(req);
          assert.ok(res);
          assert.strictEqual(res.status, 403);
        });
      });
    }
  });

  describe("2. DATA CONSISTENCY & SHARED SOURCE OF TRUTH", () => {
    it("Test A (Applicant Profile Update): Admin Applicant Detail retrieves updated applicant values", async () => {
      // 1. Applicant updates their profile in shared userRepository
      await userRepository.updateApplicantProfile(TEST_APPLICANT_ID, {
        name: "Aarav S. Mehta (Updated)",
        headline: "Principal Staff Engineer & AI Lead",
        location: "San Francisco Bay Area, CA",
        skills: ["React", "TypeScript", "Next.js", "AI Architecture"],
        bio: "Updated executive engineering biography.",
        summary: "Updated executive engineering biography.",
      });

      // 2. Admin queries /api/admin/applicants/:id
      const req = createRequest(`http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}`, {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const applicant = json.applicant;

      assert.strictEqual(applicant.name, "Aarav S. Mehta (Updated)");
      assert.strictEqual(applicant.headline, "Principal Staff Engineer & AI Lead");
      assert.strictEqual(applicant.location, "San Francisco Bay Area, CA");
      assert.strictEqual(applicant.bio, "Updated executive engineering biography.");
    });

    it("Test B (Application Creation): Admin Applicant Detail immediately reflects newly submitted application", async () => {
      // 1. Applicant submits a new application via applicationRepository
      const newApp = await applicationRepository.create({
        jobId: "65f1a2b3c4d5e6f7a8b9c102", // Lead Backend Developer
        applicantId: TEST_APPLICANT_ID,
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        coverLetter: "Excited to apply for the Lead Backend Developer position.",
      });

      // 2. Admin queries /api/admin/applicants/:id/applications
      const req = createRequest(
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/applications`,
        { token: ADMIN_TOKEN },
      );
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const apps = json.applications;

      const createdAppInAdmin = apps.find((a: any) => a.id === newApp.id);
      assert.ok(createdAppInAdmin, "Created application must be found in Admin applications list");
      assert.strictEqual(createdAppInAdmin.jobTitle, "Lead Backend Developer");
      assert.strictEqual(createdAppInAdmin.job?.company, "TalentTrack AI");
      assert.strictEqual(createdAppInAdmin.coverLetter, "Excited to apply for the Lead Backend Developer position.");
    });

    it("Test C (Interview Creation): Admin Applicant Detail reflects new interview scheduled by recruiter", async () => {
      // 1. Recruiter schedules a new interview for the applicant
      const newInterview = await interviewRepository.create(
        {
          applicationId: "65f1a2b3c4d5e6f7a8b9c201",
          title: "Executive System Design Interview",
          type: "VIDEO",
          scheduledAt: "2026-11-20T16:00:00.000Z",
          durationMinutes: 60,
          meetingUrl: "https://meet.google.com/xyz-exec-adm",
        },
        "65f1a2b3c4d5e6f7a8b9c003",
        TEST_APPLICANT_ID,
        "65f1a2b3c4d5e6f7a8b9c003",
        TEST_JOB_ID,
      );

      // 2. Admin queries /api/admin/applicants/:id/interviews
      const req = createRequest(
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/interviews`,
        { token: ADMIN_TOKEN },
      );
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const interviews = json.interviews;

      const createdIvInAdmin = interviews.find((i: any) => i.id === newInterview.id);
      assert.ok(createdIvInAdmin, "Scheduled interview must be visible in Admin view");
      assert.strictEqual(createdIvInAdmin.title, "Executive System Design Interview");
      assert.strictEqual(createdIvInAdmin.meetingUrl, "https://meet.google.com/xyz-exec-adm");
    });

    it("Test D (Notifications Read-Only Guarantee): Admin viewing notifications does NOT mark them as read", async () => {
      // 1. Verify unread notification exists for candidate
      const beforeNotifs = await notificationRepository.findUserNotifications(TEST_APPLICANT_ID);
      const unreadBefore = beforeNotifs.notifications.find((n) => n.id === "65f1a2b3c4d5e6f7a8b9c701");
      assert.ok(unreadBefore);
      assert.strictEqual(unreadBefore.readAt, null, "Notification must start unread (readAt === null)");

      // 2. Admin fetches /api/admin/applicants/:id/notifications
      const req = createRequest(
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/notifications`,
        { token: ADMIN_TOKEN },
      );
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      // 3. Admin also fetches full applicant detail payload
      const detailReq = createRequest(
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}`,
        { token: ADMIN_TOKEN },
      );
      const detailRes = await handleAdminApiRequest(detailReq);
      assert.ok(detailRes);
      assert.strictEqual(detailRes.status, 200);

      // 4. Verify notification in repository remains unread
      const afterNotifs = await notificationRepository.findUserNotifications(TEST_APPLICANT_ID);
      const unreadAfter = afterNotifs.notifications.find((n) => n.id === "65f1a2b3c4d5e6f7a8b9c701");
      assert.ok(unreadAfter);
      assert.strictEqual(unreadAfter.readAt, null, "Notification must remain unread after Admin inspection");
    });

    it("Test E (Preferences Read-Only Guarantee): Admin viewing preferences retrieves stored values without mutation", async () => {
      // 1. Custom applicant preferences
      const initialPref = await applicantPreferencesRepository.findByUserId(TEST_APPLICANT_ID);
      assert.strictEqual(initialPref.jobRecommendationAlerts, true);

      // 2. Admin retrieves preferences
      const req = createRequest(
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/preferences`,
        { token: ADMIN_TOKEN },
      );
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.preferences.jobRecommendationAlerts, true);
      assert.strictEqual(json.preferences.userId, TEST_APPLICANT_ID);
    });
  });

  describe("3. DATA PRIVACY & SENSITIVE CREDENTIAL SANITIZATION", () => {
    it("never returns passwordHash or security secrets in applicant responses", async () => {
      const endpoints = [
        `http://localhost:3000/api/admin/applicants`,
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}`,
        `http://localhost:3000/api/admin/users`,
        `http://localhost:3000/api/admin/users/${TEST_APPLICANT_ID}`,
      ];

      for (const url of endpoints) {
        const req = createRequest(url, { token: ADMIN_TOKEN });
        const res = await handleAdminApiRequest(req);
        assert.ok(res);
        const text = await res.text();

        assert.strictEqual(text.includes("passwordHash"), false, `URL ${url} must not include passwordHash`);
        assert.strictEqual(text.includes("password123"), false, `URL ${url} must not include raw passwords`);
        assert.strictEqual(text.includes("sessionToken"), false, `URL ${url} must not include sessionToken`);
        assert.strictEqual(text.includes("tokenHash"), false, `URL ${url} must not include tokenHash`);
      }
    });

    it("sanitizes conversations to metadata only and protects message body privacy", async () => {
      const req = createRequest(
        `http://localhost:3000/api/admin/applicants/${TEST_APPLICANT_ID}/conversations`,
        { token: ADMIN_TOKEN },
      );
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      const json = await res.json();

      assert.ok(Array.isArray(json.conversations));
      json.conversations.forEach((conv: any) => {
        assert.ok(conv.id);
        assert.ok(conv.participantIds);
        assert.strictEqual(conv.messages, undefined, "Private message bodies must not be included");
        assert.strictEqual(conv.body, undefined, "Private body text must not be included");
      });
    });
  });

  describe("4. INPUT VALIDATION & PAGINATION BOUNDS SECURITY", () => {
    it("rejects non-hex ObjectId format with 400 Bad Request on all applicant endpoints", async () => {
      const invalidEndpoints = [
        "http://localhost:3000/api/admin/applicants/not-a-valid-id",
        "http://localhost:3000/api/admin/applicants/not-a-valid-id/applications",
        "http://localhost:3000/api/admin/applicants/not-a-valid-id/interviews",
        "http://localhost:3000/api/admin/applicants/not-a-valid-id/conversations",
        "http://localhost:3000/api/admin/applicants/not-a-valid-id/notifications",
        "http://localhost:3000/api/admin/applicants/not-a-valid-id/preferences",
      ];

      for (const url of invalidEndpoints) {
        const req = createRequest(url, { token: ADMIN_TOKEN });
        const res = await handleAdminApiRequest(req);
        assert.ok(res);
        assert.strictEqual(res.status, 400, `URL ${url} should return 400 for invalid ObjectId format`);
        const json = await res.json();
        assert.ok(json.error);
      }
    });

    it("returns 404 Not Found for non-existent 24-character hexadecimal ObjectId", async () => {
      const nonExistentId = "65f1a2b3c4d5e6f7a8b9c999";
      const req = createRequest(`http://localhost:3000/api/admin/applicants/${nonExistentId}`, {
        token: ADMIN_TOKEN,
      });
      const res = await handleAdminApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.ok(json.error);
    });

    it("rejects invalid pagination parameters (page=0, negative, limit>100) with 400", async () => {
      const badParams = [
        "page=0",
        "page=-5",
        "page=abc",
        "limit=0",
        "limit=101",
        "limit=-10",
      ];

      for (const param of badParams) {
        const req = createRequest(`http://localhost:3000/api/admin/applicants?${param}`, {
          token: ADMIN_TOKEN,
        });
        const res = await handleAdminApiRequest(req);
        assert.ok(res);
        assert.strictEqual(res.status, 400, `Param ${param} should be rejected with 400`);
      }
    });

    it("rejects invalid filter values (e.g. invalid status, invalid sort field) with 400", async () => {
      const badFilters = [
        "status=INVALID_STATUS",
        "sortBy=unsupportedColumn",
        "sortOrder=sideways",
        "emailVerified=maybe",
      ];

      for (const filter of badFilters) {
        const req = createRequest(`http://localhost:3000/api/admin/applicants?${filter}`, {
          token: ADMIN_TOKEN,
        });
        const res = await handleAdminApiRequest(req);
        assert.ok(res);
        assert.strictEqual(res.status, 400, `Filter ${filter} should be rejected with 400`);
      }
    });
  });
});

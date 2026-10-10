import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { firebaseAdminService } from "../services/firebase-admin-service.ts";
import { handleApiRequest } from "../routes/index.ts";
import { authenticate } from "../middleware/auth-middleware.ts";

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

describe("Firebase Applicant Authentication Test Suite", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    firebaseAdminService.clearMockTokens();
  });

  describe("1. Firebase ID Token Verification & Middleware", () => {
    it("Rejects request with missing Authorization header (401)", async () => {
      const req = createRequest("http://localhost/api/applications/my");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
    });

    it("Rejects request with invalid or malformed token (401)", async () => {
      const req = createRequest("http://localhost/api/applications/my", {
        token: "invalid-garbage-token-12345",
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
    });

    it("Successfully authenticates verified Firebase ID token", async () => {
      const testToken = "test-firebase:fb_uid_test_1:candidate.new@test.com";
      const req = createRequest("http://localhost/api/auth/me", { token: testToken });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, "APPLICANT");
      assert.strictEqual(json.data.user.firebaseUid, "fb_uid_test_1");
    });
  });

  describe("2. MongoDB Applicant Resolution, Linking & Provisioning", () => {
    it("Provisions new Applicant record on first-time Firebase sign-in", async () => {
      const token = "mock-fb-token-first-time";
      firebaseAdminService.registerMockToken(token, {
        uid: "fb_new_applicant_999",
        email: "brand.new@example.com",
        name: "Brand New Applicant",
        email_verified: true,
      });

      const req = createRequest("http://localhost/api/auth/firebase-bootstrap", {
        method: "POST",
        token,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const user = json.data.user;
      assert.strictEqual(user.firebaseUid, "fb_new_applicant_999");
      assert.strictEqual(user.email, "brand.new@example.com");
      assert.strictEqual(user.role, "APPLICANT");

      // Verify user exists in repository
      const fromDb = userRepository.findByFirebaseUid("fb_new_applicant_999");
      assert.ok(fromDb);
      assert.strictEqual(fromDb.id, user.id);
    });

    it("Safely links firebaseUid to existing MongoDB Applicant with verified email without creating duplicates", async () => {
      // Existing seed applicant: Aarav Mehta (aarav.mehta@example.com, id: 65f1a2b3c4d5e6f7a8b9c008)
      const existing = userRepository.findByEmail("aarav.mehta@example.com");
      assert.ok(existing);
      assert.strictEqual(existing.firebaseUid, undefined);

      const token = "mock-fb-aarav-token";
      firebaseAdminService.registerMockToken(token, {
        uid: "google_oauth_uid_aarav_777",
        email: "aarav.mehta@example.com",
        name: "Aarav Mehta Google",
        email_verified: true,
      });

      const req = createRequest("http://localhost/api/auth/me", { token });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.user.id, existing.id); // Same MongoDB ID preserved!
      assert.strictEqual(json.data.user.firebaseUid, "google_oauth_uid_aarav_777");

      // Verify no duplicate user was created
      const allUsers = userRepository.findAll({ search: "aarav.mehta@example.com" });
      assert.strictEqual(allUsers.users.length, 1);
    });

    it("Prevents duplicate account creation on repeated logins with the same Firebase UID", async () => {
      const token = "mock-repeat-token";
      firebaseAdminService.registerMockToken(token, {
        uid: "fb_repeat_uid_123",
        email: "repeat.candidate@test.com",
        name: "Repeat Candidate",
        email_verified: true,
      });

      // First login
      const req1 = createRequest("http://localhost/api/auth/me", { token });
      const res1 = await handleApiRequest(req1);
      const json1 = await res1!.json();
      const userId1 = json1.data.user.id;

      // Second login
      const req2 = createRequest("http://localhost/api/auth/me", { token });
      const res2 = await handleApiRequest(req2);
      const json2 = await res2!.json();
      const userId2 = json2.data.user.id;

      assert.strictEqual(userId1, userId2);
    });

    it("Handles Phone Number OTP login when email is not provided", async () => {
      const token = "mock-phone-otp-token";
      firebaseAdminService.registerMockToken(token, {
        uid: "fb_phone_uid_9876543210",
        phone_number: "+919876543210",
      });

      const req = createRequest("http://localhost/api/auth/firebase-bootstrap", {
        method: "POST",
        token,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.user.firebaseUid, "fb_phone_uid_9876543210");
      assert.strictEqual(json.data.user.role, "APPLICANT");
      assert.ok(json.data.user.email);
    });
  });

  describe("3. Applicant Authorization & Role Escalation Protection", () => {
    it("Firebase Applicant CANNOT access recruiter-only APIs (403)", async () => {
      const token = "test-firebase:fb_applicant_1:app1@test.com";

      // Attempt to create a job (recruiter-only)
      const req = createRequest("http://localhost/api/jobs", {
        method: "POST",
        token,
        body: {
          title: "Malicious Job Post",
          description: "Testing role barrier",
          department: "Engineering",
          location: "Remote",
          employmentType: "Full-time",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
    });

    it("Firebase Applicant CANNOT access admin-only APIs (403)", async () => {
      const token = "test-firebase:fb_applicant_1:app1@test.com";

      const req = createRequest("http://localhost/api/admin/users", { token });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
    });

    it("Firebase Applicant CAN submit job application to a PUBLISHED job using verified identity", async () => {
      // 1. Create a published job under recruiter Rahul Mehta
      const recruiter = userRepository.findByEmail("rahul.mehta@talenttrack.ai")!;
      const job = await jobRepository.create({
        title: "Senior React Architect",
        description: "Leading frontend architecture",
        department: "Engineering",
        location: "Remote",
        employmentType: "Full-Time",
        recruiterId: recruiter.id,
        status: "PUBLISHED",
      });

      // 2. Applicant submits application with Firebase token
      const token = "test-firebase:fb_app_submitter:submitter@test.com";
      const req = createRequest("http://localhost/api/applications", {
        method: "POST",
        token,
        body: {
          jobId: job.id,
          coverLetter: "Excited to apply via Firebase Auth!",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 201);

      const json = await res.json();
      assert.strictEqual(json.data.jobId, job.id);
      assert.strictEqual(json.data.recruiterId, recruiter.id);

      // Verify applicantId matches derived identity
      const applicantUser = userRepository.findByFirebaseUid("fb_app_submitter")!;
      assert.strictEqual(json.data.applicantId, applicantUser.id);
    });

    it("Firebase Applicant can retrieve personal application history", async () => {
      const token = "test-firebase:fb_app_history:hist@test.com";
      const req = createRequest("http://localhost/api/applications/my", { token });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.ok(Array.isArray(json.data));
    });
  });

  describe("4. Recruiter & Admin Authentication Independence", () => {
    it("Recruiter session authentication continues working without Firebase", async () => {
      // Recruiter login via standard credentials
      const req = createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: {
          email: "rahul.mehta@talenttrack.ai",
          password: "password123",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.user.role, "RECRUITER");
      assert.ok(json.data.token);

      // Verify recruiter can access recruiter applications
      const recReq = createRequest("http://localhost/api/recruiter/applications", {
        token: json.data.token,
      });
      const recRes = await handleApiRequest(recReq);
      assert.ok(recRes);
      assert.strictEqual(recRes.status, 200);
    });

    it("Public job board remains accessible without any authentication", async () => {
      const req = createRequest("http://localhost/api/jobs");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
    });
  });

  describe("5. Role Conflict & Security Guarantees", () => {
    it("Rejects Applicant Google bootstrap if email belongs to an existing Recruiter (409 Conflict)", async () => {
      const token = "mock-recruiter-conflict-token";
      firebaseAdminService.registerMockToken(token, {
        uid: "google_uid_recruiter_conflict",
        email: "rahul.mehta@talenttrack.ai", // Existing recruiter in seed
        name: "Rahul Mehta Conflict",
        email_verified: true,
      });

      const req = createRequest("http://localhost/api/auth/firebase-bootstrap", {
        method: "POST",
        token,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 409);

      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(
        json.error?.message?.includes("recruiter/admin account") ||
          json.message?.includes("recruiter/admin account"),
      );
    });

    it("Ignores client-supplied applicantId and role in body during bootstrap", async () => {
      const token = "mock-spoof-body-token";
      firebaseAdminService.registerMockToken(token, {
        uid: "fb_clean_uid_555",
        email: "clean.applicant@test.com",
        name: "Clean Applicant",
        email_verified: true,
      });

      const req = createRequest("http://localhost/api/auth/firebase-bootstrap", {
        method: "POST",
        token,
        body: {
          applicantId: "malicious_spoofed_id",
          role: "ADMIN",
          userId: "malicious_admin_id",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.user.role, "APPLICANT");
      assert.strictEqual(json.data.user.firebaseUid, "fb_clean_uid_555");
      assert.notStrictEqual(json.data.user.id, "malicious_spoofed_id");
    });
  });
});

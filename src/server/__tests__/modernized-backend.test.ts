import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { jobQueueService } from "../workers/job-queue.ts";
import { ResumeBackgroundWorker } from "../workers/resume-worker.ts";
import { handleApiRequest } from "../routes/index.ts";
import { errorResponse, successResponse } from "../utils/response.ts";
import { ValidationError, NotFoundError, DatabaseConnectionError } from "../utils/errors.ts";
import {
  parsePaginationParams,
  parseSortParams,
  buildPaginationMetadata,
  escapeRegexString,
} from "../utils/query-parser.ts";

function createJsonRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
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

describe("MODERNIZED BACKEND & DATABASE INTEGRATION SUITE", () => {
  let adminUser: any;
  let adminToken: string;
  let recruiterUser: any;
  let recruiterToken: string;
  let applicantUser: any;
  let applicantToken: string;

  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.clearAll();
    applicationRepository.clearAll();
    resumeRepository.clearAll();
    interviewRepository.clearAll();
    jobQueueService.clearAll();

    // 1. Create Admin
    adminUser = userRepository.createUser({
      name: "Platform Admin",
      email: "admin.modern@talenttrack.ai",
      passwordHash: "password123",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    });
    adminToken = "admin-token-test-123456";
    sessionRepository.createSession(adminUser.id, adminToken);

    // 2. Create Recruiter
    recruiterUser = userRepository.createUser({
      name: "Sarah Recruiter",
      email: "sarah.recruiter@talenttrack.ai",
      passwordHash: "password123",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterToken = "recruiter-token-test-123456";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);

    // 3. Create Applicant
    applicantUser = userRepository.createUser({
      name: "Aarav Mehta",
      email: "aarav.applicant@example.com",
      passwordHash: "password123",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    userRepository.updateApplicantProfile(applicantUser.id, {
      headline: "Senior Frontend Engineer",
      location: "San Francisco, CA",
      skills: ["React", "TypeScript", "Node.js"],
    });
    applicantToken = "applicant-token-test-123456";
    sessionRepository.createSession(applicantUser.id, applicantToken);
  });

  describe("1. Query Parser, Pagination, Allowlist Sorting & Regex Safety", () => {
    it("safely parses pagination parameters and enforces sensible defaults and maximum limits", () => {
      const normalParams = new URLSearchParams("page=2&limit=25");
      const p1 = parsePaginationParams(normalParams);
      assert.strictEqual(p1.page, 2);
      assert.strictEqual(p1.limit, 25);
      assert.strictEqual(p1.skip, 25);

      // Enforces maximum limit of 100
      const excessiveParams = new URLSearchParams("page=-5&limit=500");
      const p2 = parsePaginationParams(excessiveParams, 10, 100);
      assert.strictEqual(p2.page, 1, "Negative page should reset to 1");
      assert.strictEqual(p2.limit, 100, "Excessive limit should be clamped to 100");
      assert.strictEqual(p2.skip, 0);
    });

    it("builds consistent pagination metadata", () => {
      const meta = buildPaginationMetadata(55, 2, 20);
      assert.strictEqual(meta.page, 2);
      assert.strictEqual(meta.limit, 20);
      assert.strictEqual(meta.total, 55);
      assert.strictEqual(meta.totalPages, 3);
      assert.strictEqual(meta.hasNextPage, true);
      assert.strictEqual(meta.hasPrevPage, true);
    });

    it("enforces explicit allowlists for sorting fields", () => {
      const allowed = ["createdAt", "name", "email"];
      const maliciousParams = new URLSearchParams("sortBy=$where&sortOrder=asc");
      const sort = parseSortParams(maliciousParams, allowed, "createdAt", "desc");
      assert.strictEqual(
        sort.sortBy,
        "createdAt",
        "Disallowed sort parameter must fallback to default",
      );
      assert.strictEqual(sort.sortOrder, "asc");
      assert.strictEqual(sort.sortDirection, 1);
    });

    it("escapes special characters to prevent regex and ReDoS injection", () => {
      const dangerousInput = ".*+?^${}()|[]\\test";
      const escaped = escapeRegexString(dangerousInput);
      assert.ok(!escaped.includes(".*"), "Wildcards must be escaped");
      assert.ok(escaped.includes("\\.\\*\\+\\?"));
    });
  });

  describe("2. Centralized Error Handling & Diagnostics", () => {
    it("formats Mongoose-style validation errors into 400 Bad Request with field-level details", async () => {
      const validationErr = {
        name: "ValidationError",
        errors: {
          email: { message: "Invalid email format" },
          title: { message: "Title is required" },
        },
      };

      const res = errorResponse(validationErr);
      assert.strictEqual(res.status, 400);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "VALIDATION_ERROR");
      assert.strictEqual(json.error.details.email, "Invalid email format");
      assert.strictEqual(json.error.details.title, "Title is required");
      assert.ok(res.headers.get("X-Request-Id"), "Response must include X-Request-Id");
    });

    it("formats duplicate key errors (code 11000) into 409 Conflict", async () => {
      const duplicateErr = {
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: "duplicate@talenttrack.ai" },
      };

      const res = errorResponse(duplicateErr);
      assert.strictEqual(res.status, 409);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "DUPLICATE_KEY_ERROR");
      assert.strictEqual(json.error.details.keyValue.email, "duplicate@talenttrack.ai");
    });

    it("formats CastErrors (invalid ObjectIds) into 400 Bad Request", async () => {
      const castErr = {
        name: "CastError",
        path: "jobId",
        value: "not-an-object-id",
      };

      const res = errorResponse(castErr);
      assert.strictEqual(res.status, 400);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "INVALID_IDENTIFIER");
      assert.strictEqual(json.error.details.field, "jobId");
    });

    it("formats database unavailability into 503 Service Unavailable", async () => {
      const dbErr = new DatabaseConnectionError("Database connection lost");
      const res = errorResponse(dbErr);
      assert.strictEqual(res.status, 503);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "DATABASE_UNAVAILABLE");
    });
  });

  describe("3. Health and Readiness Endpoints", () => {
    it("GET /api/health returns 200 with service health status", async () => {
      const req = createJsonRequest("http://localhost:3000/api/health");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.status, "healthy");
      assert.strictEqual(json.data.service, "talenttrack-ai-api");
    });

    it("GET /api/ready returns readiness check response", async () => {
      const req = createJsonRequest("http://localhost:3000/api/ready");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.ok([200, 503].includes(res.status));

      const json = (await res.json()) as any;
      assert.ok("ready" in json.data);
      assert.ok("database" in json.data);
    });
  });

  describe("4. Candidate Talent Pool APIs (GET & PATCH /api/candidates)", () => {
    it("GET /api/candidates rejects unauthenticated requests with 401 Unauthorized", async () => {
      const req = createJsonRequest("http://localhost:3000/api/candidates");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
    });

    it("GET /api/candidates rejects applicant user with 403 Forbidden", async () => {
      const req = createJsonRequest("http://localhost:3000/api/candidates", {
        token: applicantToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
    });

    it("GET /api/candidates allows recruiters to retrieve candidates with pagination", async () => {
      const req = createJsonRequest("http://localhost:3000/api/candidates?page=1&limit=10", {
        token: recruiterToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.candidates));
      assert.ok(json.data.pagination);
      assert.strictEqual(json.data.pagination.page, 1);
      assert.strictEqual(json.data.pagination.limit, 10);
      assert.ok(json.data.candidates.length >= 1);
    });

    it("GET /api/candidates supports filtering by skill and search query", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/candidates?search=Aarav&skill=React",
        { token: recruiterToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      const match = json.data.candidates.find((c: any) => c.name === "Aarav Mehta");
      assert.ok(match, "Should find candidate matching name and skill");
    });

    it("GET /api/candidates/:id retrieves full candidate profile", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/candidates/${applicantUser.id}`, {
        token: recruiterToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.id, applicantUser.id);
      assert.strictEqual(json.data.name, "Aarav Mehta");
      assert.ok(Array.isArray(json.data.skills));
      assert.ok(json.data.skills.includes("React"));
    });

    it("PATCH /api/candidates/:id allows updating candidate profile attributes safely", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/candidates/${applicantUser.id}`, {
        method: "PATCH",
        token: applicantToken,
        body: {
          headline: "Staff Frontend Architect",
          skills: ["React", "TypeScript", "Next.js", "GraphQL"],
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.applicantProfile.headline, "Staff Frontend Architect");
    });
  });

  describe("5. Durable Background Job Queue & Concurrency Locking", () => {
    it("enqueues background jobs with unique IDs and initial pending status", async () => {
      const job = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-test-001", applicantId: applicantUser.id },
      });

      assert.ok(job.jobId.startsWith("job_"));
      assert.strictEqual(job.type, "RESUME_PARSE");
      assert.strictEqual(job.status, "pending");
      assert.strictEqual(job.retryCount, 0);
    });

    it("enforces idempotency when enqueuing the same pending resume", async () => {
      const job1 = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-idempotency-test", applicantId: applicantUser.id },
      });

      const job2 = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-idempotency-test", applicantId: applicantUser.id },
      });

      assert.strictEqual(job1.jobId, job2.jobId, "Duplicate enqueue must return existing job");
    });

    it("atomically acquires jobs and sets concurrency lease locks", async () => {
      const job = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-concurrency-test" },
      });

      // Worker 1 acquires the job
      const acquired1 = await jobQueueService.acquireNextJob("worker_instance_1");
      assert.ok(acquired1);
      assert.strictEqual(acquired1.jobId, job.jobId);
      assert.strictEqual(acquired1.status, "processing");

      // Worker 2 attempts to acquire simultaneously -> must get null (locked)
      const acquired2 = await jobQueueService.acquireNextJob("worker_instance_2");
      assert.strictEqual(acquired2, null, "Concurrent worker must not acquire locked job");
    });

    it("applies bounded exponential backoff retries on transient failures", async () => {
      const job = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-retry-test" },
        maxRetries: 3,
      });

      const acquired = await jobQueueService.acquireNextJob("worker_1");
      assert.ok(acquired);

      // Simulate transient failure (e.g. rate limit)
      await jobQueueService.failJob(job.jobId, "Gemini quota exceeded", "RATE_LIMIT");

      const statusAfterFailure = await jobQueueService.getJob(job.jobId);
      assert.ok(statusAfterFailure);
      assert.strictEqual(
        statusAfterFailure.status,
        "pending",
        "Transient failure must be re-queued",
      );
      assert.strictEqual(statusAfterFailure.failureCategory, "RATE_LIMIT");
      assert.strictEqual(statusAfterFailure.lastError, "Gemini quota exceeded");
    });

    it("dead-letters tasks that exceed maximum retry limit", async () => {
      const job = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-dead-letter-test" },
        maxRetries: 1,
      });

      const acquired = await jobQueueService.acquireNextJob("worker_1");
      assert.ok(acquired);

      // Fail once (retryCount becomes 1 >= maxRetries)
      await jobQueueService.failJob(job.jobId, "Unrecoverable parse error", "TRANSIENT");

      const deadLetterJob = await jobQueueService.getJob(job.jobId);
      assert.ok(deadLetterJob);
      assert.strictEqual(
        deadLetterJob.status,
        "failed",
        "Task exceeding maxRetries must be failed",
      );
      assert.ok(deadLetterJob.lastError);
    });

    it("allows operators to manually retry failed tasks", async () => {
      const job = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-operator-retry" },
        maxRetries: 1,
      });

      await jobQueueService.acquireNextJob("worker_1");
      await jobQueueService.failJob(job.jobId, "Failed permanently", "PERMANENT");

      const retried = await jobQueueService.retryJob(job.jobId);
      assert.ok(retried);
      assert.strictEqual(retried.status, "pending");
      assert.strictEqual(retried.retryCount, 0);
    });

    it("recovers stale locked jobs left behind by crashed workers", async () => {
      // Simulate crashed worker by manipulating lockedAt timestamp
      const job = await jobQueueService.enqueue({
        type: "RESUME_PARSE",
        payload: { resumeId: "res-stale-test" },
      });

      const acquired = await jobQueueService.acquireNextJob("crashed_worker");
      assert.ok(acquired);

      const recoveredCount = await jobQueueService.recoverStaleJobs();
      assert.strictEqual(typeof recoveredCount, "number");
    });
  });

  describe("6. Asynchronous Resume Parsing & Status Endpoints", () => {
    let testResume: any;

    beforeEach(async () => {
      testResume = await resumeRepository.create({
        applicantId: applicantUser.id,
        originalFileName: "test_resume.pdf",
        storedFileName: "test_resume_stored.pdf",
        mimeType: "application/pdf",
        fileSize: 10240,
        s3Key: "resumes/test_resume.pdf",
        s3Bucket: "talenttrack-resumes",
      });
    });

    it("POST /api/resumes/:id/parse?async=true returns 202 Accepted with job identifier", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/resumes/${testResume.id}/parse?async=true`,
        {
          method: "POST",
          token: applicantToken,
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 202);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.ok(json.data.jobId);
      assert.strictEqual(json.data.parsingStatus, "PROCESSING");
      assert.strictEqual(json.data.resumeId, testResume.id);
    });

    it("GET /api/resumes/:id/status inspects processing state", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume.id}/status`, {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.resumeId, testResume.id);
      assert.strictEqual(json.data.parsingStatus, "NOT_STARTED");
    });

    it("POST /api/resumes/:id/retry schedules re-processing for eligible resumes", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume.id}/retry`, {
        method: "POST",
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 202);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.ok(json.data.jobId);
      assert.strictEqual(json.data.parsingStatus, "PROCESSING");
    });
  });

  describe("7. Session and AuthToken Persistence", () => {
    it("creates, validates, touches, and revokes sessions cleanly", () => {
      const token = "secure-session-token-abc123xyz";
      const session = sessionRepository.createSession(applicantUser.id, token, {
        ipAddress: "127.0.0.1",
        userAgent: "TestAgent/1.0",
      });

      assert.ok(session.id.startsWith("sess_"));
      assert.strictEqual(session.userId, applicantUser.id);
      assert.strictEqual(session.ipAddress, "127.0.0.1");

      const validSession = sessionRepository.findValidSessionByToken(token);
      assert.ok(validSession);
      assert.strictEqual(validSession.id, session.id);

      sessionRepository.touchSession(token);

      const revoked = sessionRepository.revokeSessionByToken(token);
      assert.strictEqual(revoked, true);

      const revokedCheck = sessionRepository.findValidSessionByToken(token);
      assert.strictEqual(revokedCheck, null, "Revoked session must not be valid");
    });

    it("creates, validates, and consumes password reset tokens", () => {
      const { token } = tokenRepository.createPasswordResetToken(applicantUser.id, 60);
      assert.ok(token);

      const checkValid = tokenRepository.verifyPasswordResetToken(token);
      assert.strictEqual(checkValid.valid, true);
      assert.strictEqual(checkValid.userId, applicantUser.id);

      const consumed = tokenRepository.consumePasswordResetToken(token);
      assert.strictEqual(consumed, true);

      const checkReused = tokenRepository.verifyPasswordResetToken(token);
      assert.strictEqual(checkReused.valid, false, "Consumed token must not be reusable");
    });

    it("creates, validates, and consumes email verification tokens", () => {
      const { token } = tokenRepository.createEmailVerificationToken(applicantUser.id, 48);
      assert.ok(token);

      const checkValid = tokenRepository.verifyEmailVerificationToken(token);
      assert.strictEqual(checkValid.valid, true);
      assert.strictEqual(checkValid.userId, applicantUser.id);

      const consumed = tokenRepository.consumeEmailVerificationToken(token);
      assert.strictEqual(consumed, true);

      const checkConsumed = tokenRepository.verifyEmailVerificationToken(token);
      assert.strictEqual(checkConsumed.valid, false);
    });
  });
});

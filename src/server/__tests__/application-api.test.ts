import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { handleApiRequest } from "../routes/index.ts";

function createJsonRequest(
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

describe("APPLICATION MANAGEMENT REST API & RBAC SUITE", () => {
  let applicant1User: any;
  let applicant1Token: string;
  let applicant2User: any;
  let applicant2Token: string;
  let recruiter1User: any;
  let recruiter1Token: string;
  let recruiter2User: any;
  let recruiter2Token: string;

  let publishedJob1: any;
  let publishedJob2: any;
  let draftJob: any;
  let archivedJob: any;
  let closedJob: any;

  let applicant1Resume: any;
  let applicant2Resume: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.clearAll();
    resumeRepository.clearAll();
    applicationRepository.clearAll();

    // 1. Create Users
    applicant1User = userRepository.createUser({
      email: "applicant1@talenttrack.io",
      name: "Aarav Mehta",
      passwordHash: "passwordHash123",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant1Token = "applicant1-test-token-123456";
    sessionRepository.createSession(applicant1User.id, applicant1Token);

    applicant2User = userRepository.createUser({
      email: "applicant2@talenttrack.io",
      name: "Priya Sharma",
      passwordHash: "passwordHash123",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant2Token = "applicant2-test-token-123456";
    sessionRepository.createSession(applicant2User.id, applicant2Token);

    recruiter1User = userRepository.createUser({
      email: "recruiter1@talenttrack.io",
      name: "Sarah Recruiter",
      passwordHash: "passwordHash123",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiter1Token = "recruiter1-test-token-123456";
    sessionRepository.createSession(recruiter1User.id, recruiter1Token);

    recruiter2User = userRepository.createUser({
      email: "recruiter2@talenttrack.io",
      name: "Alex Recruiter",
      passwordHash: "passwordHash123",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiter2Token = "recruiter2-test-token-123456";
    sessionRepository.createSession(recruiter2User.id, recruiter2Token);

    // 2. Create Jobs
    publishedJob1 = await jobRepository.create({
      title: "Senior React Engineer",
      description: "Building next-generation web applications.",
      department: "Engineering",
      location: "San Francisco, CA",
      employmentType: "Full-Time",
      experienceRequired: "5+ years",
      skills: ["React", "TypeScript", "Next.js"],
      recruiterId: recruiter1User.id,
      status: "PUBLISHED",
    });

    publishedJob2 = await jobRepository.create({
      title: "Lead AI Engineer",
      description: "Developing transformer LLM pipeline.",
      department: "Data & AI",
      location: "Austin, TX",
      employmentType: "Full-Time",
      experienceRequired: "6+ years",
      skills: ["Python", "PyTorch", "NLP"],
      recruiterId: recruiter2User.id,
      status: "PUBLISHED",
    });

    draftJob = await jobRepository.create({
      title: "Draft Product Manager",
      description: "Internal drafting stage.",
      department: "Product",
      location: "Remote",
      employmentType: "Full-Time",
      experienceRequired: "3+ years",
      skills: ["Roadmapping", "Agile"],
      recruiterId: recruiter1User.id,
      status: "DRAFT",
    });

    archivedJob = await jobRepository.create({
      title: "Archived QA Engineer",
      description: "Archived posting.",
      department: "Quality",
      location: "Remote",
      employmentType: "Contract",
      experienceRequired: "2+ years",
      skills: ["Playwright", "Jest"],
      recruiterId: recruiter1User.id,
      status: "ARCHIVED",
    });

    closedJob = await jobRepository.create({
      title: "Closed DevOps Lead",
      description: "Closed posting.",
      department: "Infrastructure",
      location: "Remote",
      employmentType: "Full-Time",
      experienceRequired: "5+ years",
      skills: ["Kubernetes", "Terraform"],
      recruiterId: recruiter1User.id,
      status: "CLOSED",
    });

    // 3. Create Resumes
    applicant1Resume = await resumeRepository.create({
      applicantId: applicant1User.id,
      originalFileName: "Aarav_Resume.pdf",
      storedFileName: "aarav_uuid.pdf",
      mimeType: "application/pdf",
      fileSize: 102400,
      s3Key: `resumes/${applicant1User.id}/aarav_uuid.pdf`,
      s3Bucket: "talenttrack-resumes-private",
    });

    applicant2Resume = await resumeRepository.create({
      applicantId: applicant2User.id,
      originalFileName: "Priya_Resume.pdf",
      storedFileName: "priya_uuid.pdf",
      mimeType: "application/pdf",
      fileSize: 104800,
      s3Key: `resumes/${applicant2User.id}/priya_uuid.pdf`,
      s3Bucket: "talenttrack-resumes-private",
    });
  });

  /* ------------------------------------------------------------- */
  /* PHASE 3 - 8: APPLICANT SUBMISSION API                         */
  /* ------------------------------------------------------------- */

  it("should successfully allow an authenticated applicant to apply to a published job", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: publishedJob1.id,
        resumeId: applicant1Resume.id,
        coverLetter: "Excited to apply for this React role!",
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201, "Should return 201 Created");

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id);
    assert.equal(json.data.jobId, publishedJob1.id);
    assert.equal(json.data.applicantId, applicant1User.id);
    assert.equal(json.data.recruiterId, recruiter1User.id);
    assert.equal(json.data.status, "APPLIED");
    assert.equal(json.data.currentStage, "APPLIED");

    // Verify persistence in repository
    const stored = await applicationRepository.findById(json.data.id);
    assert.ok(stored, "Application must persist in repository");
    assert.equal(stored.applicantId, applicant1User.id);
    assert.equal(stored.recruiterId, recruiter1User.id);
  });

  it("should reject unauthenticated application submission with 401", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      // No token
      body: {
        jobId: publishedJob1.id,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401);
  });

  it("should reject recruiter accounts from submitting applications with 403", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: recruiter1Token,
      body: {
        jobId: publishedJob1.id,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("should reject application for non-existent job with 404", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: "65f1a2b3c4d5e6f7a8b9c999",
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("should reject application for DRAFT job with 404", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: draftJob.id,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("should reject application for ARCHIVED job with 404", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: archivedJob.id,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("should reject application for CLOSED job with 404", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: closedJob.id,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("should reject non-existent resumeId with 404", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: publishedJob1.id,
        resumeId: "65f1a2b3c4d5e6f7a8b9c999",
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("should reject submitting another applicant's resume with 403", async () => {
    // Applicant 1 tries to attach Applicant 2's resume
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: publishedJob1.id,
        resumeId: applicant2Resume.id,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403, "Should prevent using another applicant's resume");
  });

  it("should reject duplicate application to the same job with 409 Conflict", async () => {
    // First application
    const req1 = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: publishedJob1.id,
        resumeId: applicant1Resume.id,
      },
    });
    const res1 = await handleApiRequest(req1);
    assert.ok(res1);
    assert.equal(res1.status, 201);

    // Second application to the same job
    const req2 = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: publishedJob1.id,
        resumeId: applicant1Resume.id,
      },
    });
    const res2 = await handleApiRequest(req2);
    assert.ok(res2);
    assert.equal(res2.status, 409, "Should return 409 Conflict on duplicate application");

    const json = await res2.json();
    assert.equal(json.success, false);
    assert.match(json.message, /already applied/i);
  });

  it("should prevent applicantId and recruiterId spoofing by client", async () => {
    const req = createJsonRequest("https://talenttrack.ai/api/applications", {
      method: "POST",
      token: applicant1Token,
      body: {
        jobId: publishedJob1.id,
        applicantId: "spoofed-applicant-id-999",
        recruiterId: "spoofed-recruiter-id-999",
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);

    const json = await res.json();
    // Must be authenticated applicant1User.id, not the spoofed string
    assert.equal(json.data.applicantId, applicant1User.id);
    // Must be job recruiter1User.id, not the spoofed string
    assert.equal(json.data.recruiterId, recruiter1User.id);
  });

  /* ------------------------------------------------------------- */
  /* PHASE 12 - 13: APPLICANT APPLICATION HISTORY                  */
  /* ------------------------------------------------------------- */

  it("should retrieve only own applications for authenticated applicant", async () => {
    // Applicant 1 applies to Job 1
    await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    // Applicant 2 applies to Job 2
    await applicationRepository.create({
      jobId: publishedJob2.id,
      applicantId: applicant2User.id,
      recruiterId: recruiter2User.id,
      resumeId: applicant2Resume.id,
    });

    // Applicant 1 queries personal history
    const req = createJsonRequest("https://talenttrack.ai/api/applications/my", {
      token: applicant1Token,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].jobId, publishedJob1.id);
    assert.equal(json.data[0].applicantId, applicant1User.id);
    assert.ok(json.data[0].job, "Should include populated job info");
    assert.equal(json.data[0].job.title, "Senior React Engineer");
  });

  /* ------------------------------------------------------------- */
  /* PHASE 14: APPLICATION DETAIL ACCESS CONTROL                   */
  /* ------------------------------------------------------------- */

  it("should allow applicant to view own application detail", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    const req = createJsonRequest(`https://talenttrack.ai/api/applications/${app.id}`, {
      token: applicant1Token,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.application.id, app.id);
  });

  it("should deny applicant from viewing another applicant's application with 403", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    // Applicant 2 attempts to view Applicant 1's application
    const req = createJsonRequest(`https://talenttrack.ai/api/applications/${app.id}`, {
      token: applicant2Token,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("should allow recruiter to view application for their own job", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    const req = createJsonRequest(`https://talenttrack.ai/api/applications/${app.id}`, {
      token: recruiter1Token,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
  });

  it("should deny recruiter from viewing application for another recruiter's job with 403", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    // Recruiter 2 attempts to view application belonging to Recruiter 1
    const req = createJsonRequest(`https://talenttrack.ai/api/applications/${app.id}`, {
      token: recruiter2Token,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  /* ------------------------------------------------------------- */
  /* PHASE 15 - 17: RECRUITER APPLICATION LIST                     */
  /* ------------------------------------------------------------- */

  it("should allow recruiter to retrieve applications only for their own jobs", async () => {
    // App 1 for Recruiter 1
    await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    // App 2 for Recruiter 2
    await applicationRepository.create({
      jobId: publishedJob2.id,
      applicantId: applicant2User.id,
      recruiterId: recruiter2User.id,
      resumeId: applicant2Resume.id,
    });

    // Recruiter 1 requests their application list
    const req = createJsonRequest("https://talenttrack.ai/api/recruiter/applications", {
      token: recruiter1Token,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].jobId, publishedJob1.id);
    assert.equal(json.data[0].recruiterId, recruiter1User.id);
    assert.equal(json.data[0].applicant.name, "Aarav Mehta");
  });

  it("should support job and status filtering on recruiter applications list", async () => {
    await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const req = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications?jobId=${publishedJob1.id}&status=APPLIED`,
      {
        token: recruiter1Token,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.data.length, 1);
  });

  /* ------------------------------------------------------------- */
  /* PHASE 18: RESUME ACCESS CONTROLS                              */
  /* ------------------------------------------------------------- */

  it("should allow recruiter to download resume for a candidate applied to their job", async () => {
    await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    // Recruiter 1 downloads Applicant 1's resume
    const req = createJsonRequest(
      `https://talenttrack.ai/api/resumes/${applicant1Resume.id}/download`,
      {
        token: recruiter1Token,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.downloadUrl);
  });

  it("should deny unrelated recruiter from downloading candidate's resume with 403", async () => {
    await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });

    // Recruiter 2 tries to download Applicant 1's resume (not applied to Recruiter 2's jobs)
    const req = createJsonRequest(
      `https://talenttrack.ai/api/resumes/${applicant1Resume.id}/download`,
      {
        token: recruiter2Token,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  /* ------------------------------------------------------------- */
  /* PHASE 19: RECRUITER PIPELINE KANBAN STAGE UPDATE & SECURITY   */
  /* ------------------------------------------------------------- */

  it("should successfully update application stage for owned job via PATCH /api/recruiter/applications/:id/stage", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
      resumeId: applicant1Resume.id,
    });
    assert.equal(app.currentStage, "APPLIED");

    const req = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter1Token,
        body: {
          stage: "SCREENING",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200, "Should return 200 OK for valid stage update");

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.stage, "SCREENING");
    assert.equal(json.data.application.currentStage, "SCREENING");
    assert.equal(json.data.application.status, "SCREENING");

    // Verify persistence in MongoDB / Repository
    const persisted = await applicationRepository.findById(app.id);
    assert.ok(persisted);
    assert.equal(persisted.currentStage, "SCREENING");
    assert.equal(persisted.status, "SCREENING");
  });

  it("should support transitions across all valid stages", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const validStages = ["SCREENING", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN", "APPLIED"];

    for (const targetStage of validStages) {
      const req = createJsonRequest(
        `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
        {
          method: "PATCH",
          token: recruiter1Token,
          body: {
            stage: targetStage,
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.data.stage, targetStage);

      // Verify persistence
      const persisted = await applicationRepository.findById(app.id);
      assert.ok(persisted);
      assert.equal(persisted.currentStage, targetStage);
    }
  });

  it("should also support PATCH /api/applications/:id/stage endpoint", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const req = createJsonRequest(
      `https://talenttrack.ai/api/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter1Token,
        body: {
          stage: "INTERVIEW",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.data.stage, "INTERVIEW");
  });

  it("should reject unauthenticated stage update with 401", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const req = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        // No token
        body: {
          stage: "INTERVIEW",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401, "Unauthenticated request must return 401");
  });

  it("should reject applicant role attempting stage update with 403 Forbidden", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const req = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: applicant1Token, // Applicant role
        body: {
          stage: "OFFERED",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403, "Applicant must be rejected with 403");
  });

  it("should reject recruiter updating another recruiter's application with 403 Forbidden", async () => {
    // Application belongs to Recruiter 1
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    // Recruiter 2 attempts to change stage
    const req = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter2Token,
        body: {
          stage: "OFFERED",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403, "Cross-recruiter modification must be blocked with 403");
  });

  it("should reject non-existent application with 404", async () => {
    const req = createJsonRequest(
      "https://talenttrack.ai/api/recruiter/applications/65f1a2b3c4d5e6f7a8b9c999/stage",
      {
        method: "PATCH",
        token: recruiter1Token,
        body: {
          stage: "SCREENING",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404, "Non-existent application must return 404");
  });

  it("should reject invalid/malformed application ID with 400 Bad Request", async () => {
    const req = createJsonRequest(
      "https://talenttrack.ai/api/recruiter/applications/invalid-id-format/stage",
      {
        method: "PATCH",
        token: recruiter1Token,
        body: {
          stage: "SCREENING",
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400, "Malformed application ID must return 400");
  });

  it("should reject invalid stage values with 400 Bad Request", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const invalidStages = ["INVALID", "PENDING", "SHORTLISTED", "RANDOM_VALUE", "HIRED"];

    for (const invalidStage of invalidStages) {
      const req = createJsonRequest(
        `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
        {
          method: "PATCH",
          token: recruiter1Token,
          body: {
            stage: invalidStage,
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 400, `Invalid stage '${invalidStage}' must return 400`);

      const json = await res.json();
      assert.equal(json.success, false);
    }
  });

  it("should reject missing, empty, or non-string stage with 400 Bad Request", async () => {
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    // 1. Missing stage
    const req1 = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter1Token,
        body: {},
      },
    );
    const res1 = await handleApiRequest(req1);
    assert.ok(res1);
    assert.equal(res1.status, 400);

    // 2. Empty stage
    const req2 = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter1Token,
        body: { stage: "" },
      },
    );
    const res2 = await handleApiRequest(req2);
    assert.ok(res2);
    assert.equal(res2.status, 400);

    // 3. Numeric stage
    const req3 = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter1Token,
        body: { stage: 123 },
      },
    );
    const res3 = await handleApiRequest(req3);
    assert.ok(res3);
    assert.equal(res3.status, 400);
  });

  it("should ignore client-supplied recruiterId in body and enforce session ownership", async () => {
    // App belongs to Recruiter 1
    const app = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    // Recruiter 2 tries to spoof recruiterId: recruiter1User.id in payload
    const req = createJsonRequest(
      `https://talenttrack.ai/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiter2Token,
        body: {
          stage: "OFFERED",
          recruiterId: recruiter1User.id,
        },
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403, "Cannot bypass authorization via client recruiterId");
  });

  it("should filter applications by updated stage in GET /api/recruiter/applications", async () => {
    const app1 = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiter1User.id,
    });

    const app2 = await applicationRepository.create({
      jobId: publishedJob1.id,
      applicantId: applicant2User.id,
      recruiterId: recruiter1User.id,
    });

    // Move app1 to INTERVIEW
    await applicationRepository.updateStage(app1.id, "INTERVIEW");

    // Recruiter queries stage=INTERVIEW
    const req = createJsonRequest(
      "https://talenttrack.ai/api/recruiter/applications?stage=INTERVIEW",
      {
        token: recruiter1Token,
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].id, app1.id);
    assert.equal(json.data[0].currentStage, "INTERVIEW");
  });
});

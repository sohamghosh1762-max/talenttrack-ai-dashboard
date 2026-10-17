import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { handleApiRequest } from "../routes/index.ts";

function createApiRequest(
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

describe("JOB MANAGEMENT REST API & RBAC SUITE", () => {
  let recruiterToken: string;
  let recruiterUser: any;
  let recruiter2Token: string;
  let recruiter2User: any;
  let applicantToken: string;
  let applicantUser: any;
  let adminToken: string;
  let adminUser: any;

  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.clearAll();

    // 1. Create Recruiter 1
    recruiterUser = userRepository.createUser({
      email: "recruiter1@talenttrack.io",
      name: "Sarah Recruiter",
      passwordHash: "passwordHash123",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterToken = "recruiter1-test-token-abcdef123456";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);

    // 2. Create Recruiter 2
    recruiter2User = userRepository.createUser({
      email: "recruiter2@talenttrack.io",
      name: "Alex Recruiter",
      passwordHash: "passwordHash123",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiter2Token = "recruiter2-test-token-abcdef123456";
    sessionRepository.createSession(recruiter2User.id, recruiter2Token);

    // 3. Create Applicant
    applicantUser = userRepository.createUser({
      email: "applicant@talenttrack.io",
      name: "Jane Applicant",
      passwordHash: "passwordHash123",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantToken = "applicant-test-token-abcdef123456";
    sessionRepository.createSession(applicantUser.id, applicantToken);

    // 4. Create Admin
    adminUser = userRepository.createUser({
      email: "admin@talenttrack.io",
      name: "Super Admin",
      passwordHash: "passwordHash123",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    });
    adminToken = "admin-test-token-abcdef123456";
    sessionRepository.createSession(adminUser.id, adminToken);
  });

  // =========================================================================
  // PHASE 3 — CREATE JOB API TESTS
  // =========================================================================
  describe("Phase 3: Create Job API (POST /api/jobs)", () => {
    it("Authenticated recruiter can create a new job opening (201 Created)", async () => {
      const payload = {
        title: "Senior Full Stack Engineer",
        description: "Join our core team building resilient cloud services and web applications.",
        department: "Engineering",
        location: "San Francisco, CA (Hybrid)",
        employmentType: "Full-Time",
        experienceRequired: "3-5 years",
        skills: ["React", "Node.js", "TypeScript", "MongoDB"],
        salaryRange: {
          min: 140000,
          max: 180000,
          currency: "USD",
        },
        status: "PUBLISHED",
      };

      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        method: "POST",
        token: recruiterToken,
        body: payload,
      });

      const res = await handleApiRequest(req);
      assert.ok(res, "Response should exist");
      assert.strictEqual(res.status, 201);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.id, "Should return generated ID");
      assert.strictEqual(json.data.title, payload.title);
      assert.strictEqual(
        json.data.recruiterId,
        recruiterUser.id,
        "recruiterId must match authenticated user",
      );
      assert.strictEqual(json.data.status, "PUBLISHED");
    });

    it("Rejects unauthenticated requests with 401 Unauthorized", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        method: "POST",
        body: {
          title: "Senior Backend Developer",
          description: "Develop APIs and backend systems with high throughput.",
          department: "Engineering",
          location: "Remote",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
    });

    it("Rejects applicant users with 403 Forbidden", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        method: "POST",
        token: applicantToken,
        body: {
          title: "Unauthorized Job Creation",
          description: "This should fail because applicant cannot create jobs.",
          department: "Design",
          location: "Remote",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
    });

    it("Rejects invalid job data with 400 Bad Request", async () => {
      // Missing description and empty title
      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        method: "POST",
        token: recruiterToken,
        body: {
          title: "",
          department: "Engineering",
          location: "Remote",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 400);
    });

    it("Forces recruiterId to authenticated user identity and ignores spoofed recruiterId in body", async () => {
      const spoofedRecruiterId = "507f1f77bcf86cd799439099";
      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        method: "POST",
        token: recruiterToken,
        body: {
          title: "Secure Ownership Test Job",
          description: "Ensuring recruiterId is taken from session and not client body payload.",
          department: "Engineering",
          location: "Austin, TX",
          recruiterId: spoofedRecruiterId,
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 201);

      const json = await res.json();
      assert.strictEqual(
        json.data.recruiterId,
        recruiterUser.id,
        "recruiterId must match authenticated recruiter, NOT spoofed ID",
      );
    });
  });

  // =========================================================================
  // PHASE 4 — VIEW JOBS API TESTS
  // =========================================================================
  describe("Phase 4: View Jobs API (GET /api/jobs)", () => {
    beforeEach(async () => {
      // Seed jobs for tests
      await jobRepository.create({
        title: "Frontend Architect",
        department: "Engineering",
        location: "San Francisco, CA",
        employmentType: "Full-Time",
        description: "Architect Next.js and React client solutions.",
        skills: ["React", "TypeScript", "GraphQL"],
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
      });

      await jobRepository.create({
        title: "AI Research Scientist",
        department: "Research",
        location: "New York, NY",
        employmentType: "Full-Time",
        description: "Research semantic embedding representations.",
        skills: ["Python", "PyTorch", "NLP"],
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
      });

      await jobRepository.create({
        title: "Internal Draft Role",
        department: "Design",
        location: "Remote",
        employmentType: "Contract",
        description: "Draft role in progress for Q4.",
        skills: ["Figma"],
        recruiterId: recruiterUser.id,
        status: "DRAFT",
      });

      await jobRepository.create({
        title: "Old Archived Position",
        department: "Operations",
        location: "Austin, TX",
        employmentType: "Full-Time",
        description: "Position has been archived.",
        skills: ["Operations"],
        recruiterId: recruiterUser.id,
        status: "ARCHIVED",
      });

      await jobRepository.create({
        title: "Recruiter 2 Job Opening",
        department: "Engineering",
        location: "Seattle, WA",
        employmentType: "Full-Time",
        description: "Managed by recruiter 2.",
        skills: ["Go", "Kubernetes"],
        recruiterId: recruiter2User.id,
        status: "PUBLISHED",
      });
    });

    it("Public / Applicant users only see PUBLISHED jobs (drafts and archived are hidden)", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      const jobs = json.data.jobs || json.data;

      assert.ok(jobs.length >= 3);
      // Ensure all returned jobs are PUBLISHED or Active
      for (const job of jobs) {
        assert.ok(
          job.status === "PUBLISHED" || job.status === "Active",
          `Status should be published/active, was ${job.status}`,
        );
        assert.notStrictEqual(job.title, "Internal Draft Role");
        assert.notStrictEqual(job.title, "Old Archived Position");
      }
    });

    it("Recruiter can view their own jobs (including drafts and archived)", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        token: recruiterToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const jobs = json.data.jobs || json.data;
      const titles = jobs.map((j: any) => j.title);

      assert.ok(titles.includes("Frontend Architect"));
      assert.ok(titles.includes("AI Research Scientist"));
      assert.ok(
        titles.includes("Internal Draft Role"),
        "Recruiter should see their own draft jobs",
      );
      assert.ok(
        titles.includes("Old Archived Position"),
        "Recruiter should see their own archived jobs",
      );
    });

    it("Filters jobs by department and search keyword", async () => {
      const req = createApiRequest(
        "https://app.talenttrack.io/api/jobs?department=Research&search=semantic",
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const jobs = json.data.jobs || json.data;
      assert.strictEqual(jobs.length, 1);
      assert.strictEqual(jobs[0].title, "AI Research Scientist");
    });
  });

  // =========================================================================
  // PHASE 5 — VIEW SINGLE JOB API TESTS
  // =========================================================================
  describe("Phase 5: View Single Job API (GET /api/jobs/:id)", () => {
    let publishedJobId: string;
    let draftJobId: string;

    beforeEach(async () => {
      const pubJob = await jobRepository.create({
        title: "Published Job For Details Test",
        department: "Engineering",
        location: "San Francisco, CA",
        employmentType: "Full-Time",
        description: "Deep dive job description testing.",
        skills: ["React"],
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
      });
      publishedJobId = pubJob.id;

      const draftJob = await jobRepository.create({
        title: "Confidential Draft Executive Role",
        department: "Management",
        location: "Remote",
        employmentType: "Full-Time",
        description: "Confidential draft role.",
        skills: ["Leadership"],
        recruiterId: recruiterUser.id,
        status: "DRAFT",
      });
      draftJobId = draftJob.id;
    });

    it("Public user can view published job details", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${publishedJobId}`);
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.title, "Published Job For Details Test");
    });

    it("Public user gets 404 when trying to access a draft job", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${draftJobId}`);
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);
    });

    it("Authorized recruiter can view their own draft job", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${draftJobId}`, {
        token: recruiterToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.data.title, "Confidential Draft Executive Role");
    });

    it("Returns 404 for nonexistent job ID", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs/job-nonexistent-12345");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);
    });
  });

  // =========================================================================
  // PHASE 6 — EDIT JOB API TESTS
  // =========================================================================
  describe("Phase 6: Edit Job API (PUT/PATCH /api/jobs/:id)", () => {
    let jobId: string;

    beforeEach(async () => {
      const created = await jobRepository.create({
        title: "Initial Title",
        department: "Engineering",
        location: "San Francisco, CA",
        employmentType: "Full-Time",
        description: "Initial description that is long enough.",
        skills: ["React"],
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
      });
      jobId = created.id;
    });

    it("Recruiter can edit their own job opening", async () => {
      const updatePayload = {
        title: "Senior Staff React & Node Architect",
        location: "San Francisco, CA (Remote Friendly)",
        skills: ["React", "Node.js", "TypeScript", "Next.js"],
        salaryRange: {
          min: 160000,
          max: 200000,
          currency: "USD",
        },
      };

      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${jobId}`, {
        method: "PATCH",
        token: recruiterToken,
        body: updatePayload,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.title, "Senior Staff React & Node Architect");
      assert.strictEqual(json.data.skills.length, 4);

      // Verify in repository
      const inDb = await jobRepository.findById(jobId);
      assert.strictEqual(inDb?.title, "Senior Staff React & Node Architect");
    });

    it("Recruiter cannot edit another recruiter's job opening (403 Forbidden)", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${jobId}`, {
        method: "PATCH",
        token: recruiter2Token, // Recruiter 2 trying to edit Recruiter 1's job
        body: {
          title: "Malicious Edit Attempt",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
    });

    it("Recruiter ownership cannot be transferred via update", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${jobId}`, {
        method: "PATCH",
        token: recruiterToken,
        body: {
          title: "Updated Title",
          recruiterId: recruiter2User.id, // Attempt to transfer ownership
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const inDb = await jobRepository.findById(jobId);
      assert.strictEqual(
        inDb?.recruiterId,
        recruiterUser.id,
        "Ownership must remain with original recruiter",
      );
    });
  });

  // =========================================================================
  // PHASE 7 — ARCHIVE JOB API TESTS
  // =========================================================================
  describe("Phase 7: Archive Job API (PATCH /api/jobs/:id/archive)", () => {
    let jobId: string;

    beforeEach(async () => {
      const created = await jobRepository.create({
        title: "Role To Be Archived",
        department: "Marketing",
        location: "Remote",
        employmentType: "Full-Time",
        description: "Job description for archiving test.",
        skills: ["SEO", "Content"],
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
      });
      jobId = created.id;
    });

    it("Recruiter can soft-archive their own job opening (status = ARCHIVED)", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${jobId}/archive`, {
        method: "PATCH",
        token: recruiterToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.status, "ARCHIVED");

      // Verify still exists in database with status ARCHIVED (not physically deleted!)
      const inDb = await jobRepository.findById(jobId);
      assert.ok(inDb, "Job document must still exist in database");
      assert.strictEqual(inDb?.status, "ARCHIVED");
    });

    it("Recruiter cannot archive another recruiter's job opening (403 Forbidden)", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${jobId}/archive`, {
        method: "PATCH",
        token: recruiter2Token,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
    });

    it("Archived job automatically disappears from public job listings", async () => {
      // 1. Archive the job
      await jobRepository.archive(jobId);

      // 2. Query public jobs
      const req = createApiRequest("https://app.talenttrack.io/api/jobs");
      const res = await handleApiRequest(req);
      assert.ok(res);
      const json = await res.json();

      const jobs = json.data.jobs || json.data;
      const ids = jobs.map((j: any) => j.id);
      assert.strictEqual(
        ids.includes(jobId),
        false,
        "Archived job must not appear in public listings",
      );
    });
  });

  describe("Phase 8: Applicant Job Details & Unique Job ID Resolution", () => {
    let job1: any;
    let job2: any;
    let job3: any;

    beforeEach(async () => {
      job1 = await jobRepository.create({
        title: "AI/ML Systems Engineer",
        description: "Develop ML infrastructure and fine-tune transformer models.",
        department: "Research",
        location: "New York, NY (Hybrid)",
        employmentType: "Full-Time",
        experienceRequired: "3+ years",
        skills: ["Python", "PyTorch", "FastAPI", "Vector Search"],
        salaryRange: { min: 160000, max: 210000, currency: "USD", isNegotiable: false },
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
        deadline: "2026-11-30",
      });

      job2 = await jobRepository.create({
        title: "Lead Backend Developer",
        description: "Design distributed microservices and database architectures.",
        department: "Engineering",
        location: "Austin, TX (Remote)",
        employmentType: "Full-Time",
        experienceRequired: "4+ years",
        skills: ["Node.js", "TypeScript", "PostgreSQL", "MongoDB"],
        salaryRange: { min: 150000, max: 195000, currency: "USD", isNegotiable: true },
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
        deadline: "2026-12-31",
      });

      job3 = await jobRepository.create({
        title: "Senior Frontend Developer",
        description: "Create responsive client dashboards with React and TypeScript.",
        department: "Engineering",
        location: "San Francisco, CA (Hybrid)",
        employmentType: "Full-Time",
        experienceRequired: "3-5 years",
        skills: ["React", "TypeScript", "Tailwind CSS"],
        salaryRange: { min: 140000, max: 180000, currency: "USD", isNegotiable: true },
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
        deadline: "2026-12-31",
      });
    });

    it("Applicant GET /api/jobs returns all published jobs each with their unique ID", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs", {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const jobs = json.data.jobs || json.data;

      assert.ok(jobs.length >= 3);
      const ids = jobs.map((j: any) => j.id);
      assert.ok(ids.includes(job1.id));
      assert.ok(ids.includes(job2.id));
      assert.ok(ids.includes(job3.id));

      // Each ID is unique and non-empty string
      const uniqueIds = new Set(ids);
      assert.strictEqual(uniqueIds.size, ids.length);
    });

    it("GET /api/jobs/:jobId returns the exact matching AI/ML Systems Engineer job", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${job1.id}`, {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const job = json.data.job || json.data;

      assert.strictEqual(job.id, job1.id);
      assert.strictEqual(job.title, "AI/ML Systems Engineer");
      assert.strictEqual(job.department, "Research");
      assert.strictEqual(job.location, "New York, NY (Hybrid)");
      assert.strictEqual(job.salaryRange.min, 160000);
      assert.strictEqual(job.salaryRange.max, 210000);
      assert.deepStrictEqual(job.skills, ["Python", "PyTorch", "FastAPI", "Vector Search"]);
    });

    it("GET /api/jobs/:jobId returns the exact matching Lead Backend Developer job", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${job2.id}`, {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const job = json.data.job || json.data;

      assert.strictEqual(job.id, job2.id);
      assert.strictEqual(job.title, "Lead Backend Developer");
      assert.strictEqual(job.department, "Engineering");
      assert.strictEqual(job.location, "Austin, TX (Remote)");
    });

    it("GET /api/jobs/:jobId returns the exact matching Senior Frontend Developer job", async () => {
      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${job3.id}`, {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      const job = json.data.job || json.data;

      assert.strictEqual(job.id, job3.id);
      assert.strictEqual(job.title, "Senior Frontend Developer");
      assert.strictEqual(job.department, "Engineering");
      assert.strictEqual(job.location, "San Francisco, CA (Hybrid)");
    });

    it("GET /api/jobs/:jobId returns 404 for nonexistent or invalid job ID", async () => {
      const req = createApiRequest("https://app.talenttrack.io/api/jobs/job-nonexistent-9999", {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);
    });

    it("GET /api/jobs/:jobId blocks applicant from viewing unpublished DRAFT job (404)", async () => {
      const draftJob = await jobRepository.create({
        title: "Unpublished Internal Role",
        description: "Draft role not yet open.",
        department: "Engineering",
        location: "Remote",
        employmentType: "Full-Time",
        recruiterId: recruiterUser.id,
        status: "DRAFT",
      });

      const req = createApiRequest(`https://app.talenttrack.io/api/jobs/${draftJob.id}`, {
        token: applicantToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);
    });
  });
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeMongoUri,
  getDatabaseStatus,
  isDatabaseConnected,
  connectToDatabase,
  disconnectDatabase,
} from "../db/mongodb.ts";
import { User } from "../models/User.ts";
import { Recruiter } from "../models/Recruiter.ts";
import { Applicant } from "../models/Applicant.ts";
import { Job } from "../models/Job.ts";
import { Application } from "../models/Application.ts";
import { userRepository, isValidObjectId, generateObjectId } from "../db/user-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { handleApiRequest } from "../routes/index.ts";

describe("PHASE 3: MongoDB Production Integration & Persistence Suite", () => {
  before(() => {
    userRepository.resetToDefaults();
    jobRepository.resetToDefaults();
    applicationRepository.resetToDefaults();
  });

  describe("1. MongoDB Connection & Configuration Utilities", () => {
    it("sanitizes MongoDB Atlas connection URI with username & password safely", () => {
      const atlasUri =
        "mongodb+srv://mockuser:MockPassword123@mockcluster.mongodb.net/?appName=Cluster0";
      const sanitized = sanitizeMongoUri(atlasUri);
      assert.ok(!sanitized.includes("MockPassword123"), "Password must not be in sanitized URI");
      assert.ok(sanitized.includes("*****"), "Password should be masked with asterisks");
      assert.ok(sanitized.includes("mockcluster.mongodb.net"), "Host should be preserved");
    });

    it("sanitizes standard MongoDB connection string safely", () => {
      const standardUri = "mongodb://dbadmin:mypassword@localhost:27017/talenttrack";
      const sanitized = sanitizeMongoUri(standardUri);
      assert.ok(!sanitized.includes("mypassword"));
      assert.ok(sanitized.includes("*****"));
    });

    it("returns safe database status without exposing credentials", () => {
      const status = getDatabaseStatus();
      assert.ok(["connected", "connecting", "disconnected", "disconnecting"].includes(status.status));
      assert.strictEqual(typeof status.readyState, "number");
    });

    it("GET /api/health exposes safe database connectivity status", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.ok(json.data.database);
      assert.ok(["connected", "disconnected", "connecting"].includes(json.data.database));
      assert.strictEqual(json.data.service, "talenttrack-ai-api");
    });
  });

  describe("2. MongoDB Models & Validation", () => {
    it("validates 24-character hexadecimal MongoDB ObjectIds correctly", () => {
      assert.strictEqual(isValidObjectId("65f1a2b3c4d5e6f7a8b9c001"), true);
      assert.strictEqual(isValidObjectId("invalid-object-id"), false);
      assert.strictEqual(isValidObjectId("65f1a2b3c4d5e6f7a8b9c00"), false); // 23 chars
      assert.strictEqual(isValidObjectId(""), false);
    });

    it("generates genuine 24-character hexadecimal MongoDB ObjectIds", () => {
      const newId = generateObjectId();
      assert.strictEqual(newId.length, 24);
      assert.strictEqual(isValidObjectId(newId), true);
    });

    it("creates and instantiates User model with RBAC role defaults and safe projection", () => {
      const userDoc = new User({
        _id: "65f1a2b3c4d5e6f7a8b9c999",
        name: "Test Engineer",
        email: "engineer@talenttrack.ai",
        passwordHash: "securely_hashed_string",
        role: "RECRUITER",
      });

      assert.strictEqual(userDoc.name, "Test Engineer");
      assert.strictEqual(userDoc.email, "engineer@talenttrack.ai");
      assert.strictEqual(userDoc.role, "RECRUITER");
      assert.strictEqual(userDoc.status, "ACTIVE");
      assert.strictEqual(userDoc.emailVerified, false);

      const safe = userDoc.toSafeUser();
      assert.strictEqual((safe as any).passwordHash, undefined, "Password hash must be stripped from safe projection");
      assert.strictEqual(safe.name, "Test Engineer");
      assert.strictEqual(safe.id, "65f1a2b3c4d5e6f7a8b9c999");
    });

    it("creates and instantiates Recruiter model with User reference", () => {
      const recruiterDoc = new Recruiter({
        userId: "65f1a2b3c4d5e6f7a8b9c003",
        companyName: "TalentTrack AI",
        designation: "Head of Talent",
        department: "Global Tech Hiring",
        phone: "+1 555 0192",
      });

      assert.strictEqual(recruiterDoc.companyName, "TalentTrack AI");
      assert.strictEqual(recruiterDoc.designation, "Head of Talent");
      assert.strictEqual(recruiterDoc.userId.toString(), "65f1a2b3c4d5e6f7a8b9c003");
    });

    it("creates and instantiates Applicant model with candidate skills & profile", () => {
      const applicantDoc = new Applicant({
        userId: "65f1a2b3c4d5e6f7a8b9c008",
        headline: "Principal Systems Architect",
        location: "Seattle, WA",
        skills: ["Go", "Kubernetes", "Kafka", "MongoDB"],
        experience: "8 years",
      });

      assert.strictEqual(applicantDoc.headline, "Principal Systems Architect");
      assert.strictEqual(applicantDoc.location, "Seattle, WA");
      assert.deepStrictEqual(applicantDoc.skills, ["Go", "Kubernetes", "Kafka", "MongoDB"]);
      assert.strictEqual(applicantDoc.userId.toString(), "65f1a2b3c4d5e6f7a8b9c008");
    });

    it("creates and instantiates Job model with recruiterId reference and indexed fields", () => {
      const jobDoc = new Job({
        title: "Staff Cloud Engineer",
        description: "Scale multi-region Kubernetes infrastructure.",
        department: "Infrastructure",
        location: "Remote",
        employmentType: "Full-Time",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        status: "PUBLISHED",
        skills: ["AWS", "Terraform", "Kubernetes"],
        salaryRange: { min: 180000, max: 230000, currency: "USD", isNegotiable: true },
      });

      assert.strictEqual(jobDoc.title, "Staff Cloud Engineer");
      assert.strictEqual(jobDoc.department, "Infrastructure");
      assert.strictEqual(jobDoc.status, "PUBLISHED");
      assert.strictEqual(jobDoc.recruiterId.toString(), "65f1a2b3c4d5e6f7a8b9c003");
      assert.strictEqual(jobDoc.salaryRange?.min, 180000);
    });

    it("creates and instantiates Application model linking Job, Applicant, and Recruiter", () => {
      const appDoc = new Application({
        jobId: "65f1a2b3c4d5e6f7a8b9c101",
        applicantId: "65f1a2b3c4d5e6f7a8b9c008",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        status: "APPLIED",
        currentStage: "APPLIED",
        coverLetter: "Excited about this role!",
      });

      assert.strictEqual(appDoc.jobId.toString(), "65f1a2b3c4d5e6f7a8b9c101");
      assert.strictEqual(appDoc.applicantId.toString(), "65f1a2b3c4d5e6f7a8b9c008");
      assert.strictEqual(appDoc.recruiterId.toString(), "65f1a2b3c4d5e6f7a8b9c003");
      assert.strictEqual(appDoc.status, "APPLIED");
      assert.strictEqual(appDoc.currentStage, "APPLIED");
    });
  });

  describe("3. Job Repository CRUD & Query Capabilities", () => {
    it("retrieves paginated jobs with department and search filters", async () => {
      const res = await jobRepository.findAll({ department: "Engineering", search: "Frontend" });
      assert.ok(res.jobs.length >= 1);
      assert.strictEqual(res.jobs[0]?.department, "Engineering");
      assert.ok(res.jobs[0]?.title.includes("Frontend"));
    });

    it("creates a new job opening and persists it", async () => {
      const newJob = await jobRepository.create({
        title: "Platform Reliability Lead",
        description: "Oversee platform uptime, chaos engineering, and SRE operations.",
        department: "Infrastructure",
        location: "New York, NY",
        employmentType: "Full-Time",
        skills: ["Golang", "Prometheus", "Terraform"],
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        status: "PUBLISHED",
      });

      assert.ok(newJob.id);
      assert.strictEqual(newJob.title, "Platform Reliability Lead");
      assert.strictEqual(newJob.department, "Infrastructure");

      // Verify retrieval
      const fetched = await jobRepository.findById(newJob.id);
      assert.ok(fetched);
      assert.strictEqual(fetched.title, "Platform Reliability Lead");
    });

    it("updates job details and archives job", async () => {
      const job = await jobRepository.create({
        title: "Temporary Test Job",
        description: "Temporary description",
        department: "Operations",
        location: "Remote",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      const updated = await jobRepository.update(job.id, {
        title: "Updated Test Job Title",
      });
      assert.ok(updated);
      assert.strictEqual(updated.title, "Updated Test Job Title");

      const archived = await jobRepository.archive(job.id);
      assert.ok(archived);
      assert.strictEqual(archived.status, "ARCHIVED");
    });
  });

  describe("4. Application Repository & Workflow Capabilities", () => {
    it("submits an application for a candidate and increments job application count", async () => {
      const newJob = await jobRepository.create({
        title: "Data Analyst",
        description: "Analyze recruitment metrics",
        department: "Analytics",
        location: "Remote",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      const app = await applicationRepository.create({
        jobId: newJob.id,
        applicantId: "65f1a2b3c4d5e6f7a8b9c015", // Jessica Taylor
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        coverLetter: "Experienced with Spark, SQL, and Snowflake pipelines.",
      });

      assert.ok(app.id);
      assert.strictEqual(app.jobId, newJob.id);
      assert.strictEqual(app.applicantId, "65f1a2b3c4d5e6f7a8b9c015");
      assert.strictEqual(app.status, "APPLIED");
      assert.strictEqual(app.currentStage, "APPLIED");

      // Verify job applications count updated
      const updatedJob = await jobRepository.findById(newJob.id);
      assert.strictEqual(updatedJob?.applicationsCount, 1);
    });

    it("prevents duplicate applications for the same candidate and job", async () => {
      const job = await jobRepository.create({
        title: "Duplicate Check Job",
        description: "Checking duplicate applications",
        department: "Quality",
        location: "Remote",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      await applicationRepository.create({
        jobId: job.id,
        applicantId: "65f1a2b3c4d5e6f7a8b9c010",
      });

      await assert.rejects(
        async () => {
          await applicationRepository.create({
            jobId: job.id,
            applicantId: "65f1a2b3c4d5e6f7a8b9c010",
          });
        },
        /already submitted/,
        "Must reject duplicate application",
      );
    });

    it("advances application stage and updates status", async () => {
      const app = await applicationRepository.create({
        jobId: "65f1a2b3c4d5e6f7a8b9c102",
        applicantId: "65f1a2b3c4d5e6f7a8b9c016",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      const updated = await applicationRepository.updateStatus(app.id, {
        status: "Shortlisted",
        currentStage: "INTERVIEW",
        aiScore: 89,
        notes: "Passed screening call with flying colors.",
      });

      assert.ok(updated);
      assert.strictEqual(updated.status, "Shortlisted");
      assert.strictEqual(updated.currentStage, "INTERVIEW");
      assert.strictEqual(updated.aiScore, 89);
    });

    it("persistently transitions through Kanban pipeline stages with updateStage", async () => {
      const app = await applicationRepository.create({
        jobId: "65f1a2b3c4d5e6f7a8b9c101",
        applicantId: "65f1a2b3c4d5e6f7a8b9c020",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });
      assert.strictEqual(app.currentStage, "APPLIED");

      // 1. Move to SCREENING
      const screened = await applicationRepository.updateStage(app.id, "SCREENING");
      assert.ok(screened);
      assert.strictEqual(screened.currentStage, "SCREENING");
      assert.strictEqual(screened.status, "SCREENING");

      // 2. Move to INTERVIEW
      const interviewed = await applicationRepository.updateStage(app.id, "INTERVIEW");
      assert.ok(interviewed);
      assert.strictEqual(interviewed.currentStage, "INTERVIEW");

      // 3. Move to OFFERED
      const offered = await applicationRepository.updateStage(app.id, "OFFERED");
      assert.ok(offered);
      assert.strictEqual(offered.currentStage, "OFFERED");

      // 4. Verify retrieval from repository preserves the stage
      const fetched = await applicationRepository.findById(app.id);
      assert.ok(fetched);
      assert.strictEqual(fetched.currentStage, "OFFERED");
    });
  });

  describe("5. REST API Integration for Jobs & Applications", () => {
    it("GET /api/jobs returns list of open jobs", async () => {
      const req = new Request("http://localhost:3000/api/jobs", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const body = (await res.json()) as any;
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data.jobs));
      assert.ok(body.data.jobs.length >= 1);
    });

    it("GET /api/jobs/:id returns single job detail", async () => {
      const req = new Request("http://localhost:3000/api/jobs/65f1a2b3c4d5e6f7a8b9c101", {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const body = (await res.json()) as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.job.id, "65f1a2b3c4d5e6f7a8b9c101");
      assert.ok(body.data.job.title);
    });

    it("GET /api/jobs/invalid-id returns 404", async () => {
      const req = new Request("http://localhost:3000/api/jobs/non-existent-id", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);
    });
  });
});

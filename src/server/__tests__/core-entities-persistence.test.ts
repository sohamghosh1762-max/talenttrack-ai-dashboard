import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Job } from "../models/Job.ts";
import { Application } from "../models/Application.ts";
import { Interview } from "../models/Interview.ts";
import { User } from "../models/User.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { userRepository, isValidObjectId } from "../db/user-repository.ts";

describe("BACKEND & DATABASE RELIABILITY: Core Entities Persistence & Integrity Suite", () => {
  before(() => {
    userRepository.resetToDefaults();
    jobRepository.resetToDefaults();
    applicationRepository.resetToDefaults();
    interviewRepository.resetToDefaults();
  });

  describe("1. Jobs Persistence & Lifecycle", () => {
    it("creates, persists, and retrieves a complete job opening with recruiter ownership", async () => {
      const created = await jobRepository.create({
        title: "Staff Distributed Systems Engineer",
        description: "Architect multi-tenant event streams and distributed transactions.",
        department: "Infrastructure",
        location: "Remote",
        employmentType: "Full-Time",
        experienceRequired: "6+ years",
        skills: ["Go", "Kafka", "Kubernetes", "MongoDB"],
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        status: "PUBLISHED",
      });

      assert.ok(created.id);
      assert.strictEqual(isValidObjectId(created.id), true);
      assert.strictEqual(created.title, "Staff Distributed Systems Engineer");
      assert.strictEqual(created.status, "PUBLISHED");

      // Verify retrieval
      const fetched = await jobRepository.findById(created.id);
      assert.ok(fetched);
      assert.strictEqual(fetched.title, "Staff Distributed Systems Engineer");
      assert.strictEqual(fetched.recruiterId, "65f1a2b3c4d5e6f7a8b9c003");
      assert.deepStrictEqual(fetched.skills, ["Go", "Kafka", "Kubernetes", "MongoDB"]);
    });

    it("updates job details and transitions status safely to ARCHIVED", async () => {
      const job = await jobRepository.create({
        title: "Senior Security Architect",
        description: "Manage zero-trust cloud infrastructure and IAM policies.",
        department: "Security",
        location: "New York, NY",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      const updated = await jobRepository.update(job.id, {
        title: "Principal Security Architect",
      });
      assert.ok(updated);
      assert.strictEqual(updated.title, "Principal Security Architect");

      const archived = await jobRepository.archive(job.id);
      assert.ok(archived);
      assert.strictEqual(archived.status, "ARCHIVED");

      const refetched = await jobRepository.findById(job.id);
      assert.strictEqual(refetched?.status, "ARCHIVED");
    });

    it("validates Job Mongoose schema rejects titles shorter than 2 characters", async () => {
      const invalidJob = new Job({
        title: "A",
        description: "Valid description but title too short",
        department: "Engineering",
        location: "Remote",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      await assert.rejects(async () => invalidJob.validate(), /title/);
    });
  });

  describe("2. Applications Persistence, Duplicate Prevention & Stage Progression", () => {
    it("submits an application linking Candidate and Job with initial APPLIED stage", async () => {
      const job = await jobRepository.create({
        title: "Frontend Architect",
        description: "Design high performance component trees.",
        department: "Frontend",
        location: "Remote",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      const app = await applicationRepository.create({
        jobId: job.id,
        applicantId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        coverLetter: "Excited about modern React 19.",
      });

      assert.ok(app.id);
      assert.strictEqual(app.jobId, job.id);
      assert.strictEqual(app.applicantId, "65f1a2b3c4d5e6f7a8b9c008");
      assert.strictEqual(app.currentStage, "APPLIED");
      assert.strictEqual(app.status, "APPLIED");
    });

    it("strictly prevents duplicate applications for the same candidate and job opening", async () => {
      const job = await jobRepository.create({
        title: "Duplicate Test Job",
        description: "Verify duplicate submission rejection",
        department: "QA",
        location: "Remote",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
      });

      await applicationRepository.create({
        jobId: job.id,
        applicantId: "65f1a2b3c4d5e6f7a8b9c009",
      });

      await assert.rejects(
        async () => {
          await applicationRepository.create({
            jobId: job.id,
            applicantId: "65f1a2b3c4d5e6f7a8b9c009",
          });
        },
        /already submitted/,
        "Must reject duplicate application submission",
      );
    });

    it("transitions through stages and records sequential stage history", async () => {
      const app = await applicationRepository.create({
        jobId: "65f1a2b3c4d5e6f7a8b9c101",
        applicantId: "65f1a2b3c4d5e6f7a8b9c011",
      });

      // 1. Move to SCREENING
      const screened = await applicationRepository.updateStage(
        app.id,
        "SCREENING",
        "Screening phone passed",
        "recruiter_1",
        "Sarah Recruiter",
      );
      assert.ok(screened);
      assert.strictEqual(screened.currentStage, "SCREENING");

      // 2. Move to INTERVIEW
      const interviewed = await applicationRepository.updateStage(
        app.id,
        "INTERVIEW",
        "Invited to technical round",
      );
      assert.ok(interviewed);
      assert.strictEqual(interviewed.currentStage, "INTERVIEW");

      // 3. Move to OFFERED
      const offered = await applicationRepository.updateStage(app.id, "OFFERED", "Offer extended");
      assert.ok(offered);
      assert.strictEqual(offered.currentStage, "OFFERED");

      // Verify stage history preservation
      assert.ok(Array.isArray(offered.stageHistory));
      assert.ok(offered.stageHistory.length >= 3);
      assert.strictEqual(offered.stageHistory[offered.stageHistory.length - 1]?.toStage, "OFFERED");
    });

    it("validates Application Mongoose schema bounds aiScore between 0 and 100", async () => {
      const invalidApp = new Application({
        jobId: "65f1a2b3c4d5e6f7a8b9c101",
        applicantId: "65f1a2b3c4d5e6f7a8b9c008",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        aiScore: 120, // Invalid: exceeds 100
      });

      await assert.rejects(async () => invalidApp.validate(), /aiScore/);
    });
  });

  describe("3. Interviews Scheduling, Rescheduling & Integrity", () => {
    it("schedules an interview with valid duration, timezone, and participants", async () => {
      const scheduledTime = new Date(Date.now() + 86400000 * 3).toISOString();

      const interview = await interviewRepository.create(
        {
          applicationId: "65f1a2b3c4d5e6f7a8b9c201",
          title: "Architecture System Design",
          type: "VIDEO",
          scheduledAt: scheduledTime,
          durationMinutes: 60,
          timezone: "Asia/Kolkata",
          meetingUrl: "https://meet.google.com/ttk-sys-design",
          instructions: "Bring architectural diagram samples.",
        },
        "65f1a2b3c4d5e6f7a8b9c003",
        "65f1a2b3c4d5e6f7a8b9c008",
        "65f1a2b3c4d5e6f7a8b9c003",
        "65f1a2b3c4d5e6f7a8b9c101",
      );

      assert.ok(interview.id);
      assert.strictEqual(interview.status, "SCHEDULED");
      assert.strictEqual(interview.durationMinutes, 60);
      assert.strictEqual(interview.timezone, "Asia/Kolkata");
      assert.strictEqual(interview.title, "Architecture System Design");
    });

    it("reschedules and updates an interview status cleanly", async () => {
      const newTime = new Date(Date.now() + 86400000 * 5).toISOString();

      const iv = await interviewRepository.create(
        {
          applicationId: "65f1a2b3c4d5e6f7a8b9c201",
          title: "Follow-up Interview",
          type: "VIDEO",
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 30,
        },
        "65f1a2b3c4d5e6f7a8b9c003",
        "65f1a2b3c4d5e6f7a8b9c008",
        "65f1a2b3c4d5e6f7a8b9c003",
        "65f1a2b3c4d5e6f7a8b9c101",
      );

      const rescheduled = await interviewRepository.update(iv.id, {
        scheduledAt: newTime,
        status: "RESCHEDULED",
        notes: "Candidate requested rescheduling due to travel.",
      });

      assert.ok(rescheduled);
      assert.strictEqual(rescheduled.status, "RESCHEDULED");
      assert.strictEqual(rescheduled.notes, "Candidate requested rescheduling due to travel.");
    });

    it("validates Interview Mongoose schema rejects durations outside 5 to 480 minutes", async () => {
      const invalidShort = new Interview({
        applicationId: "65f1a2b3c4d5e6f7a8b9c201",
        jobId: "65f1a2b3c4d5e6f7a8b9c101",
        applicantId: "65f1a2b3c4d5e6f7a8b9c008",
        recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
        createdBy: "65f1a2b3c4d5e6f7a8b9c003",
        title: "Short",
        scheduledAt: new Date(),
        durationMinutes: 2, // Invalid: < 5
      });

      await assert.rejects(async () => invalidShort.validate(), /durationMinutes/);
    });
  });

  describe("4. Schema Validation & Data Constraints", () => {
    it("validates User schema rejects invalid email formats", async () => {
      const invalidUser = new User({
        name: "Test User",
        email: "not-a-valid-email",
        passwordHash: "hash123",
        role: "APPLICANT",
      });

      await assert.rejects(async () => invalidUser.validate(), /email/);
    });

    it("validates User schema rejects unsupported roles", async () => {
      const invalidRole = new User({
        name: "Invalid Role User",
        email: "valid@talenttrack.ai",
        passwordHash: "hash123",
        role: "INVALID_ROLE" as any,
      });

      await assert.rejects(async () => invalidRole.validate(), /role/);
    });
  });

  describe("5. Production Mock Data Removal Guarantees", () => {
    it("returns empty results for non-existent criteria without fabricating fake records", async () => {
      const result = await jobRepository.findAll({
        search: "non_existent_job_query_xyz_9999",
      });

      assert.strictEqual(result.jobs.length, 0);
      assert.strictEqual(result.pagination.total, 0);
    });

    it("returns empty candidate applications list when no applicants have applied", async () => {
      const result = await applicationRepository.findAll({
        jobId: "65f1a2b3c4d5e6f7a8b9c999", // Empty job ID
      });

      assert.strictEqual(result.applications.length, 0);
      assert.strictEqual(result.pagination.total, 0);
    });
  });
});

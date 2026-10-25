import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
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

describe("RECRUITER DASHBOARD UPGRADE & RECRUITMENT PIPELINE TEST SUITE", () => {
  let recruiterUser: any;
  let recruiterToken: string;
  let otherRecruiterUser: any;
  let otherRecruiterToken: string;
  let applicantUser1: any;
  let applicantUser2: any;
  let applicantUser3: any;

  let recruiterJob: any;
  let otherRecruiterJob: any;

  let app1: any;
  let app2: any;
  let app3: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.clearAll();
    applicationRepository.clearAll();
    interviewRepository.clearAll();

    // 1. Setup Recruiter 1
    recruiterUser = userRepository.createUser({
      email: "recruiter.lead@talenttrack.ai",
      name: "Lead Recruiter",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
    });
    recruiterToken = "recruiter-lead-token-123";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);

    // 2. Setup Recruiter 2
    otherRecruiterUser = userRepository.createUser({
      email: "recruiter.two@external.com",
      name: "External Recruiter",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
    });
    otherRecruiterToken = "recruiter-other-token-123";
    sessionRepository.createSession(otherRecruiterUser.id, otherRecruiterToken);

    // 3. Setup Applicants
    applicantUser1 = userRepository.createUser({
      email: "dev.one@example.com",
      name: "Alice Engineer",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
      applicantProfile: {
        headline: "Senior Fullstack Engineer",
        skills: ["React", "TypeScript", "Node.js"],
        location: "San Francisco, CA",
        experienceYears: "5 years",
      },
    });

    applicantUser2 = userRepository.createUser({
      email: "dev.two@example.com",
      name: "Bob Architect",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
      applicantProfile: {
        headline: "Cloud & DevOps Architect",
        skills: ["Kubernetes", "Docker", "Python"],
        location: "New York, NY",
        experienceYears: "8 years",
      },
    });

    applicantUser3 = userRepository.createUser({
      email: "dev.three@example.com",
      name: "Charlie Designer",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
      applicantProfile: {
        headline: "=SUM(1+1) Product Designer", // Test malicious formula input
        skills: ["Figma", "Design Systems"],
        location: "Remote",
        experienceYears: "4 years",
      },
    });

    // 4. Setup Jobs
    recruiterJob = await jobRepository.create({
      title: "Senior Fullstack Engineer",
      company: "TalentTrack Systems",
      location: "San Francisco, CA",
      employmentType: "Full-Time",
      experienceRequired: "5+ years",
      department: "Engineering",
      description: "Build cutting-edge ATS platforms.",
      skills: ["React", "TypeScript", "Node.js"],
      status: "PUBLISHED",
      recruiterId: recruiterUser.id,
    });

    otherRecruiterJob = await jobRepository.create({
      title: "Security Engineer",
      company: "Other Corp",
      location: "Austin, TX",
      employmentType: "Full-Time",
      experienceRequired: "3+ years",
      department: "Security",
      description: "Infosec duties.",
      skills: ["Security"],
      status: "PUBLISHED",
      recruiterId: otherRecruiterUser.id,
    });

    // 5. Setup Applications
    app1 = await applicationRepository.create({
      jobId: recruiterJob.id,
      applicantId: applicantUser1.id,
      recruiterId: recruiterUser.id,
      currentStage: "SCREENING",
      aiScore: 92,
      coverLetter: "Excited for this role.",
    });

    app2 = await applicationRepository.create({
      jobId: recruiterJob.id,
      applicantId: applicantUser2.id,
      recruiterId: recruiterUser.id,
      currentStage: "APPLIED",
      aiScore: 78,
      coverLetter: "DevOps expert.",
    });

    app3 = await applicationRepository.create({
      jobId: otherRecruiterJob.id,
      applicantId: applicantUser3.id,
      recruiterId: otherRecruiterUser.id,
      currentStage: "APPLIED",
      aiScore: 84,
      coverLetter: "=cmd|' /C calc'!A0",
    });
  });

  describe("1. Connect Dashboard Statistics to Real Database Records", () => {
    it("returns real computed recruiter KPIs and metrics", async () => {
      const req = createJsonRequest("http://localhost:3000/api/recruiter/analytics?range=30d", {
        token: recruiterToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res, "Response should not be null");
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.kpis);
      assert.equal(body.data.kpis.activeJobs, 1);
      assert.equal(body.data.kpis.totalApplications, 2);
      assert.ok(body.data.funnel.length > 0);
      assert.ok(Array.isArray(body.data.applicationTrends));
      assert.ok(Array.isArray(body.data.topSkills));
      assert.ok(body.data.aiInsights.avgScore > 0);
    });

    it("rejects unauthorized applicant access to recruiter analytics", async () => {
      const applicantToken = "applicant1-test-token-analytics";
      sessionRepository.createSession(applicantUser1.id, applicantToken);
      const req = createJsonRequest("http://localhost:3000/api/recruiter/analytics", {
        token: applicantToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 403);
    });

    it("returns empty baseline without fabricated numbers when recruiter has no records", async () => {
      const freshRecruiter = userRepository.createUser({
        email: "fresh@talenttrack.ai",
        name: "Fresh Recruiter",
        role: "RECRUITER",
        status: "ACTIVE",
        emailVerified: true,
        passwordHash: "hash123",
      });
      const freshToken = "fresh-recruiter-token-123";
      sessionRepository.createSession(freshRecruiter.id, freshToken);

      const req = createJsonRequest("http://localhost:3000/api/recruiter/analytics", {
        token: freshToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      const body = await res.json();
      assert.equal(body.data.kpis.activeJobs, 0);
      assert.equal(body.data.kpis.totalApplications, 0);
      assert.equal(body.data.kpis.shortlistedCandidates, 0);
    });
  });

  describe("2. Candidate Search, Filters, Sorting & Server-Side Pagination", () => {
    it("filters candidates by search keyword, skill, and score", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/candidates?search=Alice&skill=React&minScore=80",
        { token: recruiterToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.candidates.length, 1);
      assert.equal(body.data.candidates[0].name, "Alice Engineer");
    });

    it("supports sorting by score descending and deterministic pagination", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/candidates?sortBy=score&sortOrder=desc&page=1&limit=2",
        { token: recruiterToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.candidates.length, 2);
      assert.ok(body.data.candidates[0].score >= body.data.candidates[1].score);
      assert.ok(body.data.pagination.page === 1);
      assert.ok(body.data.pagination.limit === 2);
    });
  });

  describe("3. Kanban Stage Transitions & Server Validation", () => {
    it("allows permitted transition APPLIED -> SCREENING and records audit log", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/recruiter/applications/${app2.id}/stage`,
        {
          method: "PATCH",
          token: recruiterToken,
          body: { stage: "SCREENING", reason: "Passed resume vetting" },
        },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.stage, "SCREENING");

      // Verify audit history was persisted
      const updated = await applicationRepository.findById(app2.id);
      assert.ok(updated);
      assert.equal(updated.currentStage, "SCREENING");
      assert.ok(updated.stageHistory);
      assert.equal(updated.stageHistory.length, 1);
      assert.equal(updated.stageHistory[0]!.fromStage, "APPLIED");
      assert.equal(updated.stageHistory[0]!.toStage, "SCREENING");
      assert.equal(updated.stageHistory[0]!.reason, "Passed resume vetting");
    });

    it("rejects invalid pipeline transition APPLIED -> OFFERED", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/recruiter/applications/${app2.id}/stage`,
        {
          method: "PATCH",
          token: recruiterToken,
          body: { stage: "OFFERED" },
        },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.message.includes("Cannot transition"));
    });

    it("prevents recruiter from moving another recruiter's application", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/recruiter/applications/${app3.id}/stage`,
        {
          method: "PATCH",
          token: recruiterToken, // Recruiter 1 attempting to move Recruiter 2's application
          body: { stage: "SCREENING" },
        },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 403);
    });
  });

  describe("4. Bulk Candidate Actions with Per-Record Status", () => {
    it("handles batch stage update with per-record results", async () => {
      const req = createJsonRequest("http://localhost:3000/api/recruiter/applications/bulk", {
        method: "POST",
        token: recruiterToken,
        body: {
          action: "UPDATE_STAGE",
          applicationIds: [app1.id, app2.id, app3.id], // app3 belongs to other recruiter
          stage: "INTERVIEW",
          reason: "Bulk interview invite",
        },
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.action, "UPDATE_STAGE");
      assert.equal(body.data.totalRequested, 3);
      // app1 from SCREENING -> INTERVIEW is valid
      // app3 is unauthorized
      assert.ok(body.data.results.length === 3);
      const app3Result = body.data.results.find((r: any) => r.id === app3.id);
      assert.equal(app3Result.success, false);
      assert.ok(app3Result.error.includes("Not authorized"));
    });

    it("handles bulk note addition safely across authorized applications", async () => {
      const req = createJsonRequest("http://localhost:3000/api/recruiter/applications/bulk", {
        method: "POST",
        token: recruiterToken,
        body: {
          action: "ADD_NOTE",
          applicationIds: [app1.id, app2.id],
          note: "Reviewed in weekly recruiting sync.",
        },
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.successCount, 2);
      assert.equal(body.data.failureCount, 0);

      // Verify note was stored
      const app1Check = await applicationRepository.findById(app1.id);
      assert.ok(app1Check?.notesList);
      assert.equal(app1Check.notesList.length, 1);
      assert.equal(app1Check.notesList[0]!.text, "Reviewed in weekly recruiting sync.");
    });
  });

  describe("5. Persistent Candidate Notes & Recruiter Structured Feedback", () => {
    it("creates persistent internal note and rejects empty note", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/applications/${app1.id}/notes`, {
        method: "POST",
        token: recruiterToken,
        body: { text: "Candidate has 2 weeks notice period.", isInternal: true },
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.authorName, "Lead Recruiter");

      // Verify empty note rejected
      const emptyReq = createJsonRequest(
        `http://localhost:3000/api/applications/${app1.id}/notes`,
        {
          method: "POST",
          token: recruiterToken,
          body: { text: "   " },
        },
      );
      const emptyRes = await handleApiRequest(emptyReq);
      assert.ok(emptyRes);
      assert.equal(emptyRes.status, 400);
    });

    it("records structured evaluation feedback with rating and recommendations", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/applications/${app1.id}/feedback`, {
        method: "POST",
        token: recruiterToken,
        body: {
          stage: "SCREENING",
          rating: 5,
          overallRecommendation: "STRONG_YES",
          strengths: ["Architecture depth", "TypeScript expertise"],
          concerns: ["Needs timezone overlap confirmation"],
          notes: "Outstanding technical depth demonstrated in screening.",
        },
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.rating, 5);
      assert.equal(body.data.overallRecommendation, "STRONG_YES");

      // Verify feedback was persisted in application record
      const appCheck = await applicationRepository.findById(app1.id);
      assert.ok(appCheck?.recruiterFeedback);
      assert.equal(appCheck.recruiterFeedback.length, 1);
      assert.equal(appCheck.recruiterFeedback[0]!.rating, 5);
    });
  });

  describe("6. Interview Management Persistence & Actions", () => {
    it("schedules an interview and updates status to COMPLETED", async () => {
      const createReq = createJsonRequest("http://localhost:3000/api/interviews", {
        method: "POST",
        token: recruiterToken,
        body: {
          applicationId: app1.id,
          title: "Technical System Design",
          type: "VIDEO",
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 60,
          meetingUrl: "https://meet.google.com/test-room",
        },
      });
      const createRes = await handleApiRequest(createReq);
      assert.ok(createRes);
      assert.equal(createRes.status, 201);
      const createdBody = await createRes.json();
      const interviewId = createdBody.data.id;

      // Update to COMPLETED
      const updateReq = createJsonRequest(`http://localhost:3000/api/interviews/${interviewId}`, {
        method: "PATCH",
        token: recruiterToken,
        body: { status: "COMPLETED" },
      });
      const updateRes = await handleApiRequest(updateReq);
      assert.ok(updateRes);
      assert.equal(updateRes.status, 200);
      const updatedBody = await updateRes.json();
      assert.equal(updatedBody.data.status, "COMPLETED");
    });
  });

  describe("7. CSV Export Security & Formula Injection Mitigation", () => {
    it("escapes spreadsheet formula injection characters and excludes passwords", async () => {
      // app3 has malicious formula values: =SUM(1+1) and =cmd|' /C calc'!A0
      const exportReq = createJsonRequest("http://localhost:3000/api/recruiter/export/candidates", {
        token: otherRecruiterToken, // Other recruiter sees app3
      });
      const exportRes = await handleApiRequest(exportReq);
      assert.ok(exportRes);
      assert.equal(exportRes.status, 200);
      assert.equal(exportRes.headers.get("content-type"), "text/csv; charset=utf-8");

      const csvContent = await exportRes.text();
      // Ensure header is present
      assert.ok(csvContent.includes("Application ID,Candidate Name,Candidate Email"));
      // Ensure formula injection character '=' is prepended with single quote "'"
      assert.ok(csvContent.includes("DevOps Engineer") || csvContent.includes("'="));
      // Ensure passwords, secrets, or internal tokens are NOT in CSV
      assert.ok(!csvContent.includes("password"));
      assert.ok(!csvContent.includes("tokenRepository"));
    });
  });
});

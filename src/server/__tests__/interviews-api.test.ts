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

describe("PERSISTENT INTERVIEW SYSTEM & RBAC SUITE", () => {
  let applicantA: any;
  let applicantAToken: string;
  let applicantB: any;
  let applicantBToken: string;
  let recruiterR: any;
  let recruiterRToken: string;
  let recruiterOther: any;
  let recruiterOtherToken: string;
  let hiringManagerHM: any;
  let hiringManagerHMToken: string;
  let adminUser: any;
  let adminToken: string;
  let testJob: any;
  let testApplication: any;
  let testInterview: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.resetToDefaults();
    applicationRepository.resetToDefaults();
    interviewRepository.clearAll();

    // 1. Applicant A
    applicantA = userRepository.createUser({
      name: "Aarav Sharma",
      email: "aarav.sharma@applicant-int.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantAToken = "applicant-a-token-int-123456";
    sessionRepository.createSession(applicantA.id, applicantAToken);

    // 2. Applicant B
    applicantB = userRepository.createUser({
      name: "Priya Patel",
      email: "priya.patel@applicant-int.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantBToken = "applicant-b-token-int-123456";
    sessionRepository.createSession(applicantB.id, applicantBToken);

    // 3. Recruiter R
    recruiterR = userRepository.createUser({
      name: "Rohan Varma",
      email: "rohan.varma@talenttrack-int.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
      recruiterProfile: {
        companyName: "TalentTrack Systems",
        jobTitle: "Lead Recruiter",
      },
    });
    recruiterRToken = "recruiter-r-token-int-123456";
    sessionRepository.createSession(recruiterR.id, recruiterRToken);

    // 4. Other Recruiter
    recruiterOther = userRepository.createUser({
      name: "Sneha Rao",
      email: "sneha.rao@other-recruiter.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterOtherToken = "recruiter-other-token-int-123456";
    sessionRepository.createSession(recruiterOther.id, recruiterOtherToken);

    // 5. Hiring Manager
    hiringManagerHM = userRepository.createUser({
      name: "Alex Morgan",
      email: "alex.morgan@talenttrack-int.com",
      passwordHash: "Password123!",
      role: "HIRING_MANAGER",
      status: "ACTIVE",
      emailVerified: true,
    });
    hiringManagerHMToken = "hm-token-int-123456";
    sessionRepository.createSession(hiringManagerHM.id, hiringManagerHMToken);

    // 6. Admin
    adminUser = userRepository.createUser({
      name: "Platform Admin",
      email: "admin@talenttrack-int.com",
      passwordHash: "Password123!",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    });
    adminToken = "admin-token-int-123456";
    sessionRepository.createSession(adminUser.id, adminToken);

    // Create Job
    testJob = await jobRepository.create({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "San Francisco, CA (Hybrid)",
      employmentType: "Full-Time",
      status: "PUBLISHED",
      description: "Looking for top-tier full stack developer.",
      skills: ["React", "TypeScript", "Node.js", "MongoDB"],
      recruiterId: recruiterR.id,
      hiringManagerId: hiringManagerHM.id,
      hiringManagerIds: [hiringManagerHM.id],
    });

    // Create Application
    testApplication = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantA.id,
      recruiterId: recruiterR.id,
      coverLetter: "Excited to join the team.",
    });

    // Create Initial Interview
    testInterview = await interviewRepository.create(
      {
        applicationId: testApplication.id,
        title: "System Design & Architecture",
        type: "VIDEO",
        scheduledAt: "2026-10-15T10:00:00.000Z",
        durationMinutes: 45,
        timezone: "Asia/Kolkata",
        meetingUrl: "https://meet.google.com/ttk-arch-tech",
        instructions: "Prepare a diagram for distributed caching.",
        notes: "Internal note: check candidate scalability experience.",
      },
      recruiterR.id,
      applicantA.id,
      recruiterR.id,
      testJob.id,
    );
  });

  it("1. Authorized Recruiter can schedule an interview for their candidate application", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: testApplication.id,
        title: "Coding Round",
        type: "VIDEO",
        scheduledAt: "2026-10-18T14:30:00.000Z",
        durationMinutes: 60,
        timezone: "Asia/Kolkata",
        meetingUrl: "https://meet.google.com/ttk-coding-round",
        instructions: "Have your local IDE setup ready.",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.title, "Coding Round");
    assert.equal(data.data.applicantId, applicantA.id);
    assert.equal(data.data.recruiterId, recruiterR.id);
    assert.equal(data.data.status, "SCHEDULED");
    assert.equal(data.data.durationMinutes, 60);

    // Verify application stage advanced to INTERVIEW
    const updatedApp = await applicationRepository.findById(testApplication.id);
    assert.equal(updatedApp?.currentStage, "INTERVIEW");
  });

  it("2. Authorized Hiring Manager can schedule an interview for an assigned position", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: hiringManagerHMToken,
      body: {
        applicationId: testApplication.id,
        title: "HM Technical Discussion",
        type: "VIDEO",
        scheduledAt: "2026-10-20T11:00:00.000Z",
        durationMinutes: 45,
        timezone: "Asia/Kolkata",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.data.title, "HM Technical Discussion");
  });

  it("3. Unauthorized Recruiter cannot schedule an interview for another recruiter's job (403 Forbidden)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterOtherToken,
      body: {
        applicationId: testApplication.id,
        title: "Unauthorized Interview",
        scheduledAt: "2026-10-18T14:30:00.000Z",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("4. Applicant cannot schedule an interview directly (403 Forbidden)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: applicantAToken,
      body: {
        applicationId: testApplication.id,
        scheduledAt: "2026-10-18T14:30:00.000Z",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error.message, /Applicants cannot schedule/i);
  });

  it("5. Scheduling requires a valid Application (404 for invalid ID)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: "non_existent_application_id_999",
        scheduledAt: "2026-10-18T14:30:00.000Z",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("6. Invalid datetime string is rejected (400 Bad Request)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: testApplication.id,
        scheduledAt: "not-a-real-date",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("7. Invalid duration is rejected (400 Bad Request)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: testApplication.id,
        scheduledAt: "2026-10-18T14:30:00.000Z",
        durationMinutes: 600, // Exceeds max 480
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("8. Invalid timezone is rejected (400 Bad Request)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: testApplication.id,
        scheduledAt: "2026-10-18T14:30:00.000Z",
        timezone: "Invalid/Fake_Timezone",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("9. Invalid meeting URL format for VIDEO interview is rejected (400 Bad Request)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: testApplication.id,
        type: "VIDEO",
        scheduledAt: "2026-10-18T14:30:00.000Z",
        meetingUrl: "not-a-valid-url",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("10. Authenticated Applicant can retrieve their own scheduled Interviews", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews/my", {
      token: applicantAToken,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.equal(data.data.length, 1);
    assert.equal(data.data[0].id, testInterview.id);
    assert.equal(data.data[0].job?.title, "Senior Full Stack Engineer");
    assert.equal(data.data[0].interviewer?.name, "Rohan Varma");
    assert.equal(data.data[0].notes, undefined); // Sensitive internal notes stripped for candidate!
  });

  it("11. Applicant cannot view another Applicant's interview by ID (403 Forbidden)", async () => {
    const req = createJsonRequest(`http://localhost:3000/api/interviews/${testInterview.id}`, {
      token: applicantBToken, // Applicant B is NOT the candidate
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("12. Recruiter can view full interview details including internal notes", async () => {
    const req = createJsonRequest(`http://localhost:3000/api/interviews/${testInterview.id}`, {
      token: recruiterRToken,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.notes, "Internal note: check candidate scalability experience.");
  });

  it("13. Unrelated recruiter cannot view interview details (403 Forbidden)", async () => {
    const req = createJsonRequest(`http://localhost:3000/api/interviews/${testInterview.id}`, {
      token: recruiterOtherToken,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("14. Recruiter can update interview status to COMPLETED or RESCHEDULED", async () => {
    const req = createJsonRequest(`http://localhost:3000/api/interviews/${testInterview.id}`, {
      method: "PATCH",
      token: recruiterRToken,
      body: {
        status: "COMPLETED",
        notes: "Candidate performed excellently in system design.",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.data.status, "COMPLETED");

    // Verify persistence
    const updated = await interviewRepository.findById(testInterview.id);
    assert.equal(updated?.status, "COMPLETED");
  });

  it("15. Applicant cannot modify interview status directly (403 Forbidden)", async () => {
    const req = createJsonRequest(`http://localhost:3000/api/interviews/${testInterview.id}`, {
      method: "PATCH",
      token: applicantAToken,
      body: {
        status: "CANCELLED",
      },
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("16. Multiple interviews for one Application persist independently", async () => {
    // Add second interview (e.g. HR Screening)
    await interviewRepository.create(
      {
        applicationId: testApplication.id,
        title: "HR Behavioral Screening",
        type: "PHONE",
        scheduledAt: "2026-10-10T09:00:00.000Z",
        durationMinutes: 30,
        timezone: "Asia/Kolkata",
        status: "COMPLETED",
      },
      recruiterR.id,
      applicantA.id,
      recruiterR.id,
      testJob.id,
    );

    const req = createJsonRequest("http://localhost:3000/api/interviews/my", {
      token: applicantAToken,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    const data = await res.json();
    assert.equal(data.data.length, 2);
  });

  it("17. Non-existent interview ID returns 404 Not Found", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews/fake_interview_id_999", {
      token: applicantAToken,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("18. Unauthenticated request to /api/interviews returns 401 Unauthorized", async () => {
    const req = createJsonRequest("http://localhost:3000/api/interviews/my");
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401);
  });
});

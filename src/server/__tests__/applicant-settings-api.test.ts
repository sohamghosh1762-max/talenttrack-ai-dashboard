import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { conversationRepository } from "../repositories/conversation.repository.ts";
import { notificationRepository } from "../repositories/notification.repository.ts";
import { applicantPreferencesRepository } from "../repositories/applicant-preferences.repository.ts";
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

describe("PERSISTENT APPLICANT SETTINGS & NOTIFICATION INTEGRATION SUITE", () => {
  let applicantA: any;
  let applicantAToken: string;
  let applicantB: any;
  let applicantBToken: string;
  let recruiterR: any;
  let recruiterRToken: string;
  let testJob: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.resetToDefaults();
    applicationRepository.resetToDefaults();
    interviewRepository.resetToDefaults();
    conversationRepository.resetToDefaults();
    notificationRepository.resetToDefaults();
    applicantPreferencesRepository.resetToDefaults();

    applicantA = userRepository.createUser({
      name: "Aarav Mehta",
      email: "aarav.test@talenttrack.io",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantAToken = "token-applicant-a-settings";
    sessionRepository.createSession(applicantA.id, applicantAToken);

    applicantB = userRepository.createUser({
      name: "Candidate B",
      email: "candidate.b@talenttrack.io",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantBToken = "token-applicant-b-settings";
    sessionRepository.createSession(applicantB.id, applicantBToken);

    recruiterR = userRepository.createUser({
      name: "Rahul Mehta",
      email: "rahul.test@talenttrack.ai",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterRToken = "token-recruiter-r-settings";
    sessionRepository.createSession(recruiterR.id, recruiterRToken);

    const publishedJobsRes = await jobRepository.findAll({ status: "PUBLISHED" });
    testJob = publishedJobsRes.jobs[0];
    assert.ok(testJob);
  });

  it("1. Authenticated applicant can retrieve own settings with default values", async () => {
    const req = createJsonRequest("http://localhost:3000/api/applicant/settings", {
      method: "GET",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.data.applicationStatusUpdates, "boolean");
    assert.equal(typeof data.data.interviewReminders, "boolean");
    assert.equal(typeof data.data.jobRecommendationAlerts, "boolean");
    assert.equal(typeof data.data.messageNotifications, "boolean");
    assert.equal(typeof data.data.emailNotifications, "boolean");
  });

  it("2. Unauthenticated request to /api/applicant/settings is rejected with 401", async () => {
    const req = createJsonRequest("http://localhost:3000/api/applicant/settings", {
      method: "GET",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401);
  });

  it("3. Recruiter role cannot access applicant settings endpoint (403 Forbidden)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/applicant/settings", {
      method: "GET",
      token: recruiterRToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("4. Applicant can partially update preferences (PATCH)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/applicant/settings", {
      method: "PATCH",
      token: applicantAToken,
      body: {
        applicationStatusUpdates: false,
        interviewReminders: false,
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.applicationStatusUpdates, false);
    assert.equal(data.data.interviewReminders, false);
    // Preserved fields
    assert.equal(data.data.jobRecommendationAlerts, true);
    assert.equal(data.data.messageNotifications, true);

    // Verify persisted in repository
    const stored = await applicantPreferencesRepository.findByUserId(applicantA.id);
    assert.equal(stored.applicationStatusUpdates, false);
    assert.equal(stored.interviewReminders, false);
  });

  it("5. Applicant settings isolation: Updating Applicant A does NOT affect Applicant B", async () => {
    // Update Applicant A
    await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/settings", {
        method: "PATCH",
        token: applicantAToken,
        body: { applicationStatusUpdates: false },
      }),
    );

    // Query Applicant B
    const resB = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/settings", {
        method: "GET",
        token: applicantBToken,
      }),
    );
    assert.ok(resB);
    const dataB = await resB.json();

    assert.equal(
      dataB.data.applicationStatusUpdates,
      true,
      "Applicant B settings must remain unchanged",
    );
  });

  it("6. Validation: Non-boolean values are rejected with 400 Bad Request", async () => {
    const req = createJsonRequest("http://localhost:3000/api/applicant/settings", {
      method: "PATCH",
      token: applicantAToken,
      body: {
        applicationStatusUpdates: "false", // string instead of boolean
      },
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("7. Notification Integration: Disabling applicationStatusUpdates suppresses notification on stage change", async () => {
    // 1. Disable applicationStatusUpdates for Applicant B
    await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/settings", {
        method: "PATCH",
        token: applicantBToken,
        body: { applicationStatusUpdates: false },
      }),
    );

    // 2. Create Application for Applicant B
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    // 3. Recruiter updates stage to INTERVIEW
    const updateReq = createJsonRequest(
      `http://localhost:3000/api/recruiter/applications/${app.id}/stage`,
      {
        method: "PATCH",
        token: recruiterRToken,
        body: { stage: "INTERVIEW" },
      },
    );

    const updateRes = await handleApiRequest(updateReq);
    assert.ok(updateRes);
    assert.equal(updateRes.status, 200);

    // 4. Verify Application itself STILL updated successfully
    const updatedApp = await applicationRepository.findById(app.id);
    assert.equal(updatedApp?.currentStage, "INTERVIEW");

    // 5. Verify NO Notification was created for Applicant B because preference was false
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const stageNotif = notifs.notifications.find((n) => n.applicationId === app.id);
    assert.equal(
      stageNotif,
      undefined,
      "Notification must NOT be created when applicationStatusUpdates is disabled",
    );
  });

  it("8. Notification Integration: Re-enabling applicationStatusUpdates restores notification creation", async () => {
    // 1. Re-enable applicationStatusUpdates for Applicant B
    await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/settings", {
        method: "PATCH",
        token: applicantBToken,
        body: { applicationStatusUpdates: true },
      }),
    );

    // 2. Create Application for Applicant B
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    // 3. Recruiter updates stage to SHORTLISTED
    const updateRes = await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/recruiter/applications/${app.id}/stage`, {
        method: "PATCH",
        token: recruiterRToken,
        body: { stage: "SCREENING" },
      }),
    );
    assert.ok(updateRes);
    assert.equal(updateRes.status, 200);

    // 4. Verify Notification was created
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const stageNotif = notifs.notifications.find((n) => n.applicationId === app.id);
    assert.ok(stageNotif, "Notification must be created when preference is true");
  });

  it("9. Notification Integration: Disabling interviewReminders suppresses interview notifications", async () => {
    // 1. Disable interviewReminders for Applicant B
    await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/settings", {
        method: "PATCH",
        token: applicantBToken,
        body: { interviewReminders: false },
      }),
    );

    // 2. Create Application
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    // 3. Schedule Interview
    const scheduleRes = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/interviews", {
        method: "POST",
        token: recruiterRToken,
        body: {
          applicationId: app.id,
          title: "Technical Round",
          type: "VIDEO",
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        },
      }),
    );
    assert.ok(scheduleRes);
    assert.equal(scheduleRes.status, 201);
    const interviewData = await scheduleRes.json();

    // 4. Verify interview was created in DB
    const storedInterview = await interviewRepository.findById(interviewData.data.id);
    assert.ok(storedInterview);

    // 5. Verify NO Notification was created for Applicant B
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const interviewNotif = notifs.notifications.find(
      (n) => n.interviewId === interviewData.data.id,
    );
    assert.equal(interviewNotif, undefined, "Interview notification suppressed by preference");
  });

  it("10. Notification Integration: Disabling messageNotifications suppresses message notifications while preserving message", async () => {
    // 1. Disable messageNotifications for Applicant B
    await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/settings", {
        method: "PATCH",
        token: applicantBToken,
        body: { messageNotifications: false },
      }),
    );

    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    const conv = await conversationRepository.findOrCreateForApplication(
      app.id,
      applicantB.id,
      recruiterR.id,
      testJob.id,
    );

    // 2. Send message
    const msgRes = await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/conversations/${conv.id}/messages`, {
        method: "POST",
        token: recruiterRToken,
        body: {
          text: "Checking in on your availability.",
        },
      }),
    );
    assert.ok(msgRes);
    assert.equal(msgRes.status, 201);

    // 3. Verify message is stored in conversation
    const messages = await conversationRepository.findMessages(conv.id);
    assert.ok(messages.some((m) => m.text.includes("Checking in on your availability.")));

    // 4. Verify NO notification was created
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const msgNotif = notifs.notifications.find((n) => n.conversationId === conv.id);
    assert.equal(msgNotif, undefined, "Message notification suppressed by preference");
  });
});

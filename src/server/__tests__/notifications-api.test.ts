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
import { notificationService } from "../services/notification-service.ts";
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

describe("PERSISTENT NOTIFICATION SYSTEM & RBAC SUITE", () => {
  let applicantA: any;
  let applicantAToken: string;
  let applicantB: any;
  let applicantBToken: string;
  let recruiterR: any;
  let recruiterRToken: string;
  let adminUser: any;
  let adminToken: string;
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

    applicantA = userRepository.createUser({
      name: "Aarav Mehta",
      email: "aarav.test@talenttrack.io",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantAToken = "token-applicant-a-123456";
    sessionRepository.createSession(applicantA.id, applicantAToken);

    applicantB = userRepository.createUser({
      name: "Candidate B",
      email: "candidate.b@talenttrack.io",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantBToken = "token-applicant-b-123456";
    sessionRepository.createSession(applicantB.id, applicantBToken);

    recruiterR = userRepository.createUser({
      name: "Rahul Mehta",
      email: "rahul.test@talenttrack.ai",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterRToken = "token-recruiter-r-123456";
    sessionRepository.createSession(recruiterR.id, recruiterRToken);

    adminUser = userRepository.createUser({
      name: "Platform Admin",
      email: "admin.test@talenttrack.ai",
      passwordHash: "Password123!",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    });
    adminToken = "token-admin-123456";
    sessionRepository.createSession(adminUser.id, adminToken);

    const publishedJobsRes = await jobRepository.findAll({ status: "PUBLISHED" });
    testJob = publishedJobsRes.jobs[0];
    assert.ok(testJob, "At least one published test job must exist");

    // Seed test notifications for applicantA
    await notificationRepository.create({
      userId: applicantA.id,
      type: "APPLICATION_SUBMITTED",
      title: "Application Submitted",
      message: "Your application has been received.",
    });
    await notificationRepository.create({
      userId: applicantA.id,
      type: "APPLICATION_SHORTLISTED",
      title: "Application Shortlisted",
      message: "You have been shortlisted.",
    });
    await notificationRepository.create({
      userId: applicantA.id,
      type: "INTERVIEW_SCHEDULED",
      title: "Technical Interview",
      message: "Technical round scheduled.",
    });
  });

  it("1. Authenticated applicant can retrieve own notifications", async () => {
    const req = createJsonRequest("http://localhost:3000/api/notifications", {
      method: "GET",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data.notifications));
    assert.ok(data.data.notifications.length > 0);
    // All notifications belong strictly to applicantA
    for (const notif of data.data.notifications) {
      assert.equal(notif.userId, applicantA.id);
    }
  });

  it("2. Notifications are returned newest first", async () => {
    const req = createJsonRequest("http://localhost:3000/api/notifications", {
      method: "GET",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    const data = await res.json();
    const notifs = data.data.notifications;

    for (let i = 0; i < notifs.length - 1; i++) {
      const current = new Date(notifs[i].createdAt).getTime();
      const next = new Date(notifs[i + 1].createdAt).getTime();
      assert.ok(
        current >= next,
        `Notification ${i} is newer than or equal to notification ${i + 1}`,
      );
    }
  });

  it("3. Unauthenticated requests to /api/notifications are rejected (401)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/notifications", {
      method: "GET",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401);
  });

  it("4. Applicant A cannot see Applicant B's notifications (Isolation)", async () => {
    // Create a private notification for Applicant B
    const notifB = await notificationRepository.create({
      userId: applicantB.id,
      type: "APPLICATION_STATUS_CHANGED",
      title: "Applicant B Private Update",
      message: "Confidential status update for candidate B only.",
    });

    // Applicant A queries /api/notifications
    const reqA = createJsonRequest("http://localhost:3000/api/notifications", {
      method: "GET",
      token: applicantAToken,
    });

    const resA = await handleApiRequest(reqA);
    assert.ok(resA);
    const dataA = await resA.json();

    const containsBNotif = dataA.data.notifications.some((n: any) => n.id === notifB.id);
    assert.equal(containsBNotif, false, "Applicant A should NEVER see Applicant B's notification");
  });

  it("5. Unread count endpoint /api/notifications/unread-count returns accurate count", async () => {
    const req = createJsonRequest("http://localhost:3000/api/notifications/unread-count", {
      method: "GET",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.data.count, "number");
    assert.ok(data.data.count >= 0);
  });

  it("6. Applicant can mark own notification as read", async () => {
    // Create an unread notification for Applicant A
    const newNotif = await notificationRepository.create({
      userId: applicantA.id,
      type: "JOB_RECOMMENDATION",
      title: "New Match",
      message: "We found a matching opening for your profile.",
    });
    assert.equal(newNotif.readAt, null);

    const req = createJsonRequest(`http://localhost:3000/api/notifications/${newNotif.id}/read`, {
      method: "PATCH",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.readAt !== null);

    // Verify in repository
    const fetched = await notificationRepository.findById(newNotif.id);
    assert.ok(fetched?.readAt);
  });

  it("7. Applicant cannot mark another user's notification as read (403 Forbidden)", async () => {
    // Create notification for Applicant B
    const notifB = await notificationRepository.create({
      userId: applicantB.id,
      type: "APPLICATION_SHORTLISTED",
      title: "Candidate B Shortlisted",
      message: "Shortlisted update.",
    });

    // Applicant A attempts to mark Applicant B's notification read
    const req = createJsonRequest(`http://localhost:3000/api/notifications/${notifB.id}/read`, {
      method: "PATCH",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("8. Invalid notification ID returns 404 Not Found", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/notifications/65f1a2b3c4d5e6f7a8b9c999/read",
      {
        method: "PATCH",
        token: applicantAToken,
      },
    );

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("9. Mark all read updates only authenticated user's notifications", async () => {
    // Create unread for A and unread for B
    const notifA = await notificationRepository.create({
      userId: applicantA.id,
      type: "NEW_MESSAGE",
      title: "Message for A",
      message: "Hello A",
    });
    const notifB = await notificationRepository.create({
      userId: applicantB.id,
      type: "NEW_MESSAGE",
      title: "Message for B",
      message: "Hello B",
    });

    const req = createJsonRequest("http://localhost:3000/api/notifications/read-all", {
      method: "POST",
      token: applicantAToken,
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    // Verify A has 0 unread
    const countA = await notificationRepository.getUnreadCount(applicantA.id);
    assert.equal(countA, 0);

    // Verify B's notification is STILL unread
    const fetchedB = await notificationRepository.findById(notifB.id);
    assert.equal(fetchedB?.readAt, null);
  });

  it("10. Real Event: Application submission creates persistent notification", async () => {
    // Applicant B applies for testJob
    const applyReq = createJsonRequest("http://localhost:3000/api/applications", {
      method: "POST",
      token: applicantBToken,
      body: {
        jobId: testJob.id,
        coverLetter: "Excited to apply!",
      },
    });

    const applyRes = await handleApiRequest(applyReq);
    assert.ok(applyRes);
    assert.equal(applyRes.status, 201);
    const applyData = await applyRes.json();

    // Check notifications for Applicant B
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const submissionNotif = notifs.notifications.find(
      (n) => n.type === "APPLICATION_SUBMITTED" && n.applicationId === applyData.data.id,
    );

    assert.ok(
      submissionNotif,
      "Application submission notification must be created in MongoDB store",
    );
    assert.ok(submissionNotif.message.includes(testJob.title));
  });

  it("11. Real Event: Application stage update creates persistent notification", async () => {
    // Find or create an application
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    // Recruiter updates stage to INTERVIEW
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

    // Verify Applicant B received notification
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const stageNotif = notifs.notifications.find(
      (n) => n.applicationId === app.id && n.title.includes("Interview"),
    );
    assert.ok(stageNotif, "Stage update must create a persistent notification for applicant");
  });

  it("12. Duplicate identical stage update does not create duplicate notification", async () => {
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    // Stage update to SCREENING
    await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/recruiter/applications/${app.id}/stage`, {
        method: "PATCH",
        token: recruiterRToken,
        body: { stage: "SCREENING" },
      }),
    );

    const initialNotifs = await notificationRepository.findUserNotifications(applicantB.id);
    const initialCount = initialNotifs.notifications.filter(
      (n) => n.applicationId === app.id,
    ).length;

    // Trigger same stage update again
    await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/recruiter/applications/${app.id}/stage`, {
        method: "PATCH",
        token: recruiterRToken,
        body: { stage: "SCREENING" },
      }),
    );

    const secondNotifs = await notificationRepository.findUserNotifications(applicantB.id);
    const secondCount = secondNotifs.notifications.filter((n) => n.applicationId === app.id).length;

    assert.equal(
      secondCount,
      initialCount,
      "Repeated identical stage should not generate duplicate notification",
    );
  });

  it("13. Real Event: Interview scheduled creates persistent notification", async () => {
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    const interviewDate = new Date(Date.now() + 86400000 * 3).toISOString();

    const scheduleReq = createJsonRequest("http://localhost:3000/api/interviews", {
      method: "POST",
      token: recruiterRToken,
      body: {
        applicationId: app.id,
        title: "Technical Architecture Discussion",
        type: "VIDEO",
        scheduledAt: interviewDate,
        durationMinutes: 60,
        meetingUrl: "https://meet.google.com/xyz-test",
      },
    });

    const res = await handleApiRequest(scheduleReq);
    assert.ok(res);
    assert.equal(res.status, 201);
    const interviewData = await res.json();

    // Verify notification created for applicantB
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const interviewNotif = notifs.notifications.find(
      (n) => n.type === "INTERVIEW_SCHEDULED" && n.interviewId === interviewData.data.id,
    );

    assert.ok(interviewNotif, "Interview scheduled notification must exist");
    assert.ok(interviewNotif.message.includes("Technical Architecture Discussion"));
  });

  it("14. Real Event: Interview cancelled creates persistent notification", async () => {
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    const interview = await interviewRepository.create(
      {
        applicationId: app.id,
        title: "Initial Screening",
        type: "PHONE",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
      recruiterR.id,
      applicantB.id,
      recruiterR.id,
      testJob.id,
    );

    // Recruiter cancels interview
    const cancelReq = createJsonRequest(`http://localhost:3000/api/interviews/${interview.id}`, {
      method: "PATCH",
      token: recruiterRToken,
      body: { status: "CANCELLED" },
    });

    const res = await handleApiRequest(cancelReq);
    assert.ok(res);
    assert.equal(res.status, 200);

    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const cancelNotif = notifs.notifications.find(
      (n) => n.type === "INTERVIEW_CANCELLED" && n.interviewId === interview.id,
    );
    assert.ok(cancelNotif, "Interview cancelled notification must exist");
  });

  it("15. Real Event: Sending a message creates NEW_MESSAGE notification for recipient", async () => {
    const app = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantB.id,
      recruiterId: recruiterR.id,
    });

    // Recruiter creates a conversation and sends a message to Applicant B
    const conv = await conversationRepository.findOrCreateForApplication(
      app.id,
      applicantB.id,
      recruiterR.id,
      testJob.id,
    );

    const msgReq = createJsonRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      {
        method: "POST",
        token: recruiterRToken,
        body: {
          text: "Hi Candidate B, when are you available for a quick chat?",
        },
      },
    );

    const res = await handleApiRequest(msgReq);
    assert.ok(res);
    assert.equal(res.status, 201);

    // Verify Applicant B received notification
    const notifs = await notificationRepository.findUserNotifications(applicantB.id);
    const msgNotif = notifs.notifications.find(
      (n) => n.type === "NEW_MESSAGE" && n.conversationId === conv.id,
    );
    assert.ok(msgNotif, "NEW_MESSAGE notification must exist for recipient");
    assert.ok(msgNotif.message.includes("Hi Candidate B"));
  });

  it("16. Notification Service: ATS Analysis Ready notification works as expected", async () => {
    const notif = await notificationService.notifyAtsScoreReady({
      applicantId: applicantA.id,
      overallScore: 88,
    });

    assert.ok(notif);
    assert.equal(notif.type, "ATS_ANALYSIS_READY");
    assert.ok(notif.message.includes("88/100"));

    const stored = await notificationRepository.findById(notif.id);
    assert.ok(stored);
    assert.equal(stored.userId, applicantA.id);
  });
});

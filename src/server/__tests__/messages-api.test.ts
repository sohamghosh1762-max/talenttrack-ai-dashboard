import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { conversationRepository } from "../repositories/conversation.repository.ts";
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

describe("PERSISTENT CONVERSATION & MESSAGING API TEST SUITE", () => {
  let applicantA: any;
  let applicantAToken: string;
  let applicantB: any;
  let applicantBToken: string;
  let recruiterR: any;
  let recruiterRToken: string;
  let recruiterOther: any;
  let recruiterOtherToken: string;
  let testJob: any;
  let testApplication: any;
  let testConversation: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.resetToDefaults();
    applicationRepository.resetToDefaults();
    conversationRepository.clearAll();

    // Create test users
    applicantA = userRepository.createUser({
      name: "Aarav Sharma",
      email: "aarav.sharma@applicant-test.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantAToken = "applicant-a-token-12345678";
    sessionRepository.createSession(applicantA.id, applicantAToken);

    applicantB = userRepository.createUser({
      name: "Priya Patel",
      email: "priya.patel@applicant-test.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicantBToken = "applicant-b-token-12345678";
    sessionRepository.createSession(applicantB.id, applicantBToken);

    recruiterR = userRepository.createUser({
      name: "Rohan Varma",
      email: "rohan.varma@talenttrack-test.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
      recruiterProfile: {
        companyName: "TalentTrack Corp",
        jobTitle: "Principal Talent Partner",
      },
    });
    recruiterRToken = "recruiter-r-token-12345678";
    sessionRepository.createSession(recruiterR.id, recruiterRToken);

    recruiterOther = userRepository.createUser({
      name: "Sneha Rao",
      email: "sneha.rao@other-agency.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterOtherToken = "recruiter-other-token-12345678";
    sessionRepository.createSession(recruiterOther.id, recruiterOtherToken);

    // Create Job & Application
    testJob = await jobRepository.create({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "San Francisco, CA (Hybrid)",
      employmentType: "Full-Time",
      status: "PUBLISHED",
      description: "Looking for top-tier full stack developer.",
      skills: ["React", "TypeScript", "Node.js", "MongoDB"],
      recruiterId: recruiterR.id,
    });

    testApplication = await applicationRepository.create({
      jobId: testJob.id,
      applicantId: applicantA.id,
      recruiterId: recruiterR.id,
      coverLetter: "Excited to join the engineering team.",
    });

    // Create Conversation between Applicant A and Recruiter R
    testConversation = await conversationRepository.findOrCreateForApplication(
      testApplication.id,
      applicantA.id,
      recruiterR.id,
      testJob.id,
    );
  });

  it("1. Authenticated Applicant can retrieve their own conversations", async () => {
    const req = createJsonRequest("http://localhost:3000/api/conversations", {
      token: applicantAToken,
    });
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.equal(data.data.length, 1);
    assert.equal(data.data[0].id, testConversation.id);
    assert.equal(data.data[0].participant?.name, "Rohan Varma");
    assert.equal(data.data[0].job?.title, "Senior Full Stack Engineer");
  });

  it("2. Applicant cannot retrieve another user's conversation by ID (403 Forbidden)", async () => {
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}`,
      {
        token: applicantBToken, // Applicant B is NOT a participant
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error.message, /authorized|forbidden/i);
  });

  it("3. Applicant can retrieve messages for their own conversation", async () => {
    // Seed a message from recruiter
    await conversationRepository.createMessage({
      conversationId: testConversation.id,
      senderId: recruiterR.id,
      recipientId: applicantA.id,
      text: "Hello Aarav, we are excited to move forward with your interview.",
    });

    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        token: applicantAToken,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.length, 1);
    assert.equal(
      data.data[0].text,
      "Hello Aarav, we are excited to move forward with your interview.",
    );
    assert.equal(data.data[0].sender?.name, "Rohan Varma");
  });

  it("4. Applicant cannot retrieve messages for an unrelated conversation (403 Forbidden)", async () => {
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        token: applicantBToken,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("5. Applicant can send a message and senderId is derived strictly from authentication session", async () => {
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        method: "POST",
        token: applicantAToken,
        body: {
          text: "Thank you Rohan, I am available on Tuesday afternoon.",
        },
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.text, "Thank you Rohan, I am available on Tuesday afternoon.");
    assert.equal(data.data.senderId, applicantA.id);
    assert.equal(data.data.recipientId, recruiterR.id);
  });

  it("6. Applicant cannot spoof senderId or recipientId via request body", async () => {
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        method: "POST",
        token: applicantAToken,
        body: {
          text: "Spoof attempt",
          senderId: recruiterR.id, // Attempt to spoof recruiter sender
          recipientId: "fake_id_12345",
        },
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);

    const data = await res.json();
    // Server must override senderId with authenticated user's ID
    assert.equal(data.data.senderId, applicantA.id);
    assert.equal(data.data.recipientId, recruiterR.id);
  });

  it("7. Empty or whitespace-only messages are rejected (400 Bad Request)", async () => {
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        method: "POST",
        token: applicantAToken,
        body: {
          text: "     \n\t   ",
        },
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error.message, /empty/i);
  });

  it("8. Overly long message (>3000 chars) is rejected (400 Bad Request)", async () => {
    const longText = "a".repeat(3050);
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        method: "POST",
        token: applicantAToken,
        body: {
          text: longText,
        },
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("9. Message persists in repository and updates conversation lastMessage preview", async () => {
    await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/conversations/${testConversation.id}/messages`, {
        method: "POST",
        token: applicantAToken,
        body: { text: "Persistent message check" },
      }),
    );

    // Retrieve conversation list to verify lastMessage
    const res = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/conversations", {
        token: applicantAToken,
      }),
    );
    assert.ok(res);
    const data = await res.json();
    assert.equal(data.data[0].lastMessageText, "Persistent message check");
    assert.ok(data.data[0].lastMessageAt);
  });

  it("10. Unread count increments for recipient and resets when marked read", async () => {
    // Recruiter sends a message to Applicant A
    await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/conversations/${testConversation.id}/messages`, {
        method: "POST",
        token: recruiterRToken,
        body: { text: "Interview invitation" },
      }),
    );

    // Check unread count for Applicant A
    const listRes = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/conversations", {
        token: applicantAToken,
      }),
    );
    assert.ok(listRes);
    const listData = await listRes.json();
    assert.equal(listData.data[0].unreadCount, 1);

    // Applicant A marks conversation as read
    const readRes = await handleApiRequest(
      createJsonRequest(`http://localhost:3000/api/conversations/${testConversation.id}/read`, {
        method: "PATCH",
        token: applicantAToken,
      }),
    );
    assert.ok(readRes);
    assert.equal(readRes.status, 200);

    // Verify unread count is now 0
    const listResAfter = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/conversations", {
        token: applicantAToken,
      }),
    );
    assert.ok(listResAfter);
    const listDataAfter = await listResAfter.json();
    assert.equal(listDataAfter.data[0].unreadCount, 0);
  });

  it("11. Conversation creation for application returns existing conversation rather than duplicating", async () => {
    const createReq = createJsonRequest("http://localhost:3000/api/conversations", {
      method: "POST",
      token: applicantAToken,
      body: {
        applicationId: testApplication.id,
      },
    });
    const res = await handleApiRequest(createReq);
    assert.ok(res);
    assert.ok(res.status === 200 || res.status === 201);
    const data = await res.json();
    // Must return the existing conversation ID
    assert.equal(data.data.id, testConversation.id);
  });

  it("12. Applicant cannot create conversation for an application they do not own (403 Forbidden)", async () => {
    const createReq = createJsonRequest("http://localhost:3000/api/conversations", {
      method: "POST",
      token: applicantBToken, // Applicant B trying to initiate on Applicant A's application
      body: {
        applicationId: testApplication.id,
      },
    });
    const res = await handleApiRequest(createReq);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("13. Non-existent conversation ID returns 404 Not Found", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/conversations/non_existent_conv_id_999",
      {
        token: applicantAToken,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  it("14. Unauthenticated request to /api/conversations returns 401 Unauthorized", async () => {
    const req = createJsonRequest("http://localhost:3000/api/conversations");
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401);
  });

  it("15. Recruiter can also access and send messages in conversations they own", async () => {
    const sendReq = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        method: "POST",
        token: recruiterRToken,
        body: { text: "Looking forward to speaking with you!" },
      },
    );
    const sendRes = await handleApiRequest(sendReq);
    assert.ok(sendRes);
    assert.equal(sendRes.status, 201);
    const sendData = await sendRes.json();
    assert.equal(sendData.data.senderId, recruiterR.id);
    assert.equal(sendData.data.recipientId, applicantA.id);
  });

  it("16. Unrelated recruiter cannot access conversation (403 Forbidden)", async () => {
    const req = createJsonRequest(
      `http://localhost:3000/api/conversations/${testConversation.id}/messages`,
      {
        token: recruiterOtherToken,
      },
    );
    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });
});

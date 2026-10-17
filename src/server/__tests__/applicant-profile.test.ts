import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { handleApiRequest } from "../routes/index.ts";
import { parseApplicantProfileInput } from "../validators/applicant-profile-validator.ts";
import { calculateProfileCompletion } from "../../lib/applicant-utils.ts";

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

describe("APPLICANT PROFILE PERSISTENCE & ATS INTEGRATION SUITE", () => {
  let applicant1User: any;
  let applicant1Token: string;
  let applicant2User: any;
  let applicant2Token: string;
  let recruiterUser: any;
  let recruiterToken: string;

  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    resumeRepository.clearAll();

    applicant1User = userRepository.createUser({
      name: "Test Candidate One",
      email: "applicant1.profile.test@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      applicantProfile: {
        skills: ["Python", "PyTorch", "FastAPI"],
        experiences: [],
        education: [],
        certifications: [],
        projects: [],
      },
    });
    applicant1Token = "applicant1-profile-token-12345";
    sessionRepository.createSession(applicant1User.id, applicant1Token);

    applicant2User = userRepository.createUser({
      name: "Test Candidate Two",
      email: "applicant2.profile.test@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      applicantProfile: {
        skills: ["Go", "Kubernetes"],
        experiences: [],
        education: [],
        certifications: [],
        projects: [],
      },
    });
    applicant2Token = "applicant2-profile-token-67890";
    sessionRepository.createSession(applicant2User.id, applicant2Token);

    recruiterUser = userRepository.createUser({
      name: "Recruiter Bob",
      email: "recruiter.profile.test@example.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterToken = "recruiter-profile-token-99999";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);
  });

  describe("1. GET /api/applicant/profile", () => {
    it("returns 401 when no authenticated user is present", async () => {
      const req = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "GET",
      });
      const response = await handleApiRequest(req);
      assert.ok(response);
      assert.equal(response.status, 401);
      const body = await response.json();
      assert.equal(body.success, false);
    });

    it("returns 403 when a non-APPLICANT attempts access", async () => {
      const req = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "GET",
        token: recruiterToken,
      });
      const response = await handleApiRequest(req);
      assert.ok(response);
      assert.equal(response.status, 403);
      const body = await response.json();
      assert.equal(body.success, false);
    });

    it("retrieves authenticated applicant profile with actual data", async () => {
      const req = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "GET",
        token: applicant1Token,
      });
      const response = await handleApiRequest(req);
      assert.ok(response);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, applicant1User.id);
      assert.equal(body.data.email, applicant1User.email);
      assert.equal(body.data.name, applicant1User.name);
      assert.deepEqual(body.data.skills, ["Python", "PyTorch", "FastAPI"]);
      // Never returns fake Aarav Mehta data
      assert.notEqual(body.data.name, "Aarav Mehta");
    });
  });

  describe("2. PUT /api/applicant/profile & MongoDB Persistence", () => {
    it("updates applicant profile fields and persists changes", async () => {
      const updatePayload = {
        name: "Elena Rostova",
        phone: "+1 415 987 6543",
        headline: "Principal Systems Engineer | Distributed Architecture",
        location: "Seattle, WA (Remote)",
        bio: "Experienced engineer focusing on distributed storage and backend reliability.",
        skills: ["Go", "Kubernetes", "gRPC", "PostgreSQL", "Kafka"],
        experiences: [
          {
            id: "exp-1",
            title: "Staff Engineer",
            company: "CloudCore",
            location: "Seattle, WA",
            period: "2021 - Present",
            description: "Led development of scalable microservices handling 200k RPS.",
          },
        ],
        education: [
          {
            id: "edu-1",
            degree: "M.S. in Computer Engineering",
            institution: "University of Washington",
            period: "2018 - 2020",
            grade: "GPA 3.9",
          },
        ],
        certifications: [
          {
            id: "cert-1",
            name: "CKA: Certified Kubernetes Administrator",
            issuer: "Linux Foundation",
            year: "2023",
          },
        ],
        projects: [
          {
            id: "proj-1",
            name: "High-throughput Log Ingestion Engine",
            tech: "Go, Kafka, ClickHouse",
            description: "Open-source telemetry processing pipeline.",
          },
        ],
      };

      const putReq = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "PUT",
        token: applicant1Token,
        body: updatePayload,
      });
      const putResponse = await handleApiRequest(putReq);
      assert.ok(putResponse);
      assert.equal(putResponse.status, 200);
      const putBody = await putResponse.json();
      assert.equal(putBody.success, true);
      assert.equal(putBody.data.name, "Elena Rostova");
      assert.equal(putBody.data.headline, "Principal Systems Engineer | Distributed Architecture");
      assert.deepEqual(putBody.data.skills, ["Go", "Kubernetes", "gRPC", "PostgreSQL", "Kafka"]);
      assert.equal(putBody.data.experiences.length, 1);
      assert.equal(putBody.data.education.length, 1);

      // Verify persistence on subsequent GET
      const getReq = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "GET",
        token: applicant1Token,
      });
      const getResponse = await handleApiRequest(getReq);
      assert.ok(getResponse);
      assert.equal(getResponse.status, 200);
      const getBody = await getResponse.json();
      assert.equal(getBody.data.name, "Elena Rostova");
      assert.equal(getBody.data.location, "Seattle, WA (Remote)");
      assert.equal(getBody.data.experiences[0].company, "CloudCore");
    });

    it("prevents updating another applicant by rejecting forged body IDs", async () => {
      // User 1 tries to send user 2's ID or change user 2's data
      const maliciousPayload = {
        id: applicant2User.id,
        userId: applicant2User.id,
        applicantId: applicant2User.id,
        name: "Hacked Name",
        skills: ["Hacking"],
      };

      // Authenticated as applicant1User
      const putReq = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "PUT",
        token: applicant1Token,
        body: maliciousPayload,
      });
      const res = await handleApiRequest(putReq);
      assert.ok(res);
      assert.equal(res.status, 200);

      // Verify User 1 was updated, but User 2 was NOT touched
      const user2 = await userRepository.findById(applicant2User.id);
      assert.equal(user2?.name, "Test Candidate Two");
      assert.deepEqual(user2?.applicantProfile?.skills, ["Go", "Kubernetes"]);
    });
  });

  describe("3. ATS Score Integration & Invalidation on Profile Update", () => {
    it("invalidates cached ATS analysis when skills/experience are updated", async () => {
      // Create a test resume for applicant 1
      const testResume = await resumeRepository.create({
        applicantId: applicant1User.id,
        originalFileName: "elena_resume.pdf",
        storedFileName: "elena_resume_123.pdf",
        fileSize: 1024 * 500,
        mimeType: "application/pdf",
        s3Key: "resumes/elena_resume_123.pdf",
        s3Bucket: "talenttrack-resumes-private",
      });

      await resumeRepository.updateParsingStatus(testResume.id, {
        parsingStatus: "COMPLETED",
        parsedProfile: {
          personal: { fullName: "Test Candidate One", email: applicant1User.email },
          skills: ["Python", "PyTorch"],
          experience: [],
          education: [],
        },
        atsScore: 88,
        atsAnalysis: {
          overallScore: 88,
          tier: "GOOD",
          tierLabel: "Good ATS Compatibility",
          summary: "Strong resume",
          categoryBreakdown: {
            completeness: {
              score: 90,
              maxScore: 20,
              percentage: 90,
              findings: [],
              recommendations: [],
            },
            skills: { score: 90, maxScore: 25, percentage: 90, findings: [], recommendations: [] },
            experience: {
              score: 85,
              maxScore: 25,
              percentage: 85,
              findings: [],
              recommendations: [],
            },
            keywords: {
              score: 85,
              maxScore: 15,
              percentage: 85,
              findings: [],
              recommendations: [],
            },
            education: {
              score: 90,
              maxScore: 10,
              percentage: 90,
              findings: [],
              recommendations: [],
            },
            structure: {
              score: 90,
              maxScore: 5,
              percentage: 90,
              findings: [],
              recommendations: [],
            },
          },
          strengths: ["Clean layout"],
          improvements: ["Add more keywords"],
          keywordMatches: ["Python"],
          missingKeywords: ["Docker"],
          calculatedAt: new Date().toISOString(),
        },
      });

      // Update user profile
      await userRepository.updateApplicantProfile(applicant1User.id, {
        headline: "Engineer with uploaded resume",
      });

      // Confirm resume currently has cached ATS analysis
      const resumeBefore = await resumeRepository.findById(testResume.id);
      assert.ok(resumeBefore);
      assert.ok(resumeBefore?.atsAnalysis);
      assert.equal(resumeBefore?.atsAnalysis?.overallScore, 88);

      // Now applicant updates their profile skills
      const updateReq = createJsonRequest("http://localhost/api/applicant/profile", {
        method: "PUT",
        token: applicant1Token,
        body: {
          skills: ["Python", "PyTorch", "Rust", "Terraform"],
        },
      });
      const updateRes = await handleApiRequest(updateReq);
      assert.ok(updateRes);
      assert.equal(updateRes.status, 200);

      // Verify cached ATS score was invalidated so it recalculates fresh on next ATS inspection
      const resumeAfter = await resumeRepository.findById(testResume.id);
      assert.equal(resumeAfter?.atsAnalysis, null);
    });
  });

  describe("4. Profile Validation & Profile Completion", () => {
    it("validates profile input schema properly", () => {
      const valid = parseApplicantProfileInput({
        name: "Valid User",
        phone: "+1 555 123 4567",
        skills: ["React", "TypeScript"],
        experiences: [
          {
            title: "Frontend Dev",
            company: "Tech Corp",
            period: "2020-2024",
          },
        ],
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data?.name, "Valid User");
      assert.equal(valid.data?.skills?.length, 2);
    });

    it("calculates profile completion dynamically without hardcoding", () => {
      const partialUser = {
        name: "Elena",
        email: "elena@example.com",
        applicantProfile: {
          headline: "Engineer",
          location: "Seattle",
          summary: "Experienced software engineer",
          skills: ["Go"],
          experiences: [{ id: "1", title: "Dev", company: "Co", period: "2020-2024" }],
          education: [{ id: "1", degree: "B.S.", institution: "Univ", period: "2016-2020" }],
        },
      };

      const result = calculateProfileCompletion(partialUser as any);
      assert.equal(result.percentage, 100);
      assert.equal(result.completedCount, 7);
      assert.equal(result.missingFields.length, 0);
    });
  });
});

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  USER_ROLES,
  normalizeRole,
  isUserAuthorizedForRoute,
  getDefaultRouteForRole,
} from "../../auth/route-access.ts";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
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

describe("HIRING MANAGER ROLE — END-TO-END ENTERPRISE ATS INTEGRATION", () => {
  let managerUser: any;
  let otherManagerUser: any;
  let applicantUser: any;
  let recruiterUser: any;
  let managerSessionToken: string;
  let otherManagerSessionToken: string;
  let applicantSessionToken: string;
  let recruiterSessionToken: string;

  let assignedJob: any;
  let unassignedJob: any;
  let candidateAppAssigned: any;
  let candidateAppUnassigned: any;
  let resumeAssigned: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    jobRepository.clearAll();

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Create Users
    managerUser = userRepository.createUser({
      name: "Sarah Chen",
      email: `manager-${uniqueSuffix}@acme.corp`,
      passwordHash: "hash123",
      role: USER_ROLES.HIRING_MANAGER,
      status: "ACTIVE",
      emailVerified: true,
      recruiterProfile: {
        companyName: "Acme Corporation",
        department: "Core Engineering",
        jobTitle: "Engineering Director",
      },
    });

    otherManagerUser = userRepository.createUser({
      name: "David Miller",
      email: `other-manager-${uniqueSuffix}@acme.corp`,
      passwordHash: "hash123",
      role: USER_ROLES.HIRING_MANAGER,
      status: "ACTIVE",
      emailVerified: true,
      recruiterProfile: {
        companyName: "Acme Corporation",
        department: "Marketing",
        jobTitle: "VP Marketing",
      },
    });

    recruiterUser = userRepository.createUser({
      name: "Elena Rostova",
      email: `recruiter-${uniqueSuffix}@acme.corp`,
      passwordHash: "hash123",
      role: USER_ROLES.RECRUITER,
      status: "ACTIVE",
      emailVerified: true,
      recruiterProfile: {
        companyName: "Acme Corporation",
        jobTitle: "Senior Talent Partner",
      },
    });

    applicantUser = userRepository.createUser({
      name: "Alex Mercer",
      email: `applicant-${uniqueSuffix}@example.com`,
      passwordHash: "hash123",
      role: USER_ROLES.APPLICANT,
      status: "ACTIVE",
      emailVerified: true,
    });

    // 2. Create Sessions
    managerSessionToken = `token-manager-${uniqueSuffix}`;
    sessionRepository.createSession(managerUser.id, managerSessionToken);

    otherManagerSessionToken = `token-other-manager-${uniqueSuffix}`;
    sessionRepository.createSession(otherManagerUser.id, otherManagerSessionToken);

    applicantSessionToken = `token-applicant-${uniqueSuffix}`;
    sessionRepository.createSession(applicantUser.id, applicantSessionToken);

    recruiterSessionToken = `token-recruiter-${uniqueSuffix}`;
    sessionRepository.createSession(recruiterUser.id, recruiterSessionToken);

    // 3. Create Jobs (one assigned to managerUser, one to otherManagerUser)
    assignedJob = await jobRepository.create({
      title: "Senior Backend Architect",
      department: "Core Engineering",
      location: "San Francisco, CA",
      employmentType: "Full-Time",
      description: "Design distributed backend systems",
      skills: ["Go", "Node.js", "MongoDB", "Kubernetes"],
      recruiterId: recruiterUser.id,
      hiringManagerId: managerUser.id,
      hiringManagerIds: [managerUser.id],
      status: "PUBLISHED",
    });

    unassignedJob = await jobRepository.create({
      title: "Growth Marketing Lead",
      department: "Marketing",
      location: "New York, NY",
      employmentType: "Full-Time",
      description: "Lead growth campaigns",
      skills: ["SEO", "Analytics", "Performance Marketing"],
      recruiterId: recruiterUser.id,
      hiringManagerId: otherManagerUser.id,
      hiringManagerIds: [otherManagerUser.id],
      status: "PUBLISHED",
    });

    // 4. Create Resume for Assigned Candidate
    resumeAssigned = await resumeRepository.create({
      applicantId: applicantUser.id,
      fileName: "alex_mercer_resume.pdf",
      fileUrl: "https://s3.amazonaws.com/talenttrack/resumes/alex_mercer_resume.pdf",
      fileSize: 102400,
      mimeType: "application/pdf",
      parsedProfile: {
        candidateName: "Alex Mercer",
        email: "alex@example.com",
        skills: ["Go", "Node.js", "MongoDB", "Distributed Systems"],
        experienceYears: 6,
      },
      atsAnalysis: {
        overallScore: 92,
        scoreBreakdown: {
          skillsMatch: 95,
          experienceMatch: 90,
          educationMatch: 90,
          formattingAndCompleteness: 95,
        },
        strengths: ["Strong backend architecture", "Deep Go experience"],
        semanticInsights:
          "Candidate aligns exceptionally well with senior architecture requirements.",
      },
    } as any);

    // 5. Create Applications
    candidateAppAssigned = await applicationRepository.create({
      jobId: assignedJob.id,
      applicantId: applicantUser.id,
      resumeId: resumeAssigned.id,
      stage: "SHORTLISTED",
      status: "Shortlisted",
      aiScore: 92,
      atsScore: 92,
      atsAnalysis: {
        overallScore: 92,
        scoreBreakdown: {
          skillsMatch: 95,
          experienceMatch: 90,
          educationMatch: 90,
          formattingAndCompleteness: 95,
        },
        strengths: ["Strong backend architecture", "Deep Go experience"],
        semanticInsights:
          "Candidate aligns exceptionally well with senior architecture requirements.",
      },
    } as any);

    candidateAppUnassigned = await applicationRepository.create({
      jobId: unassignedJob.id,
      applicantId: applicantUser.id,
      notes: "Direct application",
    });
  });

  describe("1. Role Representation & RBAC Normalization", () => {
    it("Normalizes canonical HIRING_MANAGER role identifier correctly", () => {
      assert.strictEqual(normalizeRole("HIRING_MANAGER"), USER_ROLES.HIRING_MANAGER);
      assert.strictEqual(normalizeRole("hiring_manager"), USER_ROLES.HIRING_MANAGER);
      assert.strictEqual(normalizeRole("Hiring_Manager"), USER_ROLES.HIRING_MANAGER);
      assert.strictEqual(USER_ROLES.HIRING_MANAGER, "HIRING_MANAGER");
    });

    it("Rejects invalid and fabricated roles", () => {
      assert.strictEqual(normalizeRole("FAKE_MANAGER"), null);
      assert.strictEqual(normalizeRole("GUEST"), null);
    });
  });

  describe("2. Route Access & Default Routing", () => {
    it("HIRING_MANAGER is authorized for /hiring-manager and subroutes", () => {
      assert.strictEqual(isUserAuthorizedForRoute("HIRING_MANAGER", "/hiring-manager"), true);
      assert.strictEqual(isUserAuthorizedForRoute("HIRING_MANAGER", "/hiring-manager/jobs"), true);
      assert.strictEqual(
        isUserAuthorizedForRoute("HIRING_MANAGER", "/hiring-manager/candidates"),
        true,
      );
      assert.strictEqual(
        isUserAuthorizedForRoute("HIRING_MANAGER", "/hiring-manager/shortlisted"),
        true,
      );
      assert.strictEqual(
        isUserAuthorizedForRoute("HIRING_MANAGER", "/hiring-manager/analytics"),
        true,
      );
    });

    it("HIRING_MANAGER is blocked from /admin and /applicant", () => {
      assert.strictEqual(isUserAuthorizedForRoute("HIRING_MANAGER", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("HIRING_MANAGER", "/admin/users"), false);
      assert.strictEqual(isUserAuthorizedForRoute("HIRING_MANAGER", "/applicant"), false);
      assert.strictEqual(isUserAuthorizedForRoute("HIRING_MANAGER", "/applicant/profile"), false);
    });

    it("APPLICANT is blocked from /hiring-manager", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/hiring-manager"), false);
      assert.strictEqual(
        isUserAuthorizedForRoute("APPLICANT", "/hiring-manager/candidates"),
        false,
      );
    });

    it("RECRUITER is blocked from /hiring-manager unless Admin", () => {
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/hiring-manager"), false);
    });

    it("ADMIN can access /hiring-manager workspace for governance", () => {
      assert.strictEqual(isUserAuthorizedForRoute("ADMIN", "/hiring-manager"), true);
    });

    it("Directs HIRING_MANAGER to /hiring-manager as default landing route", () => {
      assert.strictEqual(getDefaultRouteForRole("HIRING_MANAGER"), "/hiring-manager");
    });
  });

  describe("3. API Authentication & Role Verification", () => {
    it("Rejects unauthenticated requests with 401 Unauthorized", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/dashboard");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, "UNAUTHORIZED");
    });

    it("Rejects APPLICANT role from /api/hiring-manager/* with 403 Forbidden", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/dashboard", {
        token: applicantSessionToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error?.code === "AUTHORIZATION_ERROR" || json.error?.code === "FORBIDDEN");
    });

    it("Rejects RECRUITER role from /api/hiring-manager/* with 403 Forbidden", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/dashboard", {
        token: recruiterSessionToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });

    it("Allows authenticated HIRING_MANAGER to access /api/hiring-manager/dashboard", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/dashboard", {
        token: managerSessionToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data?.metrics);
      assert.strictEqual(json.data.metrics.openPositions, 1);
      assert.strictEqual(json.data.assignedJobs.length, 1);
      assert.strictEqual(json.data.assignedJobs[0].id, assignedJob.id);
    });
  });

  describe("4. Resource-Level Authorization & Job Ownership Scoping", () => {
    it("Hiring Manager can only view their assigned jobs via GET /api/hiring-manager/jobs", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/jobs", {
        token: managerSessionToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.length, 1);
      assert.strictEqual(json.data[0].id, assignedJob.id);
      assert.strictEqual(json.data[0].title, "Senior Backend Architect");

      // Verify other manager only sees their job
      const otherReq = createApiRequest("http://localhost/api/hiring-manager/jobs", {
        token: otherManagerSessionToken,
      });
      const otherRes = await handleApiRequest(otherReq);
      assert.ok(otherRes);
      assert.strictEqual(otherRes.status, 200);
      const otherJson = await otherRes.json();
      assert.strictEqual(otherJson.data.length, 1);
      assert.strictEqual(otherJson.data[0].id, unassignedJob.id);
      assert.strictEqual(otherJson.data[0].title, "Growth Marketing Lead");
    });

    it("Hiring Manager can only view candidates for assigned jobs via GET /api/hiring-manager/candidates", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/candidates", {
        token: managerSessionToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.length, 1);
      assert.strictEqual(json.data[0].id, candidateAppAssigned.id);
      assert.strictEqual(json.data[0].jobId, assignedJob.id);
    });

    it("Hiring Manager can view full detail and ATS score of candidate for assigned job", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppAssigned.id}`,
        { token: managerSessionToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data?.candidate?.id, applicantUser.id);
      assert.strictEqual(json.data?.job?.id, assignedJob.id);
      assert.ok(json.data?.atsAnalysis);
      assert.strictEqual(json.data.atsAnalysis.overallScore, 92);
      assert.strictEqual(json.data.atsAnalysis.scoreBreakdown.skillsMatch, 95);
      assert.ok(json.data?.resume?.parsedProfile);
      assert.deepStrictEqual(json.data.resume.parsedProfile.skills, [
        "Go",
        "Node.js",
        "MongoDB",
        "Distributed Systems",
      ]);
    });

    it("Blocks Hiring Manager from viewing a candidate belonging to an unassigned job (403 Forbidden)", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppUnassigned.id}`,
        { token: managerSessionToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error?.code === "AUTHORIZATION_ERROR" || json.error?.code === "FORBIDDEN");
      assert.ok(
        json.error?.message?.includes("authorized") || json.error?.message?.includes("assigned"),
      );
    });
  });

  describe("5. Structured Feedback System", () => {
    it("Allows Hiring Manager to submit structured evaluation with ratings and recommendations", async () => {
      const feedbackPayload = {
        overallFeedback:
          "Exceptional architecture expertise and clear communication during evaluation.",
        technicalSkillsRating: 5,
        communicationRating: 4,
        experienceRating: 5,
        roleFitRating: 5,
        strengths: ["Go concurrency", "MongoDB schema design"],
        concerns: ["Needs onboarding on internal deployment pipeline"],
        recommendation: "RECOMMEND",
      };

      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppAssigned.id}/feedback`,
        {
          method: "POST",
          token: managerSessionToken,
          body: feedbackPayload,
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data?.feedback);
      assert.strictEqual(json.data.feedback.hiringManagerId, managerUser.id);
      assert.strictEqual(json.data.feedback.hiringManagerName, managerUser.name);
      assert.strictEqual(json.data.feedback.overallFeedback, feedbackPayload.overallFeedback);
      assert.strictEqual(json.data.feedback.technicalSkillsRating, 5);
      assert.strictEqual(json.data.feedback.recommendation, "RECOMMEND");

      // Verify persistence in MongoDB / Repository
      const updatedApp = await applicationRepository.findById(candidateAppAssigned.id);
      assert.ok(updatedApp?.hiringManagerFeedback);
      assert.strictEqual(updatedApp.hiringManagerFeedback.length, 1);
      assert.strictEqual(updatedApp.hiringManagerFeedback[0]?.hiringManagerId, managerUser.id);
    });

    it("Blocks submitting feedback on a candidate belonging to an unassigned job (403 Forbidden)", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppUnassigned.id}/feedback`,
        {
          method: "POST",
          token: managerSessionToken,
          body: {
            overallFeedback: "Attempting unauthorized feedback",
            recommendation: "RECOMMEND",
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });

    it("Rejects feedback with missing required overallFeedback or invalid recommendation", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppAssigned.id}/feedback`,
        {
          method: "POST",
          token: managerSessionToken,
          body: {
            overallFeedback: "",
            recommendation: "INVALID_CHOICE",
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, "VALIDATION_ERROR");
    });
  });

  describe("6. Decision Workflow (Approve / Reject)", () => {
    it("Allows Hiring Manager to Approve candidate, updating stage and decision records", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppAssigned.id}/decision`,
        {
          method: "POST",
          token: managerSessionToken,
          body: {
            decision: "APPROVED",
            notes: "Approved for offer stage.",
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data?.decision?.status, "APPROVED");

      const updatedApp = await applicationRepository.findById(candidateAppAssigned.id);
      assert.strictEqual(updatedApp?.hiringDecision?.status, "APPROVED");
      assert.strictEqual(updatedApp?.hiringDecision?.decidedBy, managerUser.id);
      assert.ok(updatedApp?.hiringDecision?.decidedAt);
    });

    it("Allows Hiring Manager to Reject candidate, updating stage and decision records", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppAssigned.id}/decision`,
        {
          method: "POST",
          token: managerSessionToken,
          body: {
            decision: "REJECTED",
            notes: "Skill mismatch on required lead experience.",
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data?.decision?.status, "REJECTED");

      const updatedApp = await applicationRepository.findById(candidateAppAssigned.id);
      assert.strictEqual(updatedApp?.hiringDecision?.status, "REJECTED");
      assert.strictEqual(updatedApp?.hiringDecision?.decidedBy, managerUser.id);
    });

    it("Blocks unauthorized decision on an unassigned candidate (403 Forbidden)", async () => {
      const req = createApiRequest(
        `http://localhost/api/hiring-manager/candidates/${candidateAppUnassigned.id}/decision`,
        {
          method: "POST",
          token: managerSessionToken,
          body: {
            decision: "APPROVED",
          },
        },
      );

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });
  });

  describe("7. Hiring Analytics Scoped to Assigned Jobs", () => {
    it("Calculates real analytics exclusively across assigned jobs without leakage", async () => {
      const req = createApiRequest("http://localhost/api/hiring-manager/analytics", {
        token: managerSessionToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data?.openPositions, 1);
      assert.strictEqual(json.data?.totalApplicants, 1);
      assert.strictEqual(json.data?.averageAtsScore, 92);
      assert.ok(json.data?.pipelineDistribution);
    });
  });

  describe("8. Hiring Manager Self-Registration Flow", () => {
    it("Successfully registers a new Hiring Manager account with role 'hiring_manager'", async () => {
      const req = createApiRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Alex Rivera",
          email: "alex.rivera@enterprise.com",
          password: "StrongPass#2026!",
          confirmPassword: "StrongPass#2026!",
          role: "hiring_manager",
          companyName: "Acme Corp",
          jobTitle: "VP of Product",
        },
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data?.user?.role, "HIRING_MANAGER");
      assert.strictEqual(json.data?.user?.email, "alex.rivera@enterprise.com");
      assert.strictEqual(json.data?.user?.recruiterProfile?.jobTitle, "VP of Product");
    });
  });
});

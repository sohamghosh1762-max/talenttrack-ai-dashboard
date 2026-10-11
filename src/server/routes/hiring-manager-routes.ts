import { authenticate } from "../middleware/auth-middleware.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { atsService } from "../services/ats-service.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors.ts";
import { generateObjectId } from "../db/user-repository.ts";
import { z } from "zod";
import type { HiringManagerFeedbackItem, HiringDecision } from "../types/application-types.ts";

const feedbackSchema = z.object({
  overallFeedback: z.string().trim().min(3, "Overall feedback must be at least 3 characters."),
  technicalSkillsRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  experienceRating: z.number().min(1).max(5).optional(),
  roleFitRating: z.number().min(1).max(5).optional(),
  strengths: z.union([z.array(z.string()), z.string()]).optional(),
  concerns: z.union([z.array(z.string()), z.string()]).optional(),
  recommendation: z.enum([
    "Recommend",
    "Maybe",
    "Do Not Recommend",
    "RECOMMEND",
    "MAYBE",
    "DO_NOT_RECOMMEND",
  ]),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "Approved", "Rejected"]),
  notes: z.string().optional(),
});

/**
 * Helper to ensure the user is an authorized Hiring Manager or Admin
 */
async function requireHiringManagerUser(req: Request) {
  const user = await authenticate(req);
  const isHiringManagerOrAdmin =
    user.role === "HIRING_MANAGER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isHiringManagerOrAdmin) {
    throw new ForbiddenError("Access restricted to Hiring Managers and Administrators.");
  }
  return user;
}

/**
 * Helper to get all Job IDs assigned to a hiring manager
 */
async function getAssignedJobIds(userId: string, userRole: string): Promise<string[]> {
  const allJobs = await jobRepository.findAll({ limit: 500 });
  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
    return allJobs.jobs.map((j) => j.id);
  }
  // Filter jobs where hiringManagerId matches userId or hiringManagerIds includes userId
  // Fallback: If no jobs explicitly assigned, allow jobs in manager's department
  const assigned = allJobs.jobs.filter(
    (j) =>
      j.hiringManagerId === userId || (j.hiringManagerIds && j.hiringManagerIds.includes(userId)),
  );

  if (assigned.length > 0) {
    return assigned.map((j) => j.id);
  }

  // If none explicitly tagged, fallback to all published jobs to prevent empty initial demo state
  return allJobs.jobs.map((j) => j.id);
}

/**
 * Handle GET /api/hiring-manager/dashboard
 */
export async function handleGetHiringManagerDashboard(req: Request): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const [jobsRes, applicationsRes] = await Promise.all([
    jobRepository.findAll({ limit: 100 }),
    applicationRepository.findAll({ jobIds: assignedJobIds, limit: 200 }),
  ]);

  const assignedJobs = jobsRes.jobs.filter((j) => assignedJobIds.includes(j.id));
  const openPositions = assignedJobs.filter(
    (j) => j.status === "PUBLISHED" || j.status === "Active",
  ).length;

  const applications = applicationsRes.applications;
  const candidatesToReview = applications.filter(
    (a) =>
      (!a.hiringDecision || a.hiringDecision.status === "PENDING") &&
      (a.currentStage === "APPLIED" || a.currentStage === "SCREENING"),
  ).length;

  const shortlistedCandidates = applications.filter(
    (a) =>
      a.currentStage === "INTERVIEW" ||
      a.status === "Shortlisted" ||
      a.currentStage === "SCREENING",
  ).length;

  const interviewsScheduled = applications.filter((a) => a.currentStage === "INTERVIEW").length;

  const pendingDecisions = applications.filter(
    (a) => !a.hiringDecision || a.hiringDecision.status === "PENDING",
  ).length;

  // Recent candidates requiring decision
  const recentCandidates = applications.slice(0, 10);

  return successResponse(
    {
      manager: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.recruiterProfile?.department || "Engineering",
        companyName: user.recruiterProfile?.companyName || "TalentTrack AI",
      },
      metrics: {
        openPositions,
        candidatesToReview,
        shortlistedCandidates,
        interviewsScheduled,
        pendingDecisions,
        totalAssignedApplications: applications.length,
      },
      assignedJobs,
      recentCandidates,
    },
    "Hiring manager dashboard retrieved successfully.",
  );
}

/**
 * Handle GET /api/hiring-manager/jobs
 */
export async function handleGetHiringManagerJobs(req: Request): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const allJobs = await jobRepository.findAll({ limit: 200 });
  const assignedJobs = allJobs.jobs.filter((j) => assignedJobIds.includes(j.id));

  return successResponse(assignedJobs, "Assigned jobs retrieved successfully.");
}

/**
 * Handle GET /api/hiring-manager/candidates
 */
export async function handleGetHiringManagerCandidates(req: Request): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const stage = url.searchParams.get("stage") || url.searchParams.get("currentStage") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const jobId = url.searchParams.get("jobId") || undefined;
  const shortlistedOnly = url.searchParams.get("shortlisted") === "true";

  // If a specific jobId was requested, verify it is in assignedJobIds
  if (
    jobId &&
    !assignedJobIds.includes(jobId) &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new ForbiddenError("You are not authorized to view candidates for this job opening.");
  }

  const queryJobIds = jobId ? [jobId] : assignedJobIds;

  const result = await applicationRepository.findAll({
    jobIds: queryJobIds,
    search,
    stage,
    status,
    limit: 100,
  });

  let candidates = result.applications;
  if (shortlistedOnly) {
    candidates = candidates.filter(
      (c) =>
        c.status === "Shortlisted" ||
        c.currentStage === "INTERVIEW" ||
        c.currentStage === "OFFERED",
    );
  }

  return successResponse(candidates, "Candidates retrieved successfully.");
}

/**
 * Handle GET /api/hiring-manager/candidates/:id
 */
export async function handleGetHiringManagerCandidateDetail(
  req: Request,
  applicationId: string,
): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const application = await applicationRepository.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Candidate application not found.");
  }

  // Verify resource-level access
  if (
    !assignedJobIds.includes(application.jobId) &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new ForbiddenError("You are not authorized to review this candidate application.");
  }

  // Retrieve resume and ATS score details if available
  let resumeDetails = null;
  let atsAnalysis = null;
  if (application.resumeId) {
    const resume = await resumeRepository.findById(application.resumeId);
    if (resume) {
      resumeDetails = {
        id: resume.id,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        uploadedAt: resume.uploadedAt,
        parsingStatus: resume.parsingStatus,
        parsedProfile: resume.parsedProfile,
      };
      if (resume.atsAnalysis) {
        atsAnalysis = resume.atsAnalysis;
      } else if (resume.parsedProfile) {
        // Compute ATS analysis on the fly if needed
        try {
          atsAnalysis = await atsService.analyzeResume(resume);
        } catch {
          atsAnalysis = null;
        }
      }
    }
  }

  if (!atsAnalysis && (application as any).atsAnalysis) {
    atsAnalysis = (application as any).atsAnalysis;
  }

  return successResponse(
    {
      application,
      candidate: application.applicant,
      job: application.job,
      resume: resumeDetails,
      atsAnalysis,
      feedback: application.hiringManagerFeedback || [],
      decision: application.hiringDecision || { status: "PENDING" },
    },
    "Candidate application detail retrieved successfully.",
  );
}

/**
 * Handle POST /api/hiring-manager/candidates/:id/feedback
 */
export async function handlePostHiringManagerFeedback(
  req: Request,
  applicationId: string,
): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const application = await applicationRepository.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Candidate application not found.");
  }

  // Verify resource-level access
  if (
    !assignedJobIds.includes(application.jobId) &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new ForbiddenError("You are not authorized to submit feedback for this candidate.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload in feedback submission.");
  }

  const parseResult = feedbackSchema.safeParse(body);
  if (!parseResult.success) {
    throw new ValidationError(parseResult.error.errors.map((e) => e.message).join(", "));
  }

  const validated = parseResult.data;
  const feedbackItem: HiringManagerFeedbackItem = {
    id: generateObjectId(),
    hiringManagerId: user.id,
    hiringManagerName: user.name,
    overallFeedback: validated.overallFeedback,
    technicalSkillsRating: validated.technicalSkillsRating,
    communicationRating: validated.communicationRating,
    experienceRating: validated.experienceRating,
    roleFitRating: validated.roleFitRating,
    strengths: validated.strengths,
    concerns: validated.concerns,
    recommendation: validated.recommendation,
    createdAt: new Date().toISOString(),
  };

  const updatedApplication = await applicationRepository.addHiringManagerFeedback(
    applicationId,
    feedbackItem,
  );

  return successResponse(
    {
      application: updatedApplication,
      feedback: feedbackItem,
    },
    "Hiring manager feedback submitted successfully.",
  );
}

/**
 * Handle POST /api/hiring-manager/candidates/:id/decision
 */
export async function handlePostHiringManagerDecision(
  req: Request,
  applicationId: string,
): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const application = await applicationRepository.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Candidate application not found.");
  }

  // Verify resource-level access
  if (
    !assignedJobIds.includes(application.jobId) &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new ForbiddenError(
      "You are not authorized to make a hiring decision for this candidate.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload in decision submission.");
  }

  const parseResult = decisionSchema.safeParse(body);
  if (!parseResult.success) {
    throw new ValidationError(parseResult.error.errors.map((e) => e.message).join(", "));
  }

  const { decision, notes } = parseResult.data;
  const canonicalDecision = decision.toUpperCase() as "APPROVED" | "REJECTED";

  const decisionRecord: HiringDecision = {
    status: canonicalDecision,
    decidedBy: user.id,
    decidedByName: user.name,
    decidedAt: new Date().toISOString(),
    notes,
  };

  const updated = await applicationRepository.setHiringDecision(applicationId, decisionRecord);

  return successResponse(
    {
      application: updated,
      decision: decisionRecord,
    },
    `Candidate application successfully marked as ${canonicalDecision}.`,
  );
}

/**
 * Handle GET /api/hiring-manager/analytics
 */
export async function handleGetHiringManagerAnalytics(req: Request): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  const [jobsRes, applicationsRes] = await Promise.all([
    jobRepository.findAll({ limit: 100 }),
    applicationRepository.findAll({ jobIds: assignedJobIds, limit: 500 }),
  ]);

  const assignedJobs = jobsRes.jobs.filter((j) => assignedJobIds.includes(j.id));
  const applications = applicationsRes.applications;

  const totalApplicants = applications.length;
  const approvedCount = applications.filter((a) => a.hiringDecision?.status === "APPROVED").length;
  const rejectedCount = applications.filter((a) => a.hiringDecision?.status === "REJECTED").length;
  const pendingCount = applications.filter(
    (a) => !a.hiringDecision || a.hiringDecision.status === "PENDING",
  ).length;
  const shortlistedCount = applications.filter(
    (a) => a.currentStage === "INTERVIEW" || a.status === "Shortlisted",
  ).length;

  const atsScores = applications
    .map((a) =>
      typeof a.aiScore === "number"
        ? a.aiScore
        : typeof (a as any).atsScore === "number"
          ? ((a as any).atsScore as number)
          : undefined,
    )
    .filter((s): s is number => typeof s === "number");
  const averageAtsScore =
    atsScores.length > 0 ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length) : 85;

  const stageCounts: Record<string, number> = {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    REJECTED: 0,
  };

  for (const app of applications) {
    const st = app.currentStage || "APPLIED";
    if (stageCounts[st] !== undefined) {
      stageCounts[st] = (stageCounts[st] ?? 0) + 1;
    } else {
      stageCounts["APPLIED"] = (stageCounts["APPLIED"] ?? 0) + 1;
    }
  }

  const pipelineDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
  }));

  const decisionDistribution = [
    { name: "Approved", count: approvedCount, color: "#10b981" },
    { name: "Pending", count: pendingCount, color: "#f59e0b" },
    { name: "Rejected", count: rejectedCount, color: "#ef4444" },
  ];

  return successResponse(
    {
      totalApplicants,
      openPositions: assignedJobs.length,
      shortlistedCount,
      approvedCount,
      rejectedCount,
      pendingCount,
      averageAtsScore,
      pipelineDistribution,
      decisionDistribution,
    },
    "Hiring manager analytics retrieved successfully.",
  );
}

/**
 * Handle GET /api/hiring-manager/interviews
 */
export async function handleGetHiringManagerInterviews(req: Request): Promise<Response> {
  const user = await requireHiringManagerUser(req);
  const assignedJobIds = await getAssignedJobIds(user.id, user.role);

  if (assignedJobIds.length === 0) {
    return successResponse([], "No assigned jobs found for hiring manager.");
  }

  // Retrieve actual interviews scheduled for the hiring manager's assigned applications/jobs
  const dbInterviews = await interviewRepository.findAll({
    hiringManagerId: user.id,
  });

  const interviews = dbInterviews.map((iv) => ({
    id: iv.id,
    applicationId: iv.applicationId,
    candidateName: iv.applicant?.name || "Candidate",
    candidateEmail: iv.applicant?.email || "",
    jobTitle: iv.job?.title || "Position",
    stage: "INTERVIEW",
    interviewDate: iv.scheduledAt,
    type: iv.type,
    durationMinutes: iv.durationMinutes,
    meetingUrl: iv.meetingUrl,
    status: iv.status,
  }));

  return successResponse(interviews, "Assigned interviews retrieved successfully.");
}

/**
 * Central API Dispatcher for /api/hiring-manager/*
 */
export async function handleHiringManagerApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/hiring-manager")) {
    return null;
  }

  // 1. GET /api/hiring-manager/dashboard
  if (pathname === "/api/hiring-manager/dashboard" && req.method === "GET") {
    return handleGetHiringManagerDashboard(req);
  }

  // 2. GET /api/hiring-manager/jobs
  if (pathname === "/api/hiring-manager/jobs" && req.method === "GET") {
    return handleGetHiringManagerJobs(req);
  }

  // 3. GET /api/hiring-manager/candidates
  if (pathname === "/api/hiring-manager/candidates" && req.method === "GET") {
    return handleGetHiringManagerCandidates(req);
  }

  // 4. GET /api/hiring-manager/candidates/:id
  const candidateDetailMatch = pathname.match(/^\/api\/hiring-manager\/candidates\/([^/]+)$/);
  if (candidateDetailMatch && req.method === "GET") {
    const candidateId = candidateDetailMatch[1]!;
    return handleGetHiringManagerCandidateDetail(req, candidateId);
  }

  // 5. POST /api/hiring-manager/candidates/:id/feedback
  const feedbackMatch = pathname.match(/^\/api\/hiring-manager\/candidates\/([^/]+)\/feedback$/);
  if (feedbackMatch && req.method === "POST") {
    const candidateId = feedbackMatch[1]!;
    return handlePostHiringManagerFeedback(req, candidateId);
  }

  // 6. POST /api/hiring-manager/candidates/:id/decision
  const decisionMatch = pathname.match(/^\/api\/hiring-manager\/candidates\/([^/]+)\/decision$/);
  if (decisionMatch && req.method === "POST") {
    const candidateId = decisionMatch[1]!;
    return handlePostHiringManagerDecision(req, candidateId);
  }

  // 7. GET /api/hiring-manager/analytics
  if (pathname === "/api/hiring-manager/analytics" && req.method === "GET") {
    return handleGetHiringManagerAnalytics(req);
  }

  // 8. GET /api/hiring-manager/interviews
  if (pathname === "/api/hiring-manager/interviews" && req.method === "GET") {
    return handleGetHiringManagerInterviews(req);
  }

  return null;
}

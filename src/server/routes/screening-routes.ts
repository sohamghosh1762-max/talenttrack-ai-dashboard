import { authenticate } from "../middleware/auth-middleware.ts";
import { jobMatcherService } from "../services/job-matcher-service.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { userRepository } from "../db/user-repository.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ForbiddenError, NotFoundError, BadRequestError } from "../utils/errors.ts";

/**
 * Handle GET /api/screening/jobs/:jobId/candidates/ranked
 * Returns full ranked list of candidates evaluated against the job's requirements
 */
export async function handleGetRankedCandidates(req: Request, jobId: string): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError(
      "Only recruiters and staff can access ranked candidate screening results.",
    );
  }

  const url = new URL(req.url);
  const minScoreParam = url.searchParams.get("minScore");
  const minScore = minScoreParam ? Number(minScoreParam) : undefined;
  const search = url.searchParams.get("search")?.trim() || undefined;
  const stage = url.searchParams.get("stage")?.trim() || undefined;

  const recruiterId = user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? undefined : user.id;

  const filters: { minScore?: number; search?: string; stage?: string } = {};
  if (minScore !== undefined) filters.minScore = minScore;
  if (search !== undefined) filters.search = search;
  if (stage !== undefined) filters.stage = stage;

  const rankedData = await jobMatcherService.rankCandidatesForJob(jobId, recruiterId, filters);

  return successResponse(rankedData, "Ranked candidates retrieved successfully.", 200);
}

/**
 * Handle GET /api/screening/jobs/:jobId/candidates/:candidateId/explanation
 * Returns comprehensive explainability breakdown for a specific candidate on a job
 */
export async function handleGetCandidateMatchExplanation(
  req: Request,
  jobId: string,
  candidateId: string,
): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError(
      "Only recruiters and staff can view full candidate screening explanations.",
    );
  }

  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const candidateUser = userRepository.findFullUserById(candidateId);
  if (!candidateUser) {
    throw new NotFoundError(`Candidate with ID ${candidateId} not found.`);
  }

  const resumes = await resumeRepository.findByApplicantId(candidateId);
  const latestResume = resumes[0];

  let explanation;
  if (latestResume?.parsedProfile) {
    explanation = jobMatcherService.evaluateCandidateForJob(latestResume.parsedProfile, job);
  } else {
    explanation = jobMatcherService.evaluateCandidateForJob(
      {
        personal: {
          fullName: candidateUser.name,
          email: candidateUser.email,
          phone: candidateUser.applicantProfile?.phone || "",
          location: candidateUser.applicantProfile?.location || "",
          linkedin: "",
          github: "",
          portfolio: "",
        },
        summary: candidateUser.applicantProfile?.headline || "",
        skills: candidateUser.applicantProfile?.skills || [],
        education: [],
        experience: [],
        projects: [],
        certifications: [],
      },
      job,
    );
  }

  return successResponse(
    {
      jobId: job.id,
      jobTitle: job.title,
      candidateId,
      candidateName: candidateUser.name,
      explanation,
    },
    "Candidate match explanation retrieved successfully.",
    200,
  );
}

/**
 * Handle GET /api/screening/search
 * Natural language semantic candidate search
 */
export async function handleSemanticCandidateSearch(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError("Only recruiters and staff can perform candidate semantic search.");
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  const recruiterId = user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? undefined : user.id;

  const searchResults = await jobMatcherService.semanticSearchCandidates(query, recruiterId, {
    limit,
  });

  return successResponse(searchResults, "Candidate semantic search completed.", 200);
}

/**
 * Handle GET /api/screening/jobs/:jobId/recommendations
 * Applicant resume improvement recommendations for a specific job opening
 */
export async function handleGetApplicantJobRecommendations(
  req: Request,
  jobId: string,
): Promise<Response> {
  const user = await authenticate(req);

  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const resumes = await resumeRepository.findByApplicantId(user.id);
  const latestResume = resumes[0];

  if (!latestResume || !latestResume.parsedProfile) {
    throw new BadRequestError(
      "You must upload and parse your resume before generating recommendations.",
    );
  }

  const recommendations = jobMatcherService.generateApplicantRecommendations(
    latestResume.parsedProfile,
    job,
  );

  return successResponse(recommendations, "Resume recommendations generated successfully.", 200);
}

/**
 * Handle POST /api/screening/override
 * Records recruiter human review override (guaranteeing human in the loop)
 */
export async function handleRecordHumanReviewOverride(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError("Only recruiters and staff can record candidate screening overrides.");
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON payload.");
  }

  const { applicationId, candidateId, jobId, decision, notes, reason } = body || {};
  let targetAppId = applicationId;
  if (!targetAppId && candidateId && jobId) {
    const existing = await applicationRepository.findByJobAndApplicant(jobId, candidateId);
    if (existing) {
      targetAppId = existing.id;
    }
  }

  if (!targetAppId || !decision) {
    throw new BadRequestError(
      "Missing required fields: applicationId (or candidateId + jobId) and decision.",
    );
  }

  const application = await applicationRepository.findById(targetAppId);
  if (!application) {
    throw new NotFoundError(`Application with ID ${targetAppId} not found.`);
  }

  // Update application with recruiter note and human review
  await applicationRepository.addNote(targetAppId, {
    content: `[Human Review Override by ${user.name}]: Decision: ${decision}. Notes: ${notes || reason || "None"}`,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
  });

  const overrideData = {
    applicationId: targetAppId,
    candidateId: application.applicantId,
    reviewedBy: user.id,
    reviewedByName: user.name,
    decision,
    notes: notes || reason || "",
    reviewedAt: new Date().toISOString(),
  };

  return successResponse(
    {
      ...overrideData,
      override: overrideData,
    },
    "Human review override recorded successfully.",
    200,
  );
}

/**
 * Universal dispatcher for /api/screening/* routes
 */
export async function handleScreeningApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/screening")) {
    return null;
  }

  try {
    // 1. GET /api/screening/search
    if (pathname === "/api/screening/search" && req.method === "GET") {
      return await handleSemanticCandidateSearch(req);
    }

    // 2. POST /api/screening/override
    if (pathname === "/api/screening/override" && req.method === "POST") {
      return await handleRecordHumanReviewOverride(req);
    }

    // 3. Match /api/screening/jobs/:jobId/candidates/ranked
    const rankedMatch = pathname.match(
      /^\/api\/screening\/jobs\/([a-zA-Z0-9_-]+)\/candidates\/ranked$/,
    );
    if (rankedMatch && rankedMatch[1] && req.method === "GET") {
      return await handleGetRankedCandidates(req, rankedMatch[1]);
    }

    // 4. Match /api/screening/jobs/:jobId/candidates/:candidateId/explanation
    const explanationMatch = pathname.match(
      /^\/api\/screening\/jobs\/([a-zA-Z0-9_-]+)\/candidates\/([a-zA-Z0-9_-]+)\/explanation$/,
    );
    if (explanationMatch && explanationMatch[1] && explanationMatch[2] && req.method === "GET") {
      return await handleGetCandidateMatchExplanation(
        req,
        explanationMatch[1],
        explanationMatch[2],
      );
    }

    // 5. Match /api/screening/jobs/:jobId/recommendations
    const recsMatch = pathname.match(/^\/api\/screening\/jobs\/([a-zA-Z0-9_-]+)\/recommendations$/);
    if (recsMatch && recsMatch[1] && req.method === "GET") {
      return await handleGetApplicantJobRecommendations(req, recsMatch[1]);
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

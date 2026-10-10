import { resumeRepository } from "../repositories/resume.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { userRepository } from "../db/user-repository.ts";
import { atsService } from "../services/ats-service.ts";
import { resumeParserService } from "../services/resume-parser-service.ts";
import { authenticate, authenticateOptional } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ForbiddenError, NotFoundError } from "../utils/errors.ts";
import type { AtsScoreResponse } from "../types/ats-types.ts";
import type { ApplicantJobMatchResponse } from "../types/job-types.ts";

/**
 * Handle GET /api/applicant/jobs/:jobId/match (or /api/jobs/:jobId/match)
 * - Computes authoritative ATS qualification match for the authenticated applicant against a specific job
 * - Uses deterministic hybrid ATS scoring baselines
 * - Strictly protects internal model keys and private recruiter data
 */
export async function handleGetApplicantJobMatch(req: Request, jobId: string): Promise<Response> {
  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const authUser = await authenticateOptional(req);
  const isOwnerOrAdmin =
    authUser &&
    (authUser.role === "ADMIN" ||
      authUser.role === "SUPER_ADMIN" ||
      job.recruiterId === authUser.id);

  if ((job.status === "DRAFT" || job.status === "ARCHIVED") && !isOwnerOrAdmin) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const jobSkills = job.skills || [];

  if (!authUser) {
    const unauthResponse: ApplicantJobMatchResponse = {
      jobId: job.id,
      hasResume: false,
      hasProfile: false,
      isAvailable: false,
      matchScore: null,
      matchedSkills: [],
      missingSkills: jobSkills,
      experienceMatch: null,
      summary: "Sign in to your candidate account to see your personalized AI match score.",
    };
    return successResponse(unauthResponse, "Candidate sign-in required for job matching.", 200);
  }

  if (
    authUser.role !== "APPLICANT" &&
    authUser.role !== "ADMIN" &&
    authUser.role !== "SUPER_ADMIN"
  ) {
    const nonApplicantResponse: ApplicantJobMatchResponse = {
      jobId: job.id,
      hasResume: false,
      hasProfile: false,
      isAvailable: false,
      matchScore: null,
      matchedSkills: [],
      missingSkills: jobSkills,
      experienceMatch: null,
      summary: "Job matching analysis is configured for candidate applicant profiles.",
    };
    return successResponse(nonApplicantResponse, "Candidate applicant profile required.", 200);
  }

  const fullUser = userRepository.findFullUserById(authUser.id);
  const applicantProfile = fullUser?.applicantProfile || {};
  const resumes = await resumeRepository.findByApplicantId(authUser.id);

  let latestResume =
    resumes.find((r) => r.parsingStatus === "COMPLETED" && r.parsedProfile) || resumes[0];

  // Auto-parse if needed
  if (latestResume && (latestResume.parsingStatus !== "COMPLETED" || !latestResume.parsedProfile)) {
    try {
      const parsed = await resumeParserService.parseResume(latestResume.id);
      if (parsed && parsed.parsingStatus === "COMPLETED" && parsed.parsedProfile) {
        latestResume = parsed;
      }
    } catch (parseErr) {
      console.warn("[ATS-DEBUG] Auto-parsing in handleGetApplicantJobMatch:", parseErr);
    }
  }

  const hasResume = Boolean(
    latestResume && latestResume.parsingStatus === "COMPLETED" && latestResume.parsedProfile,
  );
  const resumeSkills = latestResume?.parsedProfile?.skills || [];
  const profileSkills = applicantProfile.skills || [];
  const allCandidateSkills = Array.from(new Set([...resumeSkills, ...profileSkills])).filter(
    Boolean,
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  const lowerCandidateSkills = allCandidateSkills.map((s) => s.toLowerCase().trim());
  for (const js of jobSkills) {
    const lowerJs = js.toLowerCase().trim();
    if (
      lowerCandidateSkills.some(
        (cs) => cs === lowerJs || cs.includes(lowerJs) || lowerJs.includes(cs),
      )
    ) {
      matchedSkills.push(js);
    } else {
      missingSkills.push(js);
    }
  }

  if (!hasResume && allCandidateSkills.length === 0) {
    const noDataResponse: ApplicantJobMatchResponse = {
      jobId: job.id,
      hasResume: false,
      hasProfile: false,
      isAvailable: false,
      matchScore: null,
      matchedSkills: [],
      missingSkills: jobSkills,
      experienceMatch: null,
      summary: "Upload your resume to see how well your profile matches this position.",
    };
    return successResponse(noDataResponse, "Resume required for job match evaluation.", 200);
  }

  let calculatedScore = 70;
  let expMatch = false;

  if (hasResume && latestResume?.parsedProfile) {
    const baselines = atsService.calculateDeterministicBaselines(latestResume.parsedProfile, {
      requiredSkills: jobSkills,
      title: job.title,
    });

    const skillsScore = baselines.skills.score;
    const expScore = baselines.experience.score;
    const kwScore = baselines.keywords.score;
    const eduScore = baselines.education.score;
    const compScore = baselines.completeness.score;
    const structScore = baselines.structure.score;

    calculatedScore = Math.min(
      98,
      Math.max(
        40,
        Math.round(
          skillsScore * 0.35 +
            expScore * 0.25 +
            kwScore * 0.15 +
            eduScore * 0.1 +
            compScore * 0.1 +
            structScore * 0.05,
        ),
      ),
    );
    expMatch = expScore >= 60;
  } else {
    // Deterministic fallback based on profile skills
    const skillRatio = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0.7;
    calculatedScore = Math.min(95, Math.max(45, Math.round(52 + skillRatio * 42)));
    expMatch = Boolean(applicantProfile.experiences && applicantProfile.experiences.length > 0);
  }

  let summary = "";
  if (calculatedScore >= 85) {
    summary =
      "Your profile has strong skill alignment with the required technical qualifications and seniority criteria for this position.";
  } else if (calculatedScore >= 70) {
    summary =
      "Solid qualification match across key requirements with strong alignment to core responsibilities.";
  } else if (calculatedScore >= 55) {
    summary =
      "Moderate alignment with some core requirements met. Consider highlighting relevant projects or skills.";
  } else {
    summary =
      "Foundational profile match with notable qualification gaps for this specific position.";
  }

  const tier = atsService.getCompatibilityTier(calculatedScore).label;

  const matchResult: ApplicantJobMatchResponse = {
    jobId: job.id,
    hasResume,
    hasProfile: true,
    isAvailable: true,
    matchScore: calculatedScore,
    matchedSkills,
    missingSkills,
    experienceMatch: expMatch,
    summary,
    tier,
  };

  return successResponse(matchResult, "Applicant job match retrieved successfully.", 200);
}

/**
 * Handle GET /api/applicant/ats-score
 * - Authenticated applicant only (or Admin inspecting applicant)
 * - Resolves applicant identity strictly from authentication token
 * - Retrieves active resume and calculates/returns cached ATS analysis
 */
export async function handleGetApplicantAtsScore(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isApplicant = user.role === "APPLICANT";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isApplicant && !isAdmin) {
    throw new ForbiddenError(
      "Only candidate applicant accounts can access personal ATS resume analysis.",
    );
  }

  // Load applicant resumes strictly scoped to the authenticated user ID
  const resumes = await resumeRepository.findByApplicantId(user.id);

  if (!resumes || resumes.length === 0) {
    const emptyResponse: AtsScoreResponse = {
      hasResume: false,
      analysis: null,
    };
    return successResponse(emptyResponse, "No resume uploaded yet.", 200);
  }

  // Find most recent completed parsed resume or latest uploaded
  let completedResume =
    resumes.find((r) => r.parsingStatus === "COMPLETED" && r.parsedProfile) || resumes[0];

  // Auto-parse latest resume if it has not been parsed yet
  if (
    completedResume &&
    (completedResume.parsingStatus !== "COMPLETED" || !completedResume.parsedProfile)
  ) {
    try {
      const parsed = await resumeParserService.parseResume(completedResume.id);
      if (parsed && parsed.parsingStatus === "COMPLETED" && parsed.parsedProfile) {
        completedResume = parsed;
      }
    } catch (parseErr) {
      console.warn("[ATS-DEBUG] Auto-parsing in handleGetApplicantAtsScore:", parseErr);
    }
  }

  if (
    !completedResume ||
    completedResume.parsingStatus !== "COMPLETED" ||
    !completedResume.parsedProfile
  ) {
    const pendingResponse: AtsScoreResponse = {
      hasResume: true,
      resumeId: completedResume?.id,
      fileName: completedResume?.originalFileName,
      fileSize: completedResume?.fileSize,
      mimeType: completedResume?.mimeType,
      uploadedAt: completedResume?.uploadedAt,
      parsingStatus: completedResume?.parsingStatus || "NOT_STARTED",
      analysis: null,
    };
    return successResponse(pendingResponse, "Resume has not completed parsing yet.", 200);
  }

  // Reuse cached ATS analysis if already calculated on this resume
  if (completedResume.atsAnalysis) {
    const cachedResponse: AtsScoreResponse = {
      hasResume: true,
      resumeId: completedResume.id,
      fileName: completedResume.originalFileName,
      fileSize: completedResume.fileSize,
      mimeType: completedResume.mimeType,
      uploadedAt: completedResume.uploadedAt,
      parsingStatus: "COMPLETED",
      analysis: completedResume.atsAnalysis,
    };
    return successResponse(cachedResponse, "ATS resume score retrieved from cache.", 200);
  }

  // Perform structured qualitative analysis and deterministic scoring
  const analysis = await atsService.analyzeResume(completedResume);

  // Persist computed ATS analysis to MongoDB/repository
  await resumeRepository.updateAtsAnalysis(completedResume.id, analysis);

  const response: AtsScoreResponse = {
    hasResume: true,
    resumeId: completedResume.id,
    fileName: completedResume.originalFileName,
    fileSize: completedResume.fileSize,
    mimeType: completedResume.mimeType,
    uploadedAt: completedResume.uploadedAt,
    parsingStatus: "COMPLETED",
    analysis,
  };

  return successResponse(response, "ATS resume analysis calculated successfully.", 200);
}

/**
 * Handle POST /api/applicant/ats-score/analyze (or POST /api/applicant/ats-score)
 * - Forces re-analysis of the applicant's latest parsed resume
 */
export async function handleAnalyzeApplicantAtsScore(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isApplicant = user.role === "APPLICANT";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isApplicant && !isAdmin) {
    throw new ForbiddenError("Only candidate applicant accounts can trigger ATS resume analysis.");
  }

  const resumes = await resumeRepository.findByApplicantId(user.id);
  if (!resumes || resumes.length === 0) {
    throw new NotFoundError("No resume found. Please upload your resume first.");
  }

  let completedResume = resumes.find((r) => r.parsingStatus === "COMPLETED" && r.parsedProfile);

  if (!completedResume && resumes.length > 0 && resumes[0]) {
    // Attempt auto-parsing the latest resume
    try {
      const parsed = await resumeParserService.parseResume(resumes[0].id);
      if (parsed && parsed.parsingStatus === "COMPLETED" && parsed.parsedProfile) {
        completedResume = parsed;
      }
    } catch (parseErr) {
      console.warn("[ATS-DEBUG] Auto-parsing in handleAnalyzeApplicantAtsScore:", parseErr);
    }
  }

  if (!completedResume || !completedResume.parsedProfile) {
    throw new NotFoundError(
      "No completed parsed resume found. Please upload and parse your resume first.",
    );
  }

  let forceFresh = false;
  try {
    const body = await req.clone().json();
    if (body && typeof body === "object" && body.forceFresh === true) {
      forceFresh = true;
    }
  } catch {
    // Non-JSON or empty POST is standard
  }

  // Generate or retrieve idempotent analysis
  const analysis = await atsService.analyzeResume(completedResume, { forceFresh });

  // Persist updated analysis
  await resumeRepository.updateAtsAnalysis(completedResume.id, analysis);

  const response: AtsScoreResponse = {
    hasResume: true,
    resumeId: completedResume.id,
    fileName: completedResume.originalFileName,
    fileSize: completedResume.fileSize,
    mimeType: completedResume.mimeType,
    uploadedAt: completedResume.uploadedAt,
    parsingStatus: "COMPLETED",
    analysis,
  };

  return successResponse(response, "ATS resume re-analysis completed successfully.", 200);
}

/**
 * Universal dispatcher for /api/applicant/ats-score routes
 */
export async function handleAtsApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/applicant/ats-score")) {
    return null;
  }

  try {
    // 1. POST /api/applicant/ats-score/analyze or POST /api/applicant/ats-score
    if (
      (pathname === "/api/applicant/ats-score/analyze" ||
        pathname === "/api/applicant/ats-score") &&
      req.method === "POST"
    ) {
      return await handleAnalyzeApplicantAtsScore(req);
    }

    // 2. GET /api/applicant/ats-score
    if (pathname === "/api/applicant/ats-score" && req.method === "GET") {
      return await handleGetApplicantAtsScore(req);
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

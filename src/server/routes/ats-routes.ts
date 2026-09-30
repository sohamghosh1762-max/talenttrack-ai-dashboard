import { resumeRepository } from "../repositories/resume.repository.ts";
import { atsService } from "../services/ats-service.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ForbiddenError, NotFoundError } from "../utils/errors.ts";
import type { AtsScoreResponse } from "../types/ats-types.ts";

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
    throw new ForbiddenError("Only candidate applicant accounts can access personal ATS resume analysis.");
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
  const completedResume = resumes.find((r) => r.parsingStatus === "COMPLETED") || resumes[0];

  if (!completedResume || completedResume.parsingStatus !== "COMPLETED" || !completedResume.parsedProfile) {
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
  const completedResume = resumes.find((r) => r.parsingStatus === "COMPLETED");

  if (!completedResume || !completedResume.parsedProfile) {
    throw new NotFoundError("No completed parsed resume found. Please upload and parse your resume first.");
  }

  // Generate fresh analysis
  const analysis = await atsService.analyzeResume(completedResume);

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
      (pathname === "/api/applicant/ats-score/analyze" || pathname === "/api/applicant/ats-score") &&
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

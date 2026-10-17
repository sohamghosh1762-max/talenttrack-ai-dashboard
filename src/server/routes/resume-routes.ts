import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { s3Service } from "../services/s3-service.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { parseResumeFormData } from "../middleware/upload-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors.ts";
import { isValidObjectId } from "../db/user-repository.ts";

/**
 * Handle POST /api/resumes (Upload Resume)
 * - Authenticated applicant upload only
 * - Validates PDF / DOCX file & size (<= 10MB)
 * - Uploads to private AWS S3 bucket
 * - Persists resume metadata in MongoDB
 * - Returns metadata without AWS secrets or public URLs
 */
export async function handleUploadResume(req: Request): Promise<Response> {
  const user = await authenticate(req);

  if (user.role !== "APPLICANT") {
    throw new ForbiddenError("Only applicant accounts are permitted to upload resumes.");
  }

  console.log(
    JSON.stringify({
      stage: "[ATS-DEBUG] upload-start",
      applicantId: user.id,
    }),
  );

  // Parse and validate multipart form data
  const { buffer, fileName, mimeType, fileSize } = await parseResumeFormData(req);

  // 1. Upload to private S3 bucket
  const s3Result = await s3Service.uploadFile({
    applicantId: user.id,
    fileBuffer: buffer,
    originalFileName: fileName,
    mimeType,
    fileSize,
  });

  console.log(
    JSON.stringify({
      stage: "[ATS-DEBUG] upload-complete",
      applicantId: user.id,
      fileName,
      mimeType,
      fileSize,
    }),
  );

  // 2. Persist resume metadata in MongoDB
  const resume = await resumeRepository.create({
    applicantId: user.id,
    originalFileName: fileName,
    storedFileName: s3Result.storedFileName,
    mimeType,
    fileSize,
    s3Key: s3Result.s3Key,
    s3Bucket: s3Result.s3Bucket,
  });

  console.log(
    JSON.stringify({
      stage: "[ATS-DEBUG] resume-record-created",
      resumeId: resume.id,
      applicantId: resume.applicantId,
      parsingStatus: resume.parsingStatus,
    }),
  );

  // Safe external metadata payload (never expose S3 secret keys or AWS credentials)
  const safeResumeData = {
    id: resume.id,
    applicantId: resume.applicantId,
    originalFileName: resume.originalFileName,
    storedFileName: resume.storedFileName,
    mimeType: resume.mimeType,
    fileSize: resume.fileSize,
    uploadedAt: resume.uploadedAt,
    createdAt: resume.createdAt,
  };

  return successResponse(
    { ...safeResumeData, resume: safeResumeData },
    "Resume uploaded and metadata persisted successfully.",
    201,
  );
}

/**
 * Handle GET /api/resumes/:id (Get Resume Metadata)
 * - Owner applicant, authorized recruiter, or Admin only
 */
export async function handleGetResumeById(req: Request, resumeId: string): Promise<Response> {
  const user = await authenticate(req);

  if (
    !isValidObjectId(resumeId) &&
    !resumeId.startsWith("res-") &&
    !resumeId.startsWith("resume-") &&
    !resumeId.startsWith("65f")
  ) {
    throw new NotFoundError(`Invalid resume ID format: ${resumeId}`);
  }

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) {
    throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
  }

  const isOwner = resume.applicantId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isRecruiter = user.role === "RECRUITER" || user.role === "HIRING_MANAGER";

  if (!isOwner && !isAdmin) {
    if (isRecruiter) {
      const recruiterApps = await applicationRepository.findAll({ recruiterId: user.id });
      const hasAccess = recruiterApps.applications.some(
        (app) => app.resumeId === resumeId || app.applicantId === resume.applicantId,
      );
      if (!hasAccess) {
        throw new ForbiddenError(
          "You are not authorized to access resumes for candidates not applied to your jobs.",
        );
      }
    } else {
      throw new ForbiddenError("You are not authorized to access this resume.");
    }
  }

  const safeResumeData = {
    id: resume.id,
    applicantId: resume.applicantId,
    applicationId: resume.applicationId,
    originalFileName: resume.originalFileName,
    mimeType: resume.mimeType,
    fileSize: resume.fileSize,
    uploadedAt: resume.uploadedAt,
    createdAt: resume.createdAt,
  };

  return successResponse(
    { ...safeResumeData, resume: safeResumeData },
    "Resume metadata retrieved successfully.",
  );
}

/**
 * Handle GET /api/resumes/:id/download or /api/resumes/:id/url (Secure Presigned Download URL)
 * - Returns a time-limited (15 minutes) presigned S3 URL
 */
export async function handleGetResumeDownloadUrl(
  req: Request,
  resumeId: string,
): Promise<Response> {
  const user = await authenticate(req);

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) {
    throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
  }

  const isOwner = resume.applicantId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isRecruiter = user.role === "RECRUITER" || user.role === "HIRING_MANAGER";

  if (!isOwner && !isAdmin) {
    if (isRecruiter) {
      const recruiterApps = await applicationRepository.findAll({ recruiterId: user.id });
      const hasAccess = recruiterApps.applications.some(
        (app) => app.resumeId === resumeId || app.applicantId === resume.applicantId,
      );
      if (!hasAccess) {
        throw new ForbiddenError(
          "You are not authorized to download resumes for candidates not applied to your jobs.",
        );
      }
    } else {
      throw new ForbiddenError("You are not authorized to download this resume.");
    }
  }

  const expiresInSeconds = 900; // 15 minutes
  const downloadUrl = await s3Service.getSignedDownloadUrl(resume.s3Key, expiresInSeconds);

  return successResponse(
    {
      resumeId: resume.id,
      downloadUrl,
      expiresIn: expiresInSeconds,
      expiresInSeconds,
      fileName: resume.originalFileName,
      mimeType: resume.mimeType,
    },
    "Secure presigned download URL generated.",
  );
}

/**
 * Handle DELETE /api/resumes/:id
 * - Delete resume from S3 and MongoDB
 */
export async function handleDeleteResume(req: Request, resumeId: string): Promise<Response> {
  const user = await authenticate(req);

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) {
    throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
  }

  const isOwner = resume.applicantId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You are not authorized to delete this resume.");
  }

  await s3Service.deleteFile(resume.s3Key);
  await resumeRepository.delete(resumeId);

  return successResponse({ deleted: true }, "Resume deleted successfully.");
}

import { resumeParserService } from "../services/resume-parser-service.ts";
import { jobQueueService } from "../workers/job-queue.ts";
import { resumeBackgroundWorker } from "../workers/resume-worker.ts";

/**
 * Handle POST /api/resumes/:id/parse (AI Structured Resume Parsing)
 * - Applicant: own resume
 * - Recruiter: applicant applied to recruiter's job
 * - Admin: all resumes
 * - Supports ?async=true or header "Prefer: respond-async" for durable background execution
 */
export async function handleParseResume(req: Request, resumeId: string): Promise<Response> {
  const user = await authenticate(req);

  if (
    !isValidObjectId(resumeId) &&
    !resumeId.startsWith("res-") &&
    !resumeId.startsWith("resume-") &&
    !resumeId.startsWith("65f")
  ) {
    throw new BadRequestError(`Invalid resume ID format: ${resumeId}`);
  }

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) {
    throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
  }

  const isOwner = resume.applicantId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isRecruiter = user.role === "RECRUITER" || user.role === "HIRING_MANAGER";

  if (!isOwner && !isAdmin) {
    if (isRecruiter) {
      const recruiterApps = await applicationRepository.findAll({ recruiterId: user.id });
      const hasAccess = recruiterApps.applications.some(
        (app) => app.resumeId === resumeId || app.applicantId === resume.applicantId,
      );
      if (!hasAccess) {
        throw new ForbiddenError(
          "You are not authorized to parse resumes for candidates not applied to your jobs.",
        );
      }
    } else {
      throw new ForbiddenError("You are not authorized to parse this resume.");
    }
  }

  const url = new URL(req.url);
  const isAsyncRequested =
    url.searchParams.get("async") === "true" ||
    req.headers.get("prefer")?.includes("respond-async");

  if (isAsyncRequested) {
    // Enqueue durable background job
    const job = await jobQueueService.enqueue({
      type: "RESUME_PARSE",
      payload: { resumeId, applicantId: resume.applicantId },
      createdById: user.id,
    });

    // Proactively kick background worker loop in non-blocking way
    resumeBackgroundWorker.processNextAvailableJob().catch(() => {});

    return successResponse(
      {
        resumeId: resume.id,
        jobId: job.jobId,
        status: job.status,
        parsingStatus: "PROCESSING",
        retryCount: job.retryCount,
        message: "Resume parsing queued for durable background processing.",
      },
      "Resume parsing job scheduled successfully.",
      202,
    );
  }

  const parsedResume = await resumeParserService.parseResume(resumeId);

  const safeResponse = {
    resumeId: parsedResume.id,
    status: parsedResume.parsingStatus,
    parsingStatus: parsedResume.parsingStatus,
    parsedProfile: parsedResume.parsedProfile,
    parsedAt: parsedResume.parsedAt,
  };

  return successResponse(
    safeResponse,
    "Resume parsed and structured profile extracted successfully.",
    200,
  );
}

/**
 * Handle GET /api/resumes/:id/status (Inspect Resume Analysis & Background Job Status)
 */
export async function handleGetResumeStatus(req: Request, resumeId: string): Promise<Response> {
  const user = await authenticate(req);

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) {
    throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
  }

  const isOwner = resume.applicantId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isRecruiter = user.role === "RECRUITER" || user.role === "HIRING_MANAGER";

  if (!isOwner && !isAdmin && !isRecruiter) {
    throw new ForbiddenError("You are not authorized to view this resume status.");
  }

  const bgJob = await jobQueueService.getJobByResumeId(resumeId);

  return successResponse(
    {
      resumeId: resume.id,
      parsingStatus: resume.parsingStatus,
      parsedAt: resume.parsedAt,
      parsingError: resume.parsingError,
      atsScore: resume.atsScore,
      job: bgJob || null,
    },
    "Resume status retrieved successfully.",
  );
}

/**
 * Handle POST /api/resumes/:id/retry (Retry Failed Background Processing)
 */
export async function handleRetryResume(req: Request, resumeId: string): Promise<Response> {
  const user = await authenticate(req);

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) {
    throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
  }

  const isOwner = resume.applicantId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isRecruiter = user.role === "RECRUITER" || user.role === "HIRING_MANAGER";

  if (!isOwner && !isAdmin && !isRecruiter) {
    throw new ForbiddenError("You are not authorized to retry this resume analysis.");
  }

  // Reset parsing status in repository
  await resumeRepository.update(resumeId, {
    parsingStatus: "NOT_STARTED",
    parsingError: null,
  });

  // Re-enqueue background job
  const job = await jobQueueService.enqueue({
    type: "RESUME_PARSE",
    payload: { resumeId, applicantId: resume.applicantId },
    createdById: user.id,
    priority: 1, // Higher priority for retries
  });

  resumeBackgroundWorker.processNextAvailableJob().catch(() => {});

  return successResponse(
    {
      resumeId: resume.id,
      jobId: job.jobId,
      status: job.status,
      parsingStatus: "PROCESSING",
    },
    "Resume re-processing job scheduled.",
    202,
  );
}

/**
 * Universal dispatcher for /api/resumes/* routes
 */
export async function handleResumeApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/resumes")) {
    return null;
  }

  try {
    // 1. POST /api/resumes (or /api/resumes/upload)
    if (
      (pathname === "/api/resumes" || pathname === "/api/resumes/upload") &&
      req.method === "POST"
    ) {
      return await handleUploadResume(req);
    }

    // 2. POST /api/resumes/:id/parse
    const parseMatch = pathname.match(/^\/api\/resumes\/([a-zA-Z0-9_-]+)\/parse$/);
    if (parseMatch && parseMatch[1] && req.method === "POST") {
      return await handleParseResume(req, parseMatch[1]);
    }

    // 3. GET /api/resumes/:id/status
    const statusMatch = pathname.match(/^\/api\/resumes\/([a-zA-Z0-9_-]+)\/status$/);
    if (statusMatch && statusMatch[1] && req.method === "GET") {
      return await handleGetResumeStatus(req, statusMatch[1]);
    }

    // 4. POST /api/resumes/:id/retry
    const retryMatch = pathname.match(/^\/api\/resumes\/([a-zA-Z0-9_-]+)\/retry$/);
    if (retryMatch && retryMatch[1] && req.method === "POST") {
      return await handleRetryResume(req, retryMatch[1]);
    }

    // 5. GET /api/resumes/:id/download or /api/resumes/:id/url
    const downloadMatch = pathname.match(/^\/api\/resumes\/([a-zA-Z0-9_-]+)\/(download|url)$/);
    if (downloadMatch && downloadMatch[1] && req.method === "GET") {
      return await handleGetResumeDownloadUrl(req, downloadMatch[1]);
    }

    // 6. Match /api/resumes/:id
    const match = pathname.match(/^\/api\/resumes\/([a-zA-Z0-9_-]+)$/);
    if (match && match[1]) {
      const resumeId = match[1];
      if (req.method === "GET") {
        return await handleGetResumeById(req, resumeId);
      }
      if (req.method === "DELETE") {
        return await handleDeleteResume(req, resumeId);
      }
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { s3Service } from "../services/s3-service.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { parseResumeFormData } from "../middleware/upload-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ForbiddenError } from "../utils/errors.ts";
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
  const user = authenticate(req);

  if (user.role !== "APPLICANT") {
    throw new ForbiddenError("Only applicant accounts are permitted to upload resumes.");
  }

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
  const user = authenticate(req);

  if (!isValidObjectId(resumeId) && !resumeId.startsWith("res-") && !resumeId.startsWith("resume-") && !resumeId.startsWith("65f")) {
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
        (app) => app.resumeId === resumeId || app.applicantId === resume.applicantId
      );
      if (!hasAccess) {
        throw new ForbiddenError("You are not authorized to access resumes for candidates not applied to your jobs.");
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
 * - Returns a time-limited (15 mins) presigned S3 URL
 */
export async function handleGetResumeDownloadUrl(req: Request, resumeId: string): Promise<Response> {
  const user = authenticate(req);

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
        (app) => app.resumeId === resumeId || app.applicantId === resume.applicantId
      );
      if (!hasAccess) {
        throw new ForbiddenError("You are not authorized to download resumes for candidates not applied to your jobs.");
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
  const user = authenticate(req);

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
    if ((pathname === "/api/resumes" || pathname === "/api/resumes/upload") && req.method === "POST") {
      return await handleUploadResume(req);
    }

    // 2. GET /api/resumes/:id/download or /api/resumes/:id/url
    const downloadMatch = pathname.match(/^\/api\/resumes\/([a-zA-Z0-9_-]+)\/(download|url)$/);
    if (downloadMatch && downloadMatch[1] && req.method === "GET") {
      return await handleGetResumeDownloadUrl(req, downloadMatch[1]);
    }

    // 3. Match /api/resumes/:id
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

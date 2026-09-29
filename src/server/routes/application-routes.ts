import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "../utils/errors.ts";
import { isValidObjectId } from "../db/user-repository.ts";
import type {
  CreateApplicationInput,
  UpdateApplicationStatusInput,
  ApplicationQueryParams,
} from "../types/application-types.ts";

/**
 * Handle POST /api/applications (Applicant Submission)
 * - Authenticated APPLICANT only
 * - Validates job is PUBLISHED (rejects DRAFT/ARCHIVED/CLOSED)
 * - Validates resume exists and belongs to authenticated applicant
 * - Derives applicantId strictly from session
 * - Derives recruiterId strictly from the Job
 * - Prevents duplicate application (409 Conflict)
 * - Saves to MongoDB with status APPLIED
 */
export async function handleCreateApplication(req: Request): Promise<Response> {
  const user = authenticate(req);

  if (user.role !== "APPLICANT") {
    throw new ForbiddenError("Only applicant accounts are permitted to submit job applications.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = body as Partial<CreateApplicationInput>;
  if (!raw.jobId || typeof raw.jobId !== "string" || !raw.jobId.trim()) {
    throw new ValidationError("Missing required field: jobId");
  }

  // 1. Validate Job
  const job = await jobRepository.findById(raw.jobId.trim());
  if (!job) {
    throw new NotFoundError(`Job opening with ID ${raw.jobId} not found.`);
  }

  // Only PUBLISHED jobs accept applications
  if (job.status !== "PUBLISHED") {
    throw new NotFoundError("This job opening is not currently accepting applications.");
  }

  // 2. Validate Resume if provided
  let resumeId: string | undefined = undefined;
  if (raw.resumeId && typeof raw.resumeId === "string" && raw.resumeId.trim()) {
    const trimmedResumeId = raw.resumeId.trim();
    const resume = await resumeRepository.findById(trimmedResumeId);
    if (!resume) {
      throw new NotFoundError(`Resume with ID ${trimmedResumeId} not found.`);
    }

    // Must belong to authenticated applicant
    if (resume.applicantId !== user.id) {
      throw new ForbiddenError("You are not authorized to submit another applicant's resume.");
    }
    resumeId = resume.id;
  }

  // 3. Prevent duplicate applications
  const existingApp = await applicationRepository.findByJobAndApplicant(job.id, user.id);
  if (existingApp) {
    throw new ConflictError("You have already applied for this job.");
  }

  // 4. Create Application (applicantId derived from auth, recruiterId derived from Job)
  const createdApp = await applicationRepository.create({
    jobId: job.id,
    applicantId: user.id,
    recruiterId: job.recruiterId,
    resumeId,
    coverLetter: raw.coverLetter ? String(raw.coverLetter).trim() : undefined,
    notes: raw.notes ? String(raw.notes).trim() : undefined,
  });

  return successResponse(
    {
      id: createdApp.id,
      jobId: createdApp.jobId,
      applicantId: createdApp.applicantId,
      recruiterId: createdApp.recruiterId,
      resumeId: createdApp.resumeId,
      status: createdApp.status,
      currentStage: createdApp.currentStage,
      appliedAt: createdApp.appliedAt,
      application: createdApp,
    },
    "Job application submitted successfully.",
    201,
  );
}

/**
 * Handle GET /api/applications/my (Applicant Application History)
 * - Authenticated APPLICANT only
 * - Strictly filtered by authenticatedUser.id
 */
export async function handleGetMyApplications(req: Request): Promise<Response> {
  const user = authenticate(req);

  if (user.role !== "APPLICANT") {
    throw new ForbiddenError("Only applicant accounts can access personal application history.");
  }

  const result = await applicationRepository.findAll({
    applicantId: user.id,
    limit: 100,
  });

  return successResponse(result.applications, "Applicant application history retrieved successfully.");
}

/**
 * Handle GET /api/recruiter/applications (Recruiter Application List)
 * - Authenticated RECRUITER / ADMIN only
 * - Recruiter sees only applications for their own jobs
 */
export async function handleGetRecruiterApplications(req: Request): Promise<Response> {
  const user = authenticate(req);
  const isRecruiterOrAdmin =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isRecruiterOrAdmin) {
    throw new ForbiddenError("You are not authorized to view recruiter applications.");
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const filters: ApplicationQueryParams = {
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50,
    jobId: searchParams.get("jobId") || undefined,
    status: (searchParams.get("status") as any) || undefined,
    currentStage: (searchParams.get("currentStage") || searchParams.get("stage") as any) || undefined,
    search: searchParams.get("search") || undefined,
    sortBy: (searchParams.get("sortBy") as any) || "appliedAt",
    sortOrder: (searchParams.get("sortOrder") as any) || "desc",
  };

  // Enforce recruiter ownership: RECRUITER cannot see other recruiters' applications
  if (user.role === "RECRUITER") {
    filters.recruiterId = user.id;
  }

  const result = await applicationRepository.findAll(filters);
  return successResponse(result.applications, "Recruiter applications retrieved successfully.");
}

/**
 * Handle GET /api/applications (General Applications List)
 */
export async function handleGetApplications(req: Request): Promise<Response> {
  const user = authenticate(req);
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const filters: ApplicationQueryParams = {
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50,
    jobId: searchParams.get("jobId") || undefined,
    status: (searchParams.get("status") as any) || undefined,
    currentStage: (searchParams.get("currentStage") || searchParams.get("stage") as any) || undefined,
    search: searchParams.get("search") || undefined,
    sortBy: (searchParams.get("sortBy") as any) || "appliedAt",
    sortOrder: (searchParams.get("sortOrder") as any) || "desc",
  };

  // Enforce access boundary: Applicants can only query their own applications
  if (user.role === "APPLICANT") {
    filters.applicantId = user.id;
  } else if (user.role === "RECRUITER") {
    filters.recruiterId = user.id;
  }

  const result = await applicationRepository.findAll(filters);
  return successResponse(result.applications, "Applications retrieved successfully.");
}

/**
 * Handle GET /api/applications/:id (Application Detail)
 * - Applicant: only own application
 * - Recruiter: only application for own job
 * - Admin: platform-wide access
 */
export async function handleGetApplicationById(req: Request, appId: string): Promise<Response> {
  const user = authenticate(req);
  const application = await applicationRepository.findById(appId);
  if (!application) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  const isRoleAdmin = String(user.role).toUpperCase() === "ADMIN" || String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (user.role === "APPLICANT" && application.applicantId !== user.id) {
    throw new ForbiddenError("You are not authorized to view this application.");
  }

  if (user.role === "RECRUITER" && application.recruiterId !== user.id && !isRoleAdmin) {
    throw new ForbiddenError("You are not authorized to view this candidate application.");
  }

  return successResponse({ application }, "Application retrieved successfully.");
}

/**
 * Handle PATCH /api/applications/:id
 */
export async function handleUpdateApplicationStatus(
  req: Request,
  appId: string,
): Promise<Response> {
  const user = authenticate(req);
  const existing = await applicationRepository.findById(appId);
  if (!existing) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  const isRoleAdmin = String(user.role).toUpperCase() === "ADMIN" || String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (!isRoleAdmin && existing.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to update this candidate's application status.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = body as UpdateApplicationStatusInput;
  const updated = await applicationRepository.updateStatus(appId, raw);

  return successResponse({ application: updated }, "Application status updated successfully.");
}

/**
 * Universal dispatcher for /api/applications/* and /api/recruiter/applications
 */
export async function handleApplicationApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // 1. GET /api/applications/my
    if (pathname === "/api/applications/my" && req.method === "GET") {
      return await handleGetMyApplications(req);
    }

    // 2. GET /api/recruiter/applications
    if (pathname === "/api/recruiter/applications" && req.method === "GET") {
      return await handleGetRecruiterApplications(req);
    }

    // 3. GET /api/applications
    if (pathname === "/api/applications" && req.method === "GET") {
      return await handleGetApplications(req);
    }

    // 4. POST /api/applications
    if (pathname === "/api/applications" && req.method === "POST") {
      return await handleCreateApplication(req);
    }

    // 5. Match /api/applications/:id
    const match = pathname.match(/^\/api\/applications\/([a-zA-Z0-9_-]+)$/);
    if (match && match[1]) {
      const appId = match[1];
      if (req.method === "GET") {
        return await handleGetApplicationById(req, appId);
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateApplicationStatus(req, appId);
      }
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

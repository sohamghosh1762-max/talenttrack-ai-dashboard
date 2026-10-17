import { jobRepository } from "../repositories/job.repository.ts";
import { authenticateOptional, authenticate } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ValidationError, ForbiddenError } from "../utils/errors.ts";
import { handleGetApplicantJobMatch } from "./ats-routes.ts";
import {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  jobIdParamSchema,
} from "../validators/job.ts";
import { validateSchema } from "../validators/common.ts";
import { isValidObjectId } from "../db/user-repository.ts";
import type {
  CreateJobInput,
  UpdateJobInput,
  JobQueryParams,
  JobStatus,
} from "../types/job-types.ts";

/**
 * Handle GET /api/jobs
 * - Public/Applicants: only receive PUBLISHED (and Active) jobs
 * - Recruiters: can view their authorized jobs, and filter by status (DRAFT, PUBLISHED, ARCHIVED, etc.)
 */
export async function handleGetJobs(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const rawParams: Record<string, unknown> = {
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    department: searchParams.get("department") || undefined,
    location: searchParams.get("location") || undefined,
    employmentType: searchParams.get("employmentType") || undefined,
    recruiterId: searchParams.get("recruiterId") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: searchParams.get("sortOrder") || undefined,
  };

  const validatedParams = validateSchema(jobQuerySchema, rawParams);
  const authUser = await authenticateOptional(req);

  const filters: JobQueryParams = {
    page: validatedParams.page,
    limit: validatedParams.limit,
    search: validatedParams.search || undefined,
    status: validatedParams.status || undefined,
    department: validatedParams.department || undefined,
    location: validatedParams.location || undefined,
    employmentType: validatedParams.employmentType || undefined,
    recruiterId: validatedParams.recruiterId || undefined,
    sortBy: validatedParams.sortBy,
    sortOrder: validatedParams.sortOrder,
  };

  // Determine user role visibility
  const isRecruiterOrAdmin =
    authUser &&
    (authUser.role === "RECRUITER" ||
      authUser.role === "ADMIN" ||
      authUser.role === "SUPER_ADMIN" ||
      authUser.role === "HIRING_MANAGER");

  if (isRecruiterOrAdmin) {
    if (
      authUser.role === "RECRUITER" &&
      !filters.recruiterId &&
      !searchParams.has("allRecruiters")
    ) {
      // By default recruiter sees their jobs if not explicitly querying all
      filters.recruiterId = authUser.id;
    }
  } else {
    // Public / Applicant access: restrict to PUBLISHED jobs only. Never show drafts or archived jobs!
    if (!filters.status || filters.status === "ARCHIVED" || filters.status === "DRAFT") {
      filters.status = "PUBLISHED";
    }
  }

  const result = await jobRepository.findAll(filters);
  return successResponse(result, "Jobs retrieved successfully.");
}

/**
 * Handle GET /api/jobs/:id
 * - Public/Applicants: only view PUBLISHED jobs
 * - Authorized Recruiters/Admins: view their own jobs (including drafts/archived)
 */
export async function handleGetJobById(req: Request, jobId: string): Promise<Response> {
  if (!isValidObjectId(jobId) && !jobId.startsWith("job-")) {
    throw new NotFoundError(`Invalid job identifier format: ${jobId}`);
  }

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

  // If job is not published (e.g. DRAFT or ARCHIVED) and user is not owner/admin -> 404
  if (job.status === "DRAFT" || job.status === "ARCHIVED") {
    if (!isOwnerOrAdmin) {
      throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
    }
  }

  return successResponse({ ...job, job }, "Job opening retrieved.");
}

/**
 * Handle POST /api/jobs
 * - Only authenticated recruiters or authorized hiring staff can create jobs.
 * - recruiterId is strictly bound to authUser.id (never trusted from body).
 */
export async function handleCreateJob(req: Request): Promise<Response> {
  const user = await authenticate(req);
  if (user.role === "APPLICANT") {
    throw new ForbiddenError("Applicants are not authorized to post job openings.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(createJobSchema, body);

  const normalizedSkills: string[] = Array.isArray(validated.skills)
    ? validated.skills
    : typeof validated.skills === "string"
      ? (validated.skills as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const createdJob = await jobRepository.create({
    title: validated.title,
    description: validated.description,
    department: validated.department,
    location: validated.location,
    employmentType: validated.employmentType,
    experienceRequired: validated.experienceRequired || undefined,
    skills: normalizedSkills,
    salaryRange: validated.salaryRange || undefined,
    recruiterId: user.id, // Strictly bind to authenticated user identity
    status: validated.status || "PUBLISHED",
    deadline: validated.deadline || undefined,
  });

  return successResponse(
    { ...createdJob, job: createdJob },
    "Job opening created successfully.",
    201,
  );
}

/**
 * Handle PUT/PATCH /api/jobs/:id
 * - Only the job owner / authorized recruiter or admin can modify the job.
 * - Prevents modifying recruiter ownership.
 */
export async function handleUpdateJob(req: Request, jobId: string): Promise<Response> {
  const user = await authenticate(req);
  const existingJob = await jobRepository.findById(jobId);
  if (!existingJob) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const isRoleAdmin =
    String(user.role).toUpperCase() === "ADMIN" ||
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (!isRoleAdmin && existingJob.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to modify this job opening.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(updateJobSchema, body);

  const normalizedSkills: string[] | undefined =
    validated.skills !== undefined
      ? Array.isArray(validated.skills)
        ? validated.skills
        : typeof validated.skills === "string"
          ? (validated.skills as string)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
      : undefined;

  const updated = await jobRepository.update(jobId, {
    title: validated.title || undefined,
    description: validated.description || undefined,
    department: validated.department || undefined,
    location: validated.location || undefined,
    employmentType: validated.employmentType || undefined,
    experienceRequired: validated.experienceRequired || undefined,
    skills: normalizedSkills,
    salaryRange: validated.salaryRange || undefined,
    deadline: validated.deadline || undefined,
    status: validated.status || undefined,
  });

  return successResponse({ ...updated, job: updated }, "Job opening updated successfully.");
}

/**
 * Handle PATCH /api/jobs/:id/archive
 * - Soft-archives the job in MongoDB (status = "ARCHIVED"). Does not delete the document.
 */
export async function handleArchiveJob(req: Request, jobId: string): Promise<Response> {
  const user = await authenticate(req);
  const existingJob = await jobRepository.findById(jobId);
  if (!existingJob) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const isRoleAdmin =
    String(user.role).toUpperCase() === "ADMIN" ||
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (!isRoleAdmin && existingJob.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to archive this job opening.");
  }

  const archived = await jobRepository.archive(jobId);
  return successResponse({ ...archived, job: archived }, "Job archived successfully", 200);
}

/**
 * Handle DELETE /api/jobs/:id (Hard delete for admin cleanup if needed)
 */
export async function handleDeleteJob(req: Request, jobId: string): Promise<Response> {
  const user = await authenticate(req);
  const existingJob = await jobRepository.findById(jobId);
  if (!existingJob) {
    throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
  }

  const isRoleAdmin =
    String(user.role).toUpperCase() === "ADMIN" ||
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (!isRoleAdmin && existingJob.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to delete this job opening.");
  }

  await jobRepository.delete(jobId);
  return successResponse({ deleted: true }, "Job opening deleted successfully.");
}

/**
 * Universal dispatcher for /api/jobs/* routes
 */
export async function handleJobApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/jobs")) {
    return null;
  }

  try {
    // 1. GET /api/jobs
    if (pathname === "/api/jobs" && req.method === "GET") {
      return await handleGetJobs(req);
    }

    // 2. POST /api/jobs
    if (pathname === "/api/jobs" && req.method === "POST") {
      return await handleCreateJob(req);
    }

    // 3. PATCH /api/jobs/:id/archive
    const archiveMatch = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)\/archive$/);
    if (archiveMatch && archiveMatch[1]) {
      const jobId = archiveMatch[1];
      if (req.method === "PATCH" || req.method === "POST") {
        return await handleArchiveJob(req, jobId);
      }
    }

    // 4. Match /api/jobs/:id/match
    const jobMatch = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)\/match$/);
    if (jobMatch && jobMatch[1] && req.method === "GET") {
      return await handleGetApplicantJobMatch(req, jobMatch[1]);
    }

    // 5. Match /api/jobs/:id
    const match = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)$/);
    if (match && match[1]) {
      const jobId = match[1];
      if (req.method === "GET") {
        return await handleGetJobById(req, jobId);
      }
      if (req.method === "PUT" || req.method === "PATCH") {
        return await handleUpdateJob(req, jobId);
      }
      if (req.method === "DELETE") {
        return await handleDeleteJob(req, jobId);
      }
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

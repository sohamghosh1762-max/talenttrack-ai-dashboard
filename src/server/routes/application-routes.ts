import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "../utils/errors.ts";
import { isValidObjectId } from "../db/user-repository.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { notificationService } from "../services/notification-service.ts";
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
  const user = await authenticate(req);

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

  // Check application deadline
  if (job.deadline) {
    const deadlineTime = new Date(
      job.deadline.includes("T") ? job.deadline : `${job.deadline}T23:59:59.999Z`,
    ).getTime();
    if (!isNaN(deadlineTime) && deadlineTime < Date.now()) {
      throw new ValidationError("The application deadline for this job opening has passed.");
    }
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

  // Notify applicant of successful submission
  try {
    await notificationService.notifyApplicationSubmitted({
      applicantId: user.id,
      applicationId: createdApp.id,
      jobId: job.id,
      jobTitle: job.title,
      companyName: job.company,
    });
  } catch (err) {
    console.error("Failed to create application submission notification:", err);
  }

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
  const user = await authenticate(req);

  if (user.role !== "APPLICANT") {
    throw new ForbiddenError("Only applicant accounts can access personal application history.");
  }

  const result = await applicationRepository.findAll({
    applicantId: user.id,
    limit: 100,
  });

  return successResponse(
    result.applications,
    "Applicant application history retrieved successfully.",
  );
}

/**
 * Handle GET /api/recruiter/applications (Recruiter Application List)
 * - Authenticated RECRUITER / ADMIN only
 * - Recruiter sees only applications for their own jobs
 */
export async function handleGetRecruiterApplications(req: Request): Promise<Response> {
  const user = await authenticate(req);
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
    currentStage:
      searchParams.get("currentStage") || (searchParams.get("stage") as any) || undefined,
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
  const user = await authenticate(req);
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const filters: ApplicationQueryParams = {
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50,
    jobId: searchParams.get("jobId") || undefined,
    status: (searchParams.get("status") as any) || undefined,
    currentStage:
      searchParams.get("currentStage") || (searchParams.get("stage") as any) || undefined,
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
  const user = await authenticate(req);
  const application = await applicationRepository.findById(appId);
  if (!application) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  const isRoleAdmin =
    String(user.role).toUpperCase() === "ADMIN" ||
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (user.role === "APPLICANT" && application.applicantId !== user.id) {
    throw new ForbiddenError("You are not authorized to view this application.");
  }

  if (user.role === "RECRUITER" && application.recruiterId !== user.id && !isRoleAdmin) {
    throw new ForbiddenError("You are not authorized to view this candidate application.");
  }

  return successResponse({ application }, "Application retrieved successfully.");
}

/**
 * Handle PATCH /api/recruiter/applications/:id/stage (Recruiter Stage Update API)
 * and PATCH /api/applications/:id/stage
 * - Authenticated RECRUITER / ADMIN required
 * - Validate 24-character hexadecimal Application ID
 * - Validate requested stage against valid enum values
 * - Enforce recruiter job ownership (derives recruiter from session, never client payload)
 * - Returns 403 for unauthorized ownership access
 * - Returns 404 for non-existent application
 * - Returns 400 for invalid stage or malformed ID
 * - Persists updated stage and status to MongoDB
 */
export async function handleUpdateApplicationStage(req: Request, appId: string): Promise<Response> {
  const user = await authenticate(req);
  const isRecruiterOrAdmin =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isRecruiterOrAdmin) {
    throw new ForbiddenError(
      "Only recruiters and administrators are authorized to update candidate application stages.",
    );
  }

  if (!appId || typeof appId !== "string" || !appId.trim()) {
    throw new ValidationError("Application ID is required.");
  }

  const trimmedId = appId.trim();
  if (!isValidObjectId(trimmedId)) {
    throw new ValidationError(
      "Invalid application ID format: must be a 24-character hexadecimal ObjectId.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object containing 'stage'");
  }

  const raw = body as { stage?: unknown };
  if (raw.stage === undefined || raw.stage === null || raw.stage === "") {
    throw new ValidationError("Missing required field: stage");
  }

  if (typeof raw.stage !== "string") {
    throw new ValidationError("Field 'stage' must be a string");
  }

  const trimmedStage = raw.stage.trim().toUpperCase();
  const validStages: string[] = [
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFERED",
    "REJECTED",
    "WITHDRAWN",
  ];

  if (!validStages.includes(trimmedStage)) {
    throw new ValidationError(
      `Invalid stage '${raw.stage}'. Valid stages are: ${validStages.join(", ")}`,
    );
  }

  // Verify application exists
  const existing = await applicationRepository.findById(trimmedId);
  if (!existing) {
    throw new NotFoundError(`Application with ID ${trimmedId} not found.`);
  }

  // Enforce job ownership
  const isRoleAdmin =
    String(user.role).toUpperCase() === "ADMIN" ||
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (!isRoleAdmin && existing.recruiterId !== user.id) {
    throw new ForbiddenError(
      "You are not authorized to update applications for jobs belonging to another recruiter.",
    );
  }

  const rawReason = (body as { reason?: unknown }).reason;
  const reason = rawReason ? String(rawReason).trim() : undefined;

  const updated = await applicationRepository.recordStageTransition(
    trimmedId,
    trimmedStage as any,
    user.id,
    user.name,
    reason,
    isRoleAdmin,
  );

  if (!updated) {
    throw new NotFoundError(`Application with ID ${trimmedId} could not be updated.`);
  }

  // Notify applicant of stage transition if stage changed
  if (existing.currentStage !== trimmedStage) {
    try {
      const job = await jobRepository.findById(existing.jobId);
      await notificationService.notifyApplicationStatusChanged({
        applicantId: existing.applicantId,
        applicationId: existing.id,
        jobId: existing.jobId,
        jobTitle: job?.title || "Job Application",
        companyName: job?.company,
        oldStage: existing.currentStage,
        newStage: trimmedStage,
        status: updated.status,
      });
    } catch (err) {
      console.error("Failed to create stage change notification:", err);
    }
  }

  return successResponse(
    {
      application: updated,
      stage: updated.currentStage,
      status: updated.status,
      stageHistory: updated.stageHistory,
    },
    `Application stage updated to ${trimmedStage} successfully.`,
  );
}

/**
 * Handle PATCH /api/applications/:id
 */
export async function handleUpdateApplicationStatus(
  req: Request,
  appId: string,
): Promise<Response> {
  const user = await authenticate(req);
  const existing = await applicationRepository.findById(appId);
  if (!existing) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  const isRoleAdmin =
    String(user.role).toUpperCase() === "ADMIN" ||
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  if (!isRoleAdmin && existing.recruiterId !== user.id) {
    throw new ForbiddenError(
      "You are not authorized to update this candidate's application status.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = body as UpdateApplicationStatusInput;
  const updated = await applicationRepository.updateStatus(appId, raw);

  // Notify applicant if stage or status meaningfully updated
  try {
    const job = await jobRepository.findById(existing.jobId);
    if (raw.currentStage && raw.currentStage !== existing.currentStage) {
      await notificationService.notifyApplicationStatusChanged({
        applicantId: existing.applicantId,
        applicationId: existing.id,
        jobId: existing.jobId,
        jobTitle: job?.title || "Job Application",
        companyName: job?.company,
        oldStage: existing.currentStage,
        newStage: raw.currentStage,
        status: raw.status || updated?.status,
      });
    } else if (raw.status && raw.status !== existing.status) {
      await notificationService.notifyApplicationStatusChanged({
        applicantId: existing.applicantId,
        applicationId: existing.id,
        jobId: existing.jobId,
        jobTitle: job?.title || "Job Application",
        companyName: job?.company,
        oldStage: existing.currentStage,
        newStage: existing.currentStage,
        status: raw.status,
      });
    }
  } catch (err) {
    console.error("Failed to create application status notification:", err);
  }

  return successResponse({ application: updated }, "Application status updated successfully.");
}

/**
 * Handle POST /api/applications/:id/notes
 * Add internal recruiter note
 */
export async function handleAddApplicationNote(req: Request, appId: string): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError(
      "Only recruiters and staff are authorized to add internal candidate notes.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = body as { content?: unknown; text?: unknown };
  const content = (
    typeof raw.content === "string" ? raw.content : typeof raw.text === "string" ? raw.text : ""
  ).trim();
  if (!content) {
    throw new ValidationError("Note content is required.");
  }

  if (content.length > 2000) {
    throw new ValidationError("Note content must not exceed 2000 characters.");
  }

  const updated = await applicationRepository.addNote(appId, {
    content,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
  });

  if (!updated) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  const newNote = updated.notesList ? updated.notesList[updated.notesList.length - 1] : null;

  return successResponse(
    {
      application: updated,
      note: newNote,
      authorName: newNote?.authorName,
      authorRole: newNote?.authorRole,
      content: newNote?.content,
      text: newNote?.content,
      createdAt: newNote?.createdAt,
      id: newNote?.id,
    },
    "Internal note recorded successfully.",
    201,
  );
}

/**
 * Handle GET /api/applications/:id/notes
 */
export async function handleGetApplicationNotes(req: Request, appId: string): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError("Only recruiters and staff are authorized to view internal notes.");
  }

  const application = await applicationRepository.findById(appId);
  if (!application) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  return successResponse(
    { notes: application.notesList || [] },
    "Application notes retrieved successfully.",
  );
}

/**
 * Handle POST /api/applications/:id/feedback
 * Submit structured interview / recruiter feedback
 */
export async function handleAddApplicationFeedback(req: Request, appId: string): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError(
      "Only recruiters and hiring managers are authorized to record feedback.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  interface AddFeedbackPayload {
    recommendation?: string;
    overallRecommendation?: string;
    comments?: string;
    notes?: string;
    rating?: number;
    technicalRating?: number;
    communicationRating?: number;
    strengths?: string[] | string;
    weaknesses?: string[] | string;
    concerns?: string[] | string;
  }

  const raw = (body || {}) as AddFeedbackPayload;
  const recommendation = (
    typeof raw.recommendation === "string"
      ? raw.recommendation
      : typeof raw.overallRecommendation === "string"
        ? raw.overallRecommendation
        : ""
  ).trim();

  if (!recommendation) {
    throw new ValidationError(
      "Recommendation is required (e.g., 'Strong Hire', 'Hire', 'Hold', 'Reject').",
    );
  }

  const comments = (
    typeof raw.comments === "string" ? raw.comments : typeof raw.notes === "string" ? raw.notes : ""
  ).trim();

  const updated = await applicationRepository.addRecruiterFeedback(appId, {
    reviewerId: user.id,
    reviewerName: user.name,
    rating: typeof raw.rating === "number" ? raw.rating : undefined,
    technicalRating: typeof raw.technicalRating === "number" ? raw.technicalRating : undefined,
    communicationRating:
      typeof raw.communicationRating === "number" ? raw.communicationRating : undefined,
    strengths: raw.strengths,
    weaknesses: raw.weaknesses || raw.concerns,
    recommendation,
    comments,
  });

  if (!updated) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  const newFeedback = updated.recruiterFeedback
    ? updated.recruiterFeedback[updated.recruiterFeedback.length - 1]
    : null;

  return successResponse(
    {
      application: updated,
      feedback: newFeedback,
      rating: newFeedback?.rating,
      overallRecommendation: newFeedback?.recommendation,
      recommendation: newFeedback?.recommendation,
      reviewerName: newFeedback?.reviewerName,
      createdAt: newFeedback?.createdAt,
    },
    "Recruiter feedback recorded successfully.",
    201,
  );
}

/**
 * Handle GET /api/applications/:id/feedback
 */
export async function handleGetApplicationFeedback(req: Request, appId: string): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError("Only staff are authorized to view feedback.");
  }

  const application = await applicationRepository.findById(appId);
  if (!application) {
    throw new NotFoundError(`Application with ID ${appId} not found.`);
  }

  return successResponse(
    { feedback: application.recruiterFeedback || [] },
    "Recruiter feedback retrieved successfully.",
  );
}

/**
 * Handle POST /api/recruiter/applications/bulk
 * Perform bulk operations (STAGE_CHANGE, ADD_NOTE, ARCHIVE)
 */
export async function handleBulkApplicationsAction(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError("Only recruiters and staff can execute bulk actions.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = body as {
    applicationIds?: unknown;
    action?: unknown;
    stage?: unknown;
    note?: unknown;
    reason?: unknown;
    data?: { stage?: unknown; note?: unknown; reason?: unknown };
  };

  if (!Array.isArray(raw.applicationIds) || raw.applicationIds.length === 0) {
    throw new ValidationError(
      "Field 'applicationIds' must be a non-empty array of application IDs.",
    );
  }

  if (raw.applicationIds.length > 100) {
    throw new ValidationError("Batch size exceeds maximum limit of 100 applications.");
  }

  const appIds = raw.applicationIds.filter((id) => typeof id === "string" && id.trim()) as string[];
  const actionStr = String(raw.action || "").toUpperCase();

  if (actionStr === "STAGE_CHANGE" || actionStr === "UPDATE_STAGE") {
    const stage = (raw.stage || raw.data?.stage) as string | undefined;
    if (typeof stage !== "string" || !stage.trim()) {
      throw new ValidationError("Target 'stage' is required for stage change action.");
    }
    const result = await applicationRepository.bulkUpdateStage(
      appIds,
      stage.trim().toUpperCase() as any,
      user.id,
      user.name,
    );
    return successResponse(
      {
        action: actionStr,
        ...result,
        successCount: result.succeeded,
        failureCount: result.failed,
      },
      "Bulk stage change processed.",
    );
  }

  if (actionStr === "ADD_NOTE") {
    const note = (raw.note || raw.data?.note) as string | undefined;
    if (typeof note !== "string" || !note.trim()) {
      throw new ValidationError("Note content is required for ADD_NOTE action.");
    }
    const result = await applicationRepository.bulkAddNote(appIds, note.trim(), user.id, user.name);
    return successResponse(
      {
        action: actionStr,
        ...result,
        successCount: result.succeeded,
        failureCount: result.failed,
      },
      "Bulk note addition processed.",
    );
  }

  throw new ValidationError(`Unsupported bulk action: ${raw.action}`);
}

/**
 * Helper to escape CSV cells and protect against CSV formula injection
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);
  // Mitigate CSV Formula Injection:
  // If the cell starts with =, +, -, @, tab (\t), or carriage return (\r)
  // prepend a single quote (') so spreadsheet engines treat it strictly as raw text.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Handle GET /api/recruiter/export/candidates
 * Export candidate recruitment data to CSV with formula injection protection
 */
export async function handleExportCandidatesCsv(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "HIRING_MANAGER";

  if (!isStaff) {
    throw new ForbiddenError("Only recruiters and staff are authorized to export candidate data.");
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const jobId = searchParams.get("jobId")?.trim();
  const search = searchParams.get("search")?.trim();
  const stage = searchParams.get("stage")?.trim();
  const status = searchParams.get("status")?.trim();
  const idsParam = searchParams.get("ids")?.trim();

  const recruiterId = user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? undefined : user.id;

  let applications: any[] = [];
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const results = await Promise.all(ids.map((id) => applicationRepository.findById(id)));
    applications = results.filter(Boolean) as any[];
  } else {
    const res = await applicationRepository.findAll({
      limit: 1000,
      recruiterId,
      jobId: jobId || undefined,
      search: search || undefined,
      stage: stage || undefined,
      status: status || undefined,
    });
    applications = res.applications;
  }

  // Build CSV content
  const headers = [
    "Application ID",
    "Candidate Name",
    "Candidate Email",
    "Candidate Headline",
    "Candidate Phone",
    "Job Title",
    "Recruitment Stage",
    "Status",
    "AI Match Score",
    "Applied Date",
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvCell).join(","));

  for (const app of applications) {
    const row = [
      app.id,
      app.applicantName || app.applicant?.name || "Candidate",
      app.applicantEmail || app.applicant?.email || "",
      app.applicant?.headline || app.applicantHeadline || "",
      app.applicant?.phone || "",
      app.jobTitle || app.job?.title || "Position",
      app.currentStage || "APPLIED",
      app.status || "APPLIED",
      app.aiScore !== undefined ? `${app.aiScore}%` : "N/A",
      app.appliedAt ? new Date(app.appliedAt).toISOString().slice(0, 10) : "",
    ];
    rows.push(row.map(escapeCsvCell).join(","));
  }

  const csvOutput = rows.join("\r\n");
  const filename = `talenttrack_candidates_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvOutput, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
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

    // 5. Bulk actions: POST /api/recruiter/applications/bulk or POST /api/applications/bulk
    if (
      (pathname === "/api/recruiter/applications/bulk" || pathname === "/api/applications/bulk") &&
      req.method === "POST"
    ) {
      return await handleBulkApplicationsAction(req);
    }

    // 6. CSV Export: GET /api/recruiter/export/candidates or /api/applications/export
    if (
      (pathname === "/api/recruiter/export/candidates" ||
        pathname === "/api/applications/export" ||
        pathname === "/api/export/candidates") &&
      (req.method === "GET" || req.method === "POST")
    ) {
      return await handleExportCandidatesCsv(req);
    }

    // 7. Match /api/applications/:id/notes
    const notesMatch = pathname.match(/^\/api\/applications\/([a-zA-Z0-9_-]+)\/notes$/);
    if (notesMatch && notesMatch[1]) {
      if (req.method === "POST") return await handleAddApplicationNote(req, notesMatch[1]);
      if (req.method === "GET") return await handleGetApplicationNotes(req, notesMatch[1]);
    }

    // 8. Match /api/applications/:id/feedback
    const feedbackMatch = pathname.match(/^\/api\/applications\/([a-zA-Z0-9_-]+)\/feedback$/);
    if (feedbackMatch && feedbackMatch[1]) {
      if (req.method === "POST") return await handleAddApplicationFeedback(req, feedbackMatch[1]);
      if (req.method === "GET") return await handleGetApplicationFeedback(req, feedbackMatch[1]);
    }

    // 9. Match /api/recruiter/applications/:id/stage
    const recruiterStageMatch = pathname.match(
      /^\/api\/recruiter\/applications\/([a-zA-Z0-9_-]+)\/stage$/,
    );
    if (recruiterStageMatch && recruiterStageMatch[1]) {
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateApplicationStage(req, recruiterStageMatch[1]);
      }
    }

    // 10. Match /api/applications/:id/stage
    const appStageMatch = pathname.match(/^\/api\/applications\/([a-zA-Z0-9_-]+)\/stage$/);
    if (appStageMatch && appStageMatch[1]) {
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateApplicationStage(req, appStageMatch[1]);
      }
    }

    // 11. Match /api/recruiter/applications/:id
    const recruiterAppMatch = pathname.match(/^\/api\/recruiter\/applications\/([a-zA-Z0-9_-]+)$/);
    if (recruiterAppMatch && recruiterAppMatch[1]) {
      const appId = recruiterAppMatch[1];
      if (req.method === "GET") {
        return await handleGetApplicationById(req, appId);
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateApplicationStatus(req, appId);
      }
    }

    // 12. Match /api/applications/:id
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

import { authenticate } from "../middleware/auth-middleware.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { notificationService } from "../services/notification-service.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.ts";
import type {
  CreateInterviewInput,
  UpdateInterviewInput,
  InterviewType,
  InterviewStatus,
} from "../types/interview-types.ts";

/**
 * Validates timezone string format
 */
function isValidTimezone(tz?: string): boolean {
  if (!tz) return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle GET /api/interviews/my (or GET /api/interviews for current authenticated user)
 */
export async function handleGetMyInterviews(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") || undefined;

  if (user.role === "APPLICANT") {
    const interviews = await interviewRepository.findApplicantInterviews(user.id, statusParam);
    return successResponse(interviews, "Applicant interviews retrieved successfully.");
  }

  if (user.role === "RECRUITER") {
    const interviews = await interviewRepository.findAll({
      recruiterId: user.id,
      status: (statusParam as any) || undefined,
    });
    return successResponse(interviews, "Recruiter interviews retrieved successfully.");
  }

  if (user.role === "HIRING_MANAGER") {
    const interviews = await interviewRepository.findAll({
      hiringManagerId: user.id,
      status: (statusParam as any) || undefined,
    });
    return successResponse(interviews, "Hiring manager interviews retrieved successfully.");
  }

  // Admin / Staff: Return all interviews
  const interviews = await interviewRepository.findAll({
    status: (statusParam as any) || undefined,
  });
  return successResponse(interviews, "All interviews retrieved successfully.");
}

/**
 * Handle GET /api/interviews/:id
 */
export async function handleGetInterviewById(req: Request, interviewId: string): Promise<Response> {
  const user = await authenticate(req);

  const interview = await interviewRepository.findById(
    interviewId,
    user.role === "APPLICANT", // hide internal notes for applicant
  );

  if (!interview) {
    throw new NotFoundError("Interview record not found.");
  }

  // Authorization check
  if (user.role === "APPLICANT" && interview.applicantId !== user.id) {
    throw new ForbiddenError("You are not authorized to view this interview.");
  }

  if (user.role === "RECRUITER") {
    const isOwner = interview.recruiterId === user.id || interview.createdBy === user.id;
    if (!isOwner) {
      // Check if recruiter owns the job
      const job = await jobRepository.findById(interview.jobId);
      if (!job || job.recruiterId !== user.id) {
        throw new ForbiddenError("You are not authorized to view this interview.");
      }
    }
  }

  return successResponse(interview, "Interview details retrieved successfully.");
}

/**
 * Handle POST /api/interviews
 */
export async function handleCreateInterview(req: Request): Promise<Response> {
  const user = await authenticate(req);

  // Applicants cannot schedule interviews
  if (user.role === "APPLICANT") {
    throw new ForbiddenError(
      "Applicants cannot schedule interviews. Please contact your recruiter.",
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body.");
  }

  const {
    applicationId,
    title,
    type,
    scheduledAt,
    durationMinutes,
    timezone,
    meetingUrl,
    location,
    instructions,
    notes,
    hiringManagerId,
    interviewerIds,
  } = body;

  if (!applicationId || typeof applicationId !== "string") {
    throw new ValidationError("applicationId is required.");
  }

  if (!scheduledAt || typeof scheduledAt !== "string") {
    throw new ValidationError("scheduledAt is required.");
  }

  const parsedDate = new Date(scheduledAt);
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError("scheduledAt must be a valid ISO datetime string.");
  }

  if (durationMinutes !== undefined) {
    const d = Number(durationMinutes);
    if (isNaN(d) || d < 5 || d > 480) {
      throw new ValidationError("durationMinutes must be a number between 5 and 480.");
    }
  }

  if (timezone && !isValidTimezone(timezone)) {
    throw new ValidationError(`Invalid timezone specified: ${timezone}`);
  }

  const validTypes: InterviewType[] = ["VIDEO", "PHONE", "ONSITE"];
  if (type && !validTypes.includes(type)) {
    throw new ValidationError("type must be one of: VIDEO, PHONE, ONSITE.");
  }

  if (type === "VIDEO" && meetingUrl && typeof meetingUrl === "string") {
    if (!meetingUrl.startsWith("http://") && !meetingUrl.startsWith("https://")) {
      throw new ValidationError("meetingUrl must be a valid URL starting with http:// or https://");
    }
  }

  // Verify Application existence
  const application = await applicationRepository.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Application record not found.");
  }

  // Verify Recruiter / Hiring Manager authorization
  if (user.role === "RECRUITER") {
    const job = await jobRepository.findById(application.jobId);
    const isJobRecruiter = job?.recruiterId === user.id;
    const isAppRecruiter = application.recruiterId === user.id;
    if (!isJobRecruiter && !isAppRecruiter) {
      throw new ForbiddenError(
        "You are not authorized to schedule interviews for this application.",
      );
    }
  }

  if (user.role === "HIRING_MANAGER") {
    const job = await jobRepository.findById(application.jobId);
    const isJobHM =
      job?.hiringManagerId === user.id ||
      (job?.hiringManagerIds && job.hiringManagerIds.includes(user.id));
    if (!isJobHM) {
      throw new ForbiddenError("You are not assigned to manage interviews for this position.");
    }
  }

  // Derive immutable relationship fields from the verified Application
  const applicantId = application.applicantId;
  const recruiterId = application.recruiterId || user.id;
  const jobId = application.jobId;

  const createInput: CreateInterviewInput = {
    applicationId,
    title: title || "Technical Interview",
    type: type || "VIDEO",
    scheduledAt: parsedDate.toISOString(),
    durationMinutes: durationMinutes ? Number(durationMinutes) : 45,
    timezone: timezone || "Asia/Kolkata",
    meetingUrl: meetingUrl || undefined,
    location: location || undefined,
    instructions: instructions || undefined,
    notes: notes || undefined,
    hiringManagerId: hiringManagerId || undefined,
    interviewerIds: Array.isArray(interviewerIds) ? interviewerIds : undefined,
  };

  const createdInterview = await interviewRepository.create(
    createInput,
    user.id,
    applicantId,
    recruiterId,
    jobId,
  );

  // Update application stage to INTERVIEW if needed
  if (application.currentStage !== "INTERVIEW") {
    await applicationRepository.updateStatus(applicationId, {
      status: application.status || "Shortlisted",
      currentStage: "INTERVIEW",
      notes: notes || `Interview scheduled for ${parsedDate.toLocaleDateString()}`,
    });
  }

  // Notify applicant of scheduled interview
  try {
    const job = await jobRepository.findById(jobId);
    await notificationService.notifyInterviewScheduled({
      applicantId,
      interviewId: createdInterview.id,
      applicationId,
      jobId,
      jobTitle: job?.title || "Job Opening",
      interviewTitle: createdInterview.title,
      scheduledAt: createdInterview.scheduledAt,
      timezone: createdInterview.timezone,
      type: createdInterview.type,
      meetingUrl: createdInterview.meetingUrl,
    });
  } catch (err) {
    console.error("Failed to create interview scheduled notification:", err);
  }

  return successResponse(createdInterview, "Interview scheduled successfully.", 201);
}

/**
 * Handle PATCH /api/interviews/:id
 */
export async function handleUpdateInterview(req: Request, interviewId: string): Promise<Response> {
  const user = await authenticate(req);

  const existing = await interviewRepository.findById(interviewId);
  if (!existing) {
    throw new NotFoundError("Interview record not found.");
  }

  // Authorization check
  if (user.role === "APPLICANT") {
    throw new ForbiddenError(
      "Applicants cannot modify interview schedules directly. Please contact your recruiter.",
    );
  }

  if (user.role === "RECRUITER") {
    const isOwner = existing.recruiterId === user.id || existing.createdBy === user.id;
    if (!isOwner) {
      const job = await jobRepository.findById(existing.jobId);
      if (!job || job.recruiterId !== user.id) {
        throw new ForbiddenError("You are not authorized to update this interview.");
      }
    }
  }

  if (user.role === "HIRING_MANAGER") {
    const job = await jobRepository.findById(existing.jobId);
    const isJobHM =
      job?.hiringManagerId === user.id ||
      (job?.hiringManagerIds && job.hiringManagerIds.includes(user.id));
    if (!isJobHM) {
      throw new ForbiddenError("You are not authorized to update this interview.");
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body.");
  }

  const {
    title,
    type,
    scheduledAt,
    durationMinutes,
    timezone,
    meetingUrl,
    location,
    instructions,
    status,
    notes,
  } = body;

  const updatePayload: UpdateInterviewInput = {};

  if (title !== undefined) updatePayload.title = String(title).trim();
  if (type !== undefined) {
    const validTypes: InterviewType[] = ["VIDEO", "PHONE", "ONSITE"];
    if (!validTypes.includes(type)) {
      throw new ValidationError("type must be one of: VIDEO, PHONE, ONSITE.");
    }
    updatePayload.type = type;
  }
  if (scheduledAt !== undefined) {
    const d = new Date(scheduledAt);
    if (isNaN(d.getTime())) {
      throw new ValidationError("scheduledAt must be a valid ISO datetime string.");
    }
    updatePayload.scheduledAt = d.toISOString();
  }
  if (durationMinutes !== undefined) {
    const d = Number(durationMinutes);
    if (isNaN(d) || d < 5 || d > 480) {
      throw new ValidationError("durationMinutes must be between 5 and 480.");
    }
    updatePayload.durationMinutes = d;
  }
  if (timezone !== undefined) {
    if (!isValidTimezone(timezone)) {
      throw new ValidationError(`Invalid timezone specified: ${timezone}`);
    }
    updatePayload.timezone = timezone;
  }
  if (meetingUrl !== undefined) {
    updatePayload.meetingUrl = meetingUrl ? String(meetingUrl).trim() : "";
  }
  if (location !== undefined) {
    updatePayload.location = location ? String(location).trim() : "";
  }
  if (instructions !== undefined) {
    updatePayload.instructions = instructions ? String(instructions).trim() : "";
  }
  if (status !== undefined) {
    const validStatuses: InterviewStatus[] = [
      "SCHEDULED",
      "CONFIRMED",
      "RESCHEDULED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];
    if (!validStatuses.includes(status)) {
      throw new ValidationError("Invalid interview status specified.");
    }
    updatePayload.status = status;
  }
  if (notes !== undefined) {
    updatePayload.notes = notes ? String(notes).trim() : "";
  }

  const updated = await interviewRepository.update(interviewId, updatePayload);

  // Notify applicant of interview updates (cancelled or rescheduled)
  if (updated) {
    try {
      const job = await jobRepository.findById(existing.jobId);
      if (updatePayload.status === "CANCELLED" && existing.status !== "CANCELLED") {
        await notificationService.notifyInterviewCancelled({
          applicantId: existing.applicantId,
          interviewId: existing.id,
          applicationId: existing.applicationId,
          jobId: existing.jobId,
          jobTitle: job?.title || "Job Opening",
          interviewTitle: updated.title,
        });
      } else if (updatePayload.scheduledAt && updatePayload.scheduledAt !== existing.scheduledAt) {
        await notificationService.notifyInterviewRescheduled({
          applicantId: existing.applicantId,
          interviewId: existing.id,
          applicationId: existing.applicationId,
          jobId: existing.jobId,
          jobTitle: job?.title || "Job Opening",
          interviewTitle: updated.title,
          scheduledAt: updated.scheduledAt,
          timezone: updated.timezone,
        });
      }
    } catch (err) {
      console.error("Failed to create interview update notification:", err);
    }
  }

  return successResponse(updated, "Interview updated successfully.");
}

/**
 * Handle DELETE /api/interviews/:id
 */
export async function handleDeleteInterview(req: Request, interviewId: string): Promise<Response> {
  const user = await authenticate(req);

  const existing = await interviewRepository.findById(interviewId);
  if (!existing) {
    throw new NotFoundError("Interview record not found.");
  }

  if (user.role === "APPLICANT") {
    throw new ForbiddenError("Applicants cannot delete interview records.");
  }

  if (user.role === "RECRUITER" && existing.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to delete this interview.");
  }

  await interviewRepository.delete(interviewId);
  return successResponse({ deleted: true, id: interviewId }, "Interview deleted successfully.");
}

/**
 * Central API Dispatcher for /api/interviews/*
 */
export async function handleInterviewApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/interviews")) {
    return null;
  }

  try {
    // 1. GET /api/interviews/my or GET /api/interviews
    if (
      (pathname === "/api/interviews/my" || pathname === "/api/interviews") &&
      req.method === "GET"
    ) {
      return await handleGetMyInterviews(req);
    }

    // 2. POST /api/interviews
    if (pathname === "/api/interviews" && req.method === "POST") {
      return await handleCreateInterview(req);
    }

    // 3. GET, PATCH, DELETE /api/interviews/:id
    const idMatch = pathname.match(/^\/api\/interviews\/([^/]+)$/);
    if (idMatch) {
      const interviewId = idMatch[1]!;
      if (req.method === "GET") {
        return await handleGetInterviewById(req, interviewId);
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateInterview(req, interviewId);
      }
      if (req.method === "DELETE") {
        return await handleDeleteInterview(req, interviewId);
      }
    }

    throw new NotFoundError(`Interview endpoint not found: ${req.method} ${pathname}`);
  } catch (error) {
    return errorResponse(error);
  }
}

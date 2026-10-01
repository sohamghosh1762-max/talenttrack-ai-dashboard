import { interviewRepository } from "../repositories/interview.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ValidationError, ForbiddenError } from "../utils/errors.ts";
import { emailService } from "../services/email/email-service.ts";
import type { InterviewStatus } from "../models/Interview.ts";

/**
 * Handle GET /api/recruiter/interviews
 * - Authenticated RECRUITER or ADMIN
 * - Recruiter sees interviews for their jobs
 */
export async function handleGetInterviews(req: Request): Promise<Response> {
  const user = await authenticate(req);
  if (user.role === "APPLICANT") {
    throw new ForbiddenError("Applicants are not authorized to access recruiter interviews.");
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const status = (url.searchParams.get("status") as InterviewStatus | "All") || undefined;

  const filters: Record<string, any> = { search, status };
  if (user.role === "RECRUITER") {
    filters["recruiterId"] = user.id;
  }

  const interviews = await interviewRepository.findAll(filters);
  return successResponse(interviews, "Interviews retrieved successfully.");
}

/**
 * Handle POST /api/recruiter/interviews (Schedule Interview)
 * - Authenticated RECRUITER or ADMIN
 * - Derives recruiterId strictly from session context
 */
export async function handleCreateInterview(req: Request): Promise<Response> {
  const user = await authenticate(req);
  if (user.role === "APPLICANT") {
    throw new ForbiddenError("Only recruiters can schedule candidate interviews.");
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  if (!body.candidateName || !body.jobRole) {
    throw new ValidationError("Missing required fields: candidateName and jobRole");
  }

  const payload: any = {
    jobId: body.jobId || "65f1a2b3c4d5e6f7a8b9c101",
    applicantId: body.applicantId || "65f1a2b3c4d5e6f7a8b9c008",
    recruiterId: user.id,
    candidateName: String(body.candidateName).trim(),
    jobRole: String(body.jobRole).trim(),
    stage: body.stage ? String(body.stage).trim() : "Technical Screen",
    interviewer: body.interviewer ? String(body.interviewer).trim() : user.name || "Recruiter",
    dateTime: body.dateTime ? String(body.dateTime).trim() : "Tomorrow at 2:00 PM",
    interviewType: body.interviewType ? String(body.interviewType).trim() : "Video Call",
    meetingLink: body.meetingLink ? String(body.meetingLink).trim() : "https://meet.google.com/new-session",
    status: (body.status as InterviewStatus) || "Scheduled",
  };

  if (body.applicationId) payload.applicationId = String(body.applicationId);
  if (body.candidateEmail) payload.candidateEmail = String(body.candidateEmail).trim();
  if (body.location) payload.location = String(body.location).trim();
  if (body.notes) payload.notes = String(body.notes).trim();

  const created = await interviewRepository.create(payload);

  // Trigger candidate email notification if candidate email is provided
  if (created.candidateEmail) {
    emailService
      .sendInterviewNotificationEmail({
        to: created.candidateEmail,
        candidateName: created.candidateName,
        jobRole: created.jobRole,
        interviewer: created.interviewer,
        dateTime: created.dateTime,
        meetingLink: created.meetingLink,
      })
      .catch((err) => console.warn("Failed to dispatch interview email notification:", err));
  }

  return successResponse(created, "Interview scheduled successfully.", 201);
}

/**
 * Handle PATCH /api/recruiter/interviews/:id (Update/Reschedule/Cancel/Complete)
 */
export async function handleUpdateInterview(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  const existing = await interviewRepository.findById(id);
  if (!existing) {
    throw new NotFoundError(`Interview with ID ${id} not found.`);
  }

  const isRoleAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!isRoleAdmin && existing.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to update this interview schedule.");
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const updated = await interviewRepository.update(id, body);
  return successResponse(updated, "Interview updated successfully.");
}

/**
 * Handle DELETE /api/recruiter/interviews/:id (Cancel/Delete)
 */
export async function handleDeleteInterview(req: Request, id: string): Promise<Response> {
  const user = await authenticate(req);
  const existing = await interviewRepository.findById(id);
  if (!existing) {
    throw new NotFoundError(`Interview with ID ${id} not found.`);
  }

  const isRoleAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!isRoleAdmin && existing.recruiterId !== user.id) {
    throw new ForbiddenError("You are not authorized to cancel this interview schedule.");
  }

  await interviewRepository.delete(id);
  return successResponse({ deleted: true }, "Interview cancelled and deleted successfully.");
}

/**
 * Dispatcher for /api/recruiter/interviews routes
 */
export async function handleInterviewApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/recruiter/interviews")) {
    return null;
  }

  try {
    if (pathname === "/api/recruiter/interviews" && req.method === "GET") {
      return await handleGetInterviews(req);
    }

    if (pathname === "/api/recruiter/interviews" && req.method === "POST") {
      return await handleCreateInterview(req);
    }

    const match = pathname.match(/^\/api\/recruiter\/interviews\/([a-zA-Z0-9_-]+)$/);
    if (match && match[1]) {
      const id = match[1];
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateInterview(req, id);
      }
      if (req.method === "DELETE") {
        return await handleDeleteInterview(req, id);
      }
    }

    return null;
  } catch (err) {
    return errorResponse(err);
  }
}

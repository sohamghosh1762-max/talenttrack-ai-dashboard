import { userRepository } from "../db/user-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicantPreferencesRepository } from "../repositories/applicant-preferences.repository.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { validateUpdateApplicantProfile } from "../validators/applicant-profile-validator.ts";
import {
  handleGetApplicantAtsScore,
  handleAnalyzeApplicantAtsScore,
  handleGetApplicantJobMatch,
} from "./ats-routes.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors.ts";
import type { ApplicantProfileResponse } from "../types/user-types.ts";
import type { UpdateApplicantPreferencesInput } from "../types/preference-types.ts";

/**
 * Handle GET /api/applicant/profile
 * - Authenticated applicant only (or Admin)
 * - Returns actual candidate profile and real resume metadata without demo fallbacks
 */
export async function handleGetApplicantProfile(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isApplicant = user.role === "APPLICANT";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isApplicant && !isAdmin) {
    throw new ForbiddenError(
      "Only candidate applicant accounts can access applicant profile data.",
    );
  }

  const fullUser = userRepository.findFullUserById(user.id);
  if (!fullUser) {
    throw new NotFoundError("Applicant account not found.");
  }

  const profile = fullUser.applicantProfile || {};
  const resumes = await resumeRepository.findByApplicantId(user.id);
  const latestResume = resumes.find((r) => r.parsingStatus === "COMPLETED") || resumes[0];

  const profileResponse: ApplicantProfileResponse = {
    id: fullUser.id,
    name: fullUser.name || "",
    email: fullUser.email || "",
    headline: profile.headline || "",
    location: profile.location || "",
    phone: profile.phone || "",
    bio: profile.bio || profile.summary || "",
    summary: profile.summary || profile.bio || "",
    skills: profile.skills || [],
    experiences: profile.experiences || [],
    education: profile.education || [],
    certifications: profile.certifications || [],
    projects: profile.projects || [],
    applicantProfile: {
      ...profile,
      headline: profile.headline || "",
      location: profile.location || "",
      phone: profile.phone || "",
      bio: profile.bio || profile.summary || "",
      summary: profile.summary || profile.bio || "",
      skills: profile.skills || [],
      experiences: profile.experiences || [],
      education: profile.education || [],
      certifications: profile.certifications || [],
      projects: profile.projects || [],
    },
    resume: latestResume
      ? {
          id: latestResume.id,
          fileName: latestResume.originalFileName,
          fileSize: latestResume.fileSize,
          mimeType: latestResume.mimeType,
          uploadedAt: latestResume.uploadedAt,
          parsingStatus: latestResume.parsingStatus,
          extractedSkillsCount: latestResume.parsedProfile?.skills?.length || 0,
          atsScore: latestResume.atsScore !== undefined ? latestResume.atsScore : null,
        }
      : null,
  };

  return successResponse(profileResponse, "Applicant profile retrieved successfully.", 200);
}

/**
 * Handle PUT /api/applicant/profile & PATCH /api/applicant/profile
 * - Authenticated applicant only
 * - Persists profile edits to MongoDB and in-memory repository
 * - Invalidates cached ATS analysis on resume if ATS-relevant fields change
 */
export async function handleUpdateApplicantProfile(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isApplicant = user.role === "APPLICANT";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isApplicant && !isAdmin) {
    throw new ForbiddenError(
      "Only candidate applicant accounts are permitted to update applicant profile data.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validatedInput = validateUpdateApplicantProfile(body);

  const updatedUser = await userRepository.updateApplicantProfile(user.id, validatedInput);
  if (!updatedUser) {
    throw new NotFoundError("Applicant account not found.");
  }

  // If ATS-relevant fields have changed, invalidate cached ATS score on resumes
  const hasAtsRelevantChanges =
    validatedInput.skills !== undefined ||
    validatedInput.experiences !== undefined ||
    validatedInput.education !== undefined ||
    validatedInput.certifications !== undefined ||
    validatedInput.projects !== undefined ||
    validatedInput.summary !== undefined ||
    validatedInput.bio !== undefined;

  if (hasAtsRelevantChanges) {
    const resumes = await resumeRepository.findByApplicantId(user.id);
    for (const resume of resumes) {
      await resumeRepository.updateAtsAnalysis(resume.id, null);
    }
  }

  const profile = updatedUser.applicantProfile || {};
  const resumes = await resumeRepository.findByApplicantId(user.id);
  const latestResume = resumes.find((r) => r.parsingStatus === "COMPLETED") || resumes[0];

  const profileResponse: ApplicantProfileResponse = {
    id: updatedUser.id,
    name: updatedUser.name || "",
    email: updatedUser.email || "",
    headline: profile.headline || "",
    location: profile.location || "",
    phone: profile.phone || "",
    bio: profile.bio || profile.summary || "",
    summary: profile.summary || profile.bio || "",
    skills: profile.skills || [],
    experiences: profile.experiences || [],
    education: profile.education || [],
    certifications: profile.certifications || [],
    projects: profile.projects || [],
    applicantProfile: {
      ...profile,
      headline: profile.headline || "",
      location: profile.location || "",
      phone: profile.phone || "",
      bio: profile.bio || profile.summary || "",
      summary: profile.summary || profile.bio || "",
      skills: profile.skills || [],
      experiences: profile.experiences || [],
      education: profile.education || [],
      certifications: profile.certifications || [],
      projects: profile.projects || [],
    },
    resume: latestResume
      ? {
          id: latestResume.id,
          fileName: latestResume.originalFileName,
          fileSize: latestResume.fileSize,
          mimeType: latestResume.mimeType,
          uploadedAt: latestResume.uploadedAt,
          parsingStatus: latestResume.parsingStatus,
          extractedSkillsCount: latestResume.parsedProfile?.skills?.length || 0,
          atsScore: latestResume.atsScore !== undefined ? latestResume.atsScore : null,
        }
      : null,
  };

  return successResponse(
    profileResponse,
    "Applicant profile updated and persisted successfully.",
    200,
  );
}

/**
 * Handle GET /api/applicant/settings
 * - Authenticated applicant only (or Admin)
 * - Returns persistent applicant preferences
 */
export async function handleGetApplicantSettings(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isApplicant = user.role === "APPLICANT";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isApplicant && !isAdmin) {
    throw new ForbiddenError("Only candidate applicant accounts can access applicant settings.");
  }

  const prefs = await applicantPreferencesRepository.findByUserId(user.id);
  return successResponse(
    {
      applicationStatusUpdates: prefs.applicationStatusUpdates,
      interviewReminders: prefs.interviewReminders,
      jobRecommendationAlerts: prefs.jobRecommendationAlerts,
      messageNotifications: prefs.messageNotifications,
      emailNotifications: prefs.emailNotifications,
      updatedAt: prefs.updatedAt,
    },
    "Applicant settings retrieved successfully.",
    200,
  );
}

/**
 * Handle PATCH /api/applicant/settings & PUT /api/applicant/settings
 * - Authenticated applicant only
 * - Validates boolean types and updates persistent preferences
 */
export async function handleUpdateApplicantSettings(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isApplicant = user.role === "APPLICANT";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isApplicant && !isAdmin) {
    throw new ForbiddenError(
      "Only candidate applicant accounts are permitted to update applicant settings.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const raw = body as Record<string, unknown>;
  const allowedKeys = [
    "applicationStatusUpdates",
    "interviewReminders",
    "jobRecommendationAlerts",
    "messageNotifications",
    "emailNotifications",
  ];

  const updateInput: UpdateApplicantPreferencesInput = {};

  for (const key of allowedKeys) {
    if (key in raw && raw[key] !== undefined) {
      if (typeof raw[key] !== "boolean") {
        throw new ValidationError(`Field '${key}' must be a boolean value (true or false).`);
      }
      (updateInput as any)[key] = raw[key];
    }
  }

  const updated = await applicantPreferencesRepository.updateByUserId(user.id, updateInput);

  return successResponse(
    {
      applicationStatusUpdates: updated.applicationStatusUpdates,
      interviewReminders: updated.interviewReminders,
      jobRecommendationAlerts: updated.jobRecommendationAlerts,
      messageNotifications: updated.messageNotifications,
      emailNotifications: updated.emailNotifications,
      updatedAt: updated.updatedAt,
    },
    "Applicant preferences updated and persisted successfully.",
    200,
  );
}

/**
 * Universal dispatcher for all /api/applicant/* routes
 */
export async function handleApplicantApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/applicant")) {
    return null;
  }

  try {
    // 1. Settings routes: /api/applicant/settings
    if (pathname === "/api/applicant/settings") {
      if (req.method === "GET") {
        return await handleGetApplicantSettings(req);
      }
      if (req.method === "PUT" || req.method === "PATCH") {
        return await handleUpdateApplicantSettings(req);
      }
    }

    // 2. Profile routes: /api/applicant/profile
    if (pathname === "/api/applicant/profile") {
      if (req.method === "GET") {
        return await handleGetApplicantProfile(req);
      }
      if (req.method === "PUT" || req.method === "PATCH") {
        return await handleUpdateApplicantProfile(req);
      }
    }

    // 3. ATS Score routes: /api/applicant/ats-score
    if (pathname === "/api/applicant/ats-score/analyze" && req.method === "POST") {
      return await handleAnalyzeApplicantAtsScore(req);
    }

    if (pathname === "/api/applicant/ats-score") {
      if (req.method === "GET") {
        return await handleGetApplicantAtsScore(req);
      }
      if (req.method === "POST") {
        return await handleAnalyzeApplicantAtsScore(req);
      }
    }

    // 4. Job Match route: /api/applicant/jobs/:jobId/match
    const jobMatch = pathname.match(/^\/api\/applicant\/jobs\/([a-zA-Z0-9_-]+)\/match$/);
    if (jobMatch && jobMatch[1] && req.method === "GET") {
      return await handleGetApplicantJobMatch(req, jobMatch[1]);
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

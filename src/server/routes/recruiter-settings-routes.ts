import { authenticate } from "../middleware/auth-middleware.ts";
import { userRepository } from "../db/user-repository.ts";
import { verifyPassword, hashPassword } from "../auth/password.ts";
import { Recruiter } from "../models/Recruiter.ts";
import { User } from "../models/User.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ValidationError, ForbiddenError, AuthenticationError } from "../utils/errors.ts";

/**
 * Handle GET /api/recruiter/settings
 */
export async function handleGetRecruiterSettings(req: Request): Promise<Response> {
  const user = await authenticate(req);
  if (user.role === "APPLICANT") {
    throw new ForbiddenError("Applicants cannot access recruiter settings.");
  }

  const fullUser = userRepository.findFullUserById(user.id);
  let recruiterExtra: any = null;
  if (isDatabaseConnected()) {
    recruiterExtra = await Recruiter.findOne({ userId: user.id }).lean();
  }

  return successResponse(
    {
      id: user.id,
      name: fullUser?.name || user.name,
      email: fullUser?.email || user.email,
      role: fullUser?.recruiterProfile?.jobTitle || recruiterExtra?.designation || "Principal Talent Acquisition Lead",
      department: fullUser?.recruiterProfile?.department || recruiterExtra?.department || "Global Engineering Recruitment",
      companyName: fullUser?.recruiterProfile?.companyName || recruiterExtra?.companyName || "TalentTrack Technologies",
      phone: recruiterExtra?.phone || "+1 (555) 987-6543",
      website: recruiterExtra?.website || "https://talenttrack.ai",
      notificationPreferences: {
        emailAlerts: true,
        aiAlerts: true,
        interviewReminders: true,
      },
    },
    "Recruiter settings retrieved successfully.",
  );
}

/**
 * Handle PATCH /api/recruiter/settings
 */
export async function handleUpdateRecruiterSettings(req: Request): Promise<Response> {
  const user = await authenticate(req);
  if (user.role === "APPLICANT") {
    throw new ForbiddenError("Applicants cannot update recruiter settings.");
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const updatedUser = userRepository.updateUserProfile(user.id, {
    name: body.name ? String(body.name).trim() : undefined,
    email: body.email ? String(body.email).trim() : undefined,
    recruiterProfile: {
      companyName: body.companyName || "TalentTrack Technologies",
      jobTitle: body.role || "Principal Talent Acquisition Lead",
      department: body.department || "Global Engineering Recruitment",
    },
  });

  if (isDatabaseConnected()) {
    await Recruiter.findOneAndUpdate(
      { userId: user.id },
      {
        $set: {
          companyName: body.companyName || "TalentTrack Technologies",
          designation: body.role || "Principal Talent Acquisition Lead",
          department: body.department || "Global Engineering Recruitment",
          phone: body.phone || "+1 (555) 987-6543",
          website: body.website || "https://talenttrack.ai",
        },
      },
      { upsert: true },
    );
  }

  return successResponse(
    {
      id: user.id,
      name: updatedUser?.name || body.name || user.name,
      email: updatedUser?.email || user.email,
      role: body.role || updatedUser?.recruiterProfile?.jobTitle || "Principal Talent Acquisition Lead",
      department: body.department || updatedUser?.recruiterProfile?.department || "Global Engineering Recruitment",
      companyName: body.companyName || updatedUser?.recruiterProfile?.companyName || "TalentTrack Technologies",
    },
    "Recruiter profile settings updated successfully.",
  );
}

/**
 * Handle POST /api/recruiter/settings/change-password
 */
export async function handleChangePassword(req: Request): Promise<Response> {
  const user = await authenticate(req);
  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    throw new ValidationError("Current password and new password are required.");
  }

  if (String(newPassword).length < 6) {
    throw new ValidationError("New password must be at least 6 characters long.");
  }

  const fullUser = userRepository.findFullUserById(user.id);
  if (!fullUser || !fullUser.passwordHash) {
    throw new NotFoundError("User record not found.");
  }

  const isValid = verifyPassword(currentPassword, fullUser.passwordHash);
  if (!isValid) {
    throw new AuthenticationError("Current password is incorrect.");
  }

  const newHash = hashPassword(newPassword);
  userRepository.updatePassword(user.id, newHash);

  return successResponse({ success: true }, "Password changed successfully.");
}

/**
 * Dispatcher for /api/recruiter/settings
 */
export async function handleRecruiterSettingsApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/recruiter/settings")) {
    return null;
  }

  try {
    if (pathname === "/api/recruiter/settings/change-password" && req.method === "POST") {
      return await handleChangePassword(req);
    }

    if (pathname === "/api/recruiter/settings" && req.method === "GET") {
      return await handleGetRecruiterSettings(req);
    }

    if (
      (pathname === "/api/recruiter/settings" || pathname === "/api/recruiter/settings/profile") &&
      (req.method === "PATCH" || req.method === "PUT")
    ) {
      return await handleUpdateRecruiterSettings(req);
    }

    return null;
  } catch (err) {
    return errorResponse(err);
  }
}

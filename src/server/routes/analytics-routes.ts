import { authenticate } from "../middleware/auth-middleware.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ForbiddenError } from "../utils/errors.ts";

/**
 * Handle GET /api/recruiter/analytics and GET /api/analytics/recruiter
 * Computes live KPIs, funnel conversion rates, application trends, top skills,
 * and data-driven AI insights from persistent MongoDB records.
 */
export async function handleGetRecruiterAnalytics(req: Request): Promise<Response> {
  const user = await authenticate(req);

  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "HIRING_MANAGER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ORG_ADMIN";

  if (!isStaff) {
    throw new ForbiddenError(
      "Only recruiters and administrators are authorized to access analytics.",
    );
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId")?.trim() || undefined;
  const range = url.searchParams.get("range")?.trim() || "30d";

  const recruiterId = user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "" : user.id;

  const analytics = await applicationRepository.getRecruiterAnalytics(recruiterId, jobId, range);

  return successResponse(analytics, "Recruiter analytics retrieved successfully.");
}

/**
 * Dispatcher for analytics routes
 */
export async function handleAnalyticsApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (
    (pathname === "/api/recruiter/analytics" ||
      pathname === "/api/analytics/recruiter" ||
      pathname === "/api/analytics") &&
    req.method === "GET"
  ) {
    try {
      return await handleGetRecruiterAnalytics(req);
    } catch (err: unknown) {
      return errorResponse(err);
    }
  }

  return null;
}

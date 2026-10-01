import { handleAdminApiRequest } from "./admin-users-handler.ts";
import { handleAuthApiRequest } from "./auth-routes.ts";
import { handleJobApiRequest } from "./job-routes.ts";
import { handleApplicationApiRequest } from "./application-routes.ts";
import { handleResumeApiRequest } from "./resume-routes.ts";
import { handleAiApiRequest } from "./ai-routes.ts";
import { handleAtsApiRequest } from "./ats-routes.ts";
import { handleApplicantApiRequest } from "./applicant-routes.ts";
import { getDatabaseStatus } from "../db/mongodb.ts";
import { errorResponse, successResponse } from "../utils/response.ts";
import { NotFoundError } from "../utils/errors.ts";
import { createRequestLogger } from "../middleware/request-logger.ts";

const requestLogger = createRequestLogger();

/**
 * Central API Request Dispatcher for all /api/* routes
 */
export async function handleApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api")) {
    return null;
  }

  const startTime = performance.now();

  try {
    // 1. Health check endpoint: GET /api/health
    if (pathname === "/api/health" && req.method === "GET") {
      const dbStatus = getDatabaseStatus();
      const response = successResponse(
        {
          status: "healthy",
          database: dbStatus.status,
          databaseDetails: {
            status: dbStatus.status,
            readyState: dbStatus.readyState,
            databaseName: dbStatus.name || "talenttrack",
          },
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          service: "talenttrack-ai-api",
        },
        "API service is healthy",
      );
      requestLogger(req, startTime, 200);
      return response;
    }

    // 2. Auth routes: /api/auth/*
    if (pathname.startsWith("/api/auth")) {
      const response = await handleAuthApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 3. Admin routes: /api/admin/*
    if (pathname.startsWith("/api/admin")) {
      const response = await handleAdminApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 4. Job routes: /api/jobs/*
    if (pathname.startsWith("/api/jobs")) {
      const response = await handleJobApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 5. Resume routes: /api/resumes/*
    if (pathname.startsWith("/api/resumes")) {
      const response = await handleResumeApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 6. Application routes: /api/applications/* and /api/recruiter/*
    if (pathname.startsWith("/api/applications") || pathname.startsWith("/api/recruiter")) {
      const response = await handleApplicationApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 7. Applicant routes: /api/applicant/* (Profile & ATS Score)
    if (pathname.startsWith("/api/applicant")) {
      const response = await handleApplicantApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 8. Hiring Manager routes: /api/hiring-manager/*
    if (pathname.startsWith("/api/hiring-manager")) {
      const { handleHiringManagerApiRequest } = await import("./hiring-manager-routes.ts");
      const response = await handleHiringManagerApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 9. AI routes: /api/ai/*
    if (pathname.startsWith("/api/ai")) {
      const response = await handleAiApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 10. Fallthrough for unhandled /api/* route
    const notFoundErr = new NotFoundError(`API endpoint not found: ${req.method} ${pathname}`);
    const response = errorResponse(notFoundErr, 404);
    requestLogger(req, startTime, 404, notFoundErr.message);
    return response;
  } catch (error) {
    const response = errorResponse(error, 500);
    requestLogger(
      req,
      startTime,
      response.status,
      error instanceof Error ? error.message : String(error),
    );
    return response;
  }
}

export * from "./admin-users-handler.ts";
export * from "./auth-routes.ts";
export * from "./job-routes.ts";
export * from "./application-routes.ts";
export * from "./resume-routes.ts";
export * from "./ai-routes.ts";
export * from "./ats-routes.ts";
export * from "./applicant-routes.ts";
export * from "./hiring-manager-routes.ts";

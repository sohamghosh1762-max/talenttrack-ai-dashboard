import { handleAdminApiRequest } from "./admin-users-handler.ts";
import { handleAuthApiRequest } from "./auth-routes.ts";
import { handleJobApiRequest } from "./job-routes.ts";
import { handleApplicationApiRequest } from "./application-routes.ts";
import { handleResumeApiRequest } from "./resume-routes.ts";
import { handleAiApiRequest } from "./ai-routes.ts";
import { handleAtsApiRequest } from "./ats-routes.ts";
import { handleApplicantApiRequest } from "./applicant-routes.ts";
import { handleConversationApiRequest } from "./conversation-routes.ts";
import { handleNotificationApiRequest } from "./notification-routes.ts";
import { getDatabaseStatus, pingDatabase } from "../db/mongodb.ts";
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
    // 1. Health & Readiness check endpoints
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

    if (pathname === "/api/ready" && req.method === "GET") {
      const dbStatus = getDatabaseStatus();
      const isConnected = dbStatus.status === "connected";
      const isAlive = isConnected ? await pingDatabase().catch(() => false) : false;
      const isReady = isConnected && isAlive;
      const statusCode = isReady ? 200 : 503;
      const response = successResponse(
        {
          ready: isReady,
          status: isReady ? "ready" : "not_ready",
          database: dbStatus.status,
          databaseAlive: isAlive,
          readyState: dbStatus.readyState,
          timestamp: new Date().toISOString(),
        },
        isReady ? "Service is ready to handle traffic" : "Database dependency not ready or unreachable",
        statusCode,
      );
      requestLogger(req, startTime, statusCode);
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

    // 7. Candidate routes: /api/candidates/*
    if (pathname.startsWith("/api/candidates")) {
      const { handleCandidateApiRequest } = await import("./candidate-routes.ts");
      const response = await handleCandidateApiRequest(req);
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

    // 8. Conversation & Messaging routes: /api/conversations/*
    if (pathname.startsWith("/api/conversations")) {
      const response = await handleConversationApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 9. Notification routes: /api/notifications/*
    if (pathname.startsWith("/api/notifications")) {
      const response = await handleNotificationApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 10. Interview routes: /api/interviews/*
    if (pathname.startsWith("/api/interviews")) {
      const { handleInterviewApiRequest } = await import("./interview-routes.ts");
      const response = await handleInterviewApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 11. Hiring Manager routes: /api/hiring-manager/*
    if (pathname.startsWith("/api/hiring-manager")) {
      const { handleHiringManagerApiRequest } = await import("./hiring-manager-routes.ts");
      const response = await handleHiringManagerApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 12. AI routes: /api/ai/*
    if (pathname.startsWith("/api/ai")) {
      const response = await handleAiApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 13. Analytics routes: /api/analytics/* or /api/recruiter/analytics
    if (pathname.startsWith("/api/analytics") || pathname === "/api/recruiter/analytics") {
      const { handleAnalyticsApiRequest } = await import("./analytics-routes.ts");
      const response = await handleAnalyticsApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 14. Screening routes: /api/screening/*
    if (pathname.startsWith("/api/screening")) {
      const { handleScreeningApiRequest } = await import("./screening-routes.ts");
      const response = await handleScreeningApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 14. Fallthrough for unhandled /api/* route
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
export * from "./conversation-routes.ts";
export * from "./notification-routes.ts";
export * from "./interview-routes.ts";
export * from "./hiring-manager-routes.ts";
export * from "./candidate-routes.ts";
export * from "./analytics-routes.ts";

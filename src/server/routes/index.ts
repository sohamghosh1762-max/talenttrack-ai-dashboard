import { handleAdminApiRequest } from "./admin-users-handler.ts";
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
      const response = successResponse(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          service: "talenttrack-ai-api",
        },
        "API service is healthy",
      );
      requestLogger(req, startTime, 200);
      return response;
    }

    // 2. Admin routes: /api/admin/*
    if (pathname.startsWith("/api/admin")) {
      const response = await handleAdminApiRequest(req);
      if (response) {
        requestLogger(req, startTime, response.status);
        return response;
      }
    }

    // 3. Fallthrough for unhandled /api/* route
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

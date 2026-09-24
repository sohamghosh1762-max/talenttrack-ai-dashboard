import { errorResponse } from "../utils/response.ts";
import { AuthError } from "./auth-middleware.ts";
import { AppError } from "../utils/errors.ts";
import { logger } from "../utils/logger.ts";

/**
 * Centralized API error handler middleware function
 */
export function handleServerError(error: unknown, req?: Request): Response {
  if (error instanceof AuthError) {
    return errorResponse(error, error.status);
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(`Server Error: ${error.message}`, { stack: error.stack });
    }
    return errorResponse(error, error.statusCode);
  }

  logger.error(`Unhandled Server Exception on ${req ? `${req.method} ${req.url}` : "Request"}:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return errorResponse(error, 500);
}

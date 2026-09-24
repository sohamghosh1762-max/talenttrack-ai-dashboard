import { logger } from "../utils/logger.ts";

/**
 * Creates structured request logger callback for API requests
 */
export function createRequestLogger() {
  return (req: Request, startTime: number, status: number, error?: string) => {
    const url = new URL(req.url);
    const requestId =
      req.headers.get("x-request-id") ||
      `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const durationMs = performance.now() - startTime;

    logger.logRequest({
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      route: url.pathname,
      statusCode: status,
      durationMs,
      ...(error ? { error } : {}),
    });
  };
}

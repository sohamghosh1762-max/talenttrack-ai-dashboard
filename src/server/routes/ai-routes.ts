import { geminiService } from "../services/gemini-service.ts";
import { successResponse, errorResponse } from "../utils/response.ts";

/**
 * Handle GET /api/ai/health
 * - Safe status inspection (returns whether AI provider is configured and default model)
 * - NEVER leaks API keys, credentials, or internal configuration
 */
export async function handleGetAiHealth(_req: Request): Promise<Response> {
  const health = geminiService.getHealthStatus();
  return successResponse(
    {
      configured: health.configured,
      model: health.model,
      service: health.service,
    },
    "AI service status retrieved successfully.",
  );
}

/**
 * Dispatcher for /api/ai/* routes
 */
export async function handleAiApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // 1. GET /api/ai/health
    if (pathname === "/api/ai/health" && req.method === "GET") {
      return await handleGetAiHealth(req);
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

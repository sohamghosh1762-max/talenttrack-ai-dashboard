import { GoogleGenAI } from "@google/genai";
import { config } from "../config/index.ts";
import { AIServiceError } from "../utils/errors.ts";

export interface GenerateTextOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  timeoutMs?: number;
}

export interface GenerateStructuredOptions extends GenerateTextOptions {
  responseSchema?: Record<string, unknown>;
}

export interface GeminiHealthStatus {
  configured: boolean;
  model: string;
  service: string;
}

/**
 * Enterprise Google Gemini AI Service Adapter
 * - Secure server-side API integration
 * - Lazy initialization (does not crash app if key is unconfigured at startup)
 * - Strict credential encapsulation (prevents leakage to logs, API responses, or client)
 * - Configurable model selection with sensible enterprise defaults (gemini-2.5-flash)
 * - Abort timeout handling & rate-limit resilience
 */
export class GeminiService {
  private client: GoogleGenAI | null = null;
  private customApiKey?: string | undefined;
  private customModel?: string | undefined;

  constructor(options?: { apiKey?: string; model?: string }) {
    if (options && "apiKey" in options) {
      this.customApiKey = options.apiKey;
    }
    if (options && "model" in options) {
      this.customModel = options.model;
    }
  }

  /**
   * Safe getter for API key from instance, process environment, or central config
   */
  private getApiKey(): string | undefined {
    if (this.customApiKey !== undefined) {
      return this.customApiKey;
    }
    return (
      (typeof process !== "undefined" && process.env ? process.env["GEMINI_API_KEY"] : undefined) ||
      config.ai.geminiApiKey ||
      undefined
    );
  }

  /**
   * Get configured Gemini model name
   */
  public getModel(): string {
    if (this.customModel !== undefined && this.customModel.trim().length > 0) {
      return this.customModel;
    }
    return (
      (typeof process !== "undefined" && process.env ? process.env["GEMINI_MODEL"] : undefined) ||
      config.ai.geminiModel ||
      "gemini-3.6-flash"
    );
  }

  /**
   * Returns prioritized list of Gemini model candidates for resilient fallback
   */
  public getCandidateModels(specifiedModel?: string): string[] {
    const primary = specifiedModel || this.getModel();
    const candidates = [
      primary,
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
    ];
    return Array.from(new Set(candidates.filter(Boolean)));
  }

  /**
   * Check whether Gemini AI service is configured with a valid API key
   */
  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Lazily initialize or retrieve GoogleGenAI client instance
   */
  public getClient(): GoogleGenAI {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.getApiKey();
    if (!apiKey || !apiKey.trim()) {
      throw new AIServiceError(
        "Gemini API key is not configured. Please set GEMINI_API_KEY in the server environment.",
        503,
      );
    }

    this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
    return this.client;
  }

  /**
   * Reset the cached client (useful for dynamic configuration or testing)
   */
  public resetClient(): void {
    this.client = null;
  }

  /**
   * Sanitize error messages to guarantee no API keys or credentials ever leak
   */
  public sanitizeErrorMessage(error: unknown): string {
    if (!error) return "AI service temporarily unavailable";
    let message = error instanceof Error ? error.message : String(error);

    const key = this.getApiKey();
    if (key && key.length > 4) {
      message = message.split(key).join("[REDACTED_API_KEY]");
    }

    // Scrub any general API key patterns (e.g., AIza..., AQ....)
    message = message.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_KEY]");
    message = message.replace(/AQ\.[0-9A-Za-z-_]{40,}/g, "[REDACTED_KEY]");
    message = message.replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [REDACTED_TOKEN]");

    return message;
  }

  /**
   * Generate raw text using Gemini AI
   */
  public async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new AIServiceError("Prompt cannot be empty", 400);
    }

    const ai = this.getClient();
    const candidateModels = this.getCandidateModels(options.model);
    const timeoutMs = options.timeoutMs || 30_000;

    const requestConfig: Record<string, unknown> = {};
    if (options.temperature !== undefined) {
      requestConfig["temperature"] = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      requestConfig["maxOutputTokens"] = options.maxOutputTokens;
    }
    if (options.systemInstruction) {
      requestConfig["systemInstruction"] = options.systemInstruction;
    }

    let lastError: unknown = null;

    for (const targetModel of candidateModels) {
      try {
        console.log(
          JSON.stringify({
            stage: "[ATS-DEBUG] gemini-request",
            model: targetModel,
            promptLength: prompt.trim().length,
          }),
        );

        const apiCall = ai.models.generateContent({
          model: targetModel,
          contents: prompt.trim(),
          ...(Object.keys(requestConfig).length > 0 ? { config: requestConfig } : {}),
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new AIServiceError(`AI request timed out after ${timeoutMs}ms`, 504));
          }, timeoutMs);
          if (typeof timer.unref === "function") {
            timer.unref();
          }
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        const text = response.text;

        if (text === undefined || text === null) {
          throw new AIServiceError("Empty or malformed response returned from Gemini AI", 502);
        }

        console.log(
          JSON.stringify({
            stage: "[ATS-DEBUG] gemini-response",
            model: targetModel,
            responseLength: text.length,
          }),
        );

        return text;
      } catch (err: unknown) {
        lastError = err;
        const rawMsg = err instanceof Error ? err.message : String(err);
        const currentIndex = candidateModels.indexOf(targetModel);
        if (currentIndex < candidateModels.length - 1) {
          console.warn(
            `[ATS-DEBUG] Gemini model '${targetModel}' error: ${rawMsg.slice(0, 100)}, trying fallback '${candidateModels[currentIndex + 1]}'...`,
          );
          continue;
        }
        break;
      }
    }

    if (lastError instanceof AIServiceError) {
      throw lastError;
    }

    const rawMsg = lastError instanceof Error ? lastError.message : String(lastError);
    const safeMsg = this.sanitizeErrorMessage(lastError);

    // Handle rate limits / 429
    if (
      rawMsg.includes("429") ||
      rawMsg.toLowerCase().includes("quota") ||
      rawMsg.toLowerCase().includes("resource exhausted")
    ) {
      throw new AIServiceError(
        "AI service rate limit exceeded or quota exhausted. Please retry shortly.",
        429,
      );
    }

    // Handle invalid key / authentication failure / 401 / 403
    if (
      rawMsg.includes("401") ||
      rawMsg.includes("403") ||
      rawMsg.toLowerCase().includes("api key") ||
      rawMsg.toLowerCase().includes("unauthenticated")
    ) {
      throw new AIServiceError(
        "AI service authentication failed. Please verify the server API key configuration.",
        503,
      );
    }

    throw new AIServiceError(`AI service error: ${safeMsg}`, 503);
  }

  /**
   * Generate structured JSON data using Gemini AI
   */
  public async generateStructured<T>(
    prompt: string,
    options: GenerateStructuredOptions = {},
  ): Promise<T> {
    const ai = this.getClient();
    const candidateModels = this.getCandidateModels(options.model);
    const timeoutMs = options.timeoutMs || 30_000;

    const requestConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
    };

    if (options.temperature !== undefined) {
      requestConfig["temperature"] = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      requestConfig["maxOutputTokens"] = options.maxOutputTokens;
    }
    if (options.systemInstruction) {
      requestConfig["systemInstruction"] = options.systemInstruction;
    }
    if (options.responseSchema) {
      requestConfig["responseSchema"] = options.responseSchema;
    }

    let lastError: unknown = null;

    for (const targetModel of candidateModels) {
      try {
        console.log(
          JSON.stringify({
            stage: "[ATS-DEBUG] gemini-request",
            model: targetModel,
            hasResponseSchema: Boolean(options.responseSchema),
          }),
        );

        const apiCall = ai.models.generateContent({
          model: targetModel,
          contents: prompt.trim(),
          config: requestConfig,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new AIServiceError(`AI request timed out after ${timeoutMs}ms`, 504));
          }, timeoutMs);
          if (typeof timer.unref === "function") {
            timer.unref();
          }
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        const rawText = response.text;

        if (!rawText) {
          throw new AIServiceError("Empty response returned from Gemini AI", 502);
        }

        console.log(
          JSON.stringify({
            stage: "[ATS-DEBUG] gemini-response",
            model: targetModel,
            responseLength: rawText.length,
          }),
        );

        try {
          const parsed = JSON.parse(rawText) as T;
          return parsed;
        } catch (parseError) {
          throw new AIServiceError("Failed to parse structured JSON from AI response", 502, {
            rawText: rawText.slice(0, 500),
          });
        }
      } catch (err: unknown) {
        lastError = err;
        const rawMsg = err instanceof Error ? err.message : String(err);
        const currentIndex = candidateModels.indexOf(targetModel);
        if (currentIndex < candidateModels.length - 1) {
          console.warn(
            `[ATS-DEBUG] Gemini structured model '${targetModel}' error: ${rawMsg.slice(0, 100)}, trying fallback '${candidateModels[currentIndex + 1]}'...`,
          );
          continue;
        }
        break;
      }
    }

    if (lastError instanceof AIServiceError) {
      throw lastError;
    }

    const rawMsg = lastError instanceof Error ? lastError.message : String(lastError);
    const safeMsg = this.sanitizeErrorMessage(lastError);

    // Handle rate limits / 429
    if (
      rawMsg.includes("429") ||
      rawMsg.toLowerCase().includes("quota") ||
      rawMsg.toLowerCase().includes("resource exhausted")
    ) {
      throw new AIServiceError(
        "AI service rate limit exceeded or quota exhausted. Please retry shortly.",
        429,
      );
    }

    // Handle invalid key / authentication failure / 401 / 403
    if (
      rawMsg.includes("401") ||
      rawMsg.includes("403") ||
      rawMsg.toLowerCase().includes("api key") ||
      rawMsg.toLowerCase().includes("unauthenticated")
    ) {
      throw new AIServiceError(
        "AI service authentication failed. Please verify the server API key configuration.",
        503,
      );
    }

    throw new AIServiceError(`AI structured generation failed: ${safeMsg}`, 503);
  }

  /**
   * Safe status object suitable for health checks (NEVER leaks keys or credentials)
   */
  public getHealthStatus(): GeminiHealthStatus {
    return {
      configured: this.isConfigured(),
      model: this.getModel(),
      service: "talenttrack-ai-gemini",
    };
  }
}

export const geminiService = new GeminiService();

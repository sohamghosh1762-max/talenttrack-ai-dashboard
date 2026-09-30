import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GeminiService } from "../services/gemini-service.ts";
import { handleApiRequest } from "../routes/index.ts";
import { AIServiceError } from "../utils/errors.ts";

describe("GEMINI API INTEGRATION & SECURITY FOUNDATION SUITE", () => {
  let gemini: GeminiService;

  beforeEach(() => {
    gemini = new GeminiService({
      apiKey: "test-fake-key-for-unit-testing",
      model: "gemini-2.5-flash",
    });
  });

  describe("1. Configuration & Credential Encapsulation", () => {
    it("reports configured when valid API key is present", () => {
      assert.equal(gemini.isConfigured(), true);
      assert.equal(gemini.getModel(), "gemini-2.5-flash");
    });

    it("handles missing API key safely without crashing at initialization", () => {
      const unconfiguredService = new GeminiService({ apiKey: "" });
      assert.equal(unconfiguredService.isConfigured(), false);

      // Startup must succeed without throwing
      assert.doesNotThrow(() => {
        unconfiguredService.getHealthStatus();
      });

      // Calling getClient without key throws safe AIServiceError
      assert.throws(
        () => {
          unconfiguredService.getClient();
        },
        (err: any) => {
          return err instanceof AIServiceError && err.statusCode === 503;
        },
      );
    });

    it("allows custom model selection and preserves enterprise default", () => {
      const customService = new GeminiService({
        apiKey: "fake-key",
        model: "gemini-2.5-pro",
      });
      assert.equal(customService.getModel(), "gemini-2.5-pro");
    });

    it("never exposes API key in health status or metadata object", () => {
      const health = gemini.getHealthStatus();
      assert.equal(health.configured, true);
      assert.equal(health.model, "gemini-2.5-flash");
      assert.equal(health.service, "talenttrack-ai-gemini");

      // Verify no key property exists
      assert.equal((health as any).apiKey, undefined);
      assert.equal((health as any).key, undefined);
      assert.equal((health as any).token, undefined);

      const jsonString = JSON.stringify(health);
      assert.equal(jsonString.includes("test-fake-key"), false);
    });
  });

  describe("2. Secret Sanitization & Error Scrubbing", () => {
    it("redacts configured API key from error strings", () => {
      const rawError = new Error("Failed connecting with key test-fake-key-for-unit-testing on endpoint");
      const sanitized = gemini.sanitizeErrorMessage(rawError);

      assert.equal(sanitized.includes("test-fake-key-for-unit-testing"), false);
      assert.ok(sanitized.includes("[REDACTED_API_KEY]"));
    });

    it("redacts Google AIza and AQ key patterns from error messages", () => {
      const aizaError = new Error("Invalid key: AIzaSyD9xK81723498172349817234981723498");
      assert.equal(gemini.sanitizeErrorMessage(aizaError).includes("AIzaSy"), false);
      assert.ok(gemini.sanitizeErrorMessage(aizaError).includes("[REDACTED_KEY]"));

      const aqError = new Error("Token AQ.Ab8RN6ITpfhEDMveWISIaQtgQoYDTpsvLTxi6tlIRoTIdZbGA failed");
      assert.equal(gemini.sanitizeErrorMessage(aqError).includes("AQ.Ab8RN6"), false);
      assert.ok(gemini.sanitizeErrorMessage(aqError).includes("[REDACTED_KEY]"));
    });

    it("redacts Bearer authentication tokens from error messages", () => {
      const bearerError = new Error("Unauthorized request with Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test");
      const sanitized = gemini.sanitizeErrorMessage(bearerError);
      assert.equal(sanitized.includes("eyJhbGciOiJIUzI1NiJ9"), false);
      assert.ok(sanitized.includes("Bearer [REDACTED_TOKEN]"));
    });
  });

  describe("3. Mocked Generation & Resilience", () => {
    it("rejects empty or whitespace prompts with 400 Bad Request", async () => {
      await assert.rejects(
        async () => {
          await gemini.generateText("");
        },
        (err: any) => err instanceof AIServiceError && err.statusCode === 400,
      );

      await assert.rejects(
        async () => {
          await gemini.generateText("   ");
        },
        (err: any) => err instanceof AIServiceError && err.statusCode === 400,
      );
    });

    it("generates text successfully using mocked SDK client", async () => {
      const mockService = new GeminiService({ apiKey: "mock-key" });
      const mockClient = {
        models: {
          generateContent: async () => ({
            text: "This candidate has strong backend experience.",
          }),
        },
      };
      (mockService as any).client = mockClient;

      const result = await mockService.generateText("Analyze candidate skills");
      assert.equal(result, "This candidate has strong backend experience.");
    });

    it("generates structured JSON data successfully using mocked SDK client", async () => {
      const mockService = new GeminiService({ apiKey: "mock-key" });
      const mockClient = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              matchScore: 94,
              skillsMatched: ["React", "TypeScript", "Node.js"],
            }),
          }),
        },
      };
      (mockService as any).client = mockClient;

      interface MatchResult {
        matchScore: number;
        skillsMatched: string[];
      }

      const result = await mockService.generateStructured<MatchResult>("Analyze candidate");
      assert.equal(result.matchScore, 94);
      assert.deepEqual(result.skillsMatched, ["React", "TypeScript", "Node.js"]);
    });

    it("handles rate limiting (429) gracefully with a user-friendly error", async () => {
      const mockService = new GeminiService({ apiKey: "mock-key" });
      const mockClient = {
        models: {
          generateContent: async () => {
            throw new Error("429 Resource has been exhausted (e.g. check quota).");
          },
        },
      };
      (mockService as any).client = mockClient;

      await assert.rejects(
        async () => {
          await mockService.generateText("Test prompt");
        },
        (err: any) => {
          return (
            err instanceof AIServiceError &&
            err.statusCode === 429 &&
            err.message.includes("rate limit exceeded")
          );
        },
      );
    });

    it("handles authentication failure (401/403) gracefully with a safe error", async () => {
      const mockService = new GeminiService({ apiKey: "mock-key" });
      const mockClient = {
        models: {
          generateContent: async () => {
            throw new Error("403 API key not valid. Please pass a valid API key.");
          },
        },
      };
      (mockService as any).client = mockClient;

      await assert.rejects(
        async () => {
          await mockService.generateText("Test prompt");
        },
        (err: any) => {
          return (
            err instanceof AIServiceError &&
            err.statusCode === 503 &&
            err.message.includes("authentication failed")
          );
        },
      );
    });

    it("aborts and returns 504 on timeout exceeded", async () => {
      const mockService = new GeminiService({ apiKey: "mock-key" });
      const mockClient = {
        models: {
          generateContent: () =>
            new Promise((resolve) => {
              // Hang for 500ms
              setTimeout(() => resolve({ text: "Late response" }), 500);
            }),
        },
      };
      (mockService as any).client = mockClient;

      await assert.rejects(
        async () => {
          await mockService.generateText("Test prompt", { timeoutMs: 50 });
        },
        (err: any) => {
          return (
            err instanceof AIServiceError &&
            err.statusCode === 504 &&
            err.message.includes("timed out")
          );
        },
      );
    });
  });

  describe("4. AI Health Endpoint API", () => {
    it("GET /api/ai/health returns 200 with safe configuration status", async () => {
      const req = new Request("http://localhost:3000/api/ai/health", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.equal(typeof json.data.configured, "boolean");
      assert.equal(typeof json.data.model, "string");
      assert.equal(json.data.service, "talenttrack-ai-gemini");

      // Verify no sensitive keys leaked in payload
      const payloadString = JSON.stringify(json);
      assert.equal(payloadString.includes("AIza"), false);
      assert.equal(payloadString.includes("apiKey"), false);
      assert.equal(payloadString.includes("secret"), false);
    });
  });
});

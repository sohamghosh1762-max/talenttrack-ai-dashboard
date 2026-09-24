import { describe, it } from "node:test";
import assert from "node:assert";
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  InternalServerError,
} from "../utils/errors.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { validateSchema, paginationSchema, mongoIdSchema } from "../validators/common.ts";
import { config } from "../config/index.ts";
import { handleApiRequest } from "../routes/index.ts";
import { z } from "zod";

describe("PHASE 1: Core Foundation & Architecture Suite", () => {
  describe("1. Environment & Central Configuration", () => {
    it("Loads and provides typed app configuration", () => {
      assert.ok(config.app);
      assert.ok(typeof config.app.nodeEnv === "string");
      assert.ok(typeof config.app.appUrl === "string");
      assert.ok(typeof config.app.apiUrl === "string");
    });

    it("Correctly provides booleans for environment mode", () => {
      assert.strictEqual(typeof config.app.isProduction, "boolean");
      assert.strictEqual(typeof config.app.isDevelopment, "boolean");
      assert.strictEqual(typeof config.app.isTest, "boolean");
    });
  });

  describe("2. Application Error Hierarchy", () => {
    it("ValidationError returns 400 with VALIDATION_ERROR code", () => {
      const err = new ValidationError("Invalid field format", [{ field: "email" }]);
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.code, "VALIDATION_ERROR");
      assert.strictEqual(err.message, "Invalid field format");
      assert.deepStrictEqual(err.details, [{ field: "email" }]);
      assert.strictEqual(err.isOperational, true);
    });

    it("AuthenticationError returns 401 with AUTHENTICATION_ERROR code", () => {
      const err = new AuthenticationError("Token expired");
      assert.strictEqual(err.statusCode, 401);
      assert.strictEqual(err.code, "AUTHENTICATION_ERROR");
    });

    it("AuthorizationError returns 403 with AUTHORIZATION_ERROR code", () => {
      const err = new AuthorizationError("Requires admin privileges");
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.code, "AUTHORIZATION_ERROR");
    });

    it("NotFoundError returns 404 with NOT_FOUND code", () => {
      const err = new NotFoundError("Job not found");
      assert.strictEqual(err.statusCode, 404);
      assert.strictEqual(err.code, "NOT_FOUND");
    });

    it("ConflictError returns 409 with CONFLICT code", () => {
      const err = new ConflictError("Email already exists");
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.code, "CONFLICT");
    });

    it("InternalServerError returns 500 and is not operational", () => {
      const err = new InternalServerError("Database unreachable");
      assert.strictEqual(err.statusCode, 500);
      assert.strictEqual(err.code, "INTERNAL_SERVER_ERROR");
      assert.strictEqual(err.isOperational, false);
    });
  });

  describe("3. API Response Standard", () => {
    it("successResponse formats standardized JSON payload", async () => {
      const res = successResponse({ id: "123", title: "Software Engineer" }, "Job retrieved", 200);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get("Content-Type"), "application/json");

      const body = await res.json();
      assert.deepStrictEqual(body, {
        success: true,
        data: { id: "123", title: "Software Engineer" },
        message: "Job retrieved",
      });
    });

    it("errorResponse formats standardized error envelope for AppError", async () => {
      const error = new ValidationError("Invalid query", [{ path: "page", message: "Too small" }]);
      const res = errorResponse(error);
      assert.strictEqual(res.status, 400);

      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "VALIDATION_ERROR");
      assert.strictEqual(body.error.message, "Invalid query");
      assert.deepStrictEqual(body.error.details, [{ path: "page", message: "Too small" }]);
    });
  });

  describe("4. Schema Validation Foundation", () => {
    it("Validates and coerces pagination query parameters", () => {
      const parsed = validateSchema(paginationSchema, { page: "2", limit: "50" });
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.limit, 50);
    });

    it("Applies default pagination parameters", () => {
      const parsed = validateSchema(paginationSchema, {});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 20);
    });

    it("Throws ValidationError on invalid MongoDB ObjectId", () => {
      assert.throws(
        () => validateSchema(mongoIdSchema, "invalid-short-id"),
        (err: unknown) => err instanceof ValidationError,
      );
    });

    it("Accepts valid 24-character hexadecimal MongoDB ObjectId", () => {
      const validId = "65f1a2b3c4d5e6f7a8b9c001";
      const result = validateSchema(mongoIdSchema, validId);
      assert.strictEqual(result, validId);
    });
  });

  describe("5. Central API Dispatcher", () => {
    it("Handles GET /api/health with 200 OK and healthy status", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.status, "healthy");
      assert.strictEqual(body.data.service, "talenttrack-ai-api");
    });

    it("Returns 404 standardized error for unhandled /api/* routes", async () => {
      const req = new Request("http://localhost:3000/api/unknown-endpoint", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 404);

      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "NOT_FOUND");
    });

    it("Returns null for non-API routes (letting SSR or static handlers take over)", async () => {
      const req = new Request("http://localhost:3000/dashboard", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.strictEqual(res, null);
    });
  });
});

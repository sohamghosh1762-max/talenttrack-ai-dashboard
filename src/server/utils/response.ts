import { AppError } from "./errors.ts";
import { config } from "../config/index.ts";
import crypto from "node:crypto";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  requestId?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

export function sanitizeErrorMessage(msg: string): string {
  if (!msg || typeof msg !== "string") return msg;
  return msg
    .replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/gi, "$1*****@")
    .replace(/(:\/\/)([^:]+):([^@]+)@/g, "$1$2:*****@");
}

export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200,
  headers?: HeadersInit,
  requestId?: string,
): Response {
  const reqId = requestId || generateRequestId();
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(requestId ? { requestId } : {}),
  };

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": reqId,
      ...headers,
    },
  });
}

export function errorResponse(
  error: unknown,
  fallbackStatus: number = 500,
  headers?: HeadersInit,
  requestId?: string,
): Response {
  let status = fallbackStatus;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred.";
  let details: unknown = undefined;
  let stack: string | undefined = undefined;
  const reqId = requestId || generateRequestId();

  // 1. AppError and derived domain errors
  if (error instanceof AppError) {
    status = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
    if (config.app.isDevelopment) {
      stack = error.stack;
    }
  }
  // 2. Mongoose / MongoDB Validation Error
  else if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ValidationError" &&
    "errors" in error
  ) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Data validation failed.";
    const fieldErrors: Record<string, string> = {};
    const mongooseErrors = (error as any).errors;
    for (const key of Object.keys(mongooseErrors)) {
      fieldErrors[key] = mongooseErrors[key]?.message || "Invalid value";
    }
    details = fieldErrors;
  }
  // 3. Mongoose CastError (e.g. invalid ObjectId format)
  else if (error && typeof error === "object" && "name" in error && error.name === "CastError") {
    status = 400;
    code = "INVALID_IDENTIFIER";
    const castErr = error as any;
    message = `Invalid format for field '${castErr.path || "identifier"}': ${castErr.value}`;
    details = { field: castErr.path, value: castErr.value };
  }
  // 4. MongoDB Duplicate Key Error (E11000)
  else if (error && typeof error === "object" && "code" in error && (error as any).code === 11000) {
    status = 409;
    code = "DUPLICATE_KEY_ERROR";
    const mongoErr = error as any;
    const keyPattern = mongoErr.keyPattern ? Object.keys(mongoErr.keyPattern).join(", ") : "field";
    message = `A resource with the specified ${keyPattern} already exists.`;
    details = { keyValue: mongoErr.keyValue };
  }
  // 5. MongoDB Connection or Network Error
  else if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error.name === "MongoServerSelectionError" ||
      error.name === "MongoNetworkError" ||
      error.name === "MongooseServerSelectionError")
  ) {
    status = 503;
    code = "DATABASE_UNAVAILABLE";
    message = "Database service is temporarily unavailable. Please retry shortly.";
  }
  // 6. Generic objects with status/statusCode
  else if (error && typeof error === "object" && ("status" in error || "statusCode" in error)) {
    const errObj = error as Record<string, unknown>;
    status = Number(errObj["status"] || errObj["statusCode"]) || fallbackStatus;
    code =
      typeof errObj["code"] === "string"
        ? errObj["code"]
        : status === 401
          ? "UNAUTHORIZED"
          : status === 403
            ? "FORBIDDEN"
            : status === 404
              ? "NOT_FOUND"
              : status === 400
                ? "VALIDATION_ERROR"
                : status === 409
                  ? "CONFLICT"
                  : status === 429
                    ? "RATE_LIMIT_EXCEEDED"
                    : "APP_ERROR";
    message = typeof errObj["message"] === "string" ? errObj["message"] : message;
  }
  // 7. Standard Error instance
  else if (error instanceof Error) {
    message = error.message;
    if (config.app.isDevelopment) {
      stack = error.stack;
    }
  } else if (typeof error === "string") {
    message = error;
  }

  const safeMessage = sanitizeErrorMessage(message);

  const body: ApiErrorResponse & { message?: string } = {
    success: false,
    message: safeMessage,
    error: {
      code,
      message: safeMessage,
      ...(details !== undefined ? { details } : {}),
      ...(stack ? { stack: sanitizeErrorMessage(stack) } : {}),
    },
    requestId: reqId,
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": reqId,
      ...headers,
    },
  });
}

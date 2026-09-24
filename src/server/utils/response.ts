import { AppError } from "./errors.ts";
import { config } from "../config/index.ts";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200,
  headers?: HeadersInit,
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function errorResponse(
  error: unknown,
  fallbackStatus: number = 500,
  headers?: HeadersInit,
): Response {
  let status = fallbackStatus;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred.";
  let details: unknown = undefined;
  let stack: string | undefined = undefined;

  if (error instanceof AppError) {
    status = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
    if (config.app.isDevelopment) {
      stack = error.stack;
    }
  } else if (error instanceof Error) {
    message = error.message;
    if (config.app.isDevelopment) {
      stack = error.stack;
    }
  } else if (typeof error === "string") {
    message = error;
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(stack ? { stack } : {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

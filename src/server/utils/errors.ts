export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_SERVER_ERROR",
    details?: unknown,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Invalid request data", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required", details?: unknown) {
    super(message, 401, "AUTHENTICATION_ERROR", details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied", details?: unknown) {
    super(message, 403, "AUTHORIZATION_ERROR", details);
  }
}

export class ForbiddenError extends AuthorizationError {}
export class BadRequestError extends ValidationError {}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict occurred", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error occurred", details?: unknown) {
    super(message, 500, "INTERNAL_SERVER_ERROR", details, false);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.", details?: unknown) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
  }
}

export class DatabaseConnectionError extends AppError {
  constructor(message: string = "Database service is temporarily unavailable.", details?: unknown) {
    super(message, 503, "DATABASE_UNAVAILABLE", details);
  }
}

export class AIServiceError extends AppError {
  constructor(
    message: string = "AI service temporarily unavailable",
    statusCode: number = 503,
    details?: unknown,
  ) {
    super(message, statusCode, "AI_SERVICE_ERROR", details);
  }
}

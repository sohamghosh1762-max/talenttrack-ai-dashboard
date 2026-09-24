/**
 * Standard frontend API Error representation
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly responseData?: unknown;

  constructor(
    message: string,
    status: number = 500,
    code: string = "API_ERROR",
    details?: unknown,
    responseData?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.responseData = responseData;
  }
}

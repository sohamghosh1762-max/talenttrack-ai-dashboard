/**
 * Query Parser & Validation Utilities for Pagination, Sorting, Filtering, and Safe Search
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SortParams {
  sortBy: string;
  sortOrder: "asc" | "desc";
  sortDirection: 1 | -1;
}

/**
 * Safely parse page and limit pagination parameters from URL search params.
 * Enforces minimums, sensible defaults, and maximum limit bounds.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 10,
  maxLimit: number = 100,
): PaginationParams {
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(
    searchParams.get("limit") || searchParams.get("pageSize") || String(defaultLimit),
    10,
  );

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build standard pagination metadata for API responses
 */
export function buildPaginationMetadata(
  total: number,
  page: number,
  limit: number,
): PaginationMetadata {
  const totalPages = Math.ceil(total / limit) || 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Validate sort field against an explicit allowlist and return deterministic sort config
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string = "createdAt",
  defaultOrder: "asc" | "desc" = "desc",
): SortParams {
  const requestedField = searchParams.get("sortBy") || searchParams.get("sort");
  const requestedOrder = searchParams.get("sortOrder") || searchParams.get("order");

  const sortBy =
    requestedField && allowedFields.includes(requestedField) ? requestedField : defaultField;

  const sortOrder: "asc" | "desc" = requestedOrder?.toLowerCase() === "asc" ? "asc" : defaultOrder;

  const sortDirection: 1 | -1 = sortOrder === "asc" ? 1 : -1;

  return { sortBy, sortOrder, sortDirection };
}

/**
 * Escape user-supplied search string to prevent ReDoS and regex injection in MongoDB queries
 */
export function escapeRegexString(input: string): string {
  if (!input) return "";
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Safely extract search query without leading/trailing whitespace
 */
export function sanitizeSearchQuery(query?: string | null): string {
  if (!query || typeof query !== "string") return "";
  return query.trim();
}

import { z } from "zod";
import { ValidationError } from "../utils/errors.ts";

/**
 * Standard pagination query parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Standard identifier validation
 */
export const idParamSchema = z.string().min(1, "Identifier cannot be empty");

/**
 * MongoDB 24-character Hex ObjectId validation
 */
export const mongoIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format: must be a 24-character hexadecimal ObjectId");

/**
 * Standard date range filter validation
 */
export const dateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

/**
 * Sorting direction schema
 */
export const sortOrderSchema = z.enum(["asc", "desc"]).default("asc");

/**
 * Validates request data against a Zod schema, throwing a standardized ValidationError on failure.
 */
export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));
    throw new ValidationError(details.map((d) => `${d.path}: ${d.message}`).join("; "), details);
  }
  return result.data;
}

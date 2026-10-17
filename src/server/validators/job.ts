import { z } from "zod";
import { mongoIdSchema } from "./common.ts";

export const employmentTypeEnum = z.enum([
  "Full-Time",
  "Part-Time",
  "Contract",
  "Remote",
  "Internship",
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "REMOTE",
  "INTERNSHIP",
]);

export const jobStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
  "CLOSED",
  "Active",
  "Paused",
  "Closed",
]);

export const salaryRangeSchema = z
  .object({
    min: z.number().nonnegative("Minimum salary cannot be negative").optional(),
    max: z.number().nonnegative("Maximum salary cannot be negative").optional(),
    currency: z.string().min(1).max(10).default("USD").optional(),
    isNegotiable: z.boolean().default(false).optional(),
  })
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    {
      message: "Minimum salary cannot exceed maximum salary",
      path: ["min"],
    },
  );

export const createJobSchema = z.object({
  title: z
    .string({ required_error: "Job title is required" })
    .trim()
    .min(2, "Job title must be at least 2 characters")
    .max(200, "Job title cannot exceed 200 characters"),
  description: z
    .string({ required_error: "Job description is required" })
    .trim()
    .min(10, "Job description must be at least 10 characters"),
  department: z
    .string({ required_error: "Department is required" })
    .trim()
    .min(1, "Department cannot be empty")
    .max(100, "Department cannot exceed 100 characters"),
  location: z
    .string({ required_error: "Location is required" })
    .trim()
    .min(1, "Location cannot be empty")
    .max(150, "Location cannot exceed 150 characters"),
  employmentType: employmentTypeEnum.default("Full-Time").optional(),
  experienceRequired: z.string().trim().max(100).optional(),
  skills: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string().transform((val) =>
        val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ])
    .default([])
    .optional(),
  salaryRange: salaryRangeSchema.optional(),
  deadline: z.string().optional(),
  status: jobStatusEnum.default("PUBLISHED").optional(),
});

export const updateJobSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  department: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(150).optional(),
  employmentType: employmentTypeEnum.optional(),
  experienceRequired: z.string().trim().max(100).optional(),
  skills: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string().transform((val) =>
        val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ])
    .optional(),
  salaryRange: salaryRangeSchema.optional(),
  deadline: z.string().optional(),
  status: jobStatusEnum.optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().trim().optional(),
  status: jobStatusEnum.optional(),
  department: z.string().trim().optional(),
  location: z.string().trim().optional(),
  employmentType: employmentTypeEnum.optional(),
  recruiterId: z.string().trim().optional(),
  sortBy: z
    .enum(["createdAt", "title", "department", "applicationsCount"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export const jobIdParamSchema = z.object({
  id: mongoIdSchema,
});

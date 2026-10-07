import { z } from "zod";
import type { UpdateApplicantProfileInput } from "../types/user-types.ts";

export const applicantExperienceItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().default(""),
  period: z.string().default(""),
  description: z.string().default(""),
});

export const applicantEducationItemSchema = z.object({
  id: z.string().optional(),
  degree: z.string().min(1, "Degree is required"),
  institution: z.string().min(1, "Institution is required"),
  period: z.string().default(""),
  grade: z.string().default(""),
});

export const applicantCertificationItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().default(""),
  year: z.string().default(""),
});

export const applicantProjectItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Project name is required"),
  tech: z.string().default(""),
  description: z.string().default(""),
});

export const updateApplicantProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  headline: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  bio: z.string().max(2000).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(z.string().min(1).max(50)).optional(),
  experiences: z.array(applicantExperienceItemSchema).optional(),
  education: z.array(applicantEducationItemSchema).optional(),
  certifications: z.array(applicantCertificationItemSchema).optional(),
  projects: z.array(applicantProjectItemSchema).optional(),
});

export function validateUpdateApplicantProfile(raw: unknown): UpdateApplicantProfileInput {
  const result = updateApplicantProfileSchema.safeParse(raw);
  if (!result.success) {
    const firstError = result.error.errors[0]?.message || "Validation failed";
    throw new Error(firstError);
  }
  return result.data as UpdateApplicantProfileInput;
}

export function parseApplicantProfileInput(raw: unknown) {
  return updateApplicantProfileSchema.safeParse(raw);
}


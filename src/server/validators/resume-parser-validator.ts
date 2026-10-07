import { z } from "zod";
import type { IParsedResumeProfile } from "../types/resume-types.ts";

export const parsedPersonalSchema = z.object({
  fullName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  portfolio: z.string().default(""),
});

export const parsedEducationItemSchema = z.object({
  degree: z.string().default(""),
  institution: z.string().default(""),
  fieldOfStudy: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  grade: z.string().default(""),
});

export const parsedExperienceItemSchema = z.object({
  company: z.string().default(""),
  role: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
  technologies: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
});

export const parsedProjectItemSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  technologies: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
  url: z.string().default(""),
});

export const parsedCertificationItemSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().default(""),
});

export const parsedResumeProfileSchema = z.object({
  personal: parsedPersonalSchema.default({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
  }),
  summary: z.string().default(""),
  skills: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
  education: z.array(parsedEducationItemSchema).default([]),
  experience: z.array(parsedExperienceItemSchema).default([]),
  projects: z.array(parsedProjectItemSchema).default([]),
  certifications: z.array(parsedCertificationItemSchema).default([]),
  languages: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
  achievements: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
});

/**
 * Validate and sanitize raw AI response into typed IParsedResumeProfile
 */
export function validateParsedResumeProfile(raw: unknown): IParsedResumeProfile {
  const result = parsedResumeProfileSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Schema validation failed on AI output: ${result.error.message}`);
  }
  return result.data as IParsedResumeProfile;
}

/**
 * Gemini JSON schema definition for structured output generation
 */
export const GEMINI_RESUME_PARSER_SCHEMA = {
  type: "object",
  properties: {
    personal: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedin: { type: "string" },
        github: { type: "string" },
        portfolio: { type: "string" },
      },
    },
    summary: { type: "string" },
    skills: {
      type: "array",
      items: { type: "string" },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          degree: { type: "string" },
          institution: { type: "string" },
          fieldOfStudy: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          grade: { type: "string" },
        },
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          location: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          description: {
            type: "array",
            items: { type: "string" },
          },
          technologies: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          technologies: {
            type: "array",
            items: { type: "string" },
          },
          url: { type: "string" },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
        },
      },
    },
    languages: {
      type: "array",
      items: { type: "string" },
    },
    achievements: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "personal",
    "summary",
    "skills",
    "education",
    "experience",
    "projects",
    "certifications",
    "languages",
    "achievements",
  ],
};

import { z } from "zod";

const categoryAssessmentSchema = z.object({
  score: z.coerce.number().min(0).max(100).default(75),
  feedback: z.string().default("No specific feedback provided."),
});

export const geminiAtsAnalysisSchema = z.object({
  summary: z.string().default("ATS compatibility analysis generated based on candidate resume and profile."),
  categories: z.object({
    completeness: categoryAssessmentSchema.default({
      score: 75,
      feedback: "Standard completeness evaluated across core resume sections.",
    }),
    skills: categoryAssessmentSchema.default({
      score: 75,
      feedback: "Core technical skills identified and evaluated.",
    }),
    experience: categoryAssessmentSchema.default({
      score: 75,
      feedback: "Work experience and professional background evaluated.",
    }),
    keywords: categoryAssessmentSchema.default({
      score: 75,
      feedback: "Industry keyword coverage evaluated.",
    }),
    education: categoryAssessmentSchema.default({
      score: 75,
      feedback: "Education history and certifications evaluated.",
    }),
    structure: categoryAssessmentSchema.default({
      score: 75,
      feedback: "Section formatting and ATS readability evaluated.",
    }),
  }),
  strengths: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
  improvements: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .default([]),
});

export type ValidatedGeminiAtsOutput = z.infer<typeof geminiAtsAnalysisSchema>;

/**
 * Validate and safely sanitize raw AI response into typed ValidatedGeminiAtsOutput
 */
export function validateGeminiAtsAnalysis(raw: unknown): ValidatedGeminiAtsOutput {
  const result = geminiAtsAnalysisSchema.safeParse(raw);
  if (!result.success) {
    // If strict parse fails, attempt fallback / partial recovery
    if (typeof raw === "object" && raw !== null) {
      const partialObj = raw as Record<string, any>;
      const cats = (partialObj["categories"] || {}) as Record<string, any>;
      return {
        summary: typeof partialObj["summary"] === "string" ? partialObj["summary"] : "Resume evaluated for ATS compatibility.",
        categories: {
          completeness: {
            score: Number(cats["completeness"]?.score) || 75,
            feedback: String(cats["completeness"]?.feedback || "Completeness evaluated."),
          },
          skills: {
            score: Number(cats["skills"]?.score) || 75,
            feedback: String(cats["skills"]?.feedback || "Skills evaluated."),
          },
          experience: {
            score: Number(cats["experience"]?.score) || 75,
            feedback: String(cats["experience"]?.feedback || "Experience evaluated."),
          },
          keywords: {
            score: Number(cats["keywords"]?.score) || 75,
            feedback: String(cats["keywords"]?.feedback || "Keywords evaluated."),
          },
          education: {
            score: Number(cats["education"]?.score) || 75,
            feedback: String(cats["education"]?.feedback || "Education evaluated."),
          },
          structure: {
            score: Number(cats["structure"]?.score) || 75,
            feedback: String(cats["structure"]?.feedback || "Structure evaluated."),
          },
        },
        strengths: Array.isArray(partialObj["strengths"])
          ? partialObj["strengths"].map(String)
          : typeof partialObj["strengths"] === "string" && partialObj["strengths"].trim()
            ? [partialObj["strengths"].trim()]
            : [],
        improvements: Array.isArray(partialObj["improvements"])
          ? partialObj["improvements"].map(String)
          : typeof partialObj["improvements"] === "string" && partialObj["improvements"].trim()
            ? [partialObj["improvements"].trim()]
            : [],
      };
    }
    throw new Error(`Schema validation failed on Gemini ATS output: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Gemini JSON schema definition for structured ATS output generation
 */
export const GEMINI_ATS_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A concise 2-3 sentence executive summary of overall resume ATS compatibility and quality.",
    },
    categories: {
      type: "object",
      properties: {
        completeness: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score between 0 and 100 representing section completeness" },
            feedback: { type: "string", description: "Qualitative assessment of resume completeness" },
          },
          required: ["score", "feedback"],
        },
        skills: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score between 0 and 100 representing skills depth and presentation" },
            feedback: { type: "string", description: "Qualitative assessment of skills presentation" },
          },
          required: ["score", "feedback"],
        },
        experience: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score between 0 and 100 representing experience impact and clarity" },
            feedback: { type: "string", description: "Qualitative assessment of experience bullet points and metrics" },
          },
          required: ["score", "feedback"],
        },
        keywords: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score between 0 and 100 representing industry keyword density and relevancy" },
            feedback: { type: "string", description: "Qualitative assessment of keyword coverage" },
          },
          required: ["score", "feedback"],
        },
        education: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score between 0 and 100 representing education and certifications coverage" },
            feedback: { type: "string", description: "Qualitative assessment of education & certifications" },
          },
          required: ["score", "feedback"],
        },
        structure: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score between 0 and 100 representing parsing readability and layout structure" },
            feedback: { type: "string", description: "Qualitative assessment of resume structure and ATS parsing friendly format" },
          },
          required: ["score", "feedback"],
        },
      },
      required: ["completeness", "skills", "experience", "keywords", "education", "structure"],
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "List of 3-5 specific strengths identified in the resume (e.g., strong technical skills, quantifiable achievements)",
    },
    improvements: {
      type: "array",
      items: { type: "string" },
      description: "List of 3-5 specific, actionable suggestions to improve ATS readability and scoring",
    },
  },
  required: ["summary", "categories", "strengths", "improvements"],
};

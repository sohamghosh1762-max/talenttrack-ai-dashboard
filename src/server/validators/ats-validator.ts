import { z } from "zod";

const safeDimensionSchema = z.object({
  score: z.coerce
    .number()
    .refine((val) => !isNaN(val) && isFinite(val) && val >= 0 && val <= 100, {
      message: "Score must be a valid number between 0 and 100",
    })
    .default(75),
  evidence: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : [String(val)].filter(Boolean)))
    .default([]),
});

const legacyCategorySchema = z.object({
  score: z.coerce.number().min(0).max(100).default(75),
  feedback: z.string().default("Category evaluated."),
});

export const geminiAtsAnalysisSchema = z.object({
  summary: z.string().default("ATS compatibility analysis evaluated against structured criteria."),
  categories: z
    .object({
      completeness: legacyCategorySchema.default({ score: 75, feedback: "Completeness evaluated." }),
      skills: legacyCategorySchema.default({ score: 75, feedback: "Skills evaluated." }),
      experience: legacyCategorySchema.default({ score: 75, feedback: "Experience evaluated." }),
      keywords: legacyCategorySchema.default({ score: 75, feedback: "Keywords evaluated." }),
      education: legacyCategorySchema.default({ score: 75, feedback: "Education evaluated." }),
      structure: legacyCategorySchema.default({ score: 75, feedback: "Structure evaluated." }),
    })
    .default({}),
  skillsRelevance: safeDimensionSchema.default({
    score: 75,
    evidence: ["Core technical and domain skills evaluated."],
  }),
  experienceQuality: safeDimensionSchema.default({
    score: 75,
    evidence: ["Professional experience depth and role progression evaluated."],
  }),
  projectQuality: safeDimensionSchema.default({
    score: 75,
    evidence: ["Practical implementation projects and portfolio evaluated."],
  }),
  summaryQuality: safeDimensionSchema.default({
    score: 75,
    evidence: ["Professional summary statement evaluated."],
  }),
  keywordRelevance: safeDimensionSchema.default({
    score: 75,
    evidence: ["Industry keyword density and ATS matching terms evaluated."],
  }),
  achievementQuality: safeDimensionSchema.default({
    score: 75,
    evidence: ["Quantifiable metrics and outcome impact evaluated."],
  }),
  strengths: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : [String(val)].filter(Boolean)))
    .default([]),
  weaknesses: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : [String(val)].filter(Boolean)))
    .default([]),
  improvements: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : [String(val)].filter(Boolean)))
    .default([]),
  keywordInsights: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : [String(val)].filter(Boolean)))
    .default([]),
  recommendations: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : [String(val)].filter(Boolean)))
    .default([]),
});

export type ValidatedGeminiAtsOutput = z.infer<typeof geminiAtsAnalysisSchema>;

/**
 * Validate and safely sanitize raw AI response into typed ValidatedGeminiAtsOutput
 */
export function validateGeminiAtsAnalysis(raw: unknown): ValidatedGeminiAtsOutput {
  const result = geminiAtsAnalysisSchema.safeParse(raw);
  if (!result.success) {
    if (typeof raw === "object" && raw !== null) {
      const partialObj = raw as Record<string, any>;
      const cats = (partialObj["categories"] || {}) as Record<string, any>;

      const parseScore = (val: unknown, fallback: number = 75): number => {
        const num = Number(val);
        if (isNaN(num) || !isFinite(num)) return fallback;
        return Math.max(0, Math.min(100, Math.round(num)));
      };

      const parseEvidence = (ev: unknown, fallbackText: string): string[] => {
        if (Array.isArray(ev)) return ev.map(String).filter(Boolean);
        if (typeof ev === "string" && ev.trim()) return [ev.trim()];
        return [fallbackText];
      };

      const strengths = Array.isArray(partialObj["strengths"])
        ? partialObj["strengths"].map(String).filter(Boolean)
        : typeof partialObj["strengths"] === "string" && partialObj["strengths"].trim()
          ? [partialObj["strengths"].trim()]
          : [];

      const weaknesses = Array.isArray(partialObj["weaknesses"])
        ? partialObj["weaknesses"].map(String).filter(Boolean)
        : Array.isArray(partialObj["improvements"])
          ? partialObj["improvements"].map(String).filter(Boolean)
          : [];

      const recommendations = Array.isArray(partialObj["recommendations"])
        ? partialObj["recommendations"].map(String).filter(Boolean)
        : weaknesses.length > 0
          ? weaknesses
          : [];

      const completenessScore = parseScore(
        cats["completeness"]?.score ?? partialObj["summaryQuality"]?.score,
        75,
      );
      const skillsScore = parseScore(
        cats["skills"]?.score ?? partialObj["skillsRelevance"]?.score,
        75,
      );
      const experienceScore = parseScore(
        cats["experience"]?.score ?? partialObj["experienceQuality"]?.score,
        75,
      );
      const keywordsScore = parseScore(
        cats["keywords"]?.score ?? partialObj["keywordRelevance"]?.score,
        75,
      );
      const educationScore = parseScore(
        cats["education"]?.score ?? partialObj["achievementQuality"]?.score,
        75,
      );
      const structureScore = parseScore(
        cats["structure"]?.score ?? partialObj["projectQuality"]?.score,
        75,
      );

      return {
        summary: typeof partialObj["summary"] === "string" ? partialObj["summary"] : "Resume evaluated for ATS compatibility.",
        categories: {
          completeness: {
            score: completenessScore,
            feedback: String(cats["completeness"]?.feedback || "Completeness evaluated."),
          },
          skills: {
            score: skillsScore,
            feedback: String(cats["skills"]?.feedback || "Skills evaluated."),
          },
          experience: {
            score: experienceScore,
            feedback: String(cats["experience"]?.feedback || "Experience evaluated."),
          },
          keywords: {
            score: keywordsScore,
            feedback: String(cats["keywords"]?.feedback || "Keywords evaluated."),
          },
          education: {
            score: educationScore,
            feedback: String(cats["education"]?.feedback || "Education evaluated."),
          },
          structure: {
            score: structureScore,
            feedback: String(cats["structure"]?.feedback || "Structure evaluated."),
          },
        },
        skillsRelevance: {
          score: skillsScore,
          evidence: parseEvidence(partialObj["skillsRelevance"]?.evidence ?? cats["skills"]?.feedback, "Skills relevance analyzed."),
        },
        experienceQuality: {
          score: experienceScore,
          evidence: parseEvidence(partialObj["experienceQuality"]?.evidence ?? cats["experience"]?.feedback, "Work experience quality analyzed."),
        },
        projectQuality: {
          score: structureScore,
          evidence: parseEvidence(partialObj["projectQuality"]?.evidence ?? cats["structure"]?.feedback, "Project quality analyzed."),
        },
        summaryQuality: {
          score: completenessScore,
          evidence: parseEvidence(partialObj["summaryQuality"]?.evidence ?? cats["completeness"]?.feedback, "Professional summary analyzed."),
        },
        keywordRelevance: {
          score: keywordsScore,
          evidence: parseEvidence(partialObj["keywordRelevance"]?.evidence ?? cats["keywords"]?.feedback, "ATS keyword coverage analyzed."),
        },
        achievementQuality: {
          score: experienceScore,
          evidence: parseEvidence(partialObj["achievementQuality"]?.evidence ?? cats["experience"]?.feedback, "Measurable achievements analyzed."),
        },
        strengths,
        weaknesses,
        improvements: weaknesses,
        keywordInsights: Array.isArray(partialObj["keywordInsights"]) ? partialObj["keywordInsights"].map(String).filter(Boolean) : [],
        recommendations,
      };
    }
    throw new Error(`Schema validation failed on Gemini ATS output: ${result.error.message}`);
  }

  // Ensure categories and dimensions are mirrored if either was omitted in input
  const data = result.data;
  if (!data.categories.completeness.score || data.categories.completeness.score === 75) {
    data.categories.completeness.score = data.summaryQuality.score;
  }
  if (!data.categories.skills.score || data.categories.skills.score === 75) {
    data.categories.skills.score = data.skillsRelevance.score;
  }
  if (!data.categories.experience.score || data.categories.experience.score === 75) {
    data.categories.experience.score = data.experienceQuality.score;
  }
  if (!data.categories.keywords.score || data.categories.keywords.score === 75) {
    data.categories.keywords.score = data.keywordRelevance.score;
  }
  if (!data.categories.structure.score || data.categories.structure.score === 75) {
    data.categories.structure.score = data.projectQuality.score;
  }

  return data;
}

/**
 * Gemini JSON schema definition for structured ATS output generation
 */
export const GEMINI_ATS_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A concise 2-3 sentence executive overview of overall resume ATS compatibility and quality.",
    },
    skillsRelevance: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score between 0 and 100 evaluating relevance and depth of skills" },
        evidence: { type: "array", items: { type: "string" }, description: "Specific evidence found in resume" },
      },
      required: ["score", "evidence"],
    },
    experienceQuality: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score between 0 and 100 evaluating role clarity and technical depth" },
        evidence: { type: "array", items: { type: "string" }, description: "Specific evidence found in resume" },
      },
      required: ["score", "evidence"],
    },
    projectQuality: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score between 0 and 100 evaluating project complexity and relevance" },
        evidence: { type: "array", items: { type: "string" }, description: "Specific evidence found in resume" },
      },
      required: ["score", "evidence"],
    },
    summaryQuality: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score between 0 and 100 evaluating executive summary clarity" },
        evidence: { type: "array", items: { type: "string" }, description: "Specific evidence found in resume" },
      },
      required: ["score", "evidence"],
    },
    keywordRelevance: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score between 0 and 100 evaluating ATS industry keyword density" },
        evidence: { type: "array", items: { type: "string" }, description: "Specific evidence found in resume" },
      },
      required: ["score", "evidence"],
    },
    achievementQuality: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score between 0 and 100 evaluating quantifiable metrics and impact" },
        evidence: { type: "array", items: { type: "string" }, description: "Specific evidence found in resume" },
      },
      required: ["score", "evidence"],
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "List of 3-5 specific strengths identified in the resume",
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
      description: "List of 3-5 specific areas for improvement",
    },
    keywordInsights: {
      type: "array",
      items: { type: "string" },
      description: "List of observed high-value technical keywords",
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      description: "List of 3-5 actionable recommendations",
    },
  },
  required: [
    "skillsRelevance",
    "experienceQuality",
    "projectQuality",
    "summaryQuality",
    "keywordRelevance",
    "achievementQuality",
    "strengths",
    "weaknesses",
    "recommendations",
  ],
};

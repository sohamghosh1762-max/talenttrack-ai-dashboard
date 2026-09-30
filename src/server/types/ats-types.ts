import type { ResumeParsingStatus } from "./resume-types.ts";

export type AtsCategoryKey =
  | "completeness"
  | "skills"
  | "experience"
  | "keywords"
  | "education"
  | "structure";

export type AtsCompatibilityTier =
  | "EXCELLENT"
  | "GOOD"
  | "MODERATE"
  | "NEEDS_IMPROVEMENT";

export interface AtsCategoryAssessment {
  key: AtsCategoryKey;
  label: string;
  score: number; // 0 - 100
  weight: number; // e.g. 0.20 for 20%
  feedback: string;
}

export interface AtsAnalysisResult {
  overallScore: number; // 0 - 100
  compatibilityTier: AtsCompatibilityTier;
  compatibilityLabel: string;
  summary: string;
  categories: {
    completeness: AtsCategoryAssessment;
    skills: AtsCategoryAssessment;
    experience: AtsCategoryAssessment;
    keywords: AtsCategoryAssessment;
    education: AtsCategoryAssessment;
    structure: AtsCategoryAssessment;
  };
  strengths: string[];
  improvements: string[];
  keywords?: {
    matched: string[];
    potentialMissing: string[];
  };
  recommendations?: string[];
  analyzedAt: string;
  resumeId: string;
  originalFileName: string;
}

export interface AtsScoreResponse {
  hasResume: boolean;
  resumeId?: string | undefined;
  fileName?: string | undefined;
  fileSize?: number | undefined;
  mimeType?: string | undefined;
  uploadedAt?: string | undefined;
  parsingStatus?: ResumeParsingStatus | undefined;
  analysis: AtsAnalysisResult | null;
}

export const ATS_CATEGORY_WEIGHTS: Record<AtsCategoryKey, { weight: number; label: string }> = {
  completeness: { weight: 0.2, label: "Resume Completeness" },
  skills: { weight: 0.25, label: "Skills Presentation" },
  experience: { weight: 0.2, label: "Experience Quality" },
  keywords: { weight: 0.2, label: "Keyword Coverage" },
  education: { weight: 0.1, label: "Education & Certifications" },
  structure: { weight: 0.05, label: "Structure & Formatting" },
};

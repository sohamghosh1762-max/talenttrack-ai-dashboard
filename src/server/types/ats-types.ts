import type { ResumeParsingStatus } from "./resume-types.ts";

export type AtsCategoryKey =
  "completeness" | "skills" | "experience" | "keywords" | "education" | "structure";

export type AtsCompatibilityTier = "EXCELLENT" | "GOOD" | "MODERATE" | "NEEDS_IMPROVEMENT";

export interface AtsScoringConfig {
  deterministicWeight: number; // 0.60
  geminiWeight: number; // 0.40
  rubricVersion: string; // "1.0"
  engineVersion: string; // "1.0"
  promptVersion: string; // "1.0"
}

export const ATS_SCORING_CONFIG: AtsScoringConfig = {
  deterministicWeight: 0.6,
  geminiWeight: 0.4,
  rubricVersion: "1.0",
  engineVersion: "1.0",
  promptVersion: "1.0",
};

export const ATS_CATEGORY_WEIGHTS: Record<AtsCategoryKey, { weight: number; label: string }> = {
  completeness: { weight: 0.2, label: "Resume Completeness" },
  skills: { weight: 0.25, label: "Skills Presentation" },
  experience: { weight: 0.2, label: "Experience Quality" },
  keywords: { weight: 0.2, label: "Keyword Coverage" },
  education: { weight: 0.1, label: "Education & Certifications" },
  structure: { weight: 0.05, label: "Structure & Formatting" },
};

export interface AtsCategoryAssessment {
  key: AtsCategoryKey;
  label: string;
  score: number; // 0 - 100 final blended score
  deterministicScore?: number; // 0 - 100 objective score
  geminiScore?: number; // 0 - 100 semantic score
  weight: number; // e.g. 0.20 for 20%
  feedback: string;
  evidence?: string[];
}

export interface GeminiDimensionScore {
  score: number;
  evidence: string[];
}

export interface GeminiAtsStructuredResponse {
  skillsRelevance: GeminiDimensionScore;
  experienceQuality: GeminiDimensionScore;
  projectQuality: GeminiDimensionScore;
  summaryQuality: GeminiDimensionScore;
  keywordRelevance: GeminiDimensionScore;
  achievementQuality: GeminiDimensionScore;
  strengths: string[];
  weaknesses: string[];
  keywordInsights: string[];
  recommendations: string[];
  summary?: string;
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
  deterministicScores?: Record<AtsCategoryKey, number> | undefined;
  geminiScores?: Record<string, GeminiDimensionScore> | undefined;
  finalCategoryScores?: Record<AtsCategoryKey, number> | undefined;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  keywords?:
    | {
        matched: string[];
        potentialMissing: string[];
      }
    | undefined;
  keywordInsights?: string[] | undefined;
  recommendations?: string[] | undefined;

  // Auditing & Idempotency Metadata
  resumeHash: string;
  analysisKey: string;
  rubricVersion: string;
  engineVersion: string;
  geminiModel: string;
  promptVersion: string;
  analysisVersion: number;
  analyzedAt: string;
  resumeId: string;
  originalFileName: string;
  aiAvailable?: boolean | undefined;
  aiNotice?: string | undefined;
  scoringConfig?:
    | {
        deterministicWeight: number;
        geminiWeight: number;
      }
    | undefined;
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

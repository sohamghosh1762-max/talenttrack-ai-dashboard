export type SkillEvidenceCategory =
  "employment" | "project" | "certification" | "summary" | "education";

export type SkillVerificationStatus =
  "supported" | "partially_supported" | "unverified" | "not_found";

export interface MatchedSkillItem {
  canonicalName: string;
  canonicalSkill?: string | undefined;
  originalTerminology: string;
  jobRequirement: string;
  isRequired: boolean;
  evidence: string | any;
  evidenceCategory: SkillEvidenceCategory;
  section?: string | undefined;
  confidence: number; // 0.0 - 1.0
  verificationStatus: SkillVerificationStatus;
  status?: SkillVerificationStatus | undefined;
}

export interface MissingSkillItem {
  canonicalName: string;
  canonicalSkill?: string | undefined;
  isRequired: boolean;
  isMandatory?: boolean | undefined;
  status: SkillVerificationStatus;
  reason: string;
  explanation?: string | undefined;
}

export interface ScreeningFactorScores {
  requiredSkills: number; // 0 - 100
  preferredSkills: number; // 0 - 100
  experience: number; // 0 - 100
  projects: number; // 0 - 100
  education: number; // 0 - 100
  semanticAlignment: number; // 0 - 100
}

export interface ScreeningFactorWeights {
  requiredSkills: number;
  preferredSkills: number;
  experience: number;
  projects: number;
  education: number;
  semanticAlignment: number;
}

export interface JobMatchExplanation {
  overallScore: number;
  tier: "STRONG_MATCH" | "SOLID_MATCH" | "MODERATE_MATCH" | "LOW_MATCH";
  matchTier?: "STRONG_MATCH" | "SOLID_MATCH" | "MODERATE_MATCH" | "LOW_MATCH" | string | undefined;
  tierLabel: string;
  factorScores: ScreeningFactorScores;
  factors?: ScreeningFactorScores | undefined;
  factorWeights: ScreeningFactorWeights;
  weights?: ScreeningFactorWeights | undefined;
  matchedSkills: MatchedSkillItem[];
  missingSkills: MissingSkillItem[];
  strengths: string[];
  gaps: string[];
  limitations: string[];
  rankingRationale?: string | undefined;
  engineVersion: string;
  modelVersion: string;
  timestamp: string;
  isAiGenerated: true;
  humanReviewRequired: true;
}

export interface RankedCandidateItem {
  id: string; // Application ID or Candidate ID
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline?: string | undefined;
  candidateLocation?: string | undefined;
  candidatePhone?: string | undefined;
  experienceYears?: number | undefined;
  currentStage: string;
  applicationStage?: string | undefined;
  appliedAt: string;
  rank: number;
  overallScore: number;
  matchTier?: string | undefined;
  tierLabel?: string | undefined;
  factorScores: ScreeningFactorScores;
  factors?: ScreeningFactorScores | undefined;
  matchedSkillsCount: number;
  missingSkillsCount: number;
  matchedSkills?: string[] | undefined;
  missingSkills?: string[] | undefined;
  topMatchedSkills: string[];
  topMissingSkills: string[];
  topStrengths?: string[] | undefined;
  topGaps?: string[] | undefined;
  rankingRationale: string;
  explanation: JobMatchExplanation;
  humanReviewed: boolean;
  recruiterNotesCount: number;
  updatedAt?: string | undefined;
}

export interface RankedCandidatesResponse {
  jobId: string;
  jobTitle: string;
  jobDepartment?: string | undefined;
  totalCandidates: number;
  screenedCount: number;
  scoringCriteria: {
    requiredSkills: string[];
    preferredSkills: string[];
    minExperienceYears?: number | undefined;
    weights: ScreeningFactorWeights;
  };
  candidates: RankedCandidateItem[];
}

export interface ApplicantRecommendationItem {
  id: string;
  category:
    | "skills_evidence"
    | "projects"
    | "quantifiable_impact"
    | "structure"
    | "skill_gap"
    | "action_impact";
  title: string;
  recommendation: string;
  suggestion?: string | undefined;
  justification: string;
  rationale?: string | undefined;
  relevantJobRequirement?: string | undefined;
}

export interface ApplicantJobRecommendationsResponse {
  jobId: string;
  jobTitle: string;
  overallMatchScore: number;
  recommendations: ApplicantRecommendationItem[];
  isAiGenerated: true;
  disclaimer: string;
  advisoryNotice?: string | undefined;
}

export interface SemanticSearchResultItem {
  candidateId: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  skills: string[];
  relevanceScore: number; // 0 - 100
  matchSummary: string;
  matchedKeywords: string[];
  experienceHighlights: string[];
  appliedJobsCount: number;
}

export interface SemanticSearchResponse {
  query: string;
  normalizedSkills: string[];
  totalResults: number;
  results: SemanticSearchResultItem[];
  model: string;
}

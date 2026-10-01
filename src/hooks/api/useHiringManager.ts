import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type { IJob } from "../../server/types/job-types.ts";
import type {
  HiringManagerFeedbackItem,
  HiringDecision,
  ApplicationStage,
} from "../../server/types/application-types.ts";

export interface HiringManagerDashboardData {
  manager: {
    id: string;
    name: string;
    email: string;
    department?: string;
    role: string;
  };
  metrics: {
    openPositions: number;
    candidatesToReview: number;
    shortlistedCandidates: number;
    interviewsScheduled: number;
    pendingDecisions: number;
    decidedCandidates: number;
  };
  assignedJobs: Array<{
    id: string;
    title: string;
    department: string;
    location: string;
    status: string;
    applicantCount: number;
    shortlistedCount: number;
  }>;
  recentCandidates: Array<{
    id: string;
    candidateName: string;
    email: string;
    jobTitle: string;
    department: string;
    stage: ApplicationStage;
    atsScore?: number;
    skills: string[];
    experience?: string;
    hasFeedback: boolean;
    decision?: HiringDecision;
    appliedAt: string;
  }>;
}

export interface HiringManagerCandidateItem {
  id: string;
  candidateName: string;
  email: string;
  phone?: string;
  jobId: string;
  jobTitle: string;
  department: string;
  stage: ApplicationStage;
  atsScore?: number;
  skills: string[];
  experience?: string;
  education?: string;
  hasFeedback: boolean;
  feedbackCount: number;
  latestRecommendation?: string;
  decision?: HiringDecision;
  decidedAt?: string;
  recruiterId?: string;
  appliedAt: string;
}

export interface HiringManagerCandidateDetail {
  application: {
    id: string;
    jobId: string;
    applicantId: string;
    stage: ApplicationStage;
    status: string;
    appliedAt: string;
    updatedAt: string;
    hiringDecision?: HiringDecision;
    decidedBy?: string;
    decidedAt?: string;
    decisionNotes?: string;
    hiringManagerFeedback?: HiringManagerFeedbackItem[];
  };
  job: IJob;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    headline?: string;
    location?: string;
    skills: string[];
    experience?: string;
    education?: string;
    resumeUrl?: string;
  };
  parsedProfile?: {
    candidateName?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    technicalSkills?: string[];
    softSkills?: string[];
    experienceSummary?: string;
    experienceYears?: number;
    education?: Array<{ degree?: string; institution?: string; year?: string | number }>;
    workHistory?: Array<{ title?: string; company?: string; duration?: string; description?: string }>;
    projects?: Array<{ name?: string; description?: string; technologies?: string[] }>;
  };
  atsAnalysis?: {
    overallScore?: number;
    scoreBreakdown?: {
      skillsMatch?: number;
      experienceMatch?: number;
      educationMatch?: number;
      formattingAndCompleteness?: number;
    };
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    semanticInsights?: string;
    skillMatches?: string[];
    missingSkills?: string[];
  };
  interviews?: Array<{
    id: string;
    title: string;
    date: string;
    interviewer: string;
    status: string;
    feedback?: string;
    score?: number;
  }>;
}

export interface HiringManagerAnalyticsData {
  metrics: {
    openPositions: number;
    totalApplicants: number;
    shortlistedCandidates: number;
    interviewsScheduled: number;
    approvedCandidates: number;
    rejectedCandidates: number;
    pendingDecisions: number;
    averageAtsScore: number;
  };
  stageDistribution: Record<string, number>;
  jobsBreakdown: Array<{
    id: string;
    title: string;
    department: string;
    totalApplicants: number;
    shortlisted: number;
    approved: number;
    rejected: number;
    pendingDecision: number;
  }>;
}

export interface HiringManagerInterviewItem {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  department: string;
  interviewDate: string;
  interviewType: string;
  interviewerName: string;
  status: string;
  notes?: string;
  feedback?: string;
}

export const hiringManagerKeys = {
  all: ["hiring-manager"] as const,
  dashboard: () => [...hiringManagerKeys.all, "dashboard"] as const,
  jobs: () => [...hiringManagerKeys.all, "jobs"] as const,
  candidates: (filters?: Record<string, unknown>) =>
    [...hiringManagerKeys.all, "candidates", filters] as const,
  candidateDetail: (id: string) => [...hiringManagerKeys.all, "candidate", id] as const,
  analytics: () => [...hiringManagerKeys.all, "analytics"] as const,
  interviews: () => [...hiringManagerKeys.all, "interviews"] as const,
};

export function useHiringManagerDashboard(options: { enabled?: boolean } = {}) {
  return useQuery<HiringManagerDashboardData>({
    queryKey: hiringManagerKeys.dashboard(),
    queryFn: async () => {
      const res = await apiClient.get<{ dashboard: HiringManagerDashboardData } | HiringManagerDashboardData>(
        "/api/hiring-manager/dashboard",
      );
      if (res && "dashboard" in res) {
        return res.dashboard;
      }
      return res as HiringManagerDashboardData;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useHiringManagerJobs(options: { enabled?: boolean } = {}) {
  return useQuery<{ jobs: IJob[]; total: number }>({
    queryKey: hiringManagerKeys.jobs(),
    queryFn: async () => {
      return apiClient.get<{ jobs: IJob[]; total: number }>("/api/hiring-manager/jobs");
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useHiringManagerCandidates(
  filters: { jobId?: string | undefined; stage?: string | undefined; search?: string | undefined } = {},
  options: { enabled?: boolean | undefined } = {},
) {
  return useQuery<{ candidates: HiringManagerCandidateItem[]; total: number }>({
    queryKey: hiringManagerKeys.candidates(filters),
    queryFn: async () => {
      return apiClient.get<{ candidates: HiringManagerCandidateItem[]; total: number }>(
        "/api/hiring-manager/candidates",
        { params: filters },
      );
    },
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  });
}

export function useHiringManagerCandidate(
  candidateId: string | undefined,
  options: { enabled?: boolean | undefined } = {},
) {
  return useQuery<HiringManagerCandidateDetail>({
    queryKey: hiringManagerKeys.candidateDetail(candidateId || ""),
    queryFn: async () => {
      if (!candidateId) throw new Error("Candidate ID is required");
      return apiClient.get<HiringManagerCandidateDetail>(
        `/api/hiring-manager/candidates/${candidateId}`,
      );
    },
    enabled: !!candidateId && (options.enabled ?? true),
    staleTime: 10_000,
  });
}

export function useSubmitHiringManagerFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candidateId,
      feedback,
    }: {
      candidateId: string;
      feedback: {
        overallFeedback: string;
        technicalSkillsRating?: number | undefined;
        communicationRating?: number | undefined;
        experienceRelevanceRating?: number | undefined;
        experienceRating?: number | undefined;
        roleFitRating?: number | undefined;
        strengths?: string[] | undefined;
        concerns?: string[] | undefined;
        recommendation: "RECOMMEND" | "MAYBE" | "DO_NOT_RECOMMEND";
      };
    }) => {
      return apiClient.post<{ success: boolean; feedback: HiringManagerFeedbackItem }>(
        `/api/hiring-manager/candidates/${candidateId}/feedback`,
        feedback,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hiringManagerKeys.all });
      queryClient.invalidateQueries({
        queryKey: hiringManagerKeys.candidateDetail(variables.candidateId),
      });
    },
  });
}

export function useSubmitHiringManagerDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candidateId,
      decision,
    }: {
      candidateId: string;
      decision: {
        decision: "APPROVED" | "REJECTED";
        notes?: string | undefined;
      };
    }) => {
      return apiClient.post<{
        success: boolean;
        decision: string;
        stage: ApplicationStage;
        application: unknown;
      }>(`/api/hiring-manager/candidates/${candidateId}/decision`, decision);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hiringManagerKeys.all });
      queryClient.invalidateQueries({
        queryKey: hiringManagerKeys.candidateDetail(variables.candidateId),
      });
    },
  });
}

export function useHiringManagerAnalytics(options: { enabled?: boolean } = {}) {
  return useQuery<HiringManagerAnalyticsData>({
    queryKey: hiringManagerKeys.analytics(),
    queryFn: async () => {
      return apiClient.get<HiringManagerAnalyticsData>("/api/hiring-manager/analytics");
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useHiringManagerInterviews(options: { enabled?: boolean } = {}) {
  return useQuery<{ interviews: HiringManagerInterviewItem[]; total: number }>({
    queryKey: hiringManagerKeys.interviews(),
    queryFn: async () => {
      return apiClient.get<{ interviews: HiringManagerInterviewItem[]; total: number }>(
        "/api/hiring-manager/interviews",
      );
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

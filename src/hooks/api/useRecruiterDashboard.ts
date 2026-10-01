import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface RecruiterDashboardData {
  kpiStats: {
    activeJobs: number;
    totalApplications: number;
    shortlistedCandidates: number;
    scheduledInterviews: number;
  };
  pipelineStats: {
    APPLIED: number;
    SCREENING: number;
    INTERVIEW: number;
    OFFERED: number;
    REJECTED: number;
    WITHDRAWN: number;
  };
  topSkills: Array<{ name: string; count: number; maxCount: number; colorClass: string }>;
  applicationOverviewChartData: Array<{
    date: string;
    applications: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
  }>;
  recentApplications: Array<{
    id: string;
    candidateName: string;
    candidateEmail: string;
    candidateInitials: string;
    jobTitle: string;
    score: number;
    status: string;
    appliedAt: string;
  }>;
  aiInsights: {
    topMatchCount: number;
    averageScore: number;
    summary: string;
  };
  jobs: any[];
  applicationsCount: number;
}

export function useRecruiterDashboard(options: { enabled?: boolean } = {}) {
  return useQuery<RecruiterDashboardData>({
    queryKey: ["recruiter", "dashboard"],
    queryFn: async () => {
      return apiClient.get<RecruiterDashboardData>("/api/recruiter/dashboard");
    },
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  });
}

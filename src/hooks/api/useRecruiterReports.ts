import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface RecruiterReportData {
  metrics: Array<{
    title: string;
    value: string;
    change: string;
    icon: string;
    bg: string;
    tone: string;
  }>;
  sourcingChannels: Array<{
    source: string;
    count: number;
    percent: number;
  }>;
  pipelineDistribution: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
    rejected: number;
  };
  summary: string;
}

export function useRecruiterReports(options: { enabled?: boolean } = {}) {
  return useQuery<RecruiterReportData>({
    queryKey: ["recruiter", "reports"],
    queryFn: async () => {
      return apiClient.get<RecruiterReportData>("/api/recruiter/reports");
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TimeframeRange } from "@/data/adminTypes";
import { exportUsersToCsv, exportUsersToJson } from "@/lib/export-utils";
import { recentUsersInitialData } from "@/data/adminData";

export interface ReportSummaryMetrics {
  totalUsers: { value: string; rawCount: number; change: string; isPositive: boolean };
  activeRecruiters: { value: string; rawCount: number; change: string; isPositive: boolean };
  activeApplicants: { value: string; rawCount: number; change: string; isPositive: boolean };
  activeJobs: { value: string; rawCount: number; change: string; isPositive: boolean };
  applicationsProcessed: { value: string; rawCount: number; change: string; isPositive: boolean };
  timeToHireDays: number;
  offerAcceptanceRate: string;
  biasAuditScore: string;
}

export interface SourcingChannelItem {
  channel: string;
  candidateCount: number;
  percentage: number;
  color: string;
}

export const adminReportsKeys = {
  all: ["admin", "reports"] as const,
  data: (timeframe: TimeframeRange) => ["admin", "reports", "data", timeframe] as const,
};

function getScaledReportMetrics(timeframe: TimeframeRange): ReportSummaryMetrics {
  const multipliers: Record<TimeframeRange, number> = {
    "7 Days": 0.35,
    "30 Days": 1.0,
    "3 Months": 2.4,
    "12 Months": 8.2,
  };

  const factor = multipliers[timeframe];

  return {
    totalUsers: {
      value: Math.round(2540 * factor).toLocaleString(),
      rawCount: Math.round(2540 * factor),
      change: "+12.4%",
      isPositive: true,
    },
    activeRecruiters: {
      value: Math.round(340 * Math.min(1.2, factor * 0.8 + 0.2)).toLocaleString(),
      rawCount: Math.round(340 * Math.min(1.2, factor * 0.8 + 0.2)),
      change: "+8.2%",
      isPositive: true,
    },
    activeApplicants: {
      value: Math.round(2200 * factor).toLocaleString(),
      rawCount: Math.round(2200 * factor),
      change: "+14.6%",
      isPositive: true,
    },
    activeJobs: {
      value: Math.round(486 * Math.min(1.3, factor * 0.7 + 0.3)).toLocaleString(),
      rawCount: Math.round(486 * Math.min(1.3, factor * 0.7 + 0.3)),
      change: "+6.8%",
      isPositive: true,
    },
    applicationsProcessed: {
      value: Math.round(3840 * factor).toLocaleString(),
      rawCount: Math.round(3840 * factor),
      change: "+18.2%",
      isPositive: true,
    },
    timeToHireDays: timeframe === "7 Days" ? 18 : timeframe === "30 Days" ? 21 : 24,
    offerAcceptanceRate: "84.2%",
    biasAuditScore: "99.4%",
  };
}

export function useAdminReports() {
  const [timeframe, setTimeframe] = useState<TimeframeRange>("30 Days");
  const [simulateError, setSimulateError] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery<{ metrics: ReportSummaryMetrics; sourcingChannels: SourcingChannelItem[] }, Error>({
    queryKey: adminReportsKeys.data(timeframe),
    queryFn: async () => {
      // Small simulated latency for smooth UI feedback
      await new Promise((res) => setTimeout(res, 200));

      if (simulateError) {
        throw new Error("Failed to compile platform reports. Analytics engine timeout.");
      }

      if (simulateEmpty) {
        return {
          metrics: {
            totalUsers: { value: "0", rawCount: 0, change: "0%", isPositive: true },
            activeRecruiters: { value: "0", rawCount: 0, change: "0%", isPositive: true },
            activeApplicants: { value: "0", rawCount: 0, change: "0%", isPositive: true },
            activeJobs: { value: "0", rawCount: 0, change: "0%", isPositive: true },
            applicationsProcessed: { value: "0", rawCount: 0, change: "0%", isPositive: true },
            timeToHireDays: 0,
            offerAcceptanceRate: "0%",
            biasAuditScore: "100%",
          },
          sourcingChannels: [],
        };
      }

      const metrics = getScaledReportMetrics(timeframe);
      const sourcingChannels: SourcingChannelItem[] = [
        { channel: "Direct Career Portal", candidateCount: Math.round(1728 * (timeframe === "7 Days" ? 0.3 : 1)), percentage: 45, color: "#2563eb" },
        { channel: "LinkedIn Integration", candidateCount: Math.round(1190 * (timeframe === "7 Days" ? 0.3 : 1)), percentage: 31, color: "#7c3aed" },
        { channel: "Internal Employee Referrals", candidateCount: Math.round(537 * (timeframe === "7 Days" ? 0.3 : 1)), percentage: 14, color: "#059669" },
        { channel: "AI Automated Match Sourcing", candidateCount: Math.round(385 * (timeframe === "7 Days" ? 0.3 : 1)), percentage: 10, color: "#d97706" },
      ];

      return { metrics, sourcingChannels };
    },
    staleTime: 15_000,
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminReportsKeys.all });
    await query.refetch();
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      exportUsersToCsv(recentUsersInitialData, `talenttrack_admin_report_${timeframe.toLowerCase().replace(" ", "_")}.csv`);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const handleExportJson = () => {
    setIsExporting(true);
    try {
      exportUsersToJson(recentUsersInitialData, `talenttrack_admin_report_${timeframe.toLowerCase().replace(" ", "_")}.json`);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const defaultMetrics = getScaledReportMetrics(timeframe);

  return {
    timeframe,
    setTimeframe,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error,
    simulateError,
    setSimulateError,
    simulateEmpty,
    setSimulateEmpty,
    isExporting,
    handleRefresh,
    handleExportCsv,
    handleExportJson,
    metrics: query.data?.metrics ?? defaultMetrics,
    sourcingChannels: query.data?.sourcingChannels ?? [],
  };
}

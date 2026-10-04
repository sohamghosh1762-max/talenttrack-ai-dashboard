import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminDashboard } from "@/lib/admin-api";
import type {
  AdminOverviewStats,
  AdminUserRecord,
  GrowthDataPoint,
  PlatformActivityItem,
  RecruitmentFunnelStep,
  RecruitmentStageCard,
  SystemServiceItem,
  TimeframeRange,
  UserDistributionSegment,
} from "@/data/adminTypes";

export type DashboardDateRange = "Today" | "7 Days" | "30 Days" | "3 Months" | "12 Months" | "All";

export interface DashboardData {
  stats: AdminOverviewStats;
  growthData: GrowthDataPoint[];
  growthDataByTimeframe?: Record<TimeframeRange, GrowthDataPoint[]>;
  userDistribution: UserDistributionSegment[];
  recruitmentOverview: {
    cards: RecruitmentStageCard[];
    funnel: RecruitmentFunnelStep[];
  };
  recentUsers: AdminUserRecord[];
  recentActivity: PlatformActivityItem[];
  systemStatus: SystemServiceItem[];
  analytics?: any;
}

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  data: (range: DashboardDateRange) => ["admin", "dashboard", "data", range] as const,
};

export function mapDateRangeToTimeframe(range: DashboardDateRange): TimeframeRange {
  if (range === "Today") return "7 Days";
  if (range === "7 Days") return "7 Days";
  if (range === "30 Days") return "30 Days";
  if (range === "3 Months") return "3 Months";
  return "12 Months";
}

const emptyStats: AdminOverviewStats = {
  totalUsers: {
    id: "stat-total-users",
    label: "TOTAL USERS",
    value: "0",
    rawCount: 0,
    changePct: "+0",
    isPositive: true,
    trend: "neutral",
    description: "registered accounts",
  },
  activeRecruiters: {
    id: "stat-active-recruiters",
    label: "ACTIVE RECRUITERS",
    value: "0",
    rawCount: 0,
    changePct: "0",
    isPositive: true,
    trend: "neutral",
    description: "verified employer accounts",
  },
  activeApplicants: {
    id: "stat-active-applicants",
    label: "ACTIVE APPLICANTS",
    value: "0",
    rawCount: 0,
    changePct: "+0",
    isPositive: true,
    trend: "neutral",
    description: "active job seekers in period",
  },
  activeJobs: {
    id: "stat-active-jobs",
    label: "ACTIVE JOBS",
    value: "0",
    rawCount: 0,
    changePct: "+0",
    isPositive: true,
    trend: "neutral",
    description: "currently open listings",
  },
};

export function useAdminDashboardData() {
  const [dateRange, setDateRange] = useState<DashboardDateRange>("30 Days");
  const [simulateError, setSimulateError] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery<DashboardData, Error>({
    queryKey: adminDashboardKeys.data(dateRange),
    queryFn: async () => {
      if (simulateError) {
        throw new Error("Failed to load platform dashboard metrics. Server response timeout.");
      }

      const response = await fetchAdminDashboard({ range: dateRange });

      if (simulateEmpty) {
        return {
          stats: emptyStats,
          growthData: [],
          growthDataByTimeframe: {
            "7 Days": [],
            "30 Days": [],
            "3 Months": [],
            "12 Months": [],
          },
          userDistribution: [],
          recruitmentOverview: { cards: [], funnel: [] },
          recentUsers: [],
          recentActivity: [],
          systemStatus: response.systemStatus || [],
        };
      }

      return response;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all });
    await query.refetch();
  };

  return {
    dateRange,
    setDateRange,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error,
    simulateError,
    setSimulateError,
    simulateEmpty,
    setSimulateEmpty,
    handleRefresh,
    stats: query.data?.stats ?? emptyStats,
    growthData: query.data?.growthData ?? [],
    growthDataByTimeframe: query.data?.growthDataByTimeframe,
    userDistribution: query.data?.userDistribution ?? [],
    recruitmentOverview: query.data?.recruitmentOverview ?? { cards: [], funnel: [] },
    recentUsersData: query.data?.recentUsers ?? [],
    recentActivityData: query.data?.recentActivity ?? [],
    systemStatusData: query.data?.systemStatus ?? [],
  };
}


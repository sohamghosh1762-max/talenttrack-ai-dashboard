import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminService,
  recentPlatformActivityData,
  initialSystemStatusData,
  recentUsersInitialData,
} from "@/data/adminData";
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

export type DashboardDateRange = "Today" | "7 Days" | "30 Days" | "3 Months" | "12 Months";

export interface DashboardData {
  stats: AdminOverviewStats;
  growthData: GrowthDataPoint[];
  userDistribution: UserDistributionSegment[];
  recruitmentOverview: {
    cards: RecruitmentStageCard[];
    funnel: RecruitmentFunnelStep[];
  };
  recentUsers: AdminUserRecord[];
  recentActivity: PlatformActivityItem[];
  systemStatus: SystemServiceItem[];
}

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  data: (range: DashboardDateRange) => ["admin", "dashboard", "data", range] as const,
};

/**
 * Recalculates or scales mock stats based on selected date range to give
 * realistic feedback when switching date ranges.
 */
function getScaledStats(range: DashboardDateRange): AdminOverviewStats {
  const multipliers: Record<DashboardDateRange, number> = {
    Today: 0.15,
    "7 Days": 0.4,
    "30 Days": 1.0,
    "3 Months": 2.2,
    "12 Months": 7.5,
  };

  const factor = multipliers[range];

  return {
    totalUsers: {
      id: "stat-total-users",
      label: "TOTAL USERS",
      value: Math.round(2540 * factor).toLocaleString(),
      rawCount: Math.round(2540 * factor),
      changePct: range === "Today" ? "+2.1%" : range === "7 Days" ? "+5.4%" : "+12.4%",
      isPositive: true,
      trend: "up",
      description: `vs. previous ${range.toLowerCase()}`,
    },
    activeRecruiters: {
      id: "stat-active-recruiters",
      label: "ACTIVE RECRUITERS",
      value: Math.round(340 * Math.min(1, factor * 0.85 + 0.15)).toLocaleString(),
      rawCount: Math.round(340 * Math.min(1, factor * 0.85 + 0.15)),
      changePct: "+8.2%",
      isPositive: true,
      trend: "up",
      description: "verified employer accounts",
    },
    activeApplicants: {
      id: "stat-active-applicants",
      label: "ACTIVE APPLICANTS",
      value: Math.round(2200 * factor).toLocaleString(),
      rawCount: Math.round(2200 * factor),
      changePct: "+14.6%",
      isPositive: true,
      trend: "up",
      description: `active in past ${range.toLowerCase()}`,
    },
    activeJobs: {
      id: "stat-active-jobs",
      label: "ACTIVE JOBS",
      value: Math.round(486 * Math.min(1.2, factor * 0.7 + 0.3)).toLocaleString(),
      rawCount: Math.round(486 * Math.min(1.2, factor * 0.7 + 0.3)),
      changePct: "+6.8%",
      isPositive: true,
      trend: "up",
      description: "currently open listings",
    },
  };
}

/**
 * Retrieves baseline platform activity items for client-side rendering.
 */
function getCombinedActivities(): PlatformActivityItem[] {
  const all = [...recentPlatformActivityData];
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return all.slice(0, 8);
}

/**
 * Maps dashboard date range to growth chart timeframe range
 */
export function mapDateRangeToTimeframe(range: DashboardDateRange): TimeframeRange {
  if (range === "Today") return "7 Days";
  if (range === "7 Days") return "7 Days";
  if (range === "30 Days") return "30 Days";
  if (range === "3 Months") return "3 Months";
  return "12 Months";
}

export function useAdminDashboardData() {
  const [dateRange, setDateRange] = useState<DashboardDateRange>("30 Days");
  const [simulateError, setSimulateError] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const queryClient = useQueryClient();

  const timeframe = mapDateRangeToTimeframe(dateRange);

  const query = useQuery<DashboardData, Error>({
    queryKey: adminDashboardKeys.data(dateRange),
    queryFn: async () => {
      if (simulateError) {
        throw new Error("Failed to load platform dashboard metrics. Server response timeout.");
      }

      const [growthData, userDist, recruitment, systemStatus] = await Promise.all([
        adminService.getGrowthData(timeframe),
        adminService.getUserDistribution(),
        adminService.getRecruitmentOverview(),
        adminService.getSystemHealth(),
      ]);

      if (simulateEmpty) {
        return {
          stats: {
            totalUsers: {
              id: "1",
              label: "TOTAL USERS",
              value: "0",
              rawCount: 0,
              changePct: "0%",
              isPositive: true,
              trend: "neutral",
            },
            activeRecruiters: {
              id: "2",
              label: "ACTIVE RECRUITERS",
              value: "0",
              rawCount: 0,
              changePct: "0%",
              isPositive: true,
              trend: "neutral",
            },
            activeApplicants: {
              id: "3",
              label: "ACTIVE APPLICANTS",
              value: "0",
              rawCount: 0,
              changePct: "0%",
              isPositive: true,
              trend: "neutral",
            },
            activeJobs: {
              id: "4",
              label: "ACTIVE JOBS",
              value: "0",
              rawCount: 0,
              changePct: "0%",
              isPositive: true,
              trend: "neutral",
            },
          },
          growthData: [],
          userDistribution: [],
          recruitmentOverview: { cards: [], funnel: [] },
          recentUsers: [],
          recentActivity: [],
          systemStatus: [],
        };
      }

      return {
        stats: getScaledStats(dateRange),
        growthData,
        userDistribution: userDist,
        recruitmentOverview: recruitment,
        recentUsers: recentUsersInitialData,
        recentActivity: getCombinedActivities(),
        systemStatus,
      };
    },
    staleTime: 15_000,
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all });
    await query.refetch();
  };

  const defaultStats = getScaledStats(dateRange);

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
    stats: query.data?.stats ?? defaultStats,
    growthData: query.data?.growthData ?? [],
    userDistribution: query.data?.userDistribution ?? [],
    recruitmentOverview: query.data?.recruitmentOverview ?? { cards: [], funnel: [] },
    recentUsersData: query.data?.recentUsers ?? recentUsersInitialData,
    recentActivityData: query.data?.recentActivity ?? getCombinedActivities(),
    systemStatusData: query.data?.systemStatus ?? initialSystemStatusData,
  };
}

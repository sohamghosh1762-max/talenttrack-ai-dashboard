export type TimeframeRange = "7 Days" | "30 Days" | "3 Months" | "12 Months";

export interface AdminStatItem {
  id: string;
  label: string;
  value: string;
  rawCount: number;
  changePct: string;
  isPositive: boolean;
  trend: "up" | "down" | "neutral";
  description?: string | undefined;
}

export interface AdminOverviewStats {
  totalUsers: AdminStatItem;
  activeRecruiters: AdminStatItem;
  activeApplicants: AdminStatItem;
  activeJobs: AdminStatItem;
}

export interface GrowthDataPoint {
  period: string;
  users: number;
  jobs: number;
  applications: number;
}

export interface UserDistributionSegment {
  name: "Recruiters" | "Applicants" | "Admins";
  count: number;
  percentage: number;
  color: string;
}

export interface RecruitmentStageCard {
  id: string;
  label: string;
  count: number;
  status: string;
  trend?: string | undefined;
  tone: "blue" | "purple" | "indigo" | "emerald";
}

export interface RecruitmentFunnelStep {
  stage: string;
  count: number;
  conversionPct: number; // Conversion from previous step
  overallPct: number; // Percent of total applications
}

export type AdminUserRole = "Recruiter" | "Applicant" | "Admin";
export type AdminUserStatus = "Active" | "Pending" | "Suspended";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  joined: string;
  avatarUrl?: string | undefined;
  company?: string | undefined;
  location?: string | undefined;
  lastActive?: string | undefined;
}

export type ActivityCategory = "job" | "user" | "application" | "company" | "system";

export interface PlatformActivityItem {
  id: string;
  description: string;
  timeAgo: string;
  timestamp: string;
  category: ActivityCategory;
  actorName?: string | undefined;
  badgeText?: string | undefined;
}

export type ServiceHealthStatus = "Operational" | "Degraded" | "Maintenance";

export interface SystemServiceItem {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  latency: string;
  uptime: string;
}

export interface AdminDashboardState {
  stats: AdminOverviewStats;
  growthTimeframe: TimeframeRange;
  growthData: Record<TimeframeRange, GrowthDataPoint[]>;
  userDistribution: UserDistributionSegment[];
  recruitmentOverview: {
    cards: RecruitmentStageCard[];
    funnel: RecruitmentFunnelStep[];
  };
  recentUsers: AdminUserRecord[];
  recentActivity: PlatformActivityItem[];
  systemStatus: SystemServiceItem[];
}

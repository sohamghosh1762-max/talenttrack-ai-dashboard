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
} from "./adminTypes";

export const initialAdminOverviewStats: AdminOverviewStats = {
  totalUsers: {
    id: "stat-total-users",
    label: "TOTAL USERS",
    value: "2,540",
    rawCount: 2540,
    changePct: "+12.4%",
    isPositive: true,
    trend: "up",
    description: "vs. previous month",
  },
  activeRecruiters: {
    id: "stat-active-recruiters",
    label: "ACTIVE RECRUITERS",
    value: "340",
    rawCount: 340,
    changePct: "+8.2%",
    isPositive: true,
    trend: "up",
    description: "verified employer accounts",
  },
  activeApplicants: {
    id: "stat-active-applicants",
    label: "ACTIVE APPLICANTS",
    value: "2,200",
    rawCount: 2200,
    changePct: "+14.6%",
    isPositive: true,
    trend: "up",
    description: "active job seekers in past 30d",
  },
  activeJobs: {
    id: "stat-active-jobs",
    label: "ACTIVE JOBS",
    value: "486",
    rawCount: 486,
    changePct: "+6.8%",
    isPositive: true,
    trend: "up",
    description: "currently open listings",
  },
};

export const growthChartDataByTimeframe: Record<TimeframeRange, GrowthDataPoint[]> = {
  "7 Days": [
    { period: "Mon", users: 2480, jobs: 470, applications: 180 },
    { period: "Tue", users: 2495, jobs: 473, applications: 198 },
    { period: "Wed", users: 2510, jobs: 478, applications: 212 },
    { period: "Thu", users: 2522, jobs: 480, applications: 226 },
    { period: "Fri", users: 2530, jobs: 483, applications: 238 },
    { period: "Sat", users: 2535, jobs: 485, applications: 242 },
    { period: "Sun", users: 2540, jobs: 486, applications: 248 },
  ],
  "30 Days": [
    { period: "Week 1", users: 2280, jobs: 440, applications: 154 },
    { period: "Week 2", users: 2360, jobs: 455, applications: 182 },
    { period: "Week 3", users: 2450, jobs: 470, applications: 216 },
    { period: "Week 4", users: 2540, jobs: 486, applications: 248 },
  ],
  "3 Months": [
    { period: "Jul", users: 1950, jobs: 380, applications: 112 },
    { period: "Aug", users: 2230, jobs: 432, applications: 178 },
    { period: "Sep", users: 2540, jobs: 486, applications: 248 },
  ],
  "12 Months": [
    { period: "Oct '25", users: 1100, jobs: 210, applications: 64 },
    { period: "Dec '25", users: 1420, jobs: 275, applications: 92 },
    { period: "Feb '26", users: 1740, jobs: 330, applications: 130 },
    { period: "Apr '26", users: 2010, jobs: 395, applications: 168 },
    { period: "Jun '26", users: 2290, jobs: 445, applications: 210 },
    { period: "Aug '26", users: 2460, jobs: 472, applications: 235 },
    { period: "Sep '26", users: 2540, jobs: 486, applications: 248 },
  ],
};

export const userDistributionData: UserDistributionSegment[] = [
  {
    name: "Applicants",
    count: 2200,
    percentage: 86.6,
    color: "#2563eb", // brand blue
  },
  {
    name: "Recruiters",
    count: 340,
    percentage: 13.4,
    color: "#7c3aed", // violet/indigo
  },
  {
    name: "Admins",
    count: 4,
    percentage: 0.2,
    color: "#64748b", // slate gray
  },
];

export const recruitmentOverviewCards: RecruitmentStageCard[] = [
  {
    id: "total-apps",
    label: "Total Applications",
    count: 248,
    status: "Active pipeline",
    trend: "+18% this month",
    tone: "blue",
  },
  {
    id: "shortlisted",
    label: "Shortlisted",
    count: 36,
    status: "Passed screening",
    trend: "14.5% conversion",
    tone: "indigo",
  },
  {
    id: "interviews",
    label: "Interviews",
    count: 18,
    status: "Scheduled & ongoing",
    trend: "50% of shortlisted",
    tone: "purple",
  },
  {
    id: "offers",
    label: "Offers",
    count: 8,
    status: "Extended to candidates",
    trend: "44.4% interview pass",
    tone: "emerald",
  },
];

export const recruitmentFunnelSteps: RecruitmentFunnelStep[] = [
  {
    stage: "Applications",
    count: 248,
    conversionPct: 100,
    overallPct: 100,
  },
  {
    stage: "Screening",
    count: 142,
    conversionPct: 57.3,
    overallPct: 57.3,
  },
  {
    stage: "Shortlisted",
    count: 36,
    conversionPct: 25.4,
    overallPct: 14.5,
  },
  {
    stage: "Interview",
    count: 18,
    conversionPct: 50.0,
    overallPct: 7.3,
  },
  {
    stage: "Offer",
    count: 8,
    conversionPct: 44.4,
    overallPct: 3.2,
  },
];

export const recentUsersInitialData: AdminUserRecord[] = [
  {
    id: "usr-01",
    name: "Rahul Mehta",
    email: "rahul@example.com",
    role: "Recruiter",
    status: "Active",
    joined: "Today",
    company: "TalentTrack Technologies",
    location: "Mumbai, India",
    lastActive: "10m ago",
  },
  {
    id: "usr-02",
    name: "Aarav Shah",
    email: "aarav@example.com",
    role: "Applicant",
    status: "Active",
    joined: "Today",
    company: "Independent Candidate",
    location: "Bengaluru, India",
    lastActive: "25m ago",
  },
  {
    id: "usr-03",
    name: "Priya Nair",
    email: "priya@example.com",
    role: "Applicant",
    status: "Active",
    joined: "Yesterday",
    company: "Independent Candidate",
    location: "Pune, India",
    lastActive: "2h ago",
  },
  {
    id: "usr-04",
    name: "Vikram Malhotra",
    email: "vikram@enterprise-hire.com",
    role: "Recruiter",
    status: "Pending",
    joined: "2 days ago",
    company: "Enterprise Hire Inc.",
    location: "Delhi, India",
    lastActive: "1d ago",
  },
  {
    id: "usr-05",
    name: "Sarah Jenkins",
    email: "sarah.j@talenttrack.ai",
    role: "Admin",
    status: "Active",
    joined: "3 weeks ago",
    company: "TalentTrack Core Team",
    location: "San Francisco, USA",
    lastActive: "Just now",
  },
  {
    id: "usr-06",
    name: "Rohan Kapoor",
    email: "rohan.k@recruitworks.co",
    role: "Recruiter",
    status: "Suspended",
    joined: "1 month ago",
    company: "RecruitWorks Global",
    location: "Hyderabad, India",
    lastActive: "5d ago",
  },
  {
    id: "usr-07",
    name: "Ananya Sen",
    email: "ananya.sen@devtalent.org",
    role: "Applicant",
    status: "Active",
    joined: "Yesterday",
    company: "Independent Candidate",
    location: "Kolkata, India",
    lastActive: "3h ago",
  },
];

export const recentPlatformActivityData: PlatformActivityItem[] = [
  {
    id: "act-01",
    description: "Recruiter created a new job",
    timeAgo: "2 minutes ago",
    timestamp: "2026-09-19T21:38:00Z",
    category: "job",
    actorName: "Rahul Mehta (Senior Recruiter)",
    badgeText: "Staff Software Engineer",
  },
  {
    id: "act-02",
    description: "New applicant registered",
    timeAgo: "12 minutes ago",
    timestamp: "2026-09-19T21:28:00Z",
    category: "user",
    actorName: "Aarav Shah",
    badgeText: "Profile completed",
  },
  {
    id: "act-03",
    description: "Candidate application submitted",
    timeAgo: "25 minutes ago",
    timestamp: "2026-09-19T21:15:00Z",
    category: "application",
    actorName: "Priya Nair",
    badgeText: "Lead Product Designer",
  },
  {
    id: "act-04",
    description: "Recruiter shortlisted a candidate",
    timeAgo: "42 minutes ago",
    timestamp: "2026-09-19T20:58:00Z",
    category: "job",
    actorName: "Rahul Mehta",
    badgeText: "Match score: 94%",
  },
  {
    id: "act-05",
    description: "New company registered",
    timeAgo: "1 hour ago",
    timestamp: "2026-09-19T20:40:00Z",
    category: "company",
    actorName: "Apex Cloud Innovations",
    badgeText: "Enterprise Tier",
  },
];

export const initialSystemStatusData: SystemServiceItem[] = [
  {
    id: "sys-api",
    name: "API Status",
    status: "Operational",
    latency: "24ms",
    uptime: "99.99%",
  },
  {
    id: "sys-db",
    name: "Database",
    status: "Operational",
    latency: "12ms",
    uptime: "100%",
  },
  {
    id: "sys-storage",
    name: "File Storage",
    status: "Operational",
    latency: "45ms",
    uptime: "99.98%",
  },
  {
    id: "sys-ai",
    name: "AI Processing",
    status: "Operational",
    latency: "180ms",
    uptime: "99.95%",
  },
  {
    id: "sys-email",
    name: "Email Service",
    status: "Operational",
    latency: "85ms",
    uptime: "99.99%",
  },
];

/**
 * Service layer simulating backend API endpoints.
 * All functions return Promises to demonstrate seamless replacement with real API calls.
 */
export const adminService = {
  async getOverviewStats(): Promise<AdminOverviewStats> {
    await new Promise((r) => setTimeout(r, 60));
    return { ...initialAdminOverviewStats };
  },

  async getGrowthData(timeframe: TimeframeRange): Promise<GrowthDataPoint[]> {
    await new Promise((r) => setTimeout(r, 60));
    return growthChartDataByTimeframe[timeframe] || growthChartDataByTimeframe["7 Days"];
  },

  async getUserDistribution(): Promise<UserDistributionSegment[]> {
    await new Promise((r) => setTimeout(r, 50));
    return [...userDistributionData];
  },

  async getRecruitmentOverview() {
    await new Promise((r) => setTimeout(r, 50));
    return {
      cards: [...recruitmentOverviewCards],
      funnel: [...recruitmentFunnelSteps],
    };
  },

  async getRecentUsers(): Promise<AdminUserRecord[]> {
    await new Promise((r) => setTimeout(r, 70));
    return [...recentUsersInitialData];
  },

  async getActivityFeed(): Promise<PlatformActivityItem[]> {
    await new Promise((r) => setTimeout(r, 50));
    return [...recentPlatformActivityData];
  },

  async getSystemHealth(): Promise<SystemServiceItem[]> {
    await new Promise((r) => setTimeout(r, 50));
    return [...initialSystemStatusData];
  },

  async updateUserStatus(userId: string, newStatus: AdminUserRecord["status"]): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 120));
    return true;
  },

  async deleteUser(userId: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 120));
    return true;
  },
};

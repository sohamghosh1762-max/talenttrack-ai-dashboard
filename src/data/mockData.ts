import type { ComponentType } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  FileSearch,
  Home,
  Lightbulb,
  Mail,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

export type IconComponent = ComponentType<{ className?: string }>;

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  badge?: string;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Applications", href: "/applications", icon: Users },
  { label: "Candidates", href: "/candidates", icon: CircleUserRound },
  { label: "Pipeline", href: "/pipeline", icon: SlidersHorizontal },
  { label: "AI Screening", href: "/ai-screening", icon: Sparkles },
  { label: "Messages", href: "/messages", icon: Mail, badge: "2" },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export interface RecruiterProfile {
  name: string;
  role: string;
  initials: string;
  email: string;
  department: string;
}

export const recruiterProfile: RecruiterProfile = {
  name: "Rahul Mehta",
  role: "Recruiter",
  initials: "R",
  email: "rahul.mehta@talenttrack.ai",
  department: "Global Talent Acquisition",
};

export interface KPICardData {
  id: string;
  value: string;
  title: string;
  change: string;
  changeTone?: string;
  icon: IconComponent;
  bgClass: string;
  iconToneClass: string;
}

export const kpiStatsData: KPICardData[] = [
  {
    id: "kpi-active-jobs",
    value: "12",
    title: "Active Job Openings",
    change: "↑ 3 from last week",
    icon: BriefcaseBusiness,
    bgClass: "bg-surface-blue",
    iconToneClass: "text-brand-blue",
  },
  {
    id: "kpi-total-apps",
    value: "248",
    title: "Total Applications",
    change: "↑ 18% from last week",
    icon: Users,
    bgClass: "bg-surface-green",
    iconToneClass: "text-brand-green",
  },
  {
    id: "kpi-shortlisted",
    value: "36",
    title: "Shortlisted Candidates",
    change: "↑ 6 from last week",
    icon: CircleUserRound,
    bgClass: "bg-surface-purple",
    iconToneClass: "text-brand-purple",
  },
  {
    id: "kpi-interviews",
    value: "8",
    title: "Interviews Scheduled",
    change: "↑ 3 this week",
    icon: CalendarDays,
    bgClass: "bg-surface-peach",
    iconToneClass: "text-brand-red",
  },
];

export interface ApplicationTimelinePoint {
  date: string;
  applications: number;
  shortlisted: number;
  interviewed: number;
  offered: number;
}

export const applicationOverviewChartData: ApplicationTimelinePoint[] = [
  { date: "Aug 10", applications: 30, shortlisted: 12, interviewed: 2, offered: 0 },
  { date: "Aug 17", applications: 46, shortlisted: 20, interviewed: 6, offered: 1 },
  { date: "Aug 24", applications: 59, shortlisted: 26, interviewed: 10, offered: 2 },
  { date: "Aug 31", applications: 66, shortlisted: 32, interviewed: 14, offered: 3 },
  { date: "Sep 7", applications: 80, shortlisted: 40, interviewed: 19, offered: 6 },
  { date: "Sep 14", applications: 94, shortlisted: 50, interviewed: 25, offered: 10 },
];

export interface SkillStat {
  name: string;
  count: number;
  colorClass: string;
  maxCount: number;
}

export const topSkillsData: SkillStat[] = [
  { name: "Python", count: 142, colorClass: "bg-brand-blue", maxCount: 142 },
  { name: "JavaScript", count: 118, colorClass: "bg-brand-purple/75", maxCount: 142 },
  { name: "React", count: 96, colorClass: "bg-brand-red/75", maxCount: 142 },
  { name: "Node.js", count: 74, colorClass: "bg-brand-orange/80", maxCount: 142 },
  { name: "Machine Learning", count: 62, colorClass: "bg-brand-green/85", maxCount: 142 },
  { name: "AWS", count: 58, colorClass: "bg-brand-blue/70", maxCount: 142 },
];

export interface AIInsightItem {
  id: string;
  icon: IconComponent;
  title: string;
  description: string;
  toneClass: string;
  bgClass: string;
  category: "candidate-match" | "trend" | "recommendation";
}

export const aiInsightsData: AIInsightItem[] = [
  {
    id: "insight-1",
    icon: CheckCircle2,
    title: "Engineering Pipeline Health",
    description: "You have 24 strong candidates for Software Engineer roles.",
    toneClass: "text-brand-green",
    bgClass: "bg-surface-green",
    category: "candidate-match",
  },
  {
    id: "insight-2",
    icon: BarChart3,
    title: "Application Velocity",
    description: "Applications increased by 18% this week.",
    toneClass: "text-brand-blue",
    bgClass: "bg-surface-blue",
    category: "trend",
  },
  {
    id: "insight-3",
    icon: Lightbulb,
    title: "AI Match Opportunity",
    description:
      "Consider reviewing 5 high-potential candidates who match 90%+ with your job descriptions.",
    toneClass: "text-brand-orange",
    bgClass: "bg-surface-peach",
    category: "recommendation",
  },
];

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  applications: number;
  status: "Active" | "Paused" | "Closed";
  createdOn: string;
  location: string;
  type: "Full-Time" | "Contract" | "Remote";
  experience: string;
  description?: string;
}

export const jobOpeningsData: JobOpening[] = [
  {
    id: "job-1",
    title: "Frontend Developer",
    department: "Engineering",
    applications: 72,
    status: "Active",
    createdOn: "Aug 20, 2025",
    location: "San Francisco, CA (Hybrid)",
    type: "Full-Time",
    experience: "3-5 years",
    description:
      "Build high-performance web applications using React, TypeScript, and modern CSS architecture.",
  },
  {
    id: "job-2",
    title: "Backend Developer",
    department: "Engineering",
    applications: 58,
    status: "Active",
    createdOn: "Aug 18, 2025",
    location: "Austin, TX (Remote)",
    type: "Full-Time",
    experience: "4+ years",
    description:
      "Design scalable REST & GraphQL APIs, microservices, and high-throughput data processing systems.",
  },
  {
    id: "job-3",
    title: "AI/ML Engineer",
    department: "Research",
    applications: 36,
    status: "Active",
    createdOn: "Aug 15, 2025",
    location: "New York, NY (Hybrid)",
    type: "Full-Time",
    experience: "3+ years",
    description:
      "Implement transformer models, embeddings pipelines, and semantic search algorithms.",
  },
  {
    id: "job-4",
    title: "Product Designer",
    department: "Design",
    applications: 28,
    status: "Active",
    createdOn: "Aug 12, 2025",
    location: "Seattle, WA (Remote)",
    type: "Full-Time",
    experience: "2-4 years",
    description:
      "Lead end-to-end design systems, wireframing, high-fidelity prototypes, and user research.",
  },
  {
    id: "job-5",
    title: "DevOps Engineer",
    department: "Infrastructure",
    applications: 18,
    status: "Paused",
    createdOn: "Aug 10, 2025",
    location: "Remote",
    type: "Full-Time",
    experience: "5+ years",
    description:
      "Manage Kubernetes clusters, CI/CD pipelines, AWS cloud infrastructure, and observability.",
  },
];

export interface Applicant {
  id: string;
  name: string;
  email: string;
  job: string;
  score: number;
  status: "Shortlisted" | "Under Review" | "Interview" | "Applied" | "Offered" | "Rejected";
  initials: string;
  appliedOn: string;
  phone?: string;
  location?: string;
  experience?: string;
  skills?: string[];
  summary?: string;
}

export const recentApplicantsData: Applicant[] = [
  {
    id: "app-1",
    name: "Aarav Mehta",
    email: "aarav@gmail.com",
    job: "Frontend Developer",
    score: 92,
    status: "Shortlisted",
    initials: "AM",
    appliedOn: "Sep 14, 2025",
    phone: "+1 (555) 234-5678",
    location: "San Jose, CA",
    experience: "4 years",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
    summary:
      "Senior Frontend Engineer specializing in responsive web applications and state management architectures.",
  },
  {
    id: "app-2",
    name: "Priya Nair",
    email: "priya@gmail.com",
    job: "AI/ML Engineer",
    score: 88,
    status: "Under Review",
    initials: "PN",
    appliedOn: "Sep 14, 2025",
    phone: "+1 (555) 345-6789",
    location: "Boston, MA",
    experience: "3.5 years",
    skills: ["Python", "PyTorch", "Hugging Face", "NLP", "FastAPI"],
    summary:
      "Machine Learning practitioner with deep focus on semantic search, embeddings, and NLP pipelines.",
  },
  {
    id: "app-3",
    name: "Rohit Singh",
    email: "rohit@gmail.com",
    job: "Backend Developer",
    score: 76,
    status: "Interview",
    initials: "RS",
    appliedOn: "Sep 13, 2025",
    phone: "+1 (555) 456-7890",
    location: "Austin, TX",
    experience: "5 years",
    skills: ["Node.js", "Go", "PostgreSQL", "Docker", "Redis"],
    summary:
      "Backend systems developer experienced in distributed systems, high concurrency, and database optimizations.",
  },
  {
    id: "app-4",
    name: "Sneha Kapoor",
    email: "sneha@gmail.com",
    job: "Product Designer",
    score: 68,
    status: "Applied",
    initials: "SK",
    appliedOn: "Sep 13, 2025",
    phone: "+1 (555) 567-8901",
    location: "San Francisco, CA",
    experience: "3 years",
    skills: ["Figma", "Design Systems", "User Research", "Prototyping"],
    summary:
      "Product designer crafting clean enterprise SaaS experiences and user-centric workflows.",
  },
  {
    id: "app-5",
    name: "Karan Verma",
    email: "karan@gmail.com",
    job: "DevOps Engineer",
    score: 64,
    status: "Under Review",
    initials: "KV",
    appliedOn: "Sep 12, 2025",
    phone: "+1 (555) 678-9012",
    location: "Seattle, WA",
    experience: "4 years",
    skills: ["Kubernetes", "Terraform", "AWS", "GitHub Actions", "Prometheus"],
    summary:
      "DevOps engineer passionate about automated CI/CD pipelines, cloud scalability, and reliability.",
  },
];

export interface PipelineStage {
  id: string;
  label: string;
  count: string;
  icon: IconComponent;
  bgClass: string;
  toneClass: string;
}

export const pipelineStagesData: PipelineStage[] = [
  {
    id: "stage-applied",
    label: "Applied",
    count: "118",
    icon: BarChart3,
    bgClass: "bg-surface-blue",
    toneClass: "text-brand-blue",
  },
  {
    id: "stage-screening",
    label: "Screening",
    count: "46",
    icon: FileSearch,
    bgClass: "bg-surface-purple",
    toneClass: "text-brand-purple",
  },
  {
    id: "stage-interview",
    label: "Interview",
    count: "24",
    icon: UserRound,
    bgClass: "bg-surface-peach",
    toneClass: "text-brand-orange",
  },
  {
    id: "stage-offered",
    label: "Offered",
    count: "8",
    icon: BriefcaseBusiness,
    bgClass: "bg-surface-green",
    toneClass: "text-brand-green",
  },
  {
    id: "stage-rejected",
    label: "Rejected",
    count: "32",
    icon: XCircle,
    bgClass: "bg-surface-pink",
    toneClass: "text-brand-red",
  },
];

export interface QuickActionItem {
  id: string;
  label: string;
  icon: IconComponent;
  href?: string;
  actionKey: "post-job" | "search-candidates" | "send-message" | "generate-report";
}

export const quickActionsData: QuickActionItem[] = [
  { id: "qa-post", label: "Post a Job", icon: Plus, href: "/jobs", actionKey: "post-job" },
  {
    id: "qa-search",
    label: "Search Candidates",
    icon: Search,
    href: "/candidates",
    actionKey: "search-candidates",
  },
  {
    id: "qa-message",
    label: "Send Message",
    icon: Mail,
    href: "/messages",
    actionKey: "send-message",
  },
  {
    id: "qa-report",
    label: "Generate Report",
    icon: BarChart3,
    href: "/reports",
    actionKey: "generate-report",
  },
];

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  unread: boolean;
  category: "application" | "interview" | "ai";
}

export const notificationsData: NotificationItem[] = [
  {
    id: "notif-1",
    title: "New application received",
    description: "Aarav Mehta applied for Frontend Developer role.",
    timeAgo: "10m ago",
    unread: true,
    category: "application",
  },
  {
    id: "notif-2",
    title: "Interview scheduled at 3:00 PM",
    description: "Technical Round 1 with Rohit Singh (Backend Developer).",
    timeAgo: "1h ago",
    unread: true,
    category: "interview",
  },
  {
    id: "notif-3",
    title: "AI candidate screening completed",
    description: "Batch ranking for 18 DevOps applicants ready for review.",
    timeAgo: "3h ago",
    unread: true,
    category: "ai",
  },
];

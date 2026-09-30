import type { SafeUser, ApplicantProfileResponse } from "@/server/types/user-types";
import type { User } from "@/auth/auth-types";
import type { IJob } from "@/server/types/job-types";

export interface ProfileCompletionResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  nextSuggestion: string;
  missingFields: string[];
}

export function calculateProfileCompletion(
  user: User | SafeUser | ApplicantProfileResponse | (SafeUser & { resume?: any }) | null | undefined,
): ProfileCompletionResult {
  if (!user) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 7,
      nextSuggestion: "Log in to track your profile",
      missingFields: ["Account"],
    };
  }

  const profile: any =
    (user as any).applicantProfile || (user as any);

  const checks = [
    {
      name: "Basic Info",
      completed: Boolean(user.name && user.email),
      suggestion: "Complete your basic contact info",
    },
    {
      name: "Professional Headline",
      completed: Boolean(profile.headline && profile.headline.trim().length > 0),
      suggestion: "Add a professional headline",
    },
    {
      name: "Location or Phone",
      completed: Boolean(
        (profile.location && profile.location.trim().length > 0) ||
        (profile.phone && profile.phone.trim().length > 0),
      ),
      suggestion: "Add your location & phone",
    },
    {
      name: "Summary / Bio",
      completed: Boolean(
        (profile.bio && profile.bio.trim().length > 0) ||
        (profile.summary && profile.summary.trim().length > 0),
      ),
      suggestion: "Add a professional summary",
    },
    {
      name: "Skills",
      completed: Boolean(profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0),
      suggestion: "Add skills to your profile",
    },
    {
      name: "Experience",
      completed: Boolean(
        (profile.experiences && Array.isArray(profile.experiences) && profile.experiences.length > 0) ||
        (profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0)
      ),
      suggestion: "Add your work experience",
    },
    {
      name: "Education",
      completed: Boolean(profile.education && Array.isArray(profile.education) && profile.education.length > 0),
      suggestion: "Add your education history",
    },
  ];

  const completedCount = checks.filter((c) => c.completed).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const firstMissing = checks.find((c) => !c.completed);
  const missingFields = checks.filter((c) => !c.completed).map((c) => c.name);

  const nextSuggestion = firstMissing
    ? `${firstMissing.suggestion} to hit 100%`
    : "Profile 100% complete!";

  return {
    percentage,
    completedCount,
    totalCount: checks.length,
    nextSuggestion,
    missingFields,
  };
}

export function formatApplicationDate(dateStr?: string): string {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 5) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface JobMatchResult {
  matchScore: number;
  matchedSkills: string[];
  explanation: string;
  isAvailable: boolean;
}

export function calculateJobMatch(job: IJob, userSkills: string[] = []): JobMatchResult {
  const normalizedUserSkills = userSkills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  
  // Collect all job skill keywords
  const jobSkillPool: string[] = [];
  if (Array.isArray(job.skills)) {
    jobSkillPool.push(...job.skills);
  }
  if (job.title) {
    jobSkillPool.push(...job.title.split(/[\s,/]+/));
  }
  if (job.description) {
    jobSkillPool.push(...job.description.split(/[\s,./()]+/));
  }

  const normalizedJobPool = jobSkillPool.map((s) => s.trim().toLowerCase()).filter(Boolean);

  // Find overlapping skills
  const matchedSkills = userSkills.filter((userSkill) => {
    const u = userSkill.trim().toLowerCase();
    if (!u) return false;
    return normalizedJobPool.some((target) => target.includes(u) || u.includes(target));
  });

  if (normalizedUserSkills.length === 0) {
    return {
      matchScore: 0,
      matchedSkills: [],
      explanation: "Add skills to profile for AI match",
      isAvailable: false,
    };
  }

  if (matchedSkills.length === 0) {
    return {
      matchScore: 68,
      matchedSkills: [],
      explanation: `${job.department || "Open Role"} opportunity`,
      isAvailable: true,
    };
  }

  // Calculate realistic deterministic score based on matched skills count
  const ratio = matchedSkills.length / Math.max(1, Math.min(6, (job.skills?.length || 4)));
  const calculatedScore = Math.min(96, Math.max(72, Math.round(70 + ratio * 26)));

  const explanation =
    matchedSkills.length >= 2
      ? `${matchedSkills.slice(0, 3).join(" • ")}`
      : `${matchedSkills[0]} skill match`;

  return {
    matchScore: calculatedScore,
    matchedSkills,
    explanation,
    isAvailable: true,
  };
}

export const PIPELINE_STAGES = [
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEW", label: "Interview" },
  { id: "OFFERED", label: "Offer" },
] as const;

export function getStageStepIndex(stageOrStatus?: string): number {
  if (!stageOrStatus) return 0;
  const upper = stageOrStatus.toUpperCase().trim();
  switch (upper) {
    case "APPLIED":
      return 0;
    case "SCREENING":
    case "UNDER REVIEW":
    case "SHORTLISTED":
      return 1;
    case "INTERVIEW":
      return 2;
    case "OFFERED":
    case "OFFER":
    case "HIRED":
      return 3;
    case "REJECTED":
    case "WITHDRAWN":
      return -1;
    default:
      return 0;
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

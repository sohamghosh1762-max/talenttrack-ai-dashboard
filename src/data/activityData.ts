export type AuditCategory = "user" | "job" | "application" | "company" | "system" | "security";

export type AuditActionType =
  | "USER_STATUS_CHANGED"
  | "USER_ROLE_UPDATED"
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "JOB_CREATED"
  | "JOB_STATUS_CHANGED"
  | "APPLICATION_SUBMITTED"
  | "COMPANY_VERIFIED"
  | "SYSTEM_POLICY_UPDATED"
  | "SECURITY_ALERT";

export type AuditActorRole = "Admin" | "Recruiter" | "Applicant" | "System";

export interface AuditLogRecord {
  id: string;
  action: string;
  actionType: AuditActionType;
  actorName: string;
  actorRole: AuditActorRole;
  actorEmail?: string;
  targetName: string;
  targetType: "User" | "Job" | "Application" | "Company" | "System Settings";
  targetId: string;
  category: AuditCategory;
  status: "Success" | "Warning" | "Failure";
  timestamp: string;
  timeAgo: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditQueryParams {
  search?: string;
  action?: string;
  actor?: string;
  dateRange?: string;
  target?: string;
  page?: number;
  limit?: number;
}

export const initialAuditLogs: AuditLogRecord[] = [
  {
    id: "log-101",
    action: "User Status Suspended",
    actionType: "USER_STATUS_CHANGED",
    actorName: "Sarah Jenkins",
    actorRole: "Admin",
    actorEmail: "sarah.j@talenttrack.ai",
    targetName: "Rohan Kapoor",
    targetType: "User",
    targetId: "usr-06",
    category: "user",
    status: "Warning",
    timestamp: "2026-09-22T02:45:00Z",
    timeAgo: "15 minutes ago",
    description: "Administrator modified account status from Active to Suspended due to unverified recruiters limit.",
    details: {
      previousStatus: "Active",
      newStatus: "Suspended",
      reason: "Unverified recruiter seat compliance audit",
      adminIp: "192.168.1.12",
    },
    ipAddress: "192.168.1.12",
  },
  {
    id: "log-102",
    action: "New Job Listing Created",
    actionType: "JOB_CREATED",
    actorName: "Rahul Mehta",
    actorRole: "Recruiter",
    actorEmail: "rahul.m@techcorp.io",
    targetName: "Staff Software Engineer",
    targetType: "Job",
    targetId: "job-804",
    category: "job",
    status: "Success",
    timestamp: "2026-09-22T02:10:00Z",
    timeAgo: "50 minutes ago",
    description: "Recruiter posted a new job listing under Engineering department with AI screening enabled.",
    details: {
      jobTitle: "Staff Software Engineer",
      department: "Engineering",
      location: "San Francisco, CA (Hybrid)",
      aiScreeningEnabled: true,
      minMatchScore: 80,
    },
    ipAddress: "203.0.113.45",
  },
  {
    id: "log-103",
    action: "Candidate Application Submitted",
    actionType: "APPLICATION_SUBMITTED",
    actorName: "Aarav Shah",
    actorRole: "Applicant",
    actorEmail: "aarav.shah@devmail.com",
    targetName: "Senior Fullstack Developer",
    targetType: "Application",
    targetId: "app-302",
    category: "application",
    status: "Success",
    timestamp: "2026-09-22T01:30:00Z",
    timeAgo: "1 hour ago",
    description: "Applicant submitted resume vector and cover letter for Senior Fullstack Developer role.",
    details: {
      applicantId: "usr-02",
      resumeFileName: "aarav_shah_resume_2026.pdf",
      matchScore: 92,
    },
    ipAddress: "198.51.100.14",
  },
  {
    id: "log-104",
    action: "Company Verified",
    actionType: "COMPANY_VERIFIED",
    actorName: "Sarah Jenkins",
    actorRole: "Admin",
    actorEmail: "sarah.j@talenttrack.ai",
    targetName: "Enterprise Hire Inc.",
    targetType: "Company",
    targetId: "cmp-04",
    category: "company",
    status: "Success",
    timestamp: "2026-09-21T21:15:00Z",
    timeAgo: "5 hours ago",
    description: "Corporate domain 'enterprise-hire.com' verified and granted recruiter seat management access.",
    details: {
      companyName: "Enterprise Hire Inc.",
      verifiedDomain: "enterprise-hire.com",
      allocatedSeats: 15,
    },
    ipAddress: "192.168.1.12",
  },
  {
    id: "log-105",
    action: "AI Policy Updated",
    actionType: "SYSTEM_POLICY_UPDATED",
    actorName: "System Automated",
    actorRole: "System",
    actorEmail: "system@talenttrack.ai",
    targetName: "Resume Ranking Vector Engine",
    targetType: "System Settings",
    targetId: "sys-cfg-01",
    category: "system",
    status: "Success",
    timestamp: "2026-09-21T18:00:00Z",
    timeAgo: "8 hours ago",
    description: "Automated recalibration of NLP embedding model tolerance for candidate skill matching.",
    details: {
      modelName: "TalentTrack-Embedding-v3",
      confidenceThreshold: 0.85,
      biasAuditCheck: "Passed (0.00% skew)",
    },
    ipAddress: "127.0.0.1",
  },
  {
    id: "log-106",
    action: "Failed Login Attempt",
    actionType: "SECURITY_ALERT",
    actorName: "Unknown IP",
    actorRole: "Applicant",
    actorEmail: "admin@talenttrack.ai",
    targetName: "Platform Admin Auth Endpoint",
    targetType: "System Settings",
    targetId: "sec-log-99",
    category: "security",
    status: "Failure",
    timestamp: "2026-09-21T14:22:00Z",
    timeAgo: "12 hours ago",
    description: "Multiple failed authentication attempts detected from unauthorized IP range.",
    details: {
      attemptCount: 4,
      targetUsername: "admin@talenttrack.ai",
      actionTaken: "Rate-limited IP address for 15 minutes",
    },
    ipAddress: "198.51.100.89",
  },
  {
    id: "log-107",
    action: "User Account Activated",
    actionType: "USER_STATUS_CHANGED",
    actorName: "Sarah Jenkins",
    actorRole: "Admin",
    actorEmail: "sarah.j@talenttrack.ai",
    targetName: "Vikram Malhotra",
    targetType: "User",
    targetId: "usr-04",
    category: "user",
    status: "Success",
    timestamp: "2026-09-21T11:00:00Z",
    timeAgo: "15 hours ago",
    description: "Administrator approved pending recruiter account after domain verification.",
    details: {
      previousStatus: "Pending",
      newStatus: "Active",
      role: "Recruiter",
    },
    ipAddress: "192.168.1.12",
  },
  {
    id: "log-108",
    action: "Admin Login Authenticated",
    actionType: "USER_LOGIN",
    actorName: "Sarah Jenkins",
    actorRole: "Admin",
    actorEmail: "sarah.j@talenttrack.ai",
    targetName: "TalentTrack Control Panel",
    targetType: "System Settings",
    targetId: "auth-sess-01",
    category: "security",
    status: "Success",
    timestamp: "2026-09-21T09:00:00Z",
    timeAgo: "17 hours ago",
    description: "Administrator authenticated successfully via 2FA TOTP code.",
    details: {
      authMethod: "Password + TOTP 2FA",
      sessionDuration: "8 hours",
    },
    ipAddress: "192.168.1.12",
  },
  {
    id: "log-109",
    action: "Job Listing Archived",
    actionType: "JOB_STATUS_CHANGED",
    actorName: "Priya Nair",
    actorRole: "Recruiter",
    actorEmail: "priya@example.com",
    targetName: "Lead Product Designer",
    targetType: "Job",
    targetId: "job-702",
    category: "job",
    status: "Success",
    timestamp: "2026-09-20T16:40:00Z",
    timeAgo: "1 day ago",
    description: "Recruiter marked job listing as closed after candidate acceptance.",
    details: {
      totalApplicationsReceived: 42,
      hiredCandidateId: "usr-03",
    },
    ipAddress: "203.0.113.88",
  },
  {
    id: "log-110",
    action: "New User Registered",
    actionType: "USER_REGISTERED",
    actorName: "Ananya Sen",
    actorRole: "Applicant",
    actorEmail: "ananya.sen@devtalent.org",
    targetName: "Ananya Sen Account",
    targetType: "User",
    targetId: "usr-07",
    category: "user",
    status: "Success",
    timestamp: "2026-09-20T14:10:00Z",
    timeAgo: "1 day ago",
    description: "New candidate account registered and email verification link dispatched.",
    details: {
      role: "Applicant",
      emailVerified: true,
    },
    ipAddress: "198.51.100.22",
  },
  {
    id: "log-111",
    action: "Recruiter Role Escalated",
    actionType: "USER_ROLE_UPDATED",
    actorName: "Sarah Jenkins",
    actorRole: "Admin",
    actorEmail: "sarah.j@talenttrack.ai",
    targetName: "Vikram Malhotra",
    targetType: "User",
    targetId: "usr-04",
    category: "user",
    status: "Success",
    timestamp: "2026-09-19T10:00:00Z",
    timeAgo: "2 days ago",
    description: "Granted bulk candidate export privileges to corporate recruiter.",
    details: {
      permissionGranted: "EXPORT_CANDIDATE_DATA",
      approvedBy: "sarah.j@talenttrack.ai",
    },
    ipAddress: "192.168.1.12",
  },
  {
    id: "log-112",
    action: "System Backup Completed",
    actionType: "SYSTEM_POLICY_UPDATED",
    actorName: "System Automated",
    actorRole: "System",
    actorEmail: "system@talenttrack.ai",
    targetName: "Platform Snapshot Storage",
    targetType: "System Settings",
    targetId: "sys-bkp-44",
    category: "system",
    status: "Success",
    timestamp: "2026-09-18T00:00:00Z",
    timeAgo: "4 days ago",
    description: "Scheduled daily state snapshot archived to encrypted cloud storage.",
    details: {
      snapshotSize: "142 MB",
      integrityCheck: "SHA-256 Verified",
    },
    ipAddress: "127.0.0.1",
  },
];

/**
 * Filter utility function supporting Search, Action, Actor, Date Range, and Target filters.
 */
export function getFilteredAuditLogs(
  logs: AuditLogRecord[],
  params: AuditQueryParams,
): { filtered: AuditLogRecord[]; total: number } {
  let result = [...logs];

  // 1. Search Query Filter
  if (params.search && params.search.trim() !== "") {
    const q = params.search.toLowerCase().trim();
    result = result.filter(
      (item) =>
        item.action.toLowerCase().includes(q) ||
        item.actorName.toLowerCase().includes(q) ||
        (item.actorEmail && item.actorEmail.toLowerCase().includes(q)) ||
        item.targetName.toLowerCase().includes(q) ||
        item.targetId.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }

  // 2. Action Filter
  if (params.action && params.action !== "All") {
    const actFilter = params.action.toLowerCase();
    result = result.filter((item) => {
      if (actFilter === "status_change") return item.actionType === "USER_STATUS_CHANGED";
      if (actFilter === "role_update") return item.actionType === "USER_ROLE_UPDATED";
      if (actFilter === "job") return item.actionType === "JOB_CREATED" || item.actionType === "JOB_STATUS_CHANGED";
      if (actFilter === "application") return item.actionType === "APPLICATION_SUBMITTED";
      if (actFilter === "system") return item.actionType === "SYSTEM_POLICY_UPDATED";
      if (actFilter === "security") return item.actionType === "SECURITY_ALERT" || item.actionType === "USER_LOGIN";
      return true;
    });
  }

  // 3. Actor Role Filter
  if (params.actor && params.actor !== "All") {
    const roleFilter = params.actor.toLowerCase();
    result = result.filter((item) => item.actorRole.toLowerCase() === roleFilter);
  }

  // 4. Target Entity Filter
  if (params.target && params.target !== "All") {
    const targetFilter = params.target.toLowerCase();
    result = result.filter((item) => item.targetType.toLowerCase().includes(targetFilter) || item.category.toLowerCase() === targetFilter);
  }

  // 5. Date Range Filter
  if (params.dateRange && params.dateRange !== "All Time") {
    const now = new Date("2026-09-22T03:00:00Z").getTime();
    const daysMap: Record<string, number> = {
      Today: 1,
      "7 Days": 7,
      "30 Days": 30,
      "3 Months": 90,
    };
    const days = daysMap[params.dateRange];
    if (days) {
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      result = result.filter((item) => new Date(item.timestamp).getTime() >= cutoff);
    }
  }

  return {
    filtered: result,
    total: result.length,
  };
}

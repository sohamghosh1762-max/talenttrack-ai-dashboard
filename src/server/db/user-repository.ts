import type {
  IUser,
  SafeUser,
  UserQueryParams,
  PaginatedUsersResponse,
  UserStatus,
  UserSummaryStats,
  BulkUpdateStatusResult,
  UserActivityItem,
} from "../types/user-types.ts";
import { auditService } from "../services/audit-service.ts";

// Standard 24-character hexadecimal MongoDB ObjectId validator
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Convert full internal user entity to safe external user (exclude passwordHash)
export function toSafeUser(user: IUser): SafeUser {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

// Pre-seeded database records with genuine 24-hex MongoDB ObjectIds
const DEFAULT_SEED_USERS: IUser[] = [
  // Administrators (Multiple to allow test cases for multi-admin vs sole active admin)
  {
    id: "65f1a2b3c4d5e6f7a8b9c001",
    name: "Platform Administrator",
    email: "admin@talenttrack.ai",
    passwordHash: "password123",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-01-01T08:00:00.000Z",
    updatedAt: "2025-01-01T08:00:00.000Z",
    lastActive: "2026-09-20T08:00:00.000Z",
    adminProfile: {
      platformRole: "Super Administrator",
      permissions: ["all"],
      lastLogin: "2026-09-20T08:00:00.000Z",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c002",
    name: "Elena Rostova",
    email: "elena.admin@talenttrack.ai",
    passwordHash: "password123",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
    lastActive: "2026-09-18T14:30:00.000Z",
    adminProfile: {
      platformRole: "Security & Compliance Admin",
      permissions: ["user_management", "audit_logs", "compliance"],
      lastLogin: "2026-09-18T14:30:00.000Z",
    },
  },
  // Recruiters
  {
    id: "65f1a2b3c4d5e6f7a8b9c003",
    name: "Rahul Mehta",
    email: "rahul.mehta@talenttrack.ai",
    passwordHash: "password123",
    role: "RECRUITER",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-02-01T09:30:00.000Z",
    updatedAt: "2025-02-01T09:30:00.000Z",
    lastActive: "2026-09-19T16:15:00.000Z",
    recruiterProfile: {
      companyName: "TalentTrack Technologies",
      jobTitle: "Principal Talent Acquisition Lead",
      department: "Global Engineering Recruitment",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c004",
    name: "Sarah Jenkins",
    email: "sarah.j@stripe-recruit.com",
    passwordHash: "password123",
    role: "RECRUITER",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-02-14T11:20:00.000Z",
    updatedAt: "2025-02-14T11:20:00.000Z",
    lastActive: "2026-09-15T12:00:00.000Z",
    recruiterProfile: {
      companyName: "Stripe",
      jobTitle: "Senior Technical Recruiter",
      department: "Infrastructure & Platform Hiring",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c005",
    name: "David Kim",
    email: "david.kim@databricks-partners.com",
    passwordHash: "password123",
    role: "RECRUITER",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-03-01T08:45:00.000Z",
    updatedAt: "2025-03-01T08:45:00.000Z",
    lastActive: "2026-09-18T10:00:00.000Z",
    recruiterProfile: {
      companyName: "Databricks",
      jobTitle: "Lead Recruiter",
      department: "AI & ML Core Systems",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c006",
    name: "Claire Dupont",
    email: "claire.dupont@scale-talent.io",
    passwordHash: "password123",
    role: "RECRUITER",
    status: "SUSPENDED",
    emailVerified: true,
    createdAt: "2025-03-10T14:10:00.000Z",
    updatedAt: "2025-08-20T11:00:00.000Z",
    lastActive: "2025-08-19T17:40:00.000Z",
    recruiterProfile: {
      companyName: "Scale AI",
      jobTitle: "Contract Recruiter",
      department: "Data Operations",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c007",
    name: "Marcus Vance",
    email: "marcus.v@fintechhiring.net",
    passwordHash: "password123",
    role: "RECRUITER",
    status: "INACTIVE",
    emailVerified: false,
    createdAt: "2025-04-05T13:00:00.000Z",
    updatedAt: "2025-04-05T13:00:00.000Z",
    lastActive: "2025-04-06T09:00:00.000Z",
    recruiterProfile: {
      companyName: "Vance Talent Agency",
      jobTitle: "Managing Partner",
      department: "Executive Search",
    },
  },
  // Applicants
  {
    id: "65f1a2b3c4d5e6f7a8b9c008",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-04-12T15:20:00.000Z",
    updatedAt: "2025-04-12T15:20:00.000Z",
    lastActive: "2026-09-20T07:15:00.000Z",
    applicantProfile: {
      headline: "Senior Frontend Engineer | React, TypeScript & Next.js",
      location: "San Jose, CA",
      phone: "+1 (555) 234-5678",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
      experienceYears: "5 years",
      resumeFileName: "Aarav_Mehta_Resume_2026.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c009",
    name: "Sophia Chen",
    email: "sophia.chen@example.org",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-04-18T16:00:00.000Z",
    updatedAt: "2025-04-18T16:00:00.000Z",
    lastActive: "2026-09-19T18:40:00.000Z",
    applicantProfile: {
      headline: "Machine Learning Engineer | PyTorch, NLP & LLMs",
      location: "San Francisco, CA",
      phone: "+1 (555) 345-6789",
      skills: ["Python", "PyTorch", "Hugging Face", "FastAPI", "Vector Search"],
      experienceYears: "4 years",
      resumeFileName: "Sophia_Chen_ML_CV.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c010",
    name: "Lucas Althaus",
    email: "lucas.althaus@example.de",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-05-02T10:15:00.000Z",
    updatedAt: "2025-05-02T10:15:00.000Z",
    lastActive: "2026-09-17T11:20:00.000Z",
    applicantProfile: {
      headline: "Distributed Systems & Backend Lead | Go, Kubernetes, Kafka",
      location: "Berlin, Germany (Remote)",
      phone: "+49 30 901820",
      skills: ["Go", "Kubernetes", "gRPC", "Kafka", "PostgreSQL", "Docker"],
      experienceYears: "7 years",
      resumeFileName: "Lucas_Althaus_Backend_Resume.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c011",
    name: "Maya Patel",
    email: "maya.patel@example.com",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: false,
    createdAt: "2025-05-15T14:30:00.000Z",
    updatedAt: "2025-05-15T14:30:00.000Z",
    lastActive: "2026-09-14T09:10:00.000Z",
    applicantProfile: {
      headline: "Product Designer & UX Researcher",
      location: "Austin, TX",
      phone: "+1 (555) 456-7890",
      skills: ["Figma", "Design Systems", "User Research", "Prototyping"],
      experienceYears: "3 years",
      resumeFileName: "Maya_Patel_Portfolio_Resume.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c012",
    name: "Daniel Santos",
    email: "daniel.santos@example.com",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "SUSPENDED",
    emailVerified: true,
    createdAt: "2025-06-01T12:00:00.000Z",
    updatedAt: "2025-09-01T14:00:00.000Z",
    lastActive: "2025-08-30T10:00:00.000Z",
    applicantProfile: {
      headline: "Full Stack Engineer | Node.js & React",
      location: "Toronto, ON",
      phone: "+1 (416) 555-0199",
      skills: ["Node.js", "Express", "TypeScript", "React", "MongoDB"],
      experienceYears: "3 years",
      resumeFileName: "Daniel_Santos_CV.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c013",
    name: "Amira Zahra",
    email: "amira.zahra@example.io",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "INACTIVE",
    emailVerified: false,
    createdAt: "2025-06-20T17:45:00.000Z",
    updatedAt: "2025-07-10T10:00:00.000Z",
    lastActive: "2025-07-05T12:00:00.000Z",
    applicantProfile: {
      headline: "DevOps & Cloud Infrastructure Specialist",
      location: "London, UK",
      phone: "+44 20 7946 0912",
      skills: ["AWS", "Terraform", "CI/CD", "Linux", "Docker"],
      experienceYears: "6 years",
      resumeFileName: "Amira_Zahra_DevOps.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c014",
    name: "Nathaniel Cole",
    email: "nathaniel.cole@example.com",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-07-04T08:00:00.000Z",
    updatedAt: "2025-07-04T08:00:00.000Z",
    lastActive: "2026-09-18T16:00:00.000Z",
    applicantProfile: {
      headline: "Site Reliability Engineer | Observability & Chaos Eng",
      location: "Seattle, WA",
      phone: "+1 (555) 678-9012",
      skills: ["Prometheus", "Grafana", "Go", "Kubernetes", "Python"],
      experienceYears: "5 years",
      resumeFileName: "Nathaniel_Cole_SRE.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c015",
    name: "Jessica Taylor",
    email: "jessica.taylor@example.com",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-07-18T11:30:00.000Z",
    updatedAt: "2025-07-18T11:30:00.000Z",
    lastActive: "2026-09-19T14:15:00.000Z",
    applicantProfile: {
      headline: "Data Platform Engineer | Apache Spark, Snowflake, dbt",
      location: "New York, NY",
      phone: "+1 (555) 789-0123",
      skills: ["Python", "SQL", "Apache Spark", "Snowflake", "dbt"],
      experienceYears: "4 years",
      resumeFileName: "Jessica_Taylor_Data.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c016",
    name: "Vikram Singhania",
    email: "vikram.singh@example.co.in",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-08-01T09:00:00.000Z",
    updatedAt: "2025-08-01T09:00:00.000Z",
    lastActive: "2026-09-20T06:30:00.000Z",
    applicantProfile: {
      headline: "Senior Security Engineer | Cloud Sec, AppSec & Cryptography",
      location: "Bengaluru, India",
      phone: "+91 80 2345 6789",
      skills: ["AppSec", "OAuth2", "Cryptography", "Go", "CloudTrail"],
      experienceYears: "8 years",
      resumeFileName: "Vikram_Singhania_SecEng.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c017",
    name: "Chloe Martin",
    email: "chloe.martin@example.fr",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: false,
    createdAt: "2025-08-15T13:45:00.000Z",
    updatedAt: "2025-08-15T13:45:00.000Z",
    lastActive: "2026-09-16T15:20:00.000Z",
    applicantProfile: {
      headline: "Mobile Engineer | iOS, Swift & SwiftUI",
      location: "Paris, France",
      phone: "+33 1 42 68 55 00",
      skills: ["Swift", "SwiftUI", "Combine", "CoreData", "Git"],
      experienceYears: "3 years",
      resumeFileName: "Chloe_Martin_iOS.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c018",
    name: "Ethan Wright",
    email: "ethan.wright@example.com",
    passwordHash: "password123",
    role: "APPLICANT",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-09-01T10:00:00.000Z",
    updatedAt: "2025-09-01T10:00:00.000Z",
    lastActive: "2026-09-19T11:45:00.000Z",
    applicantProfile: {
      headline: "Quality Assurance & Test Automation Engineer | Playwright, Cypress",
      location: "Chicago, IL",
      phone: "+1 (312) 555-0144",
      skills: ["Playwright", "Cypress", "Jest", "TypeScript", "CI/CD"],
      experienceYears: "4 years",
      resumeFileName: "Ethan_Wright_QA.pdf",
    },
  },
];

class UserRepository {
  private users: Map<string, IUser> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  /**
   * Reset database to initial seed dataset (useful for testing)
   */
  public resetToDefaults(): void {
    this.users.clear();
    for (const u of DEFAULT_SEED_USERS) {
      // Store clone to prevent mutations
      this.users.set(u.id, JSON.parse(JSON.stringify(u)));
    }
  }

  /**
   * Query users with search, role/status/verification/date filtering, custom sorting, and pagination
   */
  public findAll(params: UserQueryParams = {}): PaginatedUsersResponse {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const search = params.search ? params.search.trim().toLowerCase() : "";
    const roleFilter = params.role ? (params.role.toUpperCase() as IUser["role"]) : undefined;
    const statusFilter = params.status
      ? (params.status.toUpperCase() as IUser["status"])
      : undefined;
    const emailVerifiedFilter =
      typeof params.emailVerified === "boolean" ? params.emailVerified : undefined;

    const dateFrom = params.dateFrom ? new Date(params.dateFrom).getTime() : undefined;
    const dateTo = params.dateTo
      ? new Date(
          params.dateTo.includes("T") ? params.dateTo : `${params.dateTo}T23:59:59.999Z`,
        ).getTime()
      : undefined;

    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || (sortBy === "createdAt" ? "desc" : "asc");

    // Convert to list for filtering
    const allUsers = Array.from(this.users.values());

    // Calculate summary metrics across all users
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const summary: UserSummaryStats = {
      totalUsers: allUsers.length,
      admins: allUsers.filter((u) => u.role === "ADMIN").length,
      recruiters: allUsers.filter((u) => u.role === "RECRUITER").length,
      applicants: allUsers.filter((u) => u.role === "APPLICANT").length,
      suspended: allUsers.filter((u) => u.status === "SUSPENDED").length,
      active: allUsers.filter((u) => u.status === "ACTIVE").length,
      inactive: allUsers.filter((u) => u.status === "INACTIVE").length,
      verified: allUsers.filter((u) => u.emailVerified).length,
      unverified: allUsers.filter((u) => !u.emailVerified).length,
      newThisMonth: allUsers.filter((u) => {
        const d = new Date(u.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length,
    };

    // Filter matching criteria
    const filtered = allUsers.filter((u) => {
      // Search by name or email
      if (search) {
        const matchesName = u.name.toLowerCase().includes(search);
        const matchesEmail = u.email.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail) {
          return false;
        }
      }

      // Filter by role
      if (roleFilter && u.role !== roleFilter) {
        return false;
      }

      // Filter by status
      if (statusFilter && u.status !== statusFilter) {
        return false;
      }

      // Filter by email verification
      if (emailVerifiedFilter !== undefined && u.emailVerified !== emailVerifiedFilter) {
        return false;
      }

      // Filter by date range (createdAt)
      if (dateFrom !== undefined && !isNaN(dateFrom)) {
        const createdTime = new Date(u.createdAt).getTime();
        if (createdTime < dateFrom) return false;
      }

      if (dateTo !== undefined && !isNaN(dateTo)) {
        const createdTime = new Date(u.createdAt).getTime();
        if (createdTime > dateTo) return false;
      }

      return true;
    });

    // Sort by requested column
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "email") {
        comparison = a.email.localeCompare(b.email);
      } else if (sortBy === "role") {
        comparison = a.role.localeCompare(b.role);
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      } else {
        // Default createdAt
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const skip = (page - 1) * limit;
    const paginatedSlice = filtered.slice(skip, skip + limit);

    // Project safe user objects (strip passwordHash)
    const safeUsers = paginatedSlice.map((u) => toSafeUser(u));

    return {
      users: safeUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary,
    };
  }

  /**
   * Find safe user by ID
   */
  public findById(id: string): SafeUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    return toSafeUser(user);
  }

  /**
   * Internal find by ID with passwordHash
   */
  public findFullUserById(id: string): IUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    return { ...user };
  }

  /**
   * Find user by email
   */
  public findByEmail(email: string): IUser | null {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return { ...u };
      }
    }
    return null;
  }

  /**
   * Count active administrators
   */
  public countActiveAdmins(): number {
    let count = 0;
    for (const u of this.users.values()) {
      if (u.role === "ADMIN" && u.status === "ACTIVE") {
        count++;
      }
    }
    return count;
  }

  /**
   * Update user status with active administrator safeguard
   */
  public updateStatus(
    id: string,
    newStatus: UserStatus,
    _adminId?: string,
  ): { user: SafeUser; previousStatus: UserStatus } {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    const previousStatus = user.status;

    // Safeguard: do not allow deactivating or suspending the only active admin account
    if (user.role === "ADMIN" && user.status === "ACTIVE" && newStatus !== "ACTIVE") {
      const activeAdmins = this.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new Error("Cannot deactivate or suspend the only active administrator account.");
      }
    }

    // Apply update
    user.status = newStatus;
    user.updatedAt = new Date().toISOString();

    return {
      user: toSafeUser(user),
      previousStatus,
    };
  }

  /**
   * Bulk update status for multiple users with admin safeguards & audit logging
   */
  public bulkUpdateStatus(
    userIds: string[],
    newStatus: UserStatus,
    adminId: string = "system_admin",
  ): BulkUpdateStatusResult {
    let updatedCount = 0;
    let failedCount = 0;
    const failedUserIds: string[] = [];

    // Deduplicate target IDs
    const uniqueIds = Array.from(new Set(userIds));

    // First check: check if any active admins in the batch are being changed to non-active
    const activeAdminsTargeted = uniqueIds.filter((id) => {
      const u = this.users.get(id);
      return u && u.role === "ADMIN" && u.status === "ACTIVE" && newStatus !== "ACTIVE";
    });

    if (activeAdminsTargeted.length > 0) {
      const totalActiveAdmins = this.countActiveAdmins();
      // If updating all targeted active admins leaves fewer than 1 active admin overall
      if (totalActiveAdmins - activeAdminsTargeted.length < 1) {
        // Protect sole active admin account(s)
        const currentActiveAdmins = Array.from(this.users.values()).filter(
          (u) => u.role === "ADMIN" && u.status === "ACTIVE",
        );
        // If there's only 1 active admin total, do not change that single active admin
        // Mark active admins that cannot be changed as failed
        const remainingAllowed = totalActiveAdmins - 1;
        let adminSkipCount = 0;

        for (let i = 0; i < uniqueIds.length; i++) {
          const id = uniqueIds[i]!;
          const u = this.users.get(id);

          if (!u) {
            failedCount++;
            failedUserIds.push(id);
            continue;
          }

          if (u.role === "ADMIN" && u.status === "ACTIVE" && newStatus !== "ACTIVE") {
            if (adminSkipCount >= remainingAllowed) {
              failedCount++;
              failedUserIds.push(id);
              continue;
            }
            adminSkipCount++;
          }

          const previousStatus = u.status;
          u.status = newStatus;
          u.updatedAt = new Date().toISOString();
          updatedCount++;

          auditService.recordStatusChange({
            adminId,
            targetUserId: id,
            previousStatus,
            newStatus,
            metadata: { batchUpdate: true, batchSize: uniqueIds.length },
          });
        }

        return {
          updatedCount,
          failedCount,
          failedUserIds,
          message:
            failedCount > 0
              ? `Updated ${updatedCount} users. ${failedCount} user(s) failed or skipped to preserve sole active administrator.`
              : `Successfully updated ${updatedCount} users to ${newStatus}.`,
        };
      }
    }

    // Normal processing without breaking sole admin rule
    for (const id of uniqueIds) {
      const u = this.users.get(id);
      if (!u) {
        failedCount++;
        failedUserIds.push(id);
        continue;
      }

      const previousStatus = u.status;
      u.status = newStatus;
      u.updatedAt = new Date().toISOString();
      updatedCount++;

      auditService.recordStatusChange({
        adminId,
        targetUserId: id,
        previousStatus,
        newStatus,
        metadata: { batchUpdate: true, batchSize: uniqueIds.length },
      });
    }

    return {
      updatedCount,
      failedCount,
      failedUserIds,
      message:
        failedCount > 0
          ? `Updated ${updatedCount} users (${failedCount} failed).`
          : `Successfully updated ${updatedCount} users to ${newStatus}.`,
    };
  }

  /**
   * Retrieve formatted activity log history for a user
   */
  public getUserActivity(userId: string): UserActivityItem[] {
    const rawLogs = auditService.getLogsForUser(userId);
    const targetUser = this.users.get(userId);

    const activities: UserActivityItem[] = rawLogs.map((log) => ({
      id: log.id,
      action: `Status changed from ${log.previousStatus} to ${log.newStatus}`,
      targetId: log.targetUserId,
      performedBy: log.adminId,
      performedByRole: "ADMIN",
      details: {
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        ...(log.metadata || {}),
      },
      timestamp: log.timestamp,
    }));

    // If user has createdAt, add Account Created baseline event
    if (targetUser) {
      activities.push({
        id: `activity_created_${targetUser.id}`,
        action: "Account registered",
        targetId: targetUser.id,
        performedBy: targetUser.id,
        performedByRole: targetUser.role,
        details: { role: targetUser.role, email: targetUser.email },
        timestamp: targetUser.createdAt,
      });
    }

    // Sort newest activity first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();

import crypto from "node:crypto";
import { User, type IUserDocument } from "../models/User.ts";
import { Recruiter } from "../models/Recruiter.ts";
import { Applicant } from "../models/Applicant.ts";
import { isDatabaseConnected, ensureDatabaseConnected } from "./mongodb.ts";
import { hashPassword } from "../auth/password.ts";
import type {
  IUser,
  SafeUser,
  CreateUserInput,
  UpdateUserInput,
  UserQueryParams,
  PaginatedUsersResponse,
  UserStatus,
  UserRole,
  RecruiterProfileInfo,
  ApplicantProfileInfo,
  AdminProfileInfo,
  UserSummaryStats,
  BulkUpdateStatusResult,
  UserActivityItem,
  UpdateApplicantProfileInput,
  AdminApplicantQueryParams,
  AdminApplicantItem,
  AdminApplicantSummaryStats,
  PaginatedAdminApplicantsResponse,
} from "../types/user-types.ts";
import type { IParsedResumeProfile } from "../types/resume-types.ts";
import { auditService } from "../services/audit-service.ts";

// Standard 24-character hexadecimal MongoDB ObjectId validator
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Generate valid 24-character hexadecimal MongoDB ObjectId
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const random = crypto.randomBytes(8).toString("hex");
  return `${timestamp}${random}`;
}

// Convert full internal user entity to safe external user (exclude passwordHash)
export function toSafeUser(user: IUser): SafeUser {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

// Convert Mongoose User document to internal IUser entity
export function docToUser(doc: any): IUser {
  const obj = doc.toObject ? doc.toObject() : doc;
  const idStr = doc._id ? doc._id.toString() : obj.id || doc.id;
  return {
    id: String(idStr),
    name: obj.name,
    email: (obj.email || "").toLowerCase().trim(),
    passwordHash: obj.passwordHash,
    role: obj.role,
    status: obj.status || "ACTIVE",
    emailVerified: obj.emailVerified ?? false,
    emailVerifiedAt: obj.emailVerifiedAt,
    avatarUrl: obj.avatarUrl,
    failedLoginAttempts: obj.failedLoginAttempts ?? 0,
    lockedUntil: obj.lockedUntil ?? null,
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
    lastActive:
      obj.lastActive || (obj.updatedAt ? new Date(obj.updatedAt).toISOString() : undefined),
    recruiterProfile: obj.recruiterProfile,
    applicantProfile: obj.applicantProfile,
    adminProfile: obj.adminProfile,
    organizationId: obj.organizationId,
    departmentId: obj.departmentId,
    organizationName: obj.organizationName,
    departmentName: obj.departmentName,
    firebaseUid: obj.firebaseUid,
  };
}

// Pre-seeded database records with genuine 24-hex MongoDB ObjectIds
export const DEFAULT_SEED_USERS: IUser[] = [
  // Administrators
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
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
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
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
    adminProfile: {
      platformRole: "Security & Compliance Admin",
      permissions: ["user_management", "audit_logs", "compliance"],
      lastLogin: "2026-09-18T14:30:00.000Z",
    },
  },
  // Hiring Managers
  {
    id: "65f1a2b3c4d5e6f7a8b9c020",
    name: "Sarah Chen",
    email: "manager@talenttrack.ai",
    passwordHash: "password123",
    role: "HIRING_MANAGER",
    status: "ACTIVE",
    emailVerified: true,
    createdAt: "2025-02-01T09:30:00.000Z",
    updatedAt: "2025-02-01T09:30:00.000Z",
    lastActive: "2026-09-20T10:00:00.000Z",
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
    departmentId: "dept-1",
    departmentName: "Engineering",
    recruiterProfile: {
      companyName: "TalentTrack Technologies",
      jobTitle: "VP of Engineering",
      department: "Core Engineering",
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
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
    departmentId: "dept-3",
    departmentName: "Talent Acquisition",
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
    organizationId: "org-2",
    organizationName: "CloudScale Systems",
    departmentId: "dept-7",
    departmentName: "Recruitment",
    recruiterProfile: {
      companyName: "CloudScale Systems",
      jobTitle: "Senior Technical Recruiter",
      department: "Recruitment",
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

export const DEFAULT_SEED_EMAILS = new Set(DEFAULT_SEED_USERS.map((u) => u.email.toLowerCase()));

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
   * Get all raw user entities
   */
  public getAllRawUsers(): IUser[] {
    return Array.from(this.users.values()).map((u) => JSON.parse(JSON.stringify(u)));
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

      // Filter by organization (tenant isolation)
      if (params.organizationId && u.organizationId !== params.organizationId) {
        return false;
      }

      // Filter by department
      if (params.departmentId && u.departmentId !== params.departmentId) {
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
   * Query applicants with search, status/verification/skill/location/date filtering, custom sorting, and pagination
   */
  public findApplicants(params: AdminApplicantQueryParams = {}): PaginatedAdminApplicantsResponse {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const search = params.search ? params.search.trim().toLowerCase() : "";
    const statusFilter = params.status
      ? (params.status.toUpperCase() as IUser["status"])
      : undefined;
    const emailVerifiedFilter =
      typeof params.emailVerified === "boolean" ? params.emailVerified : undefined;
    const skillFilter = params.skills ? params.skills.trim().toLowerCase() : undefined;
    const locationFilter = params.location ? params.location.trim().toLowerCase() : undefined;

    const dateFrom = params.dateFrom ? new Date(params.dateFrom).getTime() : undefined;
    const dateTo = params.dateTo
      ? new Date(
          params.dateTo.includes("T") ? params.dateTo : `${params.dateTo}T23:59:59.999Z`,
        ).getTime()
      : undefined;

    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || (sortBy === "createdAt" ? "desc" : "asc");

    // All registered users with role APPLICANT
    const allApplicants = Array.from(this.users.values()).filter((u) => u.role === "APPLICANT");

    // Summary metrics across all applicants
    const summary: AdminApplicantSummaryStats = {
      totalApplicants: allApplicants.length,
      active: allApplicants.filter((u) => u.status === "ACTIVE").length,
      suspended: allApplicants.filter((u) => u.status === "SUSPENDED").length,
      inactive: allApplicants.filter((u) => u.status === "INACTIVE" || u.status === "DEACTIVATED")
        .length,
      verified: allApplicants.filter((u) => u.emailVerified).length,
      unverified: allApplicants.filter((u) => !u.emailVerified).length,
      withResume: allApplicants.filter(
        (u) => !!u.applicantProfile?.resumeId || !!u.applicantProfile?.resumeFileName,
      ).length,
    };

    // Filter matching criteria
    const filtered = allApplicants.filter((u) => {
      const profile = u.applicantProfile || {};
      const skills = profile.skills || [];

      // Search across name, email, headline, skills, location, summary, bio
      if (search) {
        const matchesName = u.name.toLowerCase().includes(search);
        const matchesEmail = u.email.toLowerCase().includes(search);
        const matchesHeadline = (profile.headline || "").toLowerCase().includes(search);
        const matchesLocation = (profile.location || "").toLowerCase().includes(search);
        const matchesSummary = (profile.summary || profile.bio || "")
          .toLowerCase()
          .includes(search);
        const matchesSkills = skills.some((s) => s.toLowerCase().includes(search));

        if (
          !matchesName &&
          !matchesEmail &&
          !matchesHeadline &&
          !matchesLocation &&
          !matchesSummary &&
          !matchesSkills
        ) {
          return false;
        }
      }

      // Filter by status
      if (statusFilter && u.status !== statusFilter) {
        return false;
      }

      // Filter by email verification
      if (emailVerifiedFilter !== undefined && u.emailVerified !== emailVerifiedFilter) {
        return false;
      }

      // Filter by skills
      if (skillFilter) {
        const hasSkill = skills.some((s) => s.toLowerCase().includes(skillFilter));
        if (!hasSkill) return false;
      }

      // Filter by location
      if (locationFilter) {
        const matchesLoc = (profile.location || "").toLowerCase().includes(locationFilter);
        if (!matchesLoc) return false;
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
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      } else if (sortBy === "headline") {
        const hA = a.applicantProfile?.headline || "";
        const hB = b.applicantProfile?.headline || "";
        comparison = hA.localeCompare(hB);
      } else if (sortBy === "lastActive") {
        const tA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const tB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        comparison = tA - tB;
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

    // Map to AdminApplicantItem (exclude passwordHash)
    const applicants: AdminApplicantItem[] = paginatedSlice.map((u) => {
      const p = u.applicantProfile || {};
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: "APPLICANT",
        status: u.status,
        emailVerified: u.emailVerified,
        emailVerifiedAt: u.emailVerifiedAt,
        avatarUrl: u.avatarUrl,
        headline: p.headline || "",
        location: p.location || "",
        phone: p.phone || "",
        summary: p.summary || p.bio || "",
        bio: p.bio || p.summary || "",
        skills: p.skills || [],
        experienceYears: p.experienceYears || "",
        experiences: p.experiences || [],
        education: p.education || [],
        certifications: p.certifications || [],
        projects: p.projects || [],
        applicantProfile: { ...p },
        resume:
          p.resumeFileName || p.resumeId
            ? {
                id: p.resumeId || `res_${u.id}`,
                fileName: p.resumeFileName || "resume.pdf",
                fileSize: 0,
                mimeType: "application/pdf",
                uploadedAt: u.createdAt,
                parsingStatus: "COMPLETED",
                atsScore: null,
              }
            : null,
        applicationsCount: 0,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastActive: u.lastActive,
      };
    });

    return {
      applicants,
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
   * Find user by Firebase UID
   */
  public findByFirebaseUid(firebaseUid: string): IUser | null {
    if (!firebaseUid) return null;
    for (const u of this.users.values()) {
      if (u.firebaseUid === firebaseUid) {
        return { ...u };
      }
    }
    return null;
  }

  /**
   * Async find full user by ID with MongoDB fallback and caching
   */
  public async findFullUserByIdAsync(id: string): Promise<IUser | null> {
    await ensureDatabaseConnected();

    if (isValidObjectId(id) && isDatabaseConnected()) {
      try {
        const doc = await User.findById(id).exec();
        if (doc) {
          const user = docToUser(doc);
          this.users.set(user.id, user);
          return user;
        }
        return null;
      } catch (err) {
        console.warn(`[UserRepository] MongoDB findFullUserByIdAsync error:`, err);
        if (process.env["NODE_ENV"] === "production") {
          return null;
        }
      }
    }
    return this.findFullUserById(id);
  }

  /**
   * Async find safe user by ID with MongoDB fallback and caching
   */
  public async findByIdAsync(id: string): Promise<SafeUser | null> {
    const full = await this.findFullUserByIdAsync(id);
    return full ? toSafeUser(full) : null;
  }

  /**
   * Async find user by email with MongoDB fallback and caching
   */
  public async findByEmailAsync(email: string): Promise<IUser | null> {
    const normalized = email.trim().toLowerCase();

    await ensureDatabaseConnected();

    if (isDatabaseConnected()) {
      try {
        const doc = await User.findOne({ email: normalized }).exec();
        if (doc) {
          const user = docToUser(doc);
          this.users.set(user.id, user);
          return user;
        }
        // When MongoDB is connected, it is strictly authoritative: non-existent records return null
        return null;
      } catch (err) {
        console.warn(`[UserRepository] MongoDB findByEmailAsync error:`, err);
        if (process.env["NODE_ENV"] === "production") {
          return null;
        }
      }
    }
    return this.findByEmail(normalized);
  }

  /**
   * Async find user by Firebase UID with MongoDB fallback and caching
   */
  public async findByFirebaseUidAsync(firebaseUid: string): Promise<IUser | null> {
    if (!firebaseUid) return null;
    const cached = this.findByFirebaseUid(firebaseUid);
    if (cached) return cached;

    if (isDatabaseConnected()) {
      try {
        const doc = await User.findOne({ firebaseUid }).exec();
        if (doc) {
          const user = docToUser(doc);
          this.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        console.warn(`[UserRepository] MongoDB findByFirebaseUidAsync error:`, err);
      }
    }
    return null;
  }

  /**
   * Link Firebase UID to existing user (and associated Applicant document if applicable)
   */
  public linkFirebaseUid(userId: string, firebaseUid: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.firebaseUid = firebaseUid;
    user.updatedAt = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, {
        $set: { firebaseUid, updatedAt: new Date() },
      }).catch(console.error);

      if (user.role === "APPLICANT") {
        Applicant.findOneAndUpdate(
          { userId },
          { $set: { firebaseUid, updatedAt: new Date() } },
        ).catch(console.error);
      }
    }

    return true;
  }

  /**
   * Create and persist a new Firebase-authenticated Applicant user
   */
  public createFirebaseApplicant(data: {
    firebaseUid: string;
    email: string;
    name?: string | undefined;
    phone?: string | undefined;
    emailVerified?: boolean | undefined;
    avatarUrl?: string | undefined;
    headline?: string | undefined;
    location?: string | undefined;
  }): IUser {
    const normalizedEmail = data.email.trim().toLowerCase();
    const id = generateObjectId();
    const now = new Date().toISOString();

    const applicantProfile: ApplicantProfileInfo = {
      headline: data.headline || "Applicant",
      location: data.location || "Remote",
      phone: data.phone || "",
      skills: [],
      experienceYears: "",
    };

    const newUser: IUser = {
      id,
      name: (data.name && data.name.trim()) || normalizedEmail.split("@")[0] || "Applicant",
      email: normalizedEmail,
      passwordHash: "FIREBASE_AUTH_MANAGED",
      firebaseUid: data.firebaseUid,
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: data.emailVerified ?? false,
      emailVerifiedAt: data.emailVerified ? now : undefined,
      avatarUrl: data.avatarUrl,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
      lastActive: now,
      applicantProfile,
    };

    if (isDatabaseConnected()) {
      User.create({
        _id: id,
        name: newUser.name,
        email: newUser.email,
        passwordHash: newUser.passwordHash,
        firebaseUid: newUser.firebaseUid,
        role: newUser.role,
        status: newUser.status,
        emailVerified: newUser.emailVerified,
        emailVerifiedAt: newUser.emailVerifiedAt,
        avatarUrl: newUser.avatarUrl,
        failedLoginAttempts: 0,
        lockedUntil: null,
        applicantProfile: newUser.applicantProfile,
      })
        .then(async (createdUserDoc) => {
          await Applicant.create({
            userId: createdUserDoc._id,
            firebaseUid: data.firebaseUid,
            headline: applicantProfile.headline,
            location: applicantProfile.location,
            phone: applicantProfile.phone,
            skills: [],
          } as any).catch(console.error);
        })
        .catch((err) => {
          console.error(`[MongoDB] Error saving Firebase user ${newUser.email}:`, err);
        });
    }

    this.users.set(id, newUser);
    return { ...newUser };
  }

  /**
   * Count active administrators
   */
  public countActiveAdmins(): number {
    let count = 0;
    for (const u of this.users.values()) {
      if ((u.role === "ADMIN" || u.role === "SUPER_ADMIN") && u.status === "ACTIVE") {
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
    if (
      (user.role === "ADMIN" || user.role === "SUPER_ADMIN") &&
      user.status === "ACTIVE" &&
      newStatus !== "ACTIVE"
    ) {
      const activeAdmins = this.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new Error("Cannot deactivate or suspend the only active administrator account.");
      }
    }

    // Apply update
    user.status = newStatus;
    user.updatedAt = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      User.findByIdAndUpdate(id, { $set: { status: newStatus, updatedAt: new Date() } }).catch(
        (err) => {
          console.error(`[MongoDB] Error updating status for user ${id}:`, err);
        },
      );
    }

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
      return (
        u &&
        (u.role === "ADMIN" || u.role === "SUPER_ADMIN") &&
        u.status === "ACTIVE" &&
        newStatus !== "ACTIVE"
      );
    });

    if (activeAdminsTargeted.length > 0) {
      const totalActiveAdmins = this.countActiveAdmins();
      // If updating all targeted active admins leaves fewer than 1 active admin overall
      if (totalActiveAdmins - activeAdminsTargeted.length < 1) {
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

          if (
            (u.role === "ADMIN" || u.role === "SUPER_ADMIN") &&
            u.status === "ACTIVE" &&
            newStatus !== "ACTIVE"
          ) {
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

          if (isDatabaseConnected() && isValidObjectId(id)) {
            User.findByIdAndUpdate(id, {
              $set: { status: newStatus, updatedAt: new Date() },
            }).catch(console.error);
          }

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

      if (isDatabaseConnected() && isValidObjectId(id)) {
        User.findByIdAndUpdate(id, { $set: { status: newStatus, updatedAt: new Date() } }).catch(
          console.error,
        );
      }

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

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities;
  }

  /**
   * Create and persist a new user entity
   */
  public createUser(userData: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    organizationId?: string;
    departmentId?: string;
    organizationName?: string;
    departmentName?: string;
    recruiterProfile?: RecruiterProfileInfo;
    applicantProfile?: ApplicantProfileInfo;
    adminProfile?: AdminProfileInfo;
  }): IUser {
    const normalizedEmail = userData.email.trim().toLowerCase();
    const existing = this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    const id = generateObjectId();
    const now = new Date().toISOString();
    const newUser: IUser = {
      id,
      name: userData.name.trim(),
      email: normalizedEmail,
      passwordHash: userData.passwordHash,
      role: userData.role,
      status: userData.status || "ACTIVE",
      emailVerified: userData.emailVerified ?? false,
      emailVerifiedAt: userData.emailVerified ? now : undefined,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
      lastActive: now,
      organizationId: (userData as any).organizationId || undefined,
      departmentId: (userData as any).departmentId || undefined,
      organizationName: (userData as any).organizationName || undefined,
      departmentName: (userData as any).departmentName || undefined,
      ...(userData.recruiterProfile ? { recruiterProfile: userData.recruiterProfile } : {}),
      ...(userData.applicantProfile ? { applicantProfile: userData.applicantProfile } : {}),
      ...(userData.adminProfile ? { adminProfile: userData.adminProfile } : {}),
    };

    if (isDatabaseConnected()) {
      User.create({
        _id: id,
        name: newUser.name,
        email: newUser.email,
        passwordHash: newUser.passwordHash,
        role: newUser.role,
        status: newUser.status,
        emailVerified: newUser.emailVerified,
        emailVerifiedAt: newUser.emailVerifiedAt,
        failedLoginAttempts: 0,
        lockedUntil: null,
        recruiterProfile: newUser.recruiterProfile,
        applicantProfile: newUser.applicantProfile,
        adminProfile: newUser.adminProfile,
      })
        .then(async (createdUserDoc) => {
          if (newUser.role === "RECRUITER" && newUser.recruiterProfile) {
            await Recruiter.create({
              userId: createdUserDoc._id,
              companyName: newUser.recruiterProfile.companyName,
              designation: newUser.recruiterProfile.jobTitle,
              department: newUser.recruiterProfile.department || "Talent Acquisition",
            } as any).catch(console.error);
          } else if (newUser.role === "APPLICANT" && newUser.applicantProfile) {
            await Applicant.create({
              userId: createdUserDoc._id,
              headline: newUser.applicantProfile.headline,
              location: newUser.applicantProfile.location,
              phone: newUser.applicantProfile.phone,
              skills: newUser.applicantProfile.skills || [],
              experience: newUser.applicantProfile.experienceYears,
              resume: newUser.applicantProfile.resumeFileName,
            } as any).catch(console.error);
          }
        })
        .catch((err) => {
          console.error(`[MongoDB] Error saving user ${newUser.email}:`, err);
        });
    }

    this.users.set(id, newUser);
    return { ...newUser };
  }

  public updateUser(id: string, updateData: UpdateUserInput, actorId?: string): SafeUser {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    if (updateData.email && updateData.email.trim().toLowerCase() !== user.email) {
      const normalizedNewEmail = updateData.email.trim().toLowerCase();
      const existing = this.findByEmail(normalizedNewEmail);
      if (existing && existing.id !== id) {
        throw new Error("An account with this email address already exists.");
      }
      user.email = normalizedNewEmail;
    }

    if (updateData.name && updateData.name.trim().length >= 2) {
      user.name = updateData.name.trim();
    }

    // Role update with last active administrator safeguard
    if (updateData.role && updateData.role !== user.role) {
      if (
        (user.role === "ADMIN" || user.role === "SUPER_ADMIN") &&
        user.status === "ACTIVE" &&
        updateData.role !== "ADMIN" &&
        updateData.role !== "SUPER_ADMIN"
      ) {
        if (this.countActiveAdmins() <= 1) {
          throw new Error("Cannot demote the only active administrator account.");
        }
      }
      const prevRole = user.role;
      user.role = updateData.role;

      auditService.recordEvent({
        action: "USER_ROLE_CHANGED",
        category: "role",
        actorId: actorId || "admin",
        actorName: "Administrator",
        actorEmail: "admin@talenttrack.ai",
        actorRole: "ADMIN",
        targetId: user.id,
        targetType: "USER",
        targetName: user.name,
        organizationId: user.organizationId,
        details: `Updated role for ${user.name} from ${prevRole} to ${user.role}`,
        status: "Success",
        metadata: { previousRole: prevRole, newRole: user.role },
      });
    }

    // Status update with last active administrator safeguard
    if (updateData.status && updateData.status !== user.status) {
      if (
        (user.role === "ADMIN" || user.role === "SUPER_ADMIN") &&
        user.status === "ACTIVE" &&
        updateData.status !== "ACTIVE"
      ) {
        if (this.countActiveAdmins() <= 1) {
          throw new Error("Cannot deactivate or suspend the only active administrator account.");
        }
      }
      const prevStatus = user.status;
      user.status = updateData.status;

      auditService.recordStatusChange({
        adminId: actorId || "admin",
        targetUserId: user.id,
        previousStatus: prevStatus,
        newStatus: user.status,
      });
    }

    if (updateData.organizationId !== undefined) {
      user.organizationId = updateData.organizationId || undefined;
    }
    if (updateData.departmentId !== undefined) {
      user.departmentId = updateData.departmentId || undefined;
    }
    if (updateData.emailVerified !== undefined) {
      user.emailVerified = updateData.emailVerified;
    }
    if (updateData.avatarUrl !== undefined) {
      user.avatarUrl = updateData.avatarUrl;
    }
    if (updateData.password) {
      user.passwordHash = hashPassword(updateData.password);
    }

    user.updatedAt = new Date().toISOString();
    this.users.set(id, user);

    auditService.recordEvent({
      action: "USER_UPDATED",
      category: "user",
      actorId: actorId || "admin",
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: user.id,
      targetType: "USER",
      targetName: user.name,
      organizationId: user.organizationId,
      details: `Updated user profile for ${user.name} (${user.email})`,
      status: "Success",
    });

    return toSafeUser(user);
  }

  public deleteUser(id: string, actorId?: string): { success: boolean; message: string } {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && user.status === "ACTIVE") {
      if (this.countActiveAdmins() <= 1) {
        throw new Error("Cannot delete the only active administrator account.");
      }
    }

    this.users.delete(id);

    auditService.recordEvent({
      action: "USER_DELETED",
      category: "user",
      actorId: actorId || "admin",
      actorName: "Administrator",
      actorEmail: "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: id,
      targetType: "USER",
      targetName: user.name,
      organizationId: user.organizationId,
      details: `Deleted user account ${user.name} (${user.email})`,
      status: "Warning",
    });

    return { success: true, message: `User ${user.name} was successfully removed.` };
  }

  public findAllInternalUsers(): IUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Create and persist a new user entity asynchronously in MongoDB Atlas
   */
  public async createUserAsync(userData: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    recruiterProfile?: RecruiterProfileInfo;
    applicantProfile?: ApplicantProfileInfo;
    adminProfile?: AdminProfileInfo;
  }): Promise<IUser> {
    const normalizedEmail = userData.email.trim().toLowerCase();
    const existing = await this.findByEmailAsync(normalizedEmail);
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    const id = generateObjectId();
    const now = new Date().toISOString();
    const newUser: IUser = {
      id,
      name: userData.name.trim(),
      email: normalizedEmail,
      passwordHash: userData.passwordHash,
      role: userData.role,
      status: userData.status || "ACTIVE",
      emailVerified: userData.emailVerified ?? false,
      emailVerifiedAt: userData.emailVerified ? now : undefined,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
      lastActive: now,
      ...(userData.recruiterProfile ? { recruiterProfile: userData.recruiterProfile } : {}),
      ...(userData.applicantProfile ? { applicantProfile: userData.applicantProfile } : {}),
      ...(userData.adminProfile ? { adminProfile: userData.adminProfile } : {}),
    };

    await ensureDatabaseConnected();

    if (isDatabaseConnected()) {
      try {
        const createdUserDoc = await User.create({
          _id: id,
          name: newUser.name,
          email: newUser.email,
          passwordHash: newUser.passwordHash,
          role: newUser.role,
          status: newUser.status,
          emailVerified: newUser.emailVerified,
          emailVerifiedAt: newUser.emailVerifiedAt,
          failedLoginAttempts: 0,
          lockedUntil: null,
          recruiterProfile: newUser.recruiterProfile,
          applicantProfile: newUser.applicantProfile,
          adminProfile: newUser.adminProfile,
        });

        if (newUser.role === "RECRUITER" && newUser.recruiterProfile) {
          await Recruiter.create({
            userId: createdUserDoc._id,
            companyName: newUser.recruiterProfile.companyName,
            designation: newUser.recruiterProfile.jobTitle,
            department: newUser.recruiterProfile.department || "Talent Acquisition",
          } as any).catch(console.error);
        } else if (newUser.role === "APPLICANT" && newUser.applicantProfile) {
          await Applicant.create({
            userId: createdUserDoc._id,
            headline: newUser.applicantProfile.headline,
            location: newUser.applicantProfile.location,
            phone: newUser.applicantProfile.phone,
            skills: newUser.applicantProfile.skills || [],
            experience: newUser.applicantProfile.experienceYears,
            resume: newUser.applicantProfile.resumeFileName,
          } as any).catch(console.error);
        }
      } catch (err: any) {
        if (err.code === 11000) {
          throw new Error("An account with this email address already exists.");
        }
        console.error(`[UserRepository] MongoDB error persisting user ${newUser.email}:`, err);
        throw err;
      }
    } else {
      const hasDbConfig = !!(process.env["MONGODB_URI"] || process.env["DATABASE_URL"]);
      if (process.env["NODE_ENV"] === "production" || hasDbConfig) {
        throw new Error(
          "Cannot create user: Database is unavailable. Registration persistence failed.",
        );
      }
    }

    this.users.set(id, newUser);
    return { ...newUser };
  }

  /**
   * Alias for createUser
   */
  public create(userData: Parameters<UserRepository["createUser"]>[0]): IUser {
    return this.createUser(userData);
  }

  /**
   * Update password hash for a user and touch updatedAt
   */
  public updatePassword(userId: string, newPasswordHash: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, {
        $set: { passwordHash: newPasswordHash, updatedAt: new Date() },
      }).catch(console.error);
    }

    return true;
  }

  /**
   * Asynchronously update password hash in MongoDB Atlas before updating cache
   */
  public async updatePasswordAsync(userId: string, newPasswordHash: string): Promise<boolean> {
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const updated = await User.findByIdAndUpdate(userId, {
        $set: { passwordHash: newPasswordHash, updatedAt: new Date() },
      });
      if (!updated && process.env["NODE_ENV"] === "production") {
        throw new Error("User account not found for password update.");
      }
    } else if (process.env["NODE_ENV"] === "production") {
      throw new Error("Cannot update password: Database is unavailable.");
    }

    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date().toISOString();
      return true;
    }
    return !process.env["NODE_ENV"] || process.env["NODE_ENV"] !== "production";
  }

  /**
   * Update email verification state
   */
  public updateEmailVerification(userId: string, verified: boolean): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.emailVerified = verified;
    user.emailVerifiedAt = verified ? new Date().toISOString() : undefined;
    if (verified && user.status === "PENDING_VERIFICATION") {
      user.status = "ACTIVE";
    }
    user.updatedAt = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, {
        $set: {
          emailVerified: verified,
          emailVerifiedAt: user.emailVerifiedAt,
          status: user.status,
          updatedAt: new Date(),
        },
      }).catch(console.error);
    }

    return true;
  }

  /**
   * Asynchronously update email verification state in MongoDB Atlas
   */
  public async updateEmailVerificationAsync(userId: string, verified: boolean): Promise<boolean> {
    const now = new Date();
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const userDoc = await User.findById(userId);
      const newStatus =
        verified && userDoc?.status === "PENDING_VERIFICATION" ? "ACTIVE" : userDoc?.status;

      await User.findByIdAndUpdate(userId, {
        $set: {
          emailVerified: verified,
          emailVerifiedAt: verified ? now : undefined,
          status: newStatus,
          updatedAt: now,
        },
      });
    } else if (process.env["NODE_ENV"] === "production") {
      throw new Error("Cannot update email verification: Database is unavailable.");
    }

    const user = this.users.get(userId);
    if (user) {
      user.emailVerified = verified;
      user.emailVerifiedAt = verified ? now.toISOString() : undefined;
      if (verified && user.status === "PENDING_VERIFICATION") {
        user.status = "ACTIVE";
      }
      user.updatedAt = now.toISOString();
      return true;
    }
    return true;
  }

  /**
   * Record a successful login event (reset failed attempts, touch timestamps)
   */
  public recordLoginSuccess(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.status === "LOCKED") {
      user.status = "ACTIVE";
    }
    user.lastLoginAt = new Date().toISOString();
    user.lastActive = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          lastActive: user.lastActive,
        },
      }).catch(console.error);
    }
  }

  /**
   * Record a failed login attempt; temporarily lock account after 5 failed attempts
   */
  public recordLoginFailure(userId: string): { locked: boolean; lockedUntil?: string | undefined } {
    const user = this.users.get(userId);
    if (!user) return { locked: false };

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    let isLocked = false;
    let lockUntil: string | undefined = undefined;

    if (user.failedLoginAttempts >= 5) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      user.lockedUntil = lockUntil;
      user.status = "LOCKED";
      isLocked = true;
    }

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, {
        $set: {
          failedLoginAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
          status: user.status,
        },
      }).catch(console.error);
    }

    return { locked: isLocked, lockedUntil: lockUntil };
  }

  /**
   * Unlock a temporarily locked account
   */
  public unlockAccount(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.status === "LOCKED") {
      user.status = "ACTIVE";
    }

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: user.status,
        },
      }).catch(console.error);
    }

    return true;
  }

  /**
   * Async record login success in both cache and MongoDB
   */
  public async recordLoginSuccessAsync(userId: string): Promise<void> {
    this.recordLoginSuccess(userId);
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const now = new Date().toISOString();
      await User.findByIdAndUpdate(userId, {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: "ACTIVE",
          lastLoginAt: now,
          lastActive: now,
        },
      }).catch(() => {});
    }
  }

  /**
   * Async record login failure in both cache and MongoDB
   */
  public async recordLoginFailureAsync(
    userId: string,
  ): Promise<{ locked: boolean; lockedUntil?: string | undefined }> {
    const res = this.recordLoginFailure(userId);
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const user = this.users.get(userId);
      if (user) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            failedLoginAttempts: user.failedLoginAttempts,
            lockedUntil: user.lockedUntil,
            status: user.status,
          },
        }).catch(() => {});
      }
    }
    return res;
  }

  /**
   * Async unlock account in both cache and MongoDB
   */
  public async unlockAccountAsync(userId: string): Promise<boolean> {
    const res = this.unlockAccount(userId);
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: "ACTIVE",
        },
      }).catch(() => {});
    }
    return res;
  }

  /**
   * Sync all persisted users from MongoDB Atlas into in-memory cache
   */
  public async syncFromDatabase(): Promise<number> {
    if (!isDatabaseConnected()) return 0;
    try {
      const docs = await User.find({}).exec();
      for (const doc of docs) {
        const user = docToUser(doc);
        this.users.set(user.id, user);
      }
      return docs.length;
    } catch (err) {
      console.warn("[UserRepository] Failed to sync users from database:", err);
      return 0;
    }
  }

  /**
   * Update and persist Applicant profile (User + Applicant models)
   */
  public async updateApplicantProfile(
    userId: string,
    data: UpdateApplicantProfileInput,
  ): Promise<IUser | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const now = new Date().toISOString();

    if (data.name !== undefined && data.name.trim()) {
      user.name = data.name.trim();
    }

    const currentProfile = user.applicantProfile || {
      headline: "",
      location: "",
      phone: "",
      skills: [],
      experienceYears: "",
    };

    const updatedProfile: ApplicantProfileInfo = {
      ...currentProfile,
      ...(data.headline !== undefined ? { headline: data.headline } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.skills !== undefined ? { skills: data.skills } : {}),
      ...(data.experiences !== undefined ? { experiences: data.experiences } : {}),
      ...(data.education !== undefined ? { education: data.education } : {}),
      ...(data.certifications !== undefined ? { certifications: data.certifications } : {}),
      ...(data.projects !== undefined ? { projects: data.projects } : {}),
    };

    user.applicantProfile = updatedProfile;
    user.updatedAt = now;

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const userUpdateFields: Record<string, any> = {
        updatedAt: new Date(),
        applicantProfile: updatedProfile,
      };
      if (data.name !== undefined && data.name.trim()) {
        userUpdateFields["name"] = data.name.trim();
      }

      await User.findByIdAndUpdate(userId, { $set: userUpdateFields }).catch((err) => {
        console.error(`[MongoDB] Error updating applicant profile for user ${userId}:`, err);
      });

      const applicantDocFields: Record<string, any> = {
        updatedAt: new Date(),
      };
      if (data.headline !== undefined) applicantDocFields["headline"] = data.headline;
      if (data.location !== undefined) applicantDocFields["location"] = data.location;
      if (data.phone !== undefined) applicantDocFields["phone"] = data.phone;
      if (data.bio !== undefined) applicantDocFields["bio"] = data.bio;
      if (data.summary !== undefined) applicantDocFields["summary"] = data.summary;
      if (data.skills !== undefined) applicantDocFields["skills"] = data.skills;
      if (data.experiences !== undefined) applicantDocFields["experience"] = data.experiences;
      if (data.education !== undefined) applicantDocFields["education"] = data.education;
      if (data.certifications !== undefined)
        applicantDocFields["certifications"] = data.certifications;
      if (data.projects !== undefined) applicantDocFields["projects"] = data.projects;

      await Applicant.findOneAndUpdate(
        { userId },
        { $set: applicantDocFields },
        { upsert: false },
      ).catch((err) => {
        console.error(`[MongoDB] Error updating Applicant document for user ${userId}:`, err);
      });
    }

    return { ...user };
  }

  /**
   * Sync extracted resume profile to Applicant profile
   */
  public async syncApplicantFromParsedResume(
    userId: string,
    profile: IParsedResumeProfile,
    resumeId?: string,
    resumeFileName?: string,
  ): Promise<void> {
    const user = this.users.get(userId);
    const now = new Date().toISOString();

    const mappedExperiences = (profile.experience || []).map((exp, i) => ({
      id: `exp-${i + 1}`,
      title: exp.role || "Role",
      company: exp.company || "Company",
      location: exp.location || "",
      period: `${exp.startDate || ""} - ${exp.endDate || "Present"}`.trim(),
      description: Array.isArray(exp.description)
        ? exp.description.join(". ")
        : String(exp.description || ""),
    }));

    const mappedEducation = (profile.education || []).map((edu, i) => ({
      id: `edu-${i + 1}`,
      degree: edu.degree || "Degree",
      institution: edu.institution || "Institution",
      period: `${edu.startDate || ""} - ${edu.endDate || ""}`.trim(),
      grade: edu.grade || "",
    }));

    const mappedCertifications = (profile.certifications || []).map((cert, i) => ({
      id: `cert-${i + 1}`,
      name: cert.name || "Certification",
      issuer: cert.issuer || "",
      year: cert.date || "",
    }));

    const mappedProjects = (profile.projects || []).map((proj, i) => ({
      id: `proj-${i + 1}`,
      name: proj.name || "Project",
      tech: Array.isArray(proj.technologies) ? proj.technologies.join(", ") : "",
      description: proj.description || "",
    }));

    const currentProfile = user?.applicantProfile || {};
    const existingSkills = currentProfile.skills || [];
    const mergedSkills = Array.from(new Set([...existingSkills, ...(profile.skills || [])]));

    const updatedProfile: ApplicantProfileInfo = {
      ...currentProfile,
      phone: profile.personal?.phone || currentProfile.phone || "",
      location: profile.personal?.location || currentProfile.location || "",
      bio: profile.summary || currentProfile.bio || "",
      summary: profile.summary || currentProfile.summary || "",
      skills: mergedSkills,
      experiences: mappedExperiences.length > 0 ? mappedExperiences : currentProfile.experiences,
      education: mappedEducation.length > 0 ? mappedEducation : currentProfile.education,
      certifications:
        mappedCertifications.length > 0 ? mappedCertifications : currentProfile.certifications,
      projects: mappedProjects.length > 0 ? mappedProjects : currentProfile.projects,
      resumeFileName: resumeFileName || currentProfile.resumeFileName,
      resumeId: resumeId || currentProfile.resumeId,
    };

    if (user) {
      if (profile.personal?.fullName && (user.name === "Applicant" || !user.name)) {
        user.name = profile.personal.fullName;
      }
      user.applicantProfile = updatedProfile;
      user.updatedAt = now;
    }

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const userUpdates: Record<string, any> = {
        updatedAt: new Date(),
        applicantProfile: updatedProfile,
      };
      if (profile.personal?.fullName) {
        userUpdates["name"] = profile.personal.fullName;
      }

      await User.findByIdAndUpdate(userId, { $set: userUpdates }).catch(console.error);

      await Applicant.findOneAndUpdate(
        { userId },
        {
          $set: {
            phone: updatedProfile.phone,
            location: updatedProfile.location,
            summary: updatedProfile.summary,
            bio: updatedProfile.bio,
            skills: updatedProfile.skills,
            experience: updatedProfile.experiences,
            education: updatedProfile.education,
            certifications: updatedProfile.certifications,
            projects: updatedProfile.projects,
            resumeFileName: updatedProfile.resumeFileName,
            resumeId: updatedProfile.resumeId,
            updatedAt: new Date(),
          },
        },
        { upsert: false },
      ).catch(console.error);
    }
  }
}

// Export singleton instance
export const userRepository = new UserRepository();

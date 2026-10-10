import { authenticate } from "../middleware/auth-middleware.ts";
import { userRepository } from "../db/user-repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { interviewRepository } from "../repositories/interview.repository.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.ts";
import {
  parsePaginationParams,
  parseSortParams,
  buildPaginationMetadata,
  escapeRegexString,
  sanitizeSearchQuery,
} from "../utils/query-parser.ts";
import { User, type IUserDocument } from "../models/User.ts";
import { Applicant } from "../models/Applicant.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { isValidObjectId } from "../db/user-repository.ts";
import type { SafeUser } from "../types/user-types.ts";

/**
 * Handle GET /api/candidates
 * Supported Query Params:
 * - page (default 1)
 * - limit (default 10, max 100)
 * - search (candidate name, email, skills, headline)
 * - skill (filter candidates possessing specific skill)
 * - location (candidate location)
 * - status (candidate/application status)
 * - jobId (candidates applied to specific job)
 * - sortBy ("createdAt", "name", "aiScore", "appliedAt")
 * - sortOrder ("asc", "desc")
 */
export async function handleGetCandidates(req: Request): Promise<Response> {
  const user = await authenticate(req);

  // Authorization: Recruiters, Hiring Managers, and Admins can browse candidates
  const isAuthorized =
    user.role === "RECRUITER" ||
    user.role === "HIRING_MANAGER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ORG_ADMIN";

  if (!isAuthorized) {
    throw new ForbiddenError("You are not authorized to view the candidate talent pool.");
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const { page, limit, skip } = parsePaginationParams(searchParams, 10, 100);
  const { sortBy, sortOrder, sortDirection } = parseSortParams(
    searchParams,
    ["createdAt", "name", "email", "updatedAt", "score", "aiScore"],
    "createdAt",
    "desc",
  );

  const search = sanitizeSearchQuery(searchParams.get("search"));
  const skill = sanitizeSearchQuery(searchParams.get("skill"));
  const location = sanitizeSearchQuery(searchParams.get("location"));
  const jobId = searchParams.get("jobId")?.trim();
  const stage = searchParams.get("stage")?.trim().toUpperCase();
  const minScoreParam = searchParams.get("minScore");
  const maxScoreParam = searchParams.get("maxScore");
  const minScore = minScoreParam ? Number(minScoreParam) : undefined;
  const maxScore = maxScoreParam ? Number(maxScoreParam) : undefined;

  // If MongoDB is connected, execute persistent MongoDB query
  if (isDatabaseConnected()) {
    const mongoQuery: Record<string, unknown> = {
      role: "APPLICANT",
      status: { $ne: "DEACTIVATED" },
    };

    if (search) {
      const escaped = escapeRegexString(search);
      const searchRegex = new RegExp(escaped, "i");
      mongoQuery["$or"] = [
        { name: searchRegex },
        { email: searchRegex },
        { "applicantProfile.headline": searchRegex },
        { "applicantProfile.skills": searchRegex },
        { "applicantProfile.location": searchRegex },
      ];
    }

    if (skill && skill !== "All") {
      const escapedSkill = escapeRegexString(skill);
      mongoQuery["applicantProfile.skills"] = new RegExp(`^${escapedSkill}$`, "i");
    }

    if (location && location !== "All") {
      const escapedLoc = escapeRegexString(location);
      mongoQuery["applicantProfile.location"] = new RegExp(escapedLoc, "i");
    }

    // Sort key for Mongo
    const mongoSortField = sortBy === "score" || sortBy === "aiScore" ? "createdAt" : sortBy;

    const [userDocs, total] = await Promise.all([
      User.find(mongoQuery)
        .sort({ [mongoSortField]: sortDirection, _id: 1 }) // Deterministic secondary sorting
        .lean<IUserDocument[]>(),
      User.countDocuments(mongoQuery),
    ]);

    // Enrich with latest application and resume data
    let candidates = await Promise.all(
      userDocs.map(async (u) => {
        const userIdStr = u._id.toString();
        const appsResult = await applicationRepository.findAll({
          applicantId: userIdStr,
          ...(jobId ? { jobId } : {}),
          limit: 1,
        });
        const latestApp = appsResult.applications[0] || null;

        const initials = (u.name || "Candidate")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return {
          id: userIdStr,
          userId: userIdStr,
          name: u.name,
          email: u.email,
          headline: u.applicantProfile?.headline || "Software Professional",
          location: u.applicantProfile?.location || "Remote",
          phone: u.applicantProfile?.phone || "",
          skills: u.applicantProfile?.skills || [],
          experience: u.applicantProfile?.experienceYears || "3+ years",
          initials,
          score: latestApp?.aiScore || 85,
          job: latestApp?.jobTitle || "Open Talent Pool",
          jobId: latestApp?.jobId || undefined,
          status: latestApp?.status || "Screening",
          currentStage: latestApp?.currentStage || "APPLIED",
          appliedDate: latestApp?.appliedAt || u.createdAt,
          resumeId: u.applicantProfile?.resumeId || latestApp?.resumeId,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      }),
    );

    // Filter by stage, minScore, maxScore if provided
    if (stage && stage !== "ALL") {
      candidates = candidates.filter((c) => c.currentStage === stage || c.status?.toUpperCase() === stage);
    }
    if (minScore !== undefined && !Number.isNaN(minScore)) {
      candidates = candidates.filter((c) => c.score >= minScore);
    }
    if (maxScore !== undefined && !Number.isNaN(maxScore)) {
      candidates = candidates.filter((c) => c.score <= maxScore);
    }

    // If sorting by score / aiScore
    if (sortBy === "score" || sortBy === "aiScore") {
      candidates.sort((a, b) =>
        sortOrder === "asc" ? a.score - b.score : b.score - a.score,
      );
    }

    const filteredTotal = candidates.length;
    const paginatedCandidates = candidates.slice(skip, skip + limit);
    const pagination = buildPaginationMetadata(filteredTotal, page, limit);

    return successResponse({ candidates: paginatedCandidates, pagination }, "Candidates retrieved successfully.");
  }

  // In-memory fallback
  const usersResponse = userRepository.findAll({ role: "APPLICANT", limit: 1000 });
  const allUsers = usersResponse.users;
  const filtered = allUsers.filter((u: SafeUser) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesName = u.name.toLowerCase().includes(q);
      const matchesEmail = u.email.toLowerCase().includes(q);
      const matchesSkills = u.applicantProfile?.skills?.some((s: string) =>
        s.toLowerCase().includes(q),
      );
      const matchesHeadline = u.applicantProfile?.headline?.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesSkills && !matchesHeadline) return false;
    }

    if (skill && skill !== "All") {
      const hasSkill = u.applicantProfile?.skills?.some(
        (s: string) => s.toLowerCase() === skill.toLowerCase(),
      );
      if (!hasSkill) return false;
    }

    if (location && location !== "All") {
      if (!u.applicantProfile?.location?.toLowerCase().includes(location.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  let enrichedCandidates = await Promise.all(
    filtered.map(async (u: SafeUser) => {
      const appsResult = await applicationRepository.findAll({
        applicantId: u.id,
        ...(jobId ? { jobId } : {}),
        limit: 1,
      });
      const latestApp = appsResult.applications[0] || null;

      const initials = (u.name || "Candidate")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return {
        id: u.id,
        userId: u.id,
        name: u.name,
        email: u.email,
        headline: u.applicantProfile?.headline || "Software Professional",
        location: u.applicantProfile?.location || "Remote",
        phone: u.applicantProfile?.phone || "",
        skills: u.applicantProfile?.skills || [],
        experience: u.applicantProfile?.experienceYears || "3+ years",
        initials,
        score: latestApp?.aiScore || 85,
        job: latestApp?.jobTitle || "Open Talent Pool",
        jobId: latestApp?.jobId || undefined,
        status: latestApp?.status || "Screening",
        currentStage: latestApp?.currentStage || "APPLIED",
        appliedDate: latestApp?.appliedAt || u.createdAt,
        resumeId: u.applicantProfile?.resumeId || latestApp?.resumeId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    }),
  );

  if (stage && stage !== "ALL") {
    enrichedCandidates = enrichedCandidates.filter(
      (c) => c.currentStage === stage || c.status?.toUpperCase() === stage,
    );
  }
  if (minScore !== undefined && !Number.isNaN(minScore)) {
    enrichedCandidates = enrichedCandidates.filter((c) => c.score >= minScore);
  }
  if (maxScore !== undefined && !Number.isNaN(maxScore)) {
    enrichedCandidates = enrichedCandidates.filter((c) => c.score <= maxScore);
  }

  enrichedCandidates.sort((a, b) => {
    if (sortBy === "name") {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === "asc" ? cmp : -cmp;
    }
    if (sortBy === "score" || sortBy === "aiScore") {
      return sortOrder === "asc" ? a.score - b.score : b.score - a.score;
    }
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  const total = enrichedCandidates.length;
  const paged = enrichedCandidates.slice(skip, skip + limit);
  const pagination = buildPaginationMetadata(total, page, limit);

  return successResponse({ candidates: paged, pagination }, "Candidates retrieved successfully.");
}

/**
 * Handle GET /api/candidates/:id
 * Retrieve comprehensive candidate profile, applications, and resumes
 */
export async function handleGetCandidateById(req: Request, candidateId: string): Promise<Response> {
  const user = await authenticate(req);

  const isStaff =
    user.role === "RECRUITER" ||
    user.role === "HIRING_MANAGER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ORG_ADMIN";

  const isSelf = user.id === candidateId;

  if (!isStaff && !isSelf) {
    throw new ForbiddenError("You are not authorized to view this candidate profile.");
  }

  // 1. Fetch user record
  let candidateUser: SafeUser | null = userRepository.findById(candidateId);
  if (!candidateUser && isValidObjectId(candidateId) && isDatabaseConnected()) {
    const doc = await User.findById(candidateId).lean<IUserDocument>();
    if (doc) {
      candidateUser = {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        role: doc.role,
        status: doc.status,
        emailVerified: doc.emailVerified,
        applicantProfile: doc.applicantProfile,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
    }
  }

  if (!candidateUser) {
    throw new NotFoundError(`Candidate record with ID ${candidateId} not found.`);
  }

  // 2. Fetch candidate applications
  const applicationsResult = await applicationRepository.findAll({ applicantId: candidateId });

  // 3. Fetch candidate interviews
  const interviews = await interviewRepository.findApplicantInterviews(candidateId);

  // 4. Fetch candidate resumes
  const resumes = await resumeRepository.findByApplicantId(candidateId);

  const initials = (candidateUser.name || "Candidate")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const latestApp = applicationsResult.applications[0];

  const profile = {
    id: candidateUser.id,
    userId: candidateUser.id,
    name: candidateUser.name,
    email: candidateUser.email,
    headline: candidateUser.applicantProfile?.headline || "Software Professional",
    location: candidateUser.applicantProfile?.location || "Remote",
    phone: candidateUser.applicantProfile?.phone || "",
    bio: candidateUser.applicantProfile?.bio || candidateUser.applicantProfile?.summary || "",
    summary: candidateUser.applicantProfile?.summary || "",
    skills: candidateUser.applicantProfile?.skills || [],
    experienceYears: candidateUser.applicantProfile?.experienceYears || "3+ years",
    experiences: candidateUser.applicantProfile?.experiences || [],
    education: candidateUser.applicantProfile?.education || [],
    certifications: candidateUser.applicantProfile?.certifications || [],
    projects: candidateUser.applicantProfile?.projects || [],
    initials,
    status: latestApp?.status || "Active",
    score: latestApp?.aiScore || 85,
    applications: applicationsResult.applications,
    interviews,
    resumes,
    createdAt: candidateUser.createdAt,
    updatedAt: candidateUser.updatedAt,
  };

  return successResponse(profile, "Candidate profile retrieved successfully.");
}

/**
 * Handle PATCH /api/candidates/:id
 * Update candidate profile information
 */
export async function handleUpdateCandidate(req: Request, candidateId: string): Promise<Response> {
  const user = await authenticate(req);

  const isStaff = user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "RECRUITER";
  const isSelf = user.id === candidateId;

  if (!isStaff && !isSelf) {
    throw new ForbiddenError("You are not authorized to update this candidate record.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    throw new BadRequestError("Invalid JSON payload.");
  }

  // Allow updating specific safe candidate profile fields
  const allowedProfileFields = [
    "headline",
    "phone",
    "location",
    "skills",
    "bio",
    "summary",
    "experienceYears",
  ];

  const profileUpdates: Record<string, unknown> = {};
  for (const field of allowedProfileFields) {
    if (body[field] !== undefined) {
      profileUpdates[field] = body[field];
    }
  }

  const updatedUser = await userRepository.updateApplicantProfile(candidateId, profileUpdates);
  if (!updatedUser) {
    throw new NotFoundError(`Candidate record with ID ${candidateId} not found.`);
  }

  return successResponse(updatedUser, "Candidate profile updated successfully.");
}

/**
 * Central API dispatcher for /api/candidates/*
 */
export async function handleCandidateApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/candidates")) {
    return null;
  }

  try {
    // 1. GET /api/candidates
    if (pathname === "/api/candidates" && req.method === "GET") {
      return await handleGetCandidates(req);
    }

    // 2. GET & PATCH /api/candidates/:id
    const idMatch = pathname.match(/^\/api\/candidates\/([a-zA-Z0-9_-]+)$/);
    if (idMatch && idMatch[1]) {
      const candidateId = idMatch[1];
      if (req.method === "GET") {
        return await handleGetCandidateById(req, candidateId);
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        return await handleUpdateCandidate(req, candidateId);
      }
    }

    return null;
  } catch (error) {
    return errorResponse(error);
  }
}

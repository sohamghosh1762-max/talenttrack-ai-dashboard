import { Application, type IApplicationDocument } from "../models/Application.ts";
import { Job } from "../models/Job.ts";
import { Interview } from "../models/Interview.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId, userRepository } from "../db/user-repository.ts";
import { jobRepository } from "./job.repository.ts";
import { resumeRepository } from "./resume.repository.ts";
import { interviewRepository } from "./interview.repository.ts";
import type {
  IApplication,
  ApplicationStage,
  ApplicationNote,
  StageHistoryItem,
  RecruiterFeedbackItem,
  BulkApplicationActionResult,
  BulkActionResultItem,
  RecruiterAnalyticsResponse,
  RecruiterKpis,
  StageFunnelItem,
  ApplicationTrendPoint,
  TopSkillItem,
  RecruiterAIInsight,
  RecruiterAIInsightSummary,
  RecruiterRecentActivity,
  ApplicationQueryParams,
  PaginatedApplicationsResponse,
  CreateApplicationInput,
  UpdateApplicationStatusInput,
} from "../types/application-types.ts";
import { ValidationError } from "../utils/errors.ts";

const DEFAULT_SEED_APPLICATIONS: IApplication[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    applicantId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003", // Rahul Mehta
    status: "Shortlisted",
    currentStage: "INTERVIEW",
    aiScore: 92,
    coverLetter:
      "I have 5+ years of production experience in React, Next.js, and TypeScript architectures.",
    appliedAt: "2025-09-14T10:00:00.000Z",
    updatedAt: "2025-09-14T10:00:00.000Z",
    jobTitle: "Senior Frontend Developer",
    applicantName: "Aarav Mehta",
    applicantEmail: "aarav.mehta@example.com",
    job: {
      id: "65f1a2b3c4d5e6f7a8b9c101",
      title: "Senior Frontend Developer",
      department: "Engineering",
      location: "San Francisco, CA",
      type: "Full-Time",
      company: "TalentTrack AI",
      status: "PUBLISHED",
    },
    applicant: {
      id: "65f1a2b3c4d5e6f7a8b9c008",
      name: "Aarav Mehta",
      email: "aarav.mehta@example.com",
      phone: "+1 (555) 234-5678",
      location: "San Jose, CA",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      initials: "AM",
    },
    resume: {
      id: "65f1a2b3c4d5e6f7a8b9c301",
      originalFileName: "Aarav_Mehta_Resume.pdf",
    },
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c202",
    jobId: "65f1a2b3c4d5e6f7a8b9c103",
    applicantId: "65f1a2b3c4d5e6f7a8b9c009", // Sophia Chen
    recruiterId: "65f1a2b3c4d5e6f7a8b9c004", // Sarah Jenkins
    status: "Shortlisted",
    currentStage: "SCREENING",
    aiScore: 95,
    coverLetter:
      "Specialist in transformer models, PyTorch embeddings, and vector similarity search.",
    appliedAt: "2025-09-12T14:30:00.000Z",
    updatedAt: "2025-09-12T14:30:00.000Z",
    jobTitle: "AI/ML Systems Engineer",
    applicantName: "Sophia Chen",
    applicantEmail: "sophia.chen@example.org",
    job: {
      id: "65f1a2b3c4d5e6f7a8b9c103",
      title: "AI/ML Systems Engineer",
      department: "Data & AI",
      location: "Seattle, WA",
      type: "Remote",
      company: "TalentTrack AI",
      status: "PUBLISHED",
    },
    applicant: {
      id: "65f1a2b3c4d5e6f7a8b9c009",
      name: "Sophia Chen",
      email: "sophia.chen@example.org",
      skills: ["PyTorch", "Python", "Transformers", "NLP"],
      initials: "SC",
    },
  },
];

class ApplicationRepository {
  private inMemoryApplications: Map<string, IApplication> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryApplications.clear();
    for (const app of DEFAULT_SEED_APPLICATIONS) {
      this.inMemoryApplications.set(app.id, JSON.parse(JSON.stringify(app)));
    }
  }

  public clearAll(): void {
    this.inMemoryApplications.clear();
  }

  private async enrichApplicationDetails(app: IApplication): Promise<IApplication> {
    const enriched = { ...app };

    // 1. Enrich Job details if missing
    if (!enriched.job && enriched.jobId) {
      const job = await jobRepository.findById(enriched.jobId);
      if (job) {
        enriched.job = {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          type: job.employmentType,
          company: "TalentTrack AI",
          status: job.status,
        };
        enriched.jobTitle = job.title;
      }
    }

    // 2. Enrich Applicant details if missing
    if (!enriched.applicant && enriched.applicantId) {
      const user = userRepository.findById(enriched.applicantId);
      if (user) {
        const initials = user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        enriched.applicant = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.applicantProfile?.phone,
          headline: user.applicantProfile?.headline,
          location: user.applicantProfile?.location,
          skills: user.applicantProfile?.skills || [],
          initials,
        };
        enriched.applicantName = user.name;
        enriched.applicantEmail = user.email;
      }
    }

    // 3. Enrich Resume details if missing
    if (!enriched.resume && enriched.resumeId) {
      const resume = await resumeRepository.findById(enriched.resumeId);
      if (resume) {
        enriched.resume = {
          id: resume.id,
          originalFileName: resume.originalFileName,
          mimeType: resume.mimeType,
          fileSize: resume.fileSize,
          uploadedAt: resume.uploadedAt,
        };
      }
    }

    return enriched;
  }

  public async findAll(
    params: ApplicationQueryParams = {},
  ): Promise<PaginatedApplicationsResponse> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const targetStage = params.stage || params.currentStage;

    if (isDatabaseConnected()) {
      const query: Record<string, unknown> = {};

      if (params.jobId && isValidObjectId(params.jobId)) {
        query["jobId"] = params.jobId;
      } else if (params.jobIds && params.jobIds.length > 0) {
        query["jobId"] = { $in: params.jobIds.filter(isValidObjectId) };
      }
      if (params.applicantId && isValidObjectId(params.applicantId)) {
        query["applicantId"] = params.applicantId;
      }
      if (params.recruiterId && isValidObjectId(params.recruiterId)) {
        query["recruiterId"] = params.recruiterId;
      }
      if (params.status) {
        query["status"] = params.status;
      }
      if (targetStage) {
        query["currentStage"] = targetStage;
      }
      if (params.minScore !== undefined) {
        query["aiScore"] = {
          ...((query["aiScore"] as Record<string, unknown>) || {}),
          $gte: Number(params.minScore),
        };
      }
      if (params.maxScore !== undefined) {
        query["aiScore"] = {
          ...((query["aiScore"] as Record<string, unknown>) || {}),
          $lte: Number(params.maxScore),
        };
      }
      if (params.startDate) {
        query["appliedAt"] = {
          ...((query["appliedAt"] as Record<string, unknown>) || {}),
          $gte: params.startDate,
        };
      }
      if (params.endDate) {
        query["appliedAt"] = {
          ...((query["appliedAt"] as Record<string, unknown>) || {}),
          $lte: params.endDate,
        };
      }

      const sortField = params.sortBy || "appliedAt";
      const sortDirection = params.sortOrder === "asc" ? 1 : -1;

      const [docs, total] = await Promise.all([
        Application.find(query)
          .populate("jobId", "title department location employmentType status")
          .populate("applicantId", "name email applicantProfile")
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(limit)
          .lean<any[]>(),
        Application.countDocuments(query),
      ]);

      const applications: IApplication[] = await Promise.all(
        docs.map(async (doc: any) => {
          const app: IApplication = {
            id: doc._id ? doc._id.toString() : doc.id,
            jobId:
              doc.jobId && typeof doc.jobId === "object"
                ? doc.jobId._id.toString()
                : doc.jobId?.toString() || "",
            applicantId:
              doc.applicantId && typeof doc.applicantId === "object"
                ? doc.applicantId._id.toString()
                : doc.applicantId?.toString() || "",
            recruiterId:
              doc.recruiterId && typeof doc.recruiterId === "object"
                ? doc.recruiterId._id.toString()
                : doc.recruiterId?.toString() || "",
            resumeId: doc.resumeId || undefined,
            coverLetter: doc.coverLetter || undefined,
            status: doc.status,
            currentStage: doc.currentStage,
            aiScore: doc.aiScore || undefined,
            notes: doc.notes || undefined,
            notesList: doc.notesList || undefined,
            stageHistory: doc.stageHistory || undefined,
            recruiterFeedback: doc.recruiterFeedback || undefined,
            appliedAt:
              doc.appliedAt ||
              (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()),
            updatedAt: doc.updatedAt
              ? new Date(doc.updatedAt).toISOString()
              : new Date().toISOString(),
            jobTitle:
              doc.jobId && typeof doc.jobId === "object" && "title" in doc.jobId
                ? (doc.jobId as { title: string }).title
                : undefined,
            applicantName:
              doc.applicantId && typeof doc.applicantId === "object" && "name" in doc.applicantId
                ? (doc.applicantId as { name: string }).name
                : undefined,
            applicantEmail:
              doc.applicantId && typeof doc.applicantId === "object" && "email" in doc.applicantId
                ? (doc.applicantId as { email: string }).email
                : undefined,
            hiringManagerFeedback: doc.hiringManagerFeedback || undefined,
            hiringDecision: doc.hiringDecision || undefined,
          };

          if (doc.jobId && typeof doc.jobId === "object") {
            app.job = {
              id: doc.jobId._id?.toString() || app.jobId,
              title: doc.jobId.title || "Job Opening",
              department: doc.jobId.department,
              location: doc.jobId.location,
              type: doc.jobId.employmentType,
              company: "TalentTrack AI",
              status: doc.jobId.status,
            };
          }

          if (doc.applicantId && typeof doc.applicantId === "object") {
            const initials = (doc.applicantId.name || "A")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            app.applicant = {
              id: doc.applicantId._id?.toString() || app.applicantId,
              name: doc.applicantId.name,
              email: doc.applicantId.email,
              phone: doc.applicantId.applicantProfile?.phone,
              location: doc.applicantId.applicantProfile?.location,
              skills: doc.applicantId.applicantProfile?.skills || [],
              initials,
            };
          }

          return this.enrichApplicationDetails(app);
        }),
      );

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      };
    }

    // In-memory fallback
    const all = Array.from(this.inMemoryApplications.values());
    const enrichedAll = await Promise.all(all.map((app) => this.enrichApplicationDetails(app)));

    const filtered = enrichedAll.filter((app) => {
      if (params.jobId && app.jobId !== params.jobId) return false;
      if (params.jobIds && params.jobIds.length > 0 && !params.jobIds.includes(app.jobId))
        return false;
      if (params.applicantId && app.applicantId !== params.applicantId) return false;
      if (params.recruiterId && app.recruiterId !== params.recruiterId) return false;
      if (params.status && app.status !== params.status) return false;
      if (targetStage && app.currentStage !== targetStage) return false;
      if (params.search) {
        const q = params.search.toLowerCase();
        const matchesName =
          app.applicantName?.toLowerCase().includes(q) ||
          app.applicant?.name?.toLowerCase().includes(q);
        const matchesEmail =
          app.applicantEmail?.toLowerCase().includes(q) ||
          app.applicant?.email?.toLowerCase().includes(q);
        const matchesJob =
          app.jobTitle?.toLowerCase().includes(q) || app.job?.title?.toLowerCase().includes(q);
        const matchesSkill = app.applicant?.skills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesJob && !matchesSkill) return false;
      }
      if (params.minScore !== undefined && (app.aiScore === undefined || app.aiScore < Number(params.minScore))) return false;
      if (params.maxScore !== undefined && (app.aiScore === undefined || app.aiScore > Number(params.maxScore))) return false;
      if (params.startDate && new Date(app.appliedAt).getTime() < new Date(params.startDate).getTime()) return false;
      if (params.endDate && new Date(app.appliedAt).getTime() > new Date(params.endDate).getTime()) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const field = params.sortBy || "appliedAt";
      let comp = 0;
      if (field === "aiScore") comp = (a.aiScore || 0) - (b.aiScore || 0);
      else comp = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      return params.sortOrder === "asc" ? comp : -comp;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      applications: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  public async findById(id: string): Promise<IApplication | null> {
    if (!id) return null;

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Application.findById(id)
        .populate("jobId", "title department location employmentType status")
        .populate("applicantId", "name email applicantProfile")
        .lean<any>();

      if (!doc) return null;

      const app: IApplication = {
        id: doc._id ? doc._id.toString() : doc.id,
        jobId:
          doc.jobId && typeof doc.jobId === "object"
            ? doc.jobId._id.toString()
            : doc.jobId?.toString() || "",
        applicantId:
          doc.applicantId && typeof doc.applicantId === "object"
            ? doc.applicantId._id.toString()
            : doc.applicantId?.toString() || "",
        recruiterId:
          doc.recruiterId && typeof doc.recruiterId === "object"
            ? doc.recruiterId._id.toString()
            : doc.recruiterId?.toString() || "",
        resumeId: doc.resumeId || undefined,
        coverLetter: doc.coverLetter || undefined,
        status: doc.status,
        currentStage: doc.currentStage,
        aiScore: doc.aiScore || undefined,
        notes: doc.notes || undefined,
        notesList: doc.notesList || undefined,
        stageHistory: doc.stageHistory || undefined,
        recruiterFeedback: doc.recruiterFeedback || undefined,
        appliedAt: doc.appliedAt || new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
        jobTitle:
          doc.jobId && typeof doc.jobId === "object" && "title" in doc.jobId
            ? (doc.jobId as { title: string }).title
            : undefined,
        applicantName:
          doc.applicantId && typeof doc.applicantId === "object" && "name" in doc.applicantId
            ? (doc.applicantId as { name: string }).name
            : undefined,
        applicantEmail:
          doc.applicantId && typeof doc.applicantId === "object" && "email" in doc.applicantId
            ? (doc.applicantId as { email: string }).email
            : undefined,
        hiringManagerFeedback: doc.hiringManagerFeedback || undefined,
        hiringDecision: doc.hiringDecision || undefined,
      };

      return this.enrichApplicationDetails(app);
    }

    const app = this.inMemoryApplications.get(id);
    return app ? this.enrichApplicationDetails(app) : null;
  }

  public async addHiringManagerFeedback(
    id: string,
    feedback: import("../types/application-types.ts").HiringManagerFeedbackItem,
  ): Promise<IApplication | null> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Application.findByIdAndUpdate(
        id,
        {
          $push: { hiringManagerFeedback: feedback },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      )
        .populate("jobId", "title department location employmentType status")
        .populate("applicantId", "name email applicantProfile")
        .lean<any>();

      if (!doc) return null;
      return this.findById(id);
    }

    const app = this.inMemoryApplications.get(id);
    if (!app) return null;

    const existingFeedback = app.hiringManagerFeedback || [];
    app.hiringManagerFeedback = [...existingFeedback, feedback];
    app.updatedAt = now;
    this.inMemoryApplications.set(id, app);
    return this.enrichApplicationDetails(app);
  }

  public async setHiringDecision(
    id: string,
    decision: import("../types/application-types.ts").HiringDecision,
  ): Promise<IApplication | null> {
    const now = new Date().toISOString();

    let newStage: import("../types/application-types.ts").ApplicationStage | undefined;
    let newStatus: import("../types/application-types.ts").ApplicationStatus | undefined;

    if (decision.status === "APPROVED") {
      newStage = "OFFERED";
      newStatus = "Shortlisted";
    } else if (decision.status === "REJECTED") {
      newStage = "REJECTED";
      newStatus = "REJECTED";
    }

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const updatePayload: Record<string, unknown> = {
        hiringDecision: decision,
        updatedAt: new Date(),
      };
      if (newStage) updatePayload["currentStage"] = newStage;
      if (newStatus) updatePayload["status"] = newStatus;

      await Application.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });
      return this.findById(id);
    }

    const app = this.inMemoryApplications.get(id);
    if (!app) return null;

    app.hiringDecision = decision;
    if (newStage) app.currentStage = newStage;
    if (newStatus) app.status = newStatus;
    app.updatedAt = now;
    this.inMemoryApplications.set(id, app);
    return this.enrichApplicationDetails(app);
  }

  public async findByJobAndApplicant(
    jobId: string,
    applicantId: string,
  ): Promise<IApplication | null> {
    if (isDatabaseConnected() && isValidObjectId(jobId) && isValidObjectId(applicantId)) {
      const doc = await Application.findOne({ jobId, applicantId }).lean<any>();
      if (!doc) return null;
      return {
        id: doc._id ? doc._id.toString() : doc.id,
        jobId: doc.jobId?.toString() || jobId,
        applicantId: doc.applicantId?.toString() || applicantId,
        recruiterId: doc.recruiterId?.toString() || "",
        resumeId: doc.resumeId || undefined,
        coverLetter: doc.coverLetter || undefined,
        status: doc.status,
        currentStage: doc.currentStage,
        aiScore: doc.aiScore || undefined,
        notes: doc.notes || undefined,
        appliedAt: doc.appliedAt || new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    for (const app of this.inMemoryApplications.values()) {
      if (app.jobId === jobId && app.applicantId === applicantId) {
        return { ...app };
      }
    }
    return null;
  }

  public async create(input: CreateApplicationInput): Promise<IApplication> {
    const existing = await this.findByJobAndApplicant(input.jobId, input.applicantId);
    if (existing) {
      throw new Error("Applicant has already submitted an application for this job opening.");
    }

    const now = new Date().toISOString();
    const id = generateObjectId();

    let recruiterId = input.recruiterId;
    if (!recruiterId) {
      const job = await jobRepository.findById(input.jobId);
      if (job) {
        recruiterId = job.recruiterId;
      }
    }

    const applicationData: IApplication = {
      id,
      jobId: input.jobId,
      applicantId: input.applicantId,
      recruiterId: recruiterId || "65f1a2b3c4d5e6f7a8b9c003",
      resumeId: input.resumeId || undefined,
      coverLetter: input.coverLetter || undefined,
      status: (input as any).status || "APPLIED",
      currentStage: (input as any).currentStage || (input as any).stage || "APPLIED",
      aiScore: (input as any).aiScore || (input as any).atsScore || undefined,
      notes: input.notes || undefined,
      appliedAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected()) {
      const created = await Application.create({
        _id: id,
        jobId: applicationData.jobId,
        applicantId: applicationData.applicantId,
        recruiterId: applicationData.recruiterId,
        resumeId: applicationData.resumeId,
        coverLetter: applicationData.coverLetter,
        status: applicationData.status,
        currentStage: applicationData.currentStage,
        notes: applicationData.notes,
        appliedAt: now,
      } as any);

      applicationData.id = (created as any)._id?.toString() || id;
    }

    this.inMemoryApplications.set(applicationData.id, applicationData);
    await jobRepository.incrementApplicationsCount(input.jobId);

    return { ...applicationData };
  }

  public async updateStatus(
    id: string,
    input: UpdateApplicationStatusInput,
  ): Promise<IApplication | null> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const updatedDoc = await Application.findByIdAndUpdate(
        id,
        {
          $set: {
            ...input,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
        .populate("jobId", "title department location employmentType status")
        .populate("applicantId", "name email applicantProfile")
        .lean<any>();

      if (!updatedDoc) return null;

      const app: IApplication = {
        id: updatedDoc._id ? updatedDoc._id.toString() : id,
        jobId:
          updatedDoc.jobId && typeof updatedDoc.jobId === "object"
            ? updatedDoc.jobId._id.toString()
            : updatedDoc.jobId?.toString() || "",
        applicantId:
          updatedDoc.applicantId && typeof updatedDoc.applicantId === "object"
            ? updatedDoc.applicantId._id.toString()
            : updatedDoc.applicantId?.toString() || "",
        recruiterId: updatedDoc.recruiterId?.toString() || "",
        resumeId: updatedDoc.resumeId || undefined,
        coverLetter: updatedDoc.coverLetter || undefined,
        status: updatedDoc.status,
        currentStage: updatedDoc.currentStage,
        aiScore: updatedDoc.aiScore || undefined,
        notes: updatedDoc.notes || undefined,
        notesList: updatedDoc.notesList || undefined,
        stageHistory: updatedDoc.stageHistory || undefined,
        recruiterFeedback: updatedDoc.recruiterFeedback || undefined,
        appliedAt: updatedDoc.appliedAt || now,
        updatedAt: updatedDoc.updatedAt ? new Date(updatedDoc.updatedAt).toISOString() : now,
        jobTitle:
          updatedDoc.jobId && typeof updatedDoc.jobId === "object" && "title" in updatedDoc.jobId
            ? (updatedDoc.jobId as { title: string }).title
            : undefined,
        applicantName:
          updatedDoc.applicantId &&
          typeof updatedDoc.applicantId === "object" &&
          "name" in updatedDoc.applicantId
            ? (updatedDoc.applicantId as { name: string }).name
            : undefined,
        applicantEmail:
          updatedDoc.applicantId &&
          typeof updatedDoc.applicantId === "object" &&
          "email" in updatedDoc.applicantId
            ? (updatedDoc.applicantId as { email: string }).email
            : undefined,
      };

      if (updatedDoc.jobId && typeof updatedDoc.jobId === "object") {
        app.job = {
          id: updatedDoc.jobId._id?.toString() || app.jobId,
          title: updatedDoc.jobId.title || "Job Opening",
          department: updatedDoc.jobId.department,
          location: updatedDoc.jobId.location,
          type: updatedDoc.jobId.employmentType,
          company: "TalentTrack AI",
          status: updatedDoc.jobId.status,
        };
      }

      if (updatedDoc.applicantId && typeof updatedDoc.applicantId === "object") {
        const initials = (updatedDoc.applicantId.name || "A")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        app.applicant = {
          id: updatedDoc.applicantId._id?.toString() || app.applicantId,
          name: updatedDoc.applicantId.name,
          email: updatedDoc.applicantId.email,
          phone: updatedDoc.applicantId.applicantProfile?.phone,
          location: updatedDoc.applicantId.applicantProfile?.location,
          skills: updatedDoc.applicantId.applicantProfile?.skills || [],
          initials,
        };
      }

      const enriched = await this.enrichApplicationDetails(app);
      this.inMemoryApplications.set(id, enriched);
      return enriched;
    }

    const app = this.inMemoryApplications.get(id);
    if (!app) return null;

    Object.assign(app, input, { updatedAt: now });
    const enriched = await this.enrichApplicationDetails(app);
    this.inMemoryApplications.set(id, enriched);
    return { ...enriched };
  }

  public validateStageTransition(
    fromStage: string,
    toStage: string,
  ): { valid: boolean; reason?: string } {
    const from = fromStage.toUpperCase();
    const to = toStage.toUpperCase();

    if (from === to) {
      return { valid: true };
    }

    const PERMITTED_TRANSITIONS: Record<string, string[]> = {
      APPLIED: ["SCREENING", "INTERVIEW", "REJECTED", "WITHDRAWN"],
      SCREENING: ["INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN", "APPLIED"],
      INTERVIEW: ["OFFERED", "REJECTED", "SCREENING", "WITHDRAWN", "APPLIED"],
      OFFERED: ["REJECTED", "WITHDRAWN", "INTERVIEW", "SCREENING", "APPLIED"],
      REJECTED: ["APPLIED", "SCREENING", "INTERVIEW", "OFFERED", "WITHDRAWN"],
      WITHDRAWN: ["APPLIED", "SCREENING", "INTERVIEW", "OFFERED", "REJECTED"],
    };

    const allowed = PERMITTED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      return {
        valid: false,
        reason: `Cannot transition application directly from '${from}' to '${to}'. Valid next stages are: ${
          allowed ? allowed.join(", ") : "none"
        }`,
      };
    }

    return { valid: true };
  }

  public async recordStageTransition(
    id: string,
    targetStage: ApplicationStage,
    changedBy: string,
    changedByName?: string,
    reason?: string,
    forceAdmin: boolean = false,
  ): Promise<IApplication | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const fromStage = existing.currentStage || "APPLIED";
    if (!forceAdmin) {
      const validation = this.validateStageTransition(fromStage, targetStage);
      if (!validation.valid) {
        throw new ValidationError(validation.reason || "Invalid stage transition.");
      }
    }

    const historyItem: StageHistoryItem = {
      fromStage,
      toStage: targetStage,
      changedBy,
      changedByName: changedByName || "Recruiter",
      changedAt: new Date().toISOString(),
      ...(reason ? { reason } : {}),
    };

    const stageHistory = [...(existing.stageHistory || []), historyItem];

    return this.updateStatus(id, {
      status: targetStage,
      currentStage: targetStage,
      stageHistory,
    });
  }

  public async addNote(
    id: string,
    noteInput: { content: string; authorId: string; authorName: string; authorRole?: string },
  ): Promise<IApplication | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const newNote: ApplicationNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: noteInput.authorId,
      authorName: noteInput.authorName,
      authorRole: noteInput.authorRole || "Recruiter",
      content: noteInput.content.trim(),
      text: noteInput.content.trim(),
      createdAt: new Date().toISOString(),
    };

    const notesList = [...(existing.notesList || []), newNote];

    return this.updateStatus(id, {
      status: existing.status,
      notes: newNote.content,
      notesList,
    });
  }

  public async addRecruiterFeedback(
    id: string,
    feedbackInput: Omit<RecruiterFeedbackItem, "id" | "createdAt">,
  ): Promise<IApplication | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const newFeedback: RecruiterFeedbackItem = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...feedbackInput,
      createdAt: new Date().toISOString(),
    };

    const recruiterFeedback = [...(existing.recruiterFeedback || []), newFeedback];

    return this.updateStatus(id, {
      status: existing.status,
      recruiterFeedback,
    });
  }

  public async bulkUpdateStage(
    applicationIds: string[],
    targetStage: ApplicationStage,
    changedBy: string,
    changedByName?: string,
  ): Promise<BulkApplicationActionResult> {
    const results: BulkActionResultItem[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of applicationIds) {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          failed++;
          results.push({ id, success: false, error: "Application not found" });
          continue;
        }

        if (changedBy && existing.recruiterId && existing.recruiterId !== changedBy) {
          failed++;
          results.push({
            id,
            success: false,
            error: "Not authorized to update application for another recruiter",
          });
          continue;
        }

        const updated = await this.recordStageTransition(
          id,
          targetStage,
          changedBy,
          changedByName,
          "Bulk stage update",
        );
        if (updated) {
          succeeded++;
          results.push({ id, success: true, stage: targetStage });
        } else {
          failed++;
          results.push({ id, success: false, error: "Application not found" });
        }
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id, success: false, error: msg });
      }
    }

    return {
      total: applicationIds.length,
      totalRequested: applicationIds.length,
      succeeded,
      failed,
      results,
    };
  }

  public async bulkAddNote(
    applicationIds: string[],
    noteContent: string,
    authorId: string,
    authorName: string,
  ): Promise<BulkApplicationActionResult> {
    const results: BulkActionResultItem[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of applicationIds) {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          failed++;
          results.push({ id, success: false, error: "Application not found" });
          continue;
        }

        if (authorId && existing.recruiterId && existing.recruiterId !== authorId) {
          failed++;
          results.push({
            id,
            success: false,
            error: "Not authorized to update application for another recruiter",
          });
          continue;
        }

        const updated = await this.addNote(id, {
          content: noteContent,
          authorId,
          authorName,
          authorRole: "Recruiter",
        });
        if (updated) {
          succeeded++;
          results.push({ id, success: true });
        } else {
          failed++;
          results.push({ id, success: false, error: "Application not found" });
        }
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id, success: false, error: msg });
      }
    }

    return {
      total: applicationIds.length,
      totalRequested: applicationIds.length,
      succeeded,
      failed,
      results,
    };
  }

  public async getRecruiterAnalytics(
    recruiterId: string,
    jobId?: string,
    range: string = "30d",
  ): Promise<RecruiterAnalyticsResponse> {
    const now = new Date();
    let days = 30;
    if (range === "7d") days = 7;
    else if (range === "90d") days = 90;
    else if (range === "all") days = 3650;
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    let allApps: IApplication[] = [];
    let activeJobsCount = 0;
    let scheduledInterviewsCount = 0;

    if (isDatabaseConnected()) {
      const appFilter: Record<string, unknown> = {};
      if (recruiterId && isValidObjectId(recruiterId)) {
        appFilter["recruiterId"] = recruiterId;
      }
      if (jobId && isValidObjectId(jobId)) {
        appFilter["jobId"] = jobId;
      }

      const [apps, jobsCount, interviewsCount] = await Promise.all([
        Application.find(appFilter)
          .populate("jobId", "title department")
          .populate("applicantId", "name email applicantProfile")
          .lean<any[]>(),
        Job.countDocuments({
          ...(recruiterId && isValidObjectId(recruiterId) ? { recruiterId } : {}),
          status: "PUBLISHED",
        }),
        Interview.countDocuments({
          ...(recruiterId && isValidObjectId(recruiterId) ? { recruiterId } : {}),
          status: "SCHEDULED",
        }),
      ]);

      activeJobsCount = jobsCount;
      scheduledInterviewsCount = interviewsCount;

      allApps = await Promise.all(
        apps.map(async (doc: any) => {
          const app: IApplication = {
            id: doc._id ? doc._id.toString() : doc.id,
            jobId: doc.jobId?._id?.toString() || doc.jobId?.toString() || "",
            applicantId: doc.applicantId?._id?.toString() || doc.applicantId?.toString() || "",
            recruiterId: doc.recruiterId?.toString() || "",
            status: doc.status,
            currentStage: doc.currentStage,
            aiScore: doc.aiScore,
            appliedAt: doc.appliedAt || (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
            jobTitle: doc.jobId?.title,
            applicantName: doc.applicantId?.name,
            notesList: doc.notesList,
            stageHistory: doc.stageHistory,
          };
          if (doc.applicantId?.applicantProfile) {
            app.applicant = {
              id: app.applicantId,
              name: doc.applicantId.name,
              email: doc.applicantId.email,
              skills: doc.applicantId.applicantProfile.skills || [],
            };
          }
          return this.enrichApplicationDetails(app);
        }),
      );
    } else {
      allApps = Array.from(this.inMemoryApplications.values()).filter((a) => {
        if (recruiterId && a.recruiterId !== recruiterId) return false;
        if (jobId && a.jobId !== jobId) return false;
        return true;
      });
      allApps = await Promise.all(allApps.map((a) => this.enrichApplicationDetails(a)));

      const jobs = await jobRepository.findAll({ recruiterId, status: "PUBLISHED" as any });
      activeJobsCount = jobs.pagination?.total ?? (jobs as any).total ?? jobs.jobs.length ?? 0;

      const interviews = await interviewRepository.findAll({ recruiterId, status: "SCHEDULED" as any });
      scheduledInterviewsCount = Array.isArray(interviews)
        ? interviews.length
        : (interviews as any).pagination?.total ?? 0;
    }

    const totalApplications = allApps.length;
    const newApplications = allApps.filter(
      (a) => new Date(a.appliedAt).getTime() >= cutoffDate.getTime(),
    ).length;

    const uniqueCandidateIds = new Set(allApps.map((a) => a.applicantId));
    const totalCandidates = uniqueCandidateIds.size;

    const candidatesAwaitingReview = allApps.filter(
      (a) => a.currentStage === "APPLIED" || a.status?.toUpperCase() === "APPLIED",
    ).length;

    const shortlistedCandidates = allApps.filter(
      (a) =>
        a.currentStage === "SCREENING" ||
        a.currentStage === "OFFERED" ||
        a.status?.toUpperCase() === "SHORTLISTED" ||
        a.status?.toUpperCase() === "SCREENING",
    ).length;

    const offersExtended = allApps.filter(
      (a) => a.currentStage === "OFFERED" || a.status?.toUpperCase() === "OFFERED",
    ).length;

    const offersAccepted = allApps.filter(
      (a) =>
        a.status?.toUpperCase() === "ACCEPTED" ||
        a.status?.toUpperCase() === "HIRED" ||
        a.hiringDecision?.status === "APPROVED",
    ).length;

    const kpis: RecruiterKpis = {
      totalCandidates,
      activeJobs: activeJobsCount,
      totalApplications,
      newApplications,
      shortlistedCandidates,
      interviewsScheduled: scheduledInterviewsCount,
      candidatesAwaitingReview,
      offersExtended,
      offersAccepted,
    };

    const stages: ApplicationStage[] = [
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "OFFERED",
      "REJECTED",
      "WITHDRAWN",
    ];
    const stageLabels: Record<ApplicationStage, string> = {
      APPLIED: "Applied",
      SCREENING: "Screening",
      INTERVIEW: "Interview",
      OFFERED: "Offered",
      REJECTED: "Rejected",
      WITHDRAWN: "Withdrawn",
    };

    const stageFunnel: StageFunnelItem[] = stages.map((st) => {
      const count = allApps.filter(
        (a) => a.currentStage === st || (st === "APPLIED" && a.status === "APPLIED"),
      ).length;
      const conversionRate = totalApplications > 0
        ? Math.round((count / totalApplications) * 1000) / 10
        : 0;
      return {
        stage: st,
        label: stageLabels[st],
        count,
        conversionRate,
      };
    });

    const applicationTrends = this.buildTrends(allApps, 5);

    const skillCounts: Record<string, number> = {};
    for (const app of allApps) {
      const skills = app.applicant?.skills || [];
      for (const s of skills) {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      }
    }
    const skillColorClasses = [
      "bg-brand-blue",
      "bg-brand-purple",
      "bg-brand-green",
      "bg-brand-orange",
      "bg-rose-500",
    ];
    const sortedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const firstSkill = sortedSkills[0];
    const maxSkillCount = firstSkill ? firstSkill[1] : 10;
    const topSkills: TopSkillItem[] = sortedSkills.map(([name, count], idx) => ({
      name,
      count,
      maxCount: Math.max(count, maxSkillCount),
      colorClass: skillColorClasses[idx % skillColorClasses.length] || "bg-brand-blue",
    }));

    const scores = allApps
      .map((a) => a.aiScore)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const topMatchesCount = allApps.filter((a) => (a.aiScore || 0) >= 80).length;

    const highScorers = allApps.filter(
      (a) => (a.aiScore || 0) >= 85 && (a.currentStage === "APPLIED" || a.currentStage === "SCREENING"),
    );
    const insightItems: RecruiterAIInsight[] = [];
    if (highScorers.length > 0) {
      insightItems.push({
        id: "insight-high-match",
        type: "HIGH_MATCH",
        title: "High Match Candidate Ready",
        description: `${highScorers.length} candidate${highScorers.length > 1 ? "s have" : " has"} an AI match score of 85%+ awaiting recruiter evaluation.`,
        bgClass: "bg-surface-green",
        toneClass: "text-brand-green",
      });
    }
    if (scheduledInterviewsCount > 0) {
      insightItems.push({
        id: "insight-interviews",
        type: "INTERVIEW_LOAD",
        title: "Active Interview Pipeline",
        description: `${scheduledInterviewsCount} upcoming interview round${scheduledInterviewsCount > 1 ? "s" : ""} coordinated across your active vacancies.`,
        bgClass: "bg-surface-purple",
        toneClass: "text-brand-purple",
      });
    }
    insightItems.push({
      id: "insight-screening",
      type: "EFFICIENCY",
      title: "Pipeline Velocity",
      description: `AI resume parsing active: average candidate screening turnaround maintained under 24 hours.`,
      bgClass: "bg-surface-blue",
      toneClass: "text-brand-blue",
    });

    const aiInsights: RecruiterAIInsightSummary = {
      avgScore,
      topMatchesCount,
      items: insightItems,
    };

    const recentActivity: RecruiterRecentActivity[] = allApps
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.appliedAt).getTime() -
          new Date(a.updatedAt || a.appliedAt).getTime(),
      )
      .slice(0, 6)
      .map((a) => ({
        id: `act-${a.id}`,
        type: (a.currentStage === "APPLIED" ? "APPLICATION_SUBMITTED" : "STAGE_CHANGED") as any,
        title: `${a.applicantName || "Candidate"} moved to ${a.currentStage || a.status}`,
        candidateName: a.applicantName || "Candidate",
        ...(a.jobTitle || a.job?.title ? { jobTitle: a.jobTitle || a.job?.title } : {}),
        timestamp: a.updatedAt || a.appliedAt,
        metadata: {
          applicationId: a.id,
          stage: a.currentStage,
          score: a.aiScore,
        },
      }));

    return {
      kpis,
      stageFunnel,
      funnel: stageFunnel,
      applicationTrends,
      topSkills,
      aiInsights,
      recentActivity,
    };
  }

  private buildTrends(allApps: IApplication[], bucketCount: number = 5): ApplicationTrendPoint[] {
    const points: ApplicationTrendPoint[] = [];
    const now = Date.now();
    const intervalMs = (30 * 24 * 60 * 60 * 1000) / bucketCount;

    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketEnd = now - i * intervalMs;
      const bucketStart = bucketEnd - intervalMs;

      const dateLabel = new Date(bucketEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const appsInBucket = allApps.filter((a) => {
        const t = new Date(a.appliedAt).getTime();
        return t >= bucketStart && t <= bucketEnd;
      });

      points.push({
        date: dateLabel,
        applications: appsInBucket.length,
        shortlisted: appsInBucket.filter(
          (a) =>
            a.currentStage === "SCREENING" ||
            a.currentStage === "OFFERED" ||
            a.status === "Shortlisted",
        ).length,
        interviewed: appsInBucket.filter(
          (a) => a.currentStage === "INTERVIEW" || a.status === "INTERVIEW",
        ).length,
        offered: appsInBucket.filter(
          (a) => a.currentStage === "OFFERED" || a.status === "OFFERED",
        ).length,
      });
    }

    return points;
  }

  public async updateStage(
    id: string,
    stage: IApplication["currentStage"],
  ): Promise<IApplication | null> {
    return this.updateStatus(id, {
      status: stage,
      currentStage: stage,
    });
  }

  public async delete(id: string): Promise<boolean> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      const res = await Application.findByIdAndDelete(id);
      this.inMemoryApplications.delete(id);
      return !!res;
    }
    return this.inMemoryApplications.delete(id);
  }
}

export const applicationRepository = new ApplicationRepository();

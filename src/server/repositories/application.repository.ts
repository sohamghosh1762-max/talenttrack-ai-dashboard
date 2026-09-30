import { Application, type IApplicationDocument } from "../models/Application.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId, userRepository } from "../db/user-repository.ts";
import { jobRepository } from "./job.repository.ts";
import { resumeRepository } from "./resume.repository.ts";
import type {
  IApplication,
  ApplicationQueryParams,
  PaginatedApplicationsResponse,
  CreateApplicationInput,
  UpdateApplicationStatusInput,
} from "../types/application-types.ts";

const DEFAULT_SEED_APPLICATIONS: IApplication[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    applicantId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003", // Rahul Mehta
    status: "Shortlisted",
    currentStage: "INTERVIEW",
    aiScore: 92,
    coverLetter: "I have 5+ years of production experience in React, Next.js, and TypeScript architectures.",
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
    coverLetter: "Specialist in transformer models, PyTorch embeddings, and vector similarity search.",
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

  public async findAll(params: ApplicationQueryParams = {}): Promise<PaginatedApplicationsResponse> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const targetStage = params.stage || params.currentStage;

    if (isDatabaseConnected()) {
      const query: Record<string, unknown> = {};

      if (params.jobId && isValidObjectId(params.jobId)) {
        query["jobId"] = params.jobId;
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
            jobId: doc.jobId && typeof doc.jobId === "object" ? doc.jobId._id.toString() : doc.jobId?.toString() || "",
            applicantId: doc.applicantId && typeof doc.applicantId === "object" ? doc.applicantId._id.toString() : doc.applicantId?.toString() || "",
            recruiterId: doc.recruiterId && typeof doc.recruiterId === "object" ? doc.recruiterId._id.toString() : doc.recruiterId?.toString() || "",
            resumeId: doc.resumeId || undefined,
            coverLetter: doc.coverLetter || undefined,
            status: doc.status,
            currentStage: doc.currentStage,
            aiScore: doc.aiScore || undefined,
            notes: doc.notes || undefined,
            appliedAt: doc.appliedAt || (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
            jobTitle: doc.jobId && typeof doc.jobId === "object" && "title" in doc.jobId ? (doc.jobId as { title: string }).title : undefined,
            applicantName: doc.applicantId && typeof doc.applicantId === "object" && "name" in doc.applicantId ? (doc.applicantId as { name: string }).name : undefined,
            applicantEmail: doc.applicantId && typeof doc.applicantId === "object" && "email" in doc.applicantId ? (doc.applicantId as { email: string }).email : undefined,
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
      if (params.applicantId && app.applicantId !== params.applicantId) return false;
      if (params.recruiterId && app.recruiterId !== params.recruiterId) return false;
      if (params.status && app.status !== params.status) return false;
      if (targetStage && app.currentStage !== targetStage) return false;
      if (params.search) {
        const q = params.search.toLowerCase();
        const matchesName = app.applicantName?.toLowerCase().includes(q) || app.applicant?.name?.toLowerCase().includes(q);
        const matchesEmail = app.applicantEmail?.toLowerCase().includes(q) || app.applicant?.email?.toLowerCase().includes(q);
        const matchesJob = app.jobTitle?.toLowerCase().includes(q) || app.job?.title?.toLowerCase().includes(q);
        const matchesSkill = app.applicant?.skills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesJob && !matchesSkill) return false;
      }
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
        jobId: doc.jobId && typeof doc.jobId === "object" ? doc.jobId._id.toString() : doc.jobId?.toString() || "",
        applicantId: doc.applicantId && typeof doc.applicantId === "object" ? doc.applicantId._id.toString() : doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId && typeof doc.recruiterId === "object" ? doc.recruiterId._id.toString() : doc.recruiterId?.toString() || "",
        resumeId: doc.resumeId || undefined,
        coverLetter: doc.coverLetter || undefined,
        status: doc.status,
        currentStage: doc.currentStage,
        aiScore: doc.aiScore || undefined,
        notes: doc.notes || undefined,
        appliedAt: doc.appliedAt || new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
        jobTitle: doc.jobId && typeof doc.jobId === "object" && "title" in doc.jobId ? (doc.jobId as { title: string }).title : undefined,
        applicantName: doc.applicantId && typeof doc.applicantId === "object" && "name" in doc.applicantId ? (doc.applicantId as { name: string }).name : undefined,
        applicantEmail: doc.applicantId && typeof doc.applicantId === "object" && "email" in doc.applicantId ? (doc.applicantId as { email: string }).email : undefined,
      };

      return this.enrichApplicationDetails(app);
    }

    const app = this.inMemoryApplications.get(id);
    return app ? this.enrichApplicationDetails(app) : null;
  }

  public async findByJobAndApplicant(jobId: string, applicantId: string): Promise<IApplication | null> {
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
      status: "APPLIED",
      currentStage: "APPLIED",
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
        jobId: updatedDoc.jobId && typeof updatedDoc.jobId === "object" ? updatedDoc.jobId._id.toString() : updatedDoc.jobId?.toString() || "",
        applicantId: updatedDoc.applicantId && typeof updatedDoc.applicantId === "object" ? updatedDoc.applicantId._id.toString() : updatedDoc.applicantId?.toString() || "",
        recruiterId: updatedDoc.recruiterId?.toString() || "",
        resumeId: updatedDoc.resumeId || undefined,
        coverLetter: updatedDoc.coverLetter || undefined,
        status: updatedDoc.status,
        currentStage: updatedDoc.currentStage,
        aiScore: updatedDoc.aiScore || undefined,
        notes: updatedDoc.notes || undefined,
        appliedAt: updatedDoc.appliedAt || now,
        updatedAt: updatedDoc.updatedAt ? new Date(updatedDoc.updatedAt).toISOString() : now,
        jobTitle: updatedDoc.jobId && typeof updatedDoc.jobId === "object" && "title" in updatedDoc.jobId ? (updatedDoc.jobId as { title: string }).title : undefined,
        applicantName: updatedDoc.applicantId && typeof updatedDoc.applicantId === "object" && "name" in updatedDoc.applicantId ? (updatedDoc.applicantId as { name: string }).name : undefined,
        applicantEmail: updatedDoc.applicantId && typeof updatedDoc.applicantId === "object" && "email" in updatedDoc.applicantId ? (updatedDoc.applicantId as { email: string }).email : undefined,
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

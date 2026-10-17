import { Job, type IJobDocument } from "../models/Job.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId, userRepository } from "../db/user-repository.ts";
import type {
  IJob,
  JobQueryParams,
  PaginatedJobsResponse,
  CreateJobInput,
  UpdateJobInput,
} from "../types/job-types.ts";

const DEFAULT_SEED_JOBS: IJob[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c101",
    title: "Senior Frontend Developer",
    description:
      "Build high-performance web applications using React, TypeScript, and modern CSS architecture.",
    department: "Engineering",
    location: "San Francisco, CA (Hybrid)",
    employmentType: "Full-Time",
    experienceRequired: "3-5 years",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
    salaryRange: { min: 140000, max: 180000, currency: "USD", isNegotiable: true },
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
    company: "TalentTrack Technologies",
    companyName: "TalentTrack Technologies",
    hiringManagerId: "65f1a2b3c4d5e6f7a8b9c020",
    hiringManagerIds: ["65f1a2b3c4d5e6f7a8b9c020"],
    status: "PUBLISHED",
    applicationsCount: 72,
    deadline: "2026-12-31",
    createdAt: "2025-08-20T08:00:00.000Z",
    updatedAt: "2025-08-20T08:00:00.000Z",
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c102",
    title: "Lead Backend Developer",
    description:
      "Design scalable REST & GraphQL APIs, microservices, and high-throughput data processing systems.",
    department: "Engineering",
    location: "Austin, TX (Remote)",
    employmentType: "Full-Time",
    experienceRequired: "4+ years",
    skills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL"],
    salaryRange: { min: 150000, max: 195000, currency: "USD", isNegotiable: true },
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
    company: "TalentTrack Technologies",
    companyName: "TalentTrack Technologies",
    hiringManagerId: "65f1a2b3c4d5e6f7a8b9c020",
    hiringManagerIds: ["65f1a2b3c4d5e6f7a8b9c020"],
    status: "PUBLISHED",
    applicationsCount: 58,
    deadline: "2026-12-31",
    createdAt: "2025-08-18T09:00:00.000Z",
    updatedAt: "2025-08-18T09:00:00.000Z",
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c103",
    title: "AI/ML Systems Engineer",
    description:
      "Implement transformer models, embeddings pipelines, and semantic search algorithms.",
    department: "Research",
    location: "New York, NY (Hybrid)",
    employmentType: "Full-Time",
    experienceRequired: "3+ years",
    skills: ["Python", "PyTorch", "Hugging Face", "Vector Search", "FastAPI"],
    salaryRange: { min: 160000, max: 210000, currency: "USD", isNegotiable: false },
    recruiterId: "65f1a2b3c4d5e6f7a8b9c004",
    company: "Stripe",
    companyName: "Stripe",
    hiringManagerId: "65f1a2b3c4d5e6f7a8b9c020",
    hiringManagerIds: ["65f1a2b3c4d5e6f7a8b9c020"],
    status: "PUBLISHED",
    applicationsCount: 36,
    deadline: "2026-11-30",
    createdAt: "2025-08-15T10:00:00.000Z",
    updatedAt: "2025-08-15T10:00:00.000Z",
  },
];

class JobRepository {
  private inMemoryJobs: Map<string, IJob> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryJobs.clear();
    for (const job of DEFAULT_SEED_JOBS) {
      this.inMemoryJobs.set(job.id, JSON.parse(JSON.stringify(job)));
    }
  }

  public clearAll(): void {
    this.inMemoryJobs.clear();
  }

  public resolveRecruiterCompany(recruiterId?: string): string {
    if (!recruiterId) return "Organization";
    const recruiterUser = userRepository.findFullUserById(recruiterId);
    if (recruiterUser?.recruiterProfile?.companyName) {
      return recruiterUser.recruiterProfile.companyName;
    }
    return "Organization";
  }

  public async findAll(params: JobQueryParams = {}): Promise<PaginatedJobsResponse> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    if (isDatabaseConnected()) {
      const query: Record<string, unknown> = {};

      if (params.search) {
        const searchRegex = new RegExp(params.search.trim(), "i");
        query["$or"] = [
          { title: searchRegex },
          { description: searchRegex },
          { department: searchRegex },
          { location: searchRegex },
          { skills: searchRegex },
          { company: searchRegex },
        ];
      }

      if (params.status) {
        query["status"] = params.status;
      }

      if (params.department && params.department !== "All") {
        query["department"] = new RegExp(`^${params.department}$`, "i");
      }

      if (params.location) {
        query["location"] = new RegExp(params.location, "i");
      }

      if (params.employmentType) {
        query["employmentType"] = params.employmentType;
      }

      if (params.recruiterId && isValidObjectId(params.recruiterId)) {
        query["recruiterId"] = params.recruiterId;
      }

      if (params.hiringManagerId) {
        query["$or"] = [
          { hiringManagerId: params.hiringManagerId },
          { hiringManagerIds: params.hiringManagerId },
        ];
      }

      const sortField = params.sortBy || "createdAt";
      const sortDirection = params.sortOrder === "asc" ? 1 : -1;

      const [docs, total] = await Promise.all([
        Job.find(query)
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(limit)
          .lean<IJobDocument[]>(),
        Job.countDocuments(query),
      ]);

      const jobs: IJob[] = docs.map((doc: any) => {
        const companyName =
          doc.company || this.resolveRecruiterCompany(doc.recruiterId?.toString());
        return {
          id: doc._id ? doc._id.toString() : doc.id,
          title: doc.title,
          description: doc.description,
          department: doc.department,
          location: doc.location,
          employmentType: doc.employmentType,
          experienceRequired: doc.experienceRequired || undefined,
          skills: doc.skills || [],
          salaryRange: doc.salaryRange || undefined,
          recruiterId: doc.recruiterId?.toString() || "",
          company: companyName,
          companyName: companyName,
          hiringManagerId: doc.hiringManagerId?.toString() || undefined,
          hiringManagerIds: doc.hiringManagerIds
            ? doc.hiringManagerIds.map((id: any) => id.toString())
            : undefined,
          status: doc.status,
          applicationsCount: doc.applicationsCount || 0,
          deadline: doc.deadline || undefined,
          createdAt: doc.createdAt
            ? new Date(doc.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: doc.updatedAt
            ? new Date(doc.updatedAt).toISOString()
            : new Date().toISOString(),
        };
      });

      return {
        jobs,
        data: jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      };
    }

    // In-memory fallback
    const all = Array.from(this.inMemoryJobs.values());
    const filtered = all.filter((job) => {
      if (params.search) {
        const s = params.search.toLowerCase();
        const matches =
          job.title.toLowerCase().includes(s) ||
          job.description.toLowerCase().includes(s) ||
          job.department.toLowerCase().includes(s) ||
          job.location.toLowerCase().includes(s) ||
          (job.company && job.company.toLowerCase().includes(s)) ||
          job.skills.some((sk) => sk.toLowerCase().includes(s));
        if (!matches) return false;
      }

      if (params.status && job.status !== params.status) {
        return false;
      }

      if (
        params.department &&
        params.department !== "All" &&
        job.department !== params.department
      ) {
        return false;
      }

      if (params.employmentType && job.employmentType !== params.employmentType) {
        return false;
      }

      if (params.recruiterId && job.recruiterId !== params.recruiterId) {
        return false;
      }

      if (params.hiringManagerId) {
        const matchesHM =
          job.hiringManagerId === params.hiringManagerId ||
          (job.hiringManagerIds && job.hiringManagerIds.includes(params.hiringManagerId));
        if (!matchesHM) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const field = params.sortBy || "createdAt";
      let comp = 0;
      if (field === "title") comp = a.title.localeCompare(b.title);
      else if (field === "department") comp = a.department.localeCompare(b.department);
      else comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return params.sortOrder === "asc" ? comp : -comp;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit).map((j) => {
      const company = j.company || this.resolveRecruiterCompany(j.recruiterId);
      return {
        ...j,
        company,
        companyName: company,
      };
    });

    return {
      jobs: paginated,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  public async findById(id: string): Promise<IJob | null> {
    if (!id) return null;

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Job.findById(id).lean<any>();
      if (!doc) return null;
      const company = doc.company || this.resolveRecruiterCompany(doc.recruiterId?.toString());
      return {
        id: doc._id ? doc._id.toString() : doc.id,
        title: doc.title,
        description: doc.description,
        department: doc.department,
        location: doc.location,
        employmentType: doc.employmentType,
        experienceRequired: doc.experienceRequired || undefined,
        skills: doc.skills || [],
        salaryRange: doc.salaryRange || undefined,
        recruiterId: doc.recruiterId?.toString() || "",
        company,
        companyName: company,
        hiringManagerId: doc.hiringManagerId?.toString() || undefined,
        hiringManagerIds: doc.hiringManagerIds
          ? doc.hiringManagerIds.map((id: any) => id.toString())
          : undefined,
        status: doc.status,
        applicationsCount: doc.applicationsCount || 0,
        deadline: doc.deadline || undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    const job = this.inMemoryJobs.get(id);
    if (!job) return null;
    const company = job.company || this.resolveRecruiterCompany(job.recruiterId);
    return {
      ...job,
      company,
      companyName: company,
    };
  }

  public async create(input: CreateJobInput): Promise<IJob> {
    const now = new Date().toISOString();
    const id = generateObjectId();
    const company =
      input.company || input.companyName || this.resolveRecruiterCompany(input.recruiterId);

    const jobData: IJob = {
      id,
      title: input.title.trim(),
      description: input.description,
      department: input.department.trim(),
      location: input.location.trim(),
      employmentType: input.employmentType || "Full-Time",
      experienceRequired: input.experienceRequired || undefined,
      skills: input.skills || [],
      salaryRange: input.salaryRange || undefined,
      recruiterId: input.recruiterId,
      company,
      companyName: company,
      hiringManagerId: input.hiringManagerId || undefined,
      hiringManagerIds: input.hiringManagerIds || undefined,
      status: input.status || "PUBLISHED",
      applicationsCount: 0,
      deadline: input.deadline || undefined,
      createdAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected()) {
      const created = await Job.create({
        _id: id,
        title: jobData.title,
        description: jobData.description,
        department: jobData.department,
        location: jobData.location,
        employmentType: jobData.employmentType,
        experienceRequired: jobData.experienceRequired,
        skills: jobData.skills,
        salaryRange: jobData.salaryRange,
        recruiterId: jobData.recruiterId,
        company: jobData.company,
        hiringManagerId: jobData.hiringManagerId,
        hiringManagerIds: jobData.hiringManagerIds,
        status: jobData.status,
        applicationsCount: 0,
        deadline: jobData.deadline,
      } as any);

      jobData.id = (created as any)._id?.toString() || id;
    }

    this.inMemoryJobs.set(jobData.id, jobData);
    return { ...jobData };
  }

  public async update(id: string, input: UpdateJobInput): Promise<IJob | null> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const updatedDoc = await Job.findByIdAndUpdate(
        id,
        {
          $set: {
            ...input,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      ).lean<any>();

      if (!updatedDoc) return null;

      const company =
        updatedDoc.company || this.resolveRecruiterCompany(updatedDoc.recruiterId?.toString());
      const job: IJob = {
        id: updatedDoc._id ? updatedDoc._id.toString() : id,
        title: updatedDoc.title,
        description: updatedDoc.description,
        department: updatedDoc.department,
        location: updatedDoc.location,
        employmentType: updatedDoc.employmentType,
        experienceRequired: updatedDoc.experienceRequired || undefined,
        skills: updatedDoc.skills || [],
        salaryRange: updatedDoc.salaryRange || undefined,
        recruiterId: updatedDoc.recruiterId?.toString() || "",
        company,
        companyName: company,
        hiringManagerId: updatedDoc.hiringManagerId?.toString() || undefined,
        hiringManagerIds: updatedDoc.hiringManagerIds
          ? updatedDoc.hiringManagerIds.map((id: any) => id.toString())
          : undefined,
        status: updatedDoc.status,
        applicationsCount: updatedDoc.applicationsCount || 0,
        deadline: updatedDoc.deadline || undefined,
        createdAt: updatedDoc.createdAt ? new Date(updatedDoc.createdAt).toISOString() : now,
        updatedAt: updatedDoc.updatedAt ? new Date(updatedDoc.updatedAt).toISOString() : now,
      };

      this.inMemoryJobs.set(id, job);
      return job;
    }

    const job = this.inMemoryJobs.get(id);
    if (!job) return null;

    Object.assign(job, input, { updatedAt: now });
    if (input.company || input.companyName) {
      job.company = input.company || input.companyName;
      job.companyName = job.company;
    }
    this.inMemoryJobs.set(id, job);
    return { ...job };
  }

  public async archive(id: string): Promise<IJob | null> {
    return this.update(id, { status: "ARCHIVED" });
  }

  public async delete(id: string): Promise<boolean> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      const res = await Job.findByIdAndDelete(id);
      this.inMemoryJobs.delete(id);
      return !!res;
    }
    return this.inMemoryJobs.delete(id);
  }

  public async incrementApplicationsCount(id: string): Promise<void> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      await Job.findByIdAndUpdate(id, { $inc: { applicationsCount: 1 } });
    }
    const job = this.inMemoryJobs.get(id);
    if (job) {
      job.applicationsCount = (job.applicationsCount || 0) + 1;
    }
  }
}

export const jobRepository = new JobRepository();

import { Interview, type IInterviewDocument } from "../models/Interview.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId, userRepository } from "../db/user-repository.ts";
import { jobRepository } from "./job.repository.ts";
import { applicationRepository } from "./application.repository.ts";
import type {
  IInterview,
  CreateInterviewInput,
  UpdateInterviewInput,
  InterviewQueryParams,
  IInterviewJobSummary,
  IInterviewInterviewer,
} from "../types/interview-types.ts";

const DEFAULT_SEED_INTERVIEWS: IInterview[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c601",
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    applicantId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003", // Rahul Mehta
    hiringManagerId: "65f1a2b3c4d5e6f7a8b9c020", // Alex Morgan
    interviewerIds: ["65f1a2b3c4d5e6f7a8b9c003", "65f1a2b3c4d5e6f7a8b9c020"],
    title: "Technical Round: Frontend System Architecture",
    type: "VIDEO",
    scheduledAt: "2026-10-15T10:00:00.000Z",
    durationMinutes: 45,
    timezone: "Asia/Kolkata",
    meetingUrl: "https://meet.google.com/ttk-arch-tech",
    instructions:
      "Please have your code editor ready and be prepared to discuss React architecture, state management, and real-time frontend optimization.",
    status: "SCHEDULED",
    notes: "Aarav demonstrated 92% AI ATS match score on React/TypeScript.",
    createdBy: "65f1a2b3c4d5e6f7a8b9c003",
    createdAt: "2025-09-15T10:00:00.000Z",
    updatedAt: "2025-09-15T10:00:00.000Z",
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c602",
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    applicantId: "65f1a2b3c4d5e6f7a8b9c008",
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
    title: "Initial Recruiter Screening Call",
    type: "PHONE",
    scheduledAt: "2025-09-12T09:00:00.000Z",
    durationMinutes: 30,
    timezone: "Asia/Kolkata",
    instructions: "Recruiter will initiate the phone call at the scheduled time.",
    status: "COMPLETED",
    notes:
      "Initial phone screening completed successfully. Candidate approved for technical round.",
    createdBy: "65f1a2b3c4d5e6f7a8b9c003",
    createdAt: "2025-09-10T08:00:00.000Z",
    updatedAt: "2025-09-12T09:30:00.000Z",
  },
];

class InterviewRepository {
  private inMemoryInterviews: Map<string, IInterview> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryInterviews.clear();
    for (const iv of DEFAULT_SEED_INTERVIEWS) {
      this.inMemoryInterviews.set(iv.id, { ...iv });
    }
  }

  public clearAll(): void {
    this.inMemoryInterviews.clear();
  }

  private async enrichInterview(iv: IInterview, hideNotes = false): Promise<IInterview> {
    const job = await jobRepository.findById(iv.jobId);
    let jobSummary: IInterviewJobSummary | undefined = undefined;
    if (job) {
      jobSummary = {
        id: job.id,
        title: job.title,
        department: job.department,
        company: job.company || job.companyName || "TalentTrack AI",
        location: job.location,
        employmentType: job.employmentType,
      };
    }

    const interviewerUser =
      userRepository.findById(iv.recruiterId) ||
      (iv.hiringManagerId ? userRepository.findById(iv.hiringManagerId) : null);
    let interviewerSummary: IInterviewInterviewer | undefined = undefined;
    if (interviewerUser) {
      interviewerSummary = {
        id: interviewerUser.id,
        name: interviewerUser.name,
        email: interviewerUser.email,
        role: interviewerUser.role,
        avatarUrl: interviewerUser.avatarUrl,
        companyName: interviewerUser.recruiterProfile?.companyName,
      };
    }

    const applicantUser = userRepository.findById(iv.applicantId);

    const result: IInterview = {
      ...iv,
      job: jobSummary,
      interviewer: interviewerSummary,
      applicant: applicantUser
        ? {
            id: applicantUser.id,
            name: applicantUser.name,
            email: applicantUser.email,
          }
        : undefined,
    };

    if (hideNotes) {
      delete result.notes;
    }

    return result;
  }

  public async findApplicantInterviews(
    applicantId: string,
    statusFilter?: string,
  ): Promise<IInterview[]> {
    if (isDatabaseConnected() && isValidObjectId(applicantId)) {
      const query: Record<string, unknown> = { applicantId };
      if (statusFilter && statusFilter !== "ALL") {
        query["status"] = statusFilter;
      }
      const docs = await Interview.find(query).sort({ scheduledAt: -1 }).lean<any[]>();
      const list: IInterview[] = docs.map((doc) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        applicationId: doc.applicationId?.toString() || "",
        jobId: doc.jobId?.toString() || "",
        applicantId: doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId?.toString() || "",
        hiringManagerId: doc.hiringManagerId?.toString() || undefined,
        interviewerIds: Array.isArray(doc.interviewerIds)
          ? doc.interviewerIds.map((id: any) => id.toString())
          : undefined,
        title: doc.title,
        type: doc.type,
        scheduledAt:
          doc.scheduledAt instanceof Date ? doc.scheduledAt.toISOString() : doc.scheduledAt,
        durationMinutes: doc.durationMinutes,
        timezone: doc.timezone,
        meetingUrl: doc.meetingUrl || undefined,
        location: doc.location || undefined,
        instructions: doc.instructions || undefined,
        status: doc.status,
        createdBy: doc.createdBy?.toString() || "",
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      }));

      return Promise.all(list.map((iv) => this.enrichInterview(iv, true)));
    }

    // In-memory fallback
    const all = Array.from(this.inMemoryInterviews.values());
    const matched = all.filter((iv) => {
      if (iv.applicantId !== applicantId) return false;
      if (statusFilter && statusFilter !== "ALL" && iv.status !== statusFilter) return false;
      return true;
    });

    matched.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return Promise.all(matched.map((iv) => this.enrichInterview(iv, true)));
  }

  public async findById(id: string, hideNotes = false): Promise<IInterview | null> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Interview.findById(id).lean<any>();
      if (!doc) return null;
      const iv: IInterview = {
        id: doc._id ? doc._id.toString() : doc.id,
        applicationId: doc.applicationId?.toString() || "",
        jobId: doc.jobId?.toString() || "",
        applicantId: doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId?.toString() || "",
        hiringManagerId: doc.hiringManagerId?.toString() || undefined,
        interviewerIds: Array.isArray(doc.interviewerIds)
          ? doc.interviewerIds.map((id: any) => id.toString())
          : undefined,
        title: doc.title,
        type: doc.type,
        scheduledAt:
          doc.scheduledAt instanceof Date ? doc.scheduledAt.toISOString() : doc.scheduledAt,
        durationMinutes: doc.durationMinutes,
        timezone: doc.timezone,
        meetingUrl: doc.meetingUrl || undefined,
        location: doc.location || undefined,
        instructions: doc.instructions || undefined,
        status: doc.status,
        notes: doc.notes || undefined,
        createdBy: doc.createdBy?.toString() || "",
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      };
      return this.enrichInterview(iv, hideNotes);
    }

    const iv = this.inMemoryInterviews.get(id);
    if (!iv) return null;
    return this.enrichInterview({ ...iv }, hideNotes);
  }

  public async findByApplicationId(
    applicationId: string,
    hideNotes = false,
  ): Promise<IInterview[]> {
    if (isDatabaseConnected() && isValidObjectId(applicationId)) {
      const docs = await Interview.find({ applicationId }).sort({ scheduledAt: 1 }).lean<any[]>();
      const list: IInterview[] = docs.map((doc) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        applicationId: doc.applicationId?.toString() || "",
        jobId: doc.jobId?.toString() || "",
        applicantId: doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId?.toString() || "",
        hiringManagerId: doc.hiringManagerId?.toString() || undefined,
        interviewerIds: Array.isArray(doc.interviewerIds)
          ? doc.interviewerIds.map((id: any) => id.toString())
          : undefined,
        title: doc.title,
        type: doc.type,
        scheduledAt:
          doc.scheduledAt instanceof Date ? doc.scheduledAt.toISOString() : doc.scheduledAt,
        durationMinutes: doc.durationMinutes,
        timezone: doc.timezone,
        meetingUrl: doc.meetingUrl || undefined,
        location: doc.location || undefined,
        instructions: doc.instructions || undefined,
        status: doc.status,
        notes: doc.notes || undefined,
        createdBy: doc.createdBy?.toString() || "",
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      }));
      return Promise.all(list.map((iv) => this.enrichInterview(iv, hideNotes)));
    }

    const all = Array.from(this.inMemoryInterviews.values());
    const matched = all.filter((iv) => iv.applicationId === applicationId);
    matched.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return Promise.all(matched.map((iv) => this.enrichInterview(iv, hideNotes)));
  }

  public async findAll(
    params: InterviewQueryParams = {},
    hideNotes = false,
  ): Promise<IInterview[]> {
    if (isDatabaseConnected()) {
      const query: Record<string, unknown> = {};
      if (params.applicantId && isValidObjectId(params.applicantId))
        query["applicantId"] = params.applicantId;
      if (params.recruiterId && isValidObjectId(params.recruiterId))
        query["recruiterId"] = params.recruiterId;
      if (params.hiringManagerId && isValidObjectId(params.hiringManagerId))
        query["hiringManagerId"] = params.hiringManagerId;
      if (params.jobId && isValidObjectId(params.jobId)) query["jobId"] = params.jobId;
      if (params.applicationId && isValidObjectId(params.applicationId))
        query["applicationId"] = params.applicationId;
      if (params.status && params.status !== "ALL") query["status"] = params.status;

      const docs = await Interview.find(query).sort({ scheduledAt: -1 }).lean<any[]>();
      const list: IInterview[] = docs.map((doc) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        applicationId: doc.applicationId?.toString() || "",
        jobId: doc.jobId?.toString() || "",
        applicantId: doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId?.toString() || "",
        hiringManagerId: doc.hiringManagerId?.toString() || undefined,
        interviewerIds: Array.isArray(doc.interviewerIds)
          ? doc.interviewerIds.map((id: any) => id.toString())
          : undefined,
        title: doc.title,
        type: doc.type,
        scheduledAt:
          doc.scheduledAt instanceof Date ? doc.scheduledAt.toISOString() : doc.scheduledAt,
        durationMinutes: doc.durationMinutes,
        timezone: doc.timezone,
        meetingUrl: doc.meetingUrl || undefined,
        location: doc.location || undefined,
        instructions: doc.instructions || undefined,
        status: doc.status,
        notes: doc.notes || undefined,
        createdBy: doc.createdBy?.toString() || "",
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      }));
      return Promise.all(list.map((iv) => this.enrichInterview(iv, hideNotes)));
    }

    const all = Array.from(this.inMemoryInterviews.values());
    const matched = all.filter((iv) => {
      if (params.applicantId && iv.applicantId !== params.applicantId) return false;
      if (params.recruiterId && iv.recruiterId !== params.recruiterId) return false;
      if (params.hiringManagerId && iv.hiringManagerId !== params.hiringManagerId) return false;
      if (params.jobId && iv.jobId !== params.jobId) return false;
      if (params.applicationId && iv.applicationId !== params.applicationId) return false;
      if (params.status && params.status !== "ALL" && iv.status !== params.status) return false;
      return true;
    });

    matched.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return Promise.all(matched.map((iv) => this.enrichInterview(iv, hideNotes)));
  }

  public async create(
    input: CreateInterviewInput,
    createdBy: string,
    applicantId: string,
    recruiterId: string,
    jobId: string,
  ): Promise<IInterview> {
    const now = new Date().toISOString();
    const id = generateObjectId();

    const ivData: IInterview = {
      id,
      applicationId: input.applicationId,
      jobId,
      applicantId,
      recruiterId,
      hiringManagerId: input.hiringManagerId || undefined,
      interviewerIds: input.interviewerIds || [recruiterId],
      title: input.title?.trim() || "Technical Interview",
      type: input.type || "VIDEO",
      scheduledAt: new Date(input.scheduledAt).toISOString(),
      durationMinutes: input.durationMinutes || 45,
      timezone: input.timezone || "Asia/Kolkata",
      meetingUrl: input.meetingUrl?.trim() || undefined,
      location: input.location?.trim() || undefined,
      instructions: input.instructions?.trim() || undefined,
      status: "SCHEDULED",
      notes: input.notes?.trim() || undefined,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected()) {
      const created = await Interview.create({
        _id: id,
        applicationId: ivData.applicationId,
        jobId: ivData.jobId,
        applicantId: ivData.applicantId,
        recruiterId: ivData.recruiterId,
        hiringManagerId: ivData.hiringManagerId,
        interviewerIds: ivData.interviewerIds,
        title: ivData.title,
        type: ivData.type,
        scheduledAt: new Date(ivData.scheduledAt),
        durationMinutes: ivData.durationMinutes,
        timezone: ivData.timezone,
        meetingUrl: ivData.meetingUrl,
        location: ivData.location,
        instructions: ivData.instructions,
        status: ivData.status,
        notes: ivData.notes,
        createdBy: ivData.createdBy,
      } as any);

      ivData.id = (created as any)._id?.toString() || id;
    }

    this.inMemoryInterviews.set(ivData.id, ivData);
    return this.enrichInterview(ivData);
  }

  public async update(id: string, input: UpdateInterviewInput): Promise<IInterview | null> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const updateDoc: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) updateDoc["title"] = input.title.trim();
      if (input.type !== undefined) updateDoc["type"] = input.type;
      if (input.scheduledAt !== undefined) updateDoc["scheduledAt"] = new Date(input.scheduledAt);
      if (input.durationMinutes !== undefined) updateDoc["durationMinutes"] = input.durationMinutes;
      if (input.timezone !== undefined) updateDoc["timezone"] = input.timezone;
      if (input.meetingUrl !== undefined)
        updateDoc["meetingUrl"] = input.meetingUrl.trim() || undefined;
      if (input.location !== undefined) updateDoc["location"] = input.location.trim() || undefined;
      if (input.instructions !== undefined)
        updateDoc["instructions"] = input.instructions.trim() || undefined;
      if (input.status !== undefined) updateDoc["status"] = input.status;
      if (input.notes !== undefined) updateDoc["notes"] = input.notes.trim() || undefined;

      const updated = await Interview.findByIdAndUpdate(
        id,
        { $set: updateDoc },
        { new: true, runValidators: true },
      ).lean<any>();

      if (!updated) return null;
      return this.findById(id);
    }

    const existing = this.inMemoryInterviews.get(id);
    if (!existing) return null;

    if (input.title !== undefined) existing.title = input.title.trim();
    if (input.type !== undefined) existing.type = input.type;
    if (input.scheduledAt !== undefined)
      existing.scheduledAt = new Date(input.scheduledAt).toISOString();
    if (input.durationMinutes !== undefined) existing.durationMinutes = input.durationMinutes;
    if (input.timezone !== undefined) existing.timezone = input.timezone;
    if (input.meetingUrl !== undefined) existing.meetingUrl = input.meetingUrl.trim() || undefined;
    if (input.location !== undefined) existing.location = input.location.trim() || undefined;
    if (input.instructions !== undefined)
      existing.instructions = input.instructions.trim() || undefined;
    if (input.status !== undefined) existing.status = input.status;
    if (input.notes !== undefined) existing.notes = input.notes.trim() || undefined;
    existing.updatedAt = now;

    this.inMemoryInterviews.set(id, existing);
    return this.enrichInterview(existing);
  }

  public async delete(id: string): Promise<boolean> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      const res = await Interview.findByIdAndDelete(id);
      return Boolean(res);
    }
    return this.inMemoryInterviews.delete(id);
  }
}

export const interviewRepository = new InterviewRepository();

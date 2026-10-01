import { Interview, type IInterviewDocument, type IInterview, type InterviewStatus } from "../models/Interview.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId } from "../db/user-repository.ts";

export interface InterviewQueryParams {
  recruiterId?: string;
  applicantId?: string;
  jobId?: string;
  status?: InterviewStatus | "All";
  search?: string;
}

const DEFAULT_SEED_INTERVIEWS: IInterview[] = [
  {
    id: "rec-int-1",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    applicantId: "65f1a2b3c4d5e6f7a8b9c008",
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
    candidateName: "Aarav Mehta",
    candidateEmail: "aarav.mehta@example.com",
    jobRole: "Senior Frontend Developer",
    stage: "Technical Deep Dive",
    interviewer: "Sarah Jenkins (VP Eng)",
    dateTime: "Tomorrow at 3:00 PM EST",
    interviewType: "Video Call",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    status: "Scheduled",
    score: 92,
  },
  {
    id: "rec-int-2",
    jobId: "65f1a2b3c4d5e6f7a8b9c102",
    applicantId: "65f1a2b3c4d5e6f7a8b9c009",
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
    candidateName: "Rohit Singh",
    candidateEmail: "rohit.singh@example.com",
    jobRole: "Lead Backend Developer",
    stage: "System Design & Architecture",
    interviewer: "David Kim (Lead Architect)",
    dateTime: "Oct 3, 2025 at 1:30 PM EST",
    interviewType: "Video Call",
    meetingLink: "https://zoom.us/j/1234567890",
    status: "Scheduled",
    score: 76,
  },
  {
    id: "rec-int-3",
    jobId: "65f1a2b3c4d5e6f7a8b9c103",
    applicantId: "65f1a2b3c4d5e6f7a8b9c010",
    recruiterId: "65f1a2b3c4d5e6f7a8b9c003",
    candidateName: "Priya Nair",
    candidateEmail: "priya.nair@example.com",
    jobRole: "AI/ML Systems Engineer",
    stage: "Technical Problem Solving",
    interviewer: "Dr. Alex Chen (AI Lead)",
    dateTime: "Sep 28, 2025 at 10:00 AM EST",
    interviewType: "Video Call",
    meetingLink: "https://meet.google.com/qrs-tuvw-xyz",
    status: "Pending Feedback",
    score: 88,
    feedbackNotes: "Candidate demonstrated exceptional domain knowledge on transformer fine-tuning.",
  },
];

class InterviewRepository {
  private inMemoryInterviews: Map<string, IInterview> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryInterviews.clear();
    for (const item of DEFAULT_SEED_INTERVIEWS) {
      this.inMemoryInterviews.set(item.id, JSON.parse(JSON.stringify(item)));
    }
  }

  public async findAll(params: InterviewQueryParams = {}): Promise<IInterview[]> {
    if (isDatabaseConnected()) {
      const query: Record<string, unknown> = {};

      if (params.recruiterId && isValidObjectId(params.recruiterId)) {
        query["recruiterId"] = params.recruiterId;
      }
      if (params.applicantId && isValidObjectId(params.applicantId)) {
        query["applicantId"] = params.applicantId;
      }
      if (params.jobId && isValidObjectId(params.jobId)) {
        query["jobId"] = params.jobId;
      }
      if (params.status && params.status !== "All") {
        query["status"] = params.status;
      }
      if (params.search) {
        const regex = new RegExp(params.search.trim(), "i");
        query["$or"] = [
          { candidateName: regex },
          { jobRole: regex },
          { interviewer: regex },
          { stage: regex },
        ];
      }

      const docs = await Interview.find(query).sort({ createdAt: -1 }).lean<IInterviewDocument[]>();
      return docs.map((doc: any) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        jobId: doc.jobId?.toString() || "",
        applicantId: doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId?.toString() || "",
        applicationId: doc.applicationId?.toString() || undefined,
        candidateName: doc.candidateName,
        candidateEmail: doc.candidateEmail || undefined,
        jobRole: doc.jobRole,
        stage: doc.stage || "Technical Screen",
        interviewer: doc.interviewer,
        dateTime: doc.dateTime,
        interviewType: doc.interviewType || "Video Call",
        meetingLink: doc.meetingLink || "https://meet.google.com/new-session",
        location: doc.location || undefined,
        notes: doc.notes || undefined,
        feedbackNotes: doc.feedbackNotes || undefined,
        score: doc.score || undefined,
        status: doc.status || "Scheduled",
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      }));
    }

    const all = Array.from(this.inMemoryInterviews.values());
    return all.filter((item) => {
      if (params.recruiterId && item.recruiterId !== params.recruiterId) return false;
      if (params.applicantId && item.applicantId !== params.applicantId) return false;
      if (params.jobId && item.jobId !== params.jobId) return false;
      if (params.status && params.status !== "All" && item.status !== params.status) return false;
      if (params.search) {
        const s = params.search.toLowerCase();
        const matches =
          item.candidateName.toLowerCase().includes(s) ||
          item.jobRole.toLowerCase().includes(s) ||
          item.interviewer.toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });
  }

  public async findById(id: string): Promise<IInterview | null> {
    if (!id) return null;

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Interview.findById(id).lean<any>();
      if (!doc) return null;
      return {
        id: doc._id ? doc._id.toString() : doc.id,
        jobId: doc.jobId?.toString() || "",
        applicantId: doc.applicantId?.toString() || "",
        recruiterId: doc.recruiterId?.toString() || "",
        applicationId: doc.applicationId?.toString() || undefined,
        candidateName: doc.candidateName,
        candidateEmail: doc.candidateEmail || undefined,
        jobRole: doc.jobRole,
        stage: doc.stage || "Technical Screen",
        interviewer: doc.interviewer,
        dateTime: doc.dateTime,
        interviewType: doc.interviewType || "Video Call",
        meetingLink: doc.meetingLink || "https://meet.google.com/new-session",
        location: doc.location || undefined,
        notes: doc.notes || undefined,
        feedbackNotes: doc.feedbackNotes || undefined,
        score: doc.score || undefined,
        status: doc.status || "Scheduled",
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    const item = this.inMemoryInterviews.get(id);
    return item ? { ...item } : null;
  }

  public async create(input: Omit<IInterview, "id">): Promise<IInterview> {
    const id = generateObjectId();
    const now = new Date().toISOString();

    const newInterview: IInterview = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected()) {
      const created = await Interview.create({
        _id: id,
        jobId: isValidObjectId(input.jobId) ? input.jobId : generateObjectId(),
        applicantId: isValidObjectId(input.applicantId) ? input.applicantId : generateObjectId(),
        recruiterId: isValidObjectId(input.recruiterId) ? input.recruiterId : generateObjectId(),
        applicationId: input.applicationId && isValidObjectId(input.applicationId) ? input.applicationId : undefined,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        jobRole: input.jobRole,
        stage: input.stage || "Technical Screen",
        interviewer: input.interviewer,
        dateTime: input.dateTime,
        interviewType: input.interviewType || "Video Call",
        meetingLink: input.meetingLink || "https://meet.google.com/new-session",
        location: input.location,
        notes: input.notes,
        feedbackNotes: input.feedbackNotes,
        score: input.score,
        status: input.status || "Scheduled",
      } as any);

      newInterview.id = (created as any)._id?.toString() || id;
    }

    this.inMemoryInterviews.set(newInterview.id, newInterview);
    return { ...newInterview };
  }

  public async update(id: string, input: Partial<IInterview>): Promise<IInterview | null> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const updatedDoc = await Interview.findByIdAndUpdate(
        id,
        {
          $set: {
            ...input,
            updatedAt: new Date(),
          },
        },
        { new: true },
      ).lean<any>();

      if (!updatedDoc) return null;

      const item: IInterview = {
        id: updatedDoc._id ? updatedDoc._id.toString() : id,
        jobId: updatedDoc.jobId?.toString() || "",
        applicantId: updatedDoc.applicantId?.toString() || "",
        recruiterId: updatedDoc.recruiterId?.toString() || "",
        applicationId: updatedDoc.applicationId?.toString() || undefined,
        candidateName: updatedDoc.candidateName,
        candidateEmail: updatedDoc.candidateEmail || undefined,
        jobRole: updatedDoc.jobRole,
        stage: updatedDoc.stage || "Technical Screen",
        interviewer: updatedDoc.interviewer,
        dateTime: updatedDoc.dateTime,
        interviewType: updatedDoc.interviewType || "Video Call",
        meetingLink: updatedDoc.meetingLink || "https://meet.google.com/new-session",
        location: updatedDoc.location || undefined,
        notes: updatedDoc.notes || undefined,
        feedbackNotes: updatedDoc.feedbackNotes || undefined,
        score: updatedDoc.score || undefined,
        status: updatedDoc.status || "Scheduled",
        createdAt: updatedDoc.createdAt ? new Date(updatedDoc.createdAt).toISOString() : now,
        updatedAt: updatedDoc.updatedAt ? new Date(updatedDoc.updatedAt).toISOString() : now,
      };

      this.inMemoryInterviews.set(id, item);
      return item;
    }

    const item = this.inMemoryInterviews.get(id);
    if (!item) return null;

    Object.assign(item, input, { updatedAt: now });
    this.inMemoryInterviews.set(id, item);
    return { ...item };
  }

  public async delete(id: string): Promise<boolean> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      await Interview.findByIdAndDelete(id);
    }
    return this.inMemoryInterviews.delete(id);
  }
}

export const interviewRepository = new InterviewRepository();

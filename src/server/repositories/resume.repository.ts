import { Resume, type IResumeDocument } from "../models/Resume.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId } from "../db/user-repository.ts";
import type { IResume, UploadResumeInput } from "../types/resume-types.ts";

const DEFAULT_SEED_RESUMES: IResume[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c301",
    applicantId: "65f1a2b3c4d5e6f7a8b9c004", // Jane Applicant
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    originalFileName: "Jane_Applicant_Resume.pdf",
    storedFileName: "uuid-jane-applicant-resume.pdf",
    mimeType: "application/pdf",
    fileSize: 245678,
    s3Key: "resumes/65f1a2b3c4d5e6f7a8b9c004/uuid-jane-applicant-resume.pdf",
    s3Bucket: "talenttrack-resumes-private",
    uploadedAt: "2025-08-20T10:00:00.000Z",
    parsingStatus: "COMPLETED",
    parsedProfile: {
      personal: {
        fullName: "Jane Applicant",
        email: "jane.applicant@example.com",
        phone: "+1 555-0199",
        location: "San Francisco, CA",
        linkedin: "https://linkedin.com/in/janeapplicant",
        github: "https://github.com/janeapplicant",
        portfolio: "https://janeapplicant.dev",
      },
      summary: "Full Stack Engineer with 4+ years of experience in React, TypeScript, and Node.js.",
      skills: [
        "React",
        "TypeScript",
        "Node.js",
        "Express",
        "MongoDB",
        "PostgreSQL",
        "Docker",
        "AWS",
        "Tailwind CSS",
      ],
      education: [
        {
          degree: "B.S. in Computer Science",
          institution: "University of California, Berkeley",
          fieldOfStudy: "Computer Science",
          startDate: "2018-09",
          endDate: "2022-05",
          grade: "3.8 GPA",
        },
      ],
      experience: [
        {
          company: "TechFlow Systems",
          role: "Senior Software Engineer",
          location: "San Francisco, CA",
          startDate: "2022-06",
          endDate: "Present",
          description: [
            "Architected scalable microservices handling 2M+ daily requests.",
            "Led a team of 4 frontend engineers building Next.js dashboards.",
          ],
          technologies: ["React", "TypeScript", "Node.js", "AWS"],
        },
      ],
      projects: [
        {
          name: "OpenSource ATS",
          description: "An automated candidate ranking and resume parsing pipeline.",
          technologies: ["TypeScript", "Next.js", "MongoDB"],
          url: "https://github.com/janeapplicant/ats",
        },
      ],
      certifications: [
        {
          name: "AWS Certified Solutions Architect",
          issuer: "Amazon Web Services",
          date: "2023-04",
        },
      ],
      languages: ["English", "Hindi"],
      achievements: ["Hackathon Winner 2023 (1st place out of 120 teams)"],
    },
    parsedAt: "2025-08-20T10:05:00.000Z",
    parsingError: null,
    createdAt: "2025-08-20T10:00:00.000Z",
    updatedAt: "2025-08-20T10:00:00.000Z",
  },
];

class ResumeRepository {
  private inMemoryResumes: Map<string, IResume> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryResumes.clear();
    for (const resume of DEFAULT_SEED_RESUMES) {
      this.inMemoryResumes.set(resume.id, JSON.parse(JSON.stringify(resume)));
    }
  }

  public clearAll(): void {
    this.inMemoryResumes.clear();
  }

  private mapDocumentToResume(doc: any): IResume {
    return {
      id: doc._id ? doc._id.toString() : doc.id,
      applicantId: doc.applicantId ? doc.applicantId.toString() : "",
      applicationId: doc.applicationId ? doc.applicationId.toString() : undefined,
      originalFileName: doc.originalFileName,
      storedFileName: doc.storedFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      s3Key: doc.s3Key,
      s3Bucket: doc.s3Bucket,
      uploadedAt: doc.uploadedAt,
      parsingStatus: doc.parsingStatus || "NOT_STARTED",
      parsedProfile: doc.parsedProfile || null,
      parsedAt: doc.parsedAt || null,
      parsingError: doc.parsingError || null,
      atsScore: doc.atsScore !== undefined ? doc.atsScore : null,
      atsAnalysis: doc.atsAnalysis || null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  public async create(data: UploadResumeInput): Promise<IResume> {
    const now = new Date().toISOString();

    if (isDatabaseConnected()) {
      const doc = await Resume.create({
        applicantId: data.applicantId,
        applicationId: data.applicationId || undefined,
        originalFileName: data.originalFileName,
        storedFileName: data.storedFileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        s3Key: data.s3Key,
        s3Bucket: data.s3Bucket,
        uploadedAt: now,
        parsingStatus: "NOT_STARTED",
        parsedProfile: null,
        parsedAt: null,
        parsingError: null,
        atsScore: null,
        atsAnalysis: null,
      });

      return this.mapDocumentToResume(doc);
    }

    // In-memory fallback
    const id = generateObjectId();
    const resume: IResume = {
      id,
      applicantId: data.applicantId,
      applicationId: data.applicationId || undefined,
      originalFileName: data.originalFileName || (data as any).fileName || "resume.pdf",
      storedFileName: data.storedFileName || (data as any).fileName || "resume.pdf",
      mimeType: data.mimeType || "application/pdf",
      fileSize: data.fileSize || 102400,
      s3Key: data.s3Key || "resumes/sample.pdf",
      s3Bucket: data.s3Bucket || "talenttrack-resumes",
      uploadedAt: now,
      parsingStatus:
        (data as any).parsingStatus || ((data as any).parsedProfile ? "COMPLETED" : "NOT_STARTED"),
      parsedProfile: (data as any).parsedProfile || null,
      parsedAt: (data as any).parsedProfile ? now : null,
      parsingError: null,
      atsScore: (data as any).atsScore || null,
      atsAnalysis: (data as any).atsAnalysis || null,
      createdAt: now,
      updatedAt: now,
    };

    this.inMemoryResumes.set(id, resume);
    return resume;
  }

  public async findById(id: string): Promise<IResume | null> {
    if (!id) return null;

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Resume.findById(id).lean<any>();
      if (!doc) return null;

      return this.mapDocumentToResume(doc);
    }

    const item = this.inMemoryResumes.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public async findByApplicantId(applicantId: string): Promise<IResume[]> {
    if (!applicantId) return [];

    if (isDatabaseConnected() && isValidObjectId(applicantId)) {
      const docs = await Resume.find({ applicantId }).sort({ createdAt: -1 }).lean<any[]>();

      return docs.map((doc) => this.mapDocumentToResume(doc));
    }

    const all = Array.from(this.inMemoryResumes.values());
    return all
      .filter((r) => r.applicantId === applicantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async findByApplicationId(applicationId: string): Promise<IResume | null> {
    if (!applicationId) return null;

    if (isDatabaseConnected() && isValidObjectId(applicationId)) {
      const doc = await Resume.findOne({ applicationId }).lean<any>();
      if (!doc) return null;

      return this.mapDocumentToResume(doc);
    }

    for (const resume of this.inMemoryResumes.values()) {
      if (resume.applicationId === applicationId) {
        return JSON.parse(JSON.stringify(resume));
      }
    }
    return null;
  }

  public async linkToApplication(resumeId: string, applicationId: string): Promise<IResume | null> {
    if (!resumeId || !applicationId) return null;

    if (isDatabaseConnected() && isValidObjectId(resumeId) && isValidObjectId(applicationId)) {
      const doc = await Resume.findByIdAndUpdate(
        resumeId,
        { applicationId },
        { new: true },
      ).lean<any>();
      if (!doc) return null;

      return this.mapDocumentToResume(doc);
    }

    const item = this.inMemoryResumes.get(resumeId);
    if (!item) return null;
    item.applicationId = applicationId;
    item.updatedAt = new Date().toISOString();
    return JSON.parse(JSON.stringify(item));
  }

  public async updateParsingStatus(
    id: string,
    update: {
      parsingStatus: "NOT_STARTED" | "PROCESSING" | "COMPLETED" | "FAILED";
      parsedProfile?: any;
      parsedAt?: string | null;
      parsingError?: string | null;
      atsScore?: number | null;
      atsAnalysis?: any | null;
    },
  ): Promise<IResume | null> {
    if (!id) return null;

    const updateFields: Record<string, any> = {
      parsingStatus: update.parsingStatus,
      updatedAt: new Date().toISOString(),
    };

    if (update.parsedProfile !== undefined) {
      updateFields["parsedProfile"] = update.parsedProfile;
    }
    if (update.parsedAt !== undefined) {
      updateFields["parsedAt"] = update.parsedAt;
    }
    if (update.parsingError !== undefined) {
      updateFields["parsingError"] = update.parsingError;
    }
    if (update.atsScore !== undefined) {
      updateFields["atsScore"] = update.atsScore;
    }
    if (update.atsAnalysis !== undefined) {
      updateFields["atsAnalysis"] = update.atsAnalysis;
    }

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Resume.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true },
      ).lean<any>();
      if (!doc) return null;
      return this.mapDocumentToResume(doc);
    }

    const item = this.inMemoryResumes.get(id);
    if (!item) return null;

    Object.assign(item, updateFields);
    return JSON.parse(JSON.stringify(item));
  }

  public async updateAtsAnalysis(id: string, atsAnalysis: any): Promise<IResume | null> {
    if (!id) return null;

    const updateFields: Record<string, any> = {
      atsScore: atsAnalysis?.overallScore !== undefined ? atsAnalysis.overallScore : null,
      atsAnalysis: atsAnalysis || null,
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Resume.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true },
      ).lean<any>();
      if (!doc) return null;
      return this.mapDocumentToResume(doc);
    }

    const item = this.inMemoryResumes.get(id);
    if (!item) return null;

    Object.assign(item, updateFields);
    return JSON.parse(JSON.stringify(item));
  }

  public async update(
    id: string,
    update: Partial<IResume> | Record<string, any>,
  ): Promise<IResume | null> {
    return this.updateParsingStatus(id, update as any);
  }

  public async delete(id: string): Promise<boolean> {
    if (!id) return false;

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const res = await Resume.findByIdAndDelete(id);
      return !!res;
    }

    return this.inMemoryResumes.delete(id);
  }
}

export const resumeRepository = new ResumeRepository();

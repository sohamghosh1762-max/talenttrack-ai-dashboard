import { Resume, type IResumeDocument } from "../models/Resume.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId } from "../db/user-repository.ts";
import type { IResume, UploadResumeInput } from "../types/resume-types.ts";

const DEFAULT_SEED_RESUMES: IResume[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c301",
    applicantId: "65f1a2b3c4d5e6f7a8b9c004", // Jane Applicant
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    originalFileName: "Aarav_Mehta_Resume_2025.pdf",
    storedFileName: "uuid-aarav-mehta-resume.pdf",
    mimeType: "application/pdf",
    fileSize: 245678,
    s3Key: "resumes/65f1a2b3c4d5e6f7a8b9c004/uuid-aarav-mehta-resume.pdf",
    s3Bucket: "talenttrack-resumes-private",
    uploadedAt: "2025-08-20T10:00:00.000Z",
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
      });

      return {
        id: doc._id.toString(),
        applicantId: doc.applicantId ? doc.applicantId.toString() : data.applicantId,
        applicationId: doc.applicationId ? doc.applicationId.toString() : undefined,
        originalFileName: doc.originalFileName,
        storedFileName: doc.storedFileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        s3Key: doc.s3Key,
        s3Bucket: doc.s3Bucket,
        uploadedAt: doc.uploadedAt,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : now,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : now,
      };
    }

    // In-memory fallback
    const id = generateObjectId();
    const resume: IResume = {
      id,
      applicantId: data.applicantId,
      applicationId: data.applicationId || undefined,
      originalFileName: data.originalFileName,
      storedFileName: data.storedFileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      s3Key: data.s3Key,
      s3Bucket: data.s3Bucket,
      uploadedAt: now,
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
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    const item = this.inMemoryResumes.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public async findByApplicantId(applicantId: string): Promise<IResume[]> {
    if (!applicantId) return [];

    if (isDatabaseConnected() && isValidObjectId(applicantId)) {
      const docs = await Resume.find({ applicantId })
        .sort({ createdAt: -1 })
        .lean<any[]>();

      return docs.map((doc) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        applicantId: doc.applicantId ? doc.applicantId.toString() : applicantId,
        applicationId: doc.applicationId ? doc.applicationId.toString() : undefined,
        originalFileName: doc.originalFileName,
        storedFileName: doc.storedFileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        s3Key: doc.s3Key,
        s3Bucket: doc.s3Bucket,
        uploadedAt: doc.uploadedAt,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      }));
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
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
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
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    const item = this.inMemoryResumes.get(resumeId);
    if (!item) return null;
    item.applicationId = applicationId;
    item.updatedAt = new Date().toISOString();
    return JSON.parse(JSON.stringify(item));
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

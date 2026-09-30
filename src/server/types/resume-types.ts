export type ResumeParsingStatus = "NOT_STARTED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface IParsedResumePersonal {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface IParsedResumeEducation {
  degree: string;
  institution: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade: string;
}

export interface IParsedResumeExperience {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string[];
  technologies: string[];
}

export interface IParsedResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url: string;
}

export interface IParsedResumeCertification {
  name: string;
  issuer: string;
  date: string;
}

export interface IParsedResumeProfile {
  personal: IParsedResumePersonal;
  summary: string;
  skills: string[];
  education: IParsedResumeEducation[];
  experience: IParsedResumeExperience[];
  projects: IParsedResumeProject[];
  certifications: IParsedResumeCertification[];
  languages: string[];
  achievements: string[];
}

export interface IResume {
  id: string; // 24-char MongoDB ObjectId
  applicantId: string; // Reference to User / Applicant
  applicationId?: string | undefined; // Reference to Application (optional)
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number; // in bytes
  s3Key: string;
  s3Bucket: string;
  uploadedAt: string;
  parsingStatus: ResumeParsingStatus;
  parsedProfile?: IParsedResumeProfile | null;
  parsedAt?: string | null;
  parsingError?: string | null;
  atsScore?: number | null;
  atsAnalysis?: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResumeInput {
  applicantId: string;
  applicationId?: string | undefined;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  s3Bucket: string;
}

export interface ResumePresignedUrlResponse {
  resumeId: string;
  downloadUrl: string;
  expiresInSeconds: number;
  fileName: string;
  mimeType: string;
}

export interface ParseResumeResponse {
  resumeId: string;
  status: ResumeParsingStatus;
  parsingStatus: ResumeParsingStatus;
  parsedProfile: IParsedResumeProfile | null;
  parsedAt: string | null;
  parsingError?: string | null;
}


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

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import { env } from "../config/env.ts";

export interface S3UploadResult {
  s3Key: string;
  s3Bucket: string;
  storedFileName: string;
}

export class S3Service {
  private s3Client: S3Client | null = null;
  private bucket: string;
  private region: string;
  private isConfigured: boolean = false;

  // In-memory fallback buffer cache for local testing / mock mode without AWS credentials
  private mockStorage: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  constructor() {
    this.region = env.AWS_REGION || "us-east-1";
    this.bucket = env.AWS_S3_BUCKET || "talenttrack-resumes-private";

    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.isConfigured = true;
    } else {
      // In-memory mock storage mode
      this.isConfigured = false;
    }
  }

  /**
   * Sanitizes original filename to prevent path traversal or invalid S3 characters
   */
  public sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.+/g, ".")
      .substring(0, 100);
  }

  /**
   * Generates a safe, collision-resistant S3 object key
   * Format: resumes/{applicantId}/{uuid}-{sanitizedName}
   */
  public generateS3Key(applicantId: string, originalFileName: string): { s3Key: string; storedFileName: string } {
    const cleanName = this.sanitizeFileName(originalFileName);
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    const storedFileName = `${uniqueId}-${cleanName}`;
    const s3Key = `resumes/${applicantId}/${storedFileName}`;
    return { s3Key, storedFileName };
  }

  /**
   * Upload file buffer to S3 as a private object
   */
  public async uploadFile(params: {
    applicantId: string;
    fileBuffer: Buffer;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
  }): Promise<S3UploadResult> {
    const { s3Key, storedFileName } = this.generateS3Key(params.applicantId, params.originalFileName);

    if (this.isConfigured && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: params.fileBuffer,
        ContentType: params.mimeType,
        ContentLength: params.fileSize,
        // Enforce private storage and server-side encryption
        ServerSideEncryption: "AES256",
        Metadata: {
          applicantId: params.applicantId,
          originalFileName: encodeURIComponent(params.originalFileName),
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
    } else {
      // Store in memory for development / testing
      this.mockStorage.set(s3Key, {
        buffer: params.fileBuffer,
        mimeType: params.mimeType,
      });
    }

    return {
      s3Key,
      s3Bucket: this.bucket,
      storedFileName,
    };
  }

  /**
   * Generates a secure, time-limited presigned URL for downloading the private S3 object
   */
  public async getSignedDownloadUrl(s3Key: string, expiresInSeconds: number = 900): Promise<string> {
    if (this.isConfigured && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    }

    // In local / mock storage mode, return a secure simulated route URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=${crypto.randomBytes(32).toString("hex")}`;
  }

  /**
   * Delete an object from S3
   */
  public async deleteFile(s3Key: string): Promise<boolean> {
    if (this.isConfigured && this.s3Client) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        });
        await this.s3Client.send(command);
        return true;
      } catch {
        return false;
      }
    }

    return this.mockStorage.delete(s3Key);
  }

  /**
   * Get file buffer (useful for in-memory testing or AI resume screening ingestion)
   */
  public async getFileBuffer(s3Key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (this.isConfigured && this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        });
        const response = await this.s3Client.send(command);
        const byteArray = await response.Body?.transformToByteArray();
        if (!byteArray) return null;
        return {
          buffer: Buffer.from(byteArray),
          mimeType: response.ContentType || "application/octet-stream",
        };
      } catch {
        return null;
      }
    }

    const item = this.mockStorage.get(s3Key);
    return item ? { buffer: item.buffer, mimeType: item.mimeType } : null;
  }

  /**
   * Reset mock storage cache (for unit testing)
   */
  public clearMockStorage(): void {
    this.mockStorage.clear();
  }
}

export const s3Service = new S3Service();

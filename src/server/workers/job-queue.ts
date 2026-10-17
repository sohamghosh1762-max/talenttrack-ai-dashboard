import crypto from "node:crypto";
import {
  BackgroundJob,
  type BackgroundJobType,
  type BackgroundJobStatus,
  type FailureCategory,
  type IBackgroundJobDocument,
} from "../models/BackgroundJob.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";

export interface EnqueueJobOptions {
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  priority?: number;
  maxRetries?: number;
  createdById?: string;
}

export interface InFlightJobInfo {
  jobId: string;
  type: BackgroundJobType;
  status: BackgroundJobStatus;
  retryCount: number;
  nextRunAt: string;
  lastError?: string | null;
  failureCategory?: FailureCategory | null;
  result?: unknown;
  createdAt: string;
  completedAt?: string | null;
  payload?: Record<string, unknown>;
  maxRetries?: number;
}

class JobQueueService {
  // In-memory fallback queue for tests / disconnected mode
  private inMemoryJobs: Map<string, any> = new Map();

  /**
   * Enqueue a new background job idempotently.
   * If an unfinished job of the same type and payload already exists, returns it.
   */
  public async enqueue(options: EnqueueJobOptions): Promise<InFlightJobInfo> {
    const { type, payload, priority = 0, maxRetries = 3, createdById } = options;
    const resumeId = payload["resumeId"];

    if (isDatabaseConnected()) {
      // Idempotency check: if pending or processing job already exists for this resume, return it
      if (resumeId) {
        const existing = await BackgroundJob.findOne({
          type,
          "payload.resumeId": resumeId,
          status: { $in: ["pending", "processing"] },
        }).lean<any>();

        if (existing) {
          return this.formatJobInfo(existing);
        }
      }

      const jobId = `job_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
      const doc = await BackgroundJob.create({
        jobId,
        type,
        status: "pending",
        priority,
        payload,
        maxRetries,
        retryCount: 0,
        nextRunAt: new Date(),
        ...(createdById ? { createdById } : {}),
      } as any);

      return this.formatJobInfo(doc);
    }

    // In-memory fallback
    if (resumeId) {
      for (const j of this.inMemoryJobs.values()) {
        if (
          j.type === type &&
          j.payload?.resumeId === resumeId &&
          (j.status === "pending" || j.status === "processing")
        ) {
          return this.formatJobInfo(j);
        }
      }
    }

    const jobId = `job_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
    const jobRecord = {
      jobId,
      type,
      status: "pending",
      priority,
      payload,
      maxRetries,
      retryCount: 0,
      nextRunAt: new Date().toISOString(),
      createdById,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryJobs.set(jobId, jobRecord);
    return this.formatJobInfo(jobRecord);
  }

  /**
   * Acquire next available job atomically using lease lock to prevent duplicate worker execution
   */
  public async acquireNextJob(workerId: string): Promise<InFlightJobInfo | null> {
    const now = new Date();

    if (isDatabaseConnected()) {
      // Lease lock with atomic findOneAndUpdate
      // Recovers jobs where lock expired (lockedAt < now - lockTimeoutMs)
      const doc = await BackgroundJob.findOneAndUpdate(
        {
          status: { $in: ["pending", "processing"] },
          nextRunAt: { $lte: now },
          $or: [
            { lockedAt: null },
            {
              $expr: {
                $lt: [
                  "$lockedAt",
                  new Date(now.getTime() - 60000), // default 60s lease
                ],
              },
            },
          ],
        },
        {
          $set: {
            status: "processing",
            lockedBy: workerId,
            lockedAt: now,
          },
          $inc: { retryCount: 1 },
        },
        {
          sort: { priority: -1, nextRunAt: 1 },
          new: true,
        },
      ).lean<any>();

      return doc ? this.formatJobInfo(doc) : null;
    }

    // In-memory fallback
    for (const j of this.inMemoryJobs.values()) {
      if (
        (j.status === "pending" ||
          (j.status === "processing" &&
            j.lockedAt &&
            new Date(j.lockedAt).getTime() < now.getTime() - 60000)) &&
        new Date(j.nextRunAt).getTime() <= now.getTime()
      ) {
        j.status = "processing";
        j.lockedBy = workerId;
        j.lockedAt = now.toISOString();
        j.retryCount = (j.retryCount || 0) + 1;
        return this.formatJobInfo(j);
      }
    }

    return null;
  }

  /**
   * Mark job as completed successfully
   */
  public async completeJob(jobId: string, result?: any): Promise<void> {
    const now = new Date();

    if (isDatabaseConnected()) {
      await BackgroundJob.updateOne(
        { jobId },
        {
          $set: {
            status: "completed",
            result,
            lockedBy: null,
            lockedAt: null,
            completedAt: now,
          },
        },
      );
      return;
    }

    const job = this.inMemoryJobs.get(jobId);
    if (job) {
      job.status = "completed";
      job.result = result;
      job.lockedBy = null;
      job.lockedAt = null;
      job.completedAt = now.toISOString();
    }
  }

  /**
   * Handle job failure: bounded retries with exponential backoff or dead-letter
   */
  public async failJob(
    jobId: string,
    error: Error | string,
    category: FailureCategory = "TRANSIENT",
    errorDetails?: any,
  ): Promise<void> {
    const errorMessage = typeof error === "string" ? error : error.message;
    const now = new Date();

    if (isDatabaseConnected()) {
      const job = await BackgroundJob.findOne({ jobId });
      if (!job) return;

      const shouldRetry =
        category !== "PERMANENT" && category !== "VALIDATION" && job.retryCount < job.maxRetries;

      if (shouldRetry) {
        // Exponential backoff: 2^retryCount * 1000ms (max 60 seconds)
        const delayMs = Math.min(60000, 1000 * Math.pow(2, job.retryCount));
        const nextRunAt = new Date(now.getTime() + delayMs);

        job.status = "pending";
        job.nextRunAt = nextRunAt;
        job.lockedBy = null;
        job.lockedAt = null;
        job.lastError = errorMessage;
        job.failureCategory = category;
        job.errorDetails = errorDetails;
        await job.save();
      } else {
        // Dead letter / permanent failure
        job.status = "failed";
        job.lockedBy = null;
        job.lockedAt = null;
        job.lastError = errorMessage;
        job.failureCategory = category;
        job.errorDetails = errorDetails;
        job.failedAt = now;
        await job.save();
      }
      return;
    }

    // In-memory fallback
    const job = this.inMemoryJobs.get(jobId);
    if (job) {
      const shouldRetry =
        category !== "PERMANENT" && category !== "VALIDATION" && job.retryCount < job.maxRetries;

      if (shouldRetry) {
        const delayMs = Math.min(60000, 1000 * Math.pow(2, job.retryCount));
        job.status = "pending";
        job.nextRunAt = new Date(now.getTime() + delayMs).toISOString();
        job.lockedBy = null;
        job.lockedAt = null;
        job.lastError = errorMessage;
        job.failureCategory = category;
      } else {
        job.status = "failed";
        job.lockedBy = null;
        job.lockedAt = null;
        job.lastError = errorMessage;
        job.failureCategory = category;
        job.failedAt = now.toISOString();
      }
    }
  }

  /**
   * Retrieve job by ID
   */
  public async getJob(jobId: string): Promise<InFlightJobInfo | null> {
    if (isDatabaseConnected()) {
      const doc = await BackgroundJob.findOne({ jobId }).lean<any>();
      return doc ? this.formatJobInfo(doc) : null;
    }
    const mem = this.inMemoryJobs.get(jobId);
    return mem ? this.formatJobInfo(mem) : null;
  }

  /**
   * Retrieve most recent job for a given resume
   */
  public async getJobByResumeId(resumeId: string): Promise<InFlightJobInfo | null> {
    if (isDatabaseConnected()) {
      const doc = await BackgroundJob.findOne({ "payload.resumeId": resumeId })
        .sort({ createdAt: -1 })
        .lean<any>();
      return doc ? this.formatJobInfo(doc) : null;
    }

    for (const j of this.inMemoryJobs.values()) {
      if (j.payload?.resumeId === resumeId) {
        return this.formatJobInfo(j);
      }
    }
    return null;
  }

  /**
   * Manual operator retry for a failed task
   */
  public async retryJob(jobId: string): Promise<InFlightJobInfo | null> {
    if (isDatabaseConnected()) {
      const job = await BackgroundJob.findOne({ jobId });
      if (!job) return null;

      job.status = "pending";
      job.retryCount = 0;
      job.nextRunAt = new Date();
      job.lockedBy = null;
      job.lockedAt = null;
      job.lastError = null;
      job.failureCategory = null;
      await job.save();

      return this.formatJobInfo(job.toObject());
    }

    const job = this.inMemoryJobs.get(jobId);
    if (!job) return null;
    job.status = "pending";
    job.retryCount = 0;
    job.nextRunAt = new Date().toISOString();
    job.lockedBy = null;
    job.lockedAt = null;
    job.lastError = null;
    return this.formatJobInfo(job);
  }

  /**
   * Recover stale locked jobs on server startup
   */
  public async recoverStaleJobs(): Promise<number> {
    const expiredCutoff = new Date(Date.now() - 60000);

    if (isDatabaseConnected()) {
      const result = await BackgroundJob.updateMany(
        {
          status: "processing",
          lockedAt: { $lt: expiredCutoff },
        },
        {
          $set: {
            status: "pending",
            lockedBy: null,
            lockedAt: null,
            nextRunAt: new Date(),
          },
        },
      );
      return result.modifiedCount || 0;
    }

    let recovered = 0;
    for (const j of this.inMemoryJobs.values()) {
      if (
        j.status === "processing" &&
        j.lockedAt &&
        new Date(j.lockedAt).getTime() < expiredCutoff.getTime()
      ) {
        j.status = "pending";
        j.lockedBy = null;
        j.lockedAt = null;
        j.nextRunAt = new Date().toISOString();
        recovered++;
      }
    }
    return recovered;
  }

  /**
   * Clear all jobs (for test isolation)
   */
  public clearAll(): void {
    this.inMemoryJobs.clear();
  }

  private formatJobInfo(doc: any): InFlightJobInfo {
    return {
      jobId: doc.jobId,
      type: doc.type,
      status: doc.status,
      retryCount: doc.retryCount || 0,
      nextRunAt: doc.nextRunAt ? new Date(doc.nextRunAt).toISOString() : new Date().toISOString(),
      lastError: doc.lastError || null,
      failureCategory: doc.failureCategory || null,
      result: doc.result || null,
      payload: doc.payload || undefined,
      maxRetries: doc.maxRetries ?? 3,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      completedAt: doc.completedAt ? new Date(doc.completedAt).toISOString() : null,
    };
  }
}

export const jobQueueService = new JobQueueService();

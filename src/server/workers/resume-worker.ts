import crypto from "node:crypto";
import { jobQueueService, type InFlightJobInfo } from "./job-queue.ts";
import { resumeParserService } from "../services/resume-parser-service.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { BadRequestError } from "../utils/errors.ts";

export interface WorkerStatus {
  workerId: string;
  isRunning: boolean;
  jobsProcessed: number;
  lastActive: string | null;
}

export class ResumeBackgroundWorker {
  private workerId: string;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private jobsProcessed: number = 0;
  private lastActive: string | null = null;
  private pollIntervalMs: number = 2000;

  constructor(workerId?: string) {
    this.workerId =
      workerId || `worker_${process.pid || 1}_${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Start worker polling loop
   */
  public async start(pollIntervalMs: number = 2000): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.pollIntervalMs = pollIntervalMs;

    // Recover stale locks left behind by previous crashes
    try {
      const recovered = await jobQueueService.recoverStaleJobs();
      if (recovered > 0) {
        console.log(`[ResumeWorker] Recovered ${recovered} stale background jobs.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[ResumeWorker] Stale recovery warning:", msg);
    }

    this.scheduleNextTick();
  }

  /**
   * Stop worker gracefully
   */
  public stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Process a single available job immediately (useful for direct execution or testing)
   */
  public async processNextAvailableJob(): Promise<boolean> {
    const job = await jobQueueService.acquireNextJob(this.workerId);
    if (!job) return false;

    this.lastActive = new Date().toISOString();

    try {
      if (job.type === "RESUME_PARSE") {
        await this.handleResumeParseJob(job);
      }
      this.jobsProcessed++;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ResumeWorker] Error processing job ${job.jobId}:`, msg);
      return false;
    }
  }

  /**
   * Handle RESUME_PARSE background task
   */
  private async handleResumeParseJob(job: InFlightJobInfo): Promise<void> {
    const rawResumeId = job.payload ? job.payload["resumeId"] : null;
    const resumeId = typeof rawResumeId === "string" ? rawResumeId : null;
    if (!resumeId) {
      await jobQueueService.failJob(job.jobId, "Missing resumeId in job payload", "PERMANENT");
      return;
    }

    try {
      // 1. Update resume status to PROCESSING in repository
      await resumeRepository.update(resumeId, {
        parsingStatus: "PROCESSING",
      });

      // 2. Execute structured extraction via resumeParserService
      const parsedResult = await resumeParserService.parseResume(resumeId);

      // 3. Mark background job completed
      await jobQueueService.completeJob(job.jobId, {
        resumeId,
        parsingStatus: parsedResult.parsingStatus,
        parsedProfile: parsedResult.parsedProfile,
        parsedAt: parsedResult.parsedAt,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        errMsg.includes("429") ||
        errMsg.toLowerCase().includes("quota") ||
        errMsg.toLowerCase().includes("rate limit");
      const isValidation = err instanceof BadRequestError;

      const category = isRateLimit ? "RATE_LIMIT" : isValidation ? "VALIDATION" : "TRANSIENT";

      // If permanent, ensure resume status reflects failure
      const maxRetries = job.maxRetries ?? 3;
      if (category === "VALIDATION" || job.retryCount >= maxRetries) {
        await resumeRepository.update(resumeId, {
          parsingStatus: "FAILED",
          parsingError: errMsg || "Background parsing failed permanently.",
        });
      }

      await jobQueueService.failJob(job.jobId, errMsg, category);
      throw err;
    }
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    this.pollTimer = setTimeout(async () => {
      try {
        await this.processNextAvailableJob();
      } catch {
        // Suppress tick error to keep worker alive
      } finally {
        if (this.isRunning) {
          this.scheduleNextTick();
        }
      }
    }, this.pollIntervalMs);
  }

  public getStatus(): WorkerStatus {
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      jobsProcessed: this.jobsProcessed,
      lastActive: this.lastActive,
    };
  }
}

export const resumeBackgroundWorker = new ResumeBackgroundWorker();

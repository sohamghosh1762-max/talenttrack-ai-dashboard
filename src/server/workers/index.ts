/**
 * Server Background Workers Registry
 *
 * Workers handle asynchronous background processing tasks:
 * - Resume parsing & OCR jobs
 * - AI matching and vector embedding generation
 * - Email and SMS notification dispatch
 * - Periodic audit log rotation and retention tasks
 */

export interface BackgroundJob<TData = unknown> {
  id: string;
  type: string;
  data: TData;
  createdAt: string;
  scheduledFor?: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface JobHandler<TData = unknown, TResult = unknown> {
  (job: BackgroundJob<TData>): Promise<TResult>;
}

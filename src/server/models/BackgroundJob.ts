import mongoose, { Schema, Document, Model } from "mongoose";

export type BackgroundJobType =
  "RESUME_PARSE" | "RESUME_OCR" | "ATS_ANALYSIS" | "EMAIL_NOTIFICATION";

export type BackgroundJobStatus = "pending" | "processing" | "completed" | "failed" | "dead_letter";

export type FailureCategory = "TRANSIENT" | "RATE_LIMIT" | "VALIDATION" | "PERMANENT";

export interface IBackgroundJobDocument extends Document {
  jobId: string;
  type: BackgroundJobType;
  status: BackgroundJobStatus;
  priority: number;
  payload: Record<string, any>;
  result?: Record<string, any> | null;
  retryCount: number;
  maxRetries: number;
  nextRunAt: Date;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  lockTimeoutMs: number;
  lastError?: string | null;
  failureCategory?: FailureCategory | null;
  errorDetails?: any;
  createdById?: string | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BackgroundJobSchema = new Schema<IBackgroundJobDocument>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["RESUME_PARSE", "RESUME_OCR", "ATS_ANALYSIS", "EMAIL_NOTIFICATION"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "dead_letter"],
      default: "pending",
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    nextRunAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedBy: {
      type: String,
      default: null,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lockTimeoutMs: {
      type: Number,
      default: 60000, // 60 seconds lease timeout
    },
    lastError: {
      type: String,
      default: null,
    },
    failureCategory: {
      type: String,
      enum: ["TRANSIENT", "RATE_LIMIT", "VALIDATION", "PERMANENT"],
      default: null,
    },
    errorDetails: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdById: {
      type: String,
      default: null,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

// High efficiency queue compound indexes
BackgroundJobSchema.index({ status: 1, nextRunAt: 1, priority: -1 });
BackgroundJobSchema.index({ type: 1, status: 1 });
BackgroundJobSchema.index({ "payload.resumeId": 1, status: 1 });

export const BackgroundJob: Model<IBackgroundJobDocument> =
  (mongoose.models["BackgroundJob"] as Model<IBackgroundJobDocument>) ||
  mongoose.model<IBackgroundJobDocument>("BackgroundJob", BackgroundJobSchema);

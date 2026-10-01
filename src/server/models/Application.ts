import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  IApplication,
  ApplicationStatus,
  ApplicationStage,
} from "../types/application-types.ts";

export interface IApplicationDocument extends Omit<IApplication, "id">, Document {
  id: string;
  jobId: mongoose.Types.ObjectId | any;
  applicantId: mongoose.Types.ObjectId | any;
  recruiterId: mongoose.Types.ObjectId | any;
}

const ApplicationSchema = new Schema<IApplicationDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeId: {
      type: String,
      trim: true,
    },
    coverLetter: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "APPLIED",
        "SCREENING",
        "INTERVIEW",
        "OFFERED",
        "REJECTED",
        "WITHDRAWN",
        "Shortlisted",
        "Under Review",
      ],
      default: "APPLIED",
      index: true,
    },
    currentStage: {
      type: String,
      enum: [
        "APPLIED",
        "SCREENING",
        "INTERVIEW",
        "OFFERED",
        "REJECTED",
        "WITHDRAWN",
      ],
      default: "APPLIED",
      index: true,
    },
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
    },
    hiringManagerFeedback: {
      type: Schema.Types.Mixed,
      default: [],
    },
    hiringDecision: {
      type: Schema.Types.Mixed,
      default: null,
    },
    appliedAt: {
      type: String,
      default: () => new Date().toISOString(),
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        if (ret["jobId"] && typeof ret["jobId"] === "object" && "_id" in ret["jobId"]) {
          ret["jobTitle"] = ret["jobId"].title;
          ret["jobId"] = ret["jobId"]._id.toString();
        } else if (ret["jobId"]) {
          ret["jobId"] = ret["jobId"].toString();
        }
        if (ret["applicantId"] && typeof ret["applicantId"] === "object" && "_id" in ret["applicantId"]) {
          ret["applicantName"] = ret["applicantId"].name;
          ret["applicantEmail"] = ret["applicantId"].email;
          ret["applicantId"] = ret["applicantId"]._id.toString();
        } else if (ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"].toString();
        }
        if (ret["recruiterId"] && typeof ret["recruiterId"] === "object" && "_id" in ret["recruiterId"]) {
          ret["recruiterId"] = ret["recruiterId"]._id.toString();
        } else if (ret["recruiterId"]) {
          ret["recruiterId"] = ret["recruiterId"].toString();
        }
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
    toObject: {
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

// Compound index to guarantee uniqueness per candidate application to a job
ApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
ApplicationSchema.index({ recruiterId: 1, status: 1 });
ApplicationSchema.index({ currentStage: 1, appliedAt: -1 });

export const Application: Model<IApplicationDocument> =
  (mongoose.models["Application"] as Model<IApplicationDocument>) ||
  mongoose.model<IApplicationDocument>("Application", ApplicationSchema);

import mongoose, { Schema, Document, Model } from "mongoose";
import type { IResume } from "../types/resume-types.ts";

export interface IResumeDocument extends Omit<IResume, "id">, Document {
  id: string;
  applicantId: mongoose.Types.ObjectId | any;
  applicationId?: mongoose.Types.ObjectId | any | undefined;
}

const ResumeSchema = new Schema<IResumeDocument>(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storedFileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    s3Bucket: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedAt: {
      type: String,
      default: () => new Date().toISOString(),
      index: true,
    },
    parsingStatus: {
      type: String,
      enum: ["NOT_STARTED", "PROCESSING", "COMPLETED", "FAILED"],
      default: "NOT_STARTED",
      index: true,
    },
    parsedProfile: {
      type: Schema.Types.Mixed,
      default: null,
    },
    parsedAt: {
      type: String,
      default: null,
    },
    parsingError: {
      type: String,
      default: null,
    },
    atsScore: {
      type: Number,
      default: null,
    },
    atsAnalysis: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        if (ret["applicantId"] && typeof ret["applicantId"] === "object" && "_id" in ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"]._id.toString();
        } else if (ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"].toString();
        }
        if (ret["applicationId"] && typeof ret["applicationId"] === "object" && "_id" in ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"]._id.toString();
        } else if (ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"].toString();
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

ResumeSchema.index({ applicantId: 1, uploadedAt: -1 });

export const Resume: Model<IResumeDocument> =
  (mongoose.models["Resume"] as Model<IResumeDocument>) ||
  mongoose.model<IResumeDocument>("Resume", ResumeSchema);

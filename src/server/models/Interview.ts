import mongoose, { Schema, Document, Model } from "mongoose";
import type { InterviewType, InterviewStatus } from "../types/interview-types.ts";

export interface IInterviewDocument extends Document {
  id: string;
  applicationId: mongoose.Types.ObjectId | any;
  jobId: mongoose.Types.ObjectId | any;
  applicantId: mongoose.Types.ObjectId | any;
  recruiterId: mongoose.Types.ObjectId | any;
  hiringManagerId?: mongoose.Types.ObjectId | any;
  interviewerIds?: mongoose.Types.ObjectId[] | any[];
  title: string;
  type: InterviewType;
  scheduledAt: Date;
  durationMinutes: number;
  timezone: string;
  meetingUrl?: string;
  location?: string;
  instructions?: string;
  status: InterviewStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId | any;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterviewDocument>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
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
    hiringManagerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    interviewerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Technical Interview",
    },
    type: {
      type: String,
      enum: ["VIDEO", "PHONE", "ONSITE"],
      default: "VIDEO",
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 45,
      min: 5,
      max: 480,
    },
    timezone: {
      type: String,
      required: true,
      default: "Asia/Kolkata",
      trim: true,
    },
    meetingUrl: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"],
      default: "SCHEDULED",
      index: true,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        if (ret["applicationId"] && typeof ret["applicationId"] === "object" && "_id" in ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"]._id.toString();
        } else if (ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"].toString();
        }
        if (ret["jobId"] && typeof ret["jobId"] === "object" && "_id" in ret["jobId"]) {
          ret["jobId"] = ret["jobId"]._id.toString();
        } else if (ret["jobId"]) {
          ret["jobId"] = ret["jobId"].toString();
        }
        if (ret["applicantId"] && typeof ret["applicantId"] === "object" && "_id" in ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"]._id.toString();
        } else if (ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"].toString();
        }
        if (ret["recruiterId"] && typeof ret["recruiterId"] === "object" && "_id" in ret["recruiterId"]) {
          ret["recruiterId"] = ret["recruiterId"]._id.toString();
        } else if (ret["recruiterId"]) {
          ret["recruiterId"] = ret["recruiterId"].toString();
        }
        if (ret["hiringManagerId"] && typeof ret["hiringManagerId"] === "object" && "_id" in ret["hiringManagerId"]) {
          ret["hiringManagerId"] = ret["hiringManagerId"]._id.toString();
        } else if (ret["hiringManagerId"]) {
          ret["hiringManagerId"] = ret["hiringManagerId"].toString();
        }
        if (ret["createdBy"] && typeof ret["createdBy"] === "object" && "_id" in ret["createdBy"]) {
          ret["createdBy"] = ret["createdBy"]._id.toString();
        } else if (ret["createdBy"]) {
          ret["createdBy"] = ret["createdBy"].toString();
        }
        if (Array.isArray(ret["interviewerIds"])) {
          ret["interviewerIds"] = ret["interviewerIds"].map((item: any) =>
            typeof item === "object" && item && "_id" in item ? item._id.toString() : item.toString(),
          );
        }
        if (ret["scheduledAt"] instanceof Date) {
          ret["scheduledAt"] = ret["scheduledAt"].toISOString();
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
        if (ret["applicationId"] && typeof ret["applicationId"] === "object" && "_id" in ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"]._id.toString();
        } else if (ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"].toString();
        }
        if (ret["jobId"] && typeof ret["jobId"] === "object" && "_id" in ret["jobId"]) {
          ret["jobId"] = ret["jobId"]._id.toString();
        } else if (ret["jobId"]) {
          ret["jobId"] = ret["jobId"].toString();
        }
        if (ret["applicantId"] && typeof ret["applicantId"] === "object" && "_id" in ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"]._id.toString();
        } else if (ret["applicantId"]) {
          ret["applicantId"] = ret["applicantId"].toString();
        }
        if (ret["recruiterId"] && typeof ret["recruiterId"] === "object" && "_id" in ret["recruiterId"]) {
          ret["recruiterId"] = ret["recruiterId"]._id.toString();
        } else if (ret["recruiterId"]) {
          ret["recruiterId"] = ret["recruiterId"].toString();
        }
        if (ret["hiringManagerId"] && typeof ret["hiringManagerId"] === "object" && "_id" in ret["hiringManagerId"]) {
          ret["hiringManagerId"] = ret["hiringManagerId"]._id.toString();
        } else if (ret["hiringManagerId"]) {
          ret["hiringManagerId"] = ret["hiringManagerId"].toString();
        }
        if (ret["createdBy"] && typeof ret["createdBy"] === "object" && "_id" in ret["createdBy"]) {
          ret["createdBy"] = ret["createdBy"]._id.toString();
        } else if (ret["createdBy"]) {
          ret["createdBy"] = ret["createdBy"].toString();
        }
        if (Array.isArray(ret["interviewerIds"])) {
          ret["interviewerIds"] = ret["interviewerIds"].map((item: any) =>
            typeof item === "object" && item && "_id" in item ? item._id.toString() : item.toString(),
          );
        }
        if (ret["scheduledAt"] instanceof Date) {
          ret["scheduledAt"] = ret["scheduledAt"].toISOString();
        }
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

InterviewSchema.index({ applicantId: 1, scheduledAt: -1 });
InterviewSchema.index({ recruiterId: 1, scheduledAt: -1 });
InterviewSchema.index({ hiringManagerId: 1, scheduledAt: -1 });
InterviewSchema.index({ scheduledAt: 1, status: 1 });

export const Interview: Model<IInterviewDocument> =
  (mongoose.models["Interview"] as Model<IInterviewDocument>) ||
  mongoose.model<IInterviewDocument>("Interview", InterviewSchema);

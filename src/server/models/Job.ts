import mongoose, { Schema, Document, Model } from "mongoose";
import type { IJob, JobStatus, EmploymentType, SalaryRange } from "../types/job-types.ts";

export interface IJobDocument extends Omit<IJob, "id">, Document {
  id: string;
  recruiterId: mongoose.Types.ObjectId | any;
}

const SalaryRangeSchema = new Schema<SalaryRange>(
  {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: "USD" },
    isNegotiable: { type: Boolean, default: false },
  },
  { _id: false },
);

const JobSchema = new Schema<IJobDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    employmentType: {
      type: String,
      enum: [
        "Full-Time",
        "Part-Time",
        "Contract",
        "Remote",
        "Internship",
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "REMOTE",
        "INTERNSHIP",
      ],
      default: "Full-Time",
    },
    experienceRequired: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    salaryRange: {
      type: SalaryRangeSchema,
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
    hiringManagerIds: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PUBLISHED",
        "ARCHIVED",
        "CLOSED",
        "Active",
        "Paused",
        "Closed",
      ],
      default: "PUBLISHED",
      index: true,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    deadline: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
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
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
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
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

// Indexes for high-frequency queries
JobSchema.index({ status: 1, department: 1 });
JobSchema.index({ recruiterId: 1, status: 1 });
JobSchema.index({ hiringManagerId: 1, status: 1 });
JobSchema.index({ createdAt: -1 });

export const Job: Model<IJobDocument> =
  (mongoose.models["Job"] as Model<IJobDocument>) ||
  mongoose.model<IJobDocument>("Job", JobSchema);

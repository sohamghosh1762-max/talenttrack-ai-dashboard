import mongoose, { Schema, Document, Model } from "mongoose";

export type InterviewStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled" | "Pending Feedback";

export interface IInterview {
  id: string;
  jobId: string;
  applicantId: string;
  recruiterId: string;
  applicationId?: string;
  candidateName: string;
  candidateEmail?: string;
  jobRole: string;
  stage: string;
  interviewer: string;
  dateTime: string;
  interviewType: string;
  meetingLink: string;
  location?: string;
  notes?: string;
  feedbackNotes?: string;
  score?: number;
  status: InterviewStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface IInterviewDocument extends Omit<IInterview, "id">, Document {
  id: string;
  jobId: mongoose.Types.ObjectId | any;
  applicantId: mongoose.Types.ObjectId | any;
  recruiterId: mongoose.Types.ObjectId | any;
  applicationId?: mongoose.Types.ObjectId | any;
}

const InterviewSchema = new Schema<IInterviewDocument>(
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
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    candidateEmail: {
      type: String,
      trim: true,
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
    },
    stage: {
      type: String,
      default: "Technical Screen",
    },
    interviewer: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: String,
      required: true,
    },
    interviewType: {
      type: String,
      default: "Video Call",
    },
    meetingLink: {
      type: String,
      default: "https://meet.google.com/new-session",
    },
    location: {
      type: String,
    },
    notes: {
      type: String,
    },
    feedbackNotes: {
      type: String,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled", "Pending Feedback"],
      default: "Scheduled",
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

InterviewSchema.index({ recruiterId: 1, status: 1 });
InterviewSchema.index({ dateTime: -1 });

export const Interview: Model<IInterviewDocument> =
  (mongoose.models["Interview"] as Model<IInterviewDocument>) ||
  mongoose.model<IInterviewDocument>("Interview", InterviewSchema);

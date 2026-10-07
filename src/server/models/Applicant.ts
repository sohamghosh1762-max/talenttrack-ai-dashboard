import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplicantDocument extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  firebaseUid?: string | undefined;
  headline?: string | undefined;
  phone?: string | undefined;
  location?: string | undefined;
  skills: string[];
  experience?: any | undefined;
  education?: any | undefined;
  certifications?: any | undefined;
  projects?: any | undefined;
  resume?: string | undefined;
  resumeId?: string | undefined;
  summary?: string | undefined;
  bio?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema = new Schema<IApplicantDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      index: true,
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    experience: {
      type: Schema.Types.Mixed,
      default: [],
    },
    education: {
      type: Schema.Types.Mixed,
      default: [],
    },
    certifications: {
      type: Schema.Types.Mixed,
      default: [],
    },
    projects: {
      type: Schema.Types.Mixed,
      default: [],
    },
    resume: {
      type: String,
      trim: true,
    },
    resumeId: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
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

export const Applicant: Model<IApplicantDocument> =
  (mongoose.models["Applicant"] as Model<IApplicantDocument>) ||
  mongoose.model<IApplicantDocument>("Applicant", ApplicantSchema);

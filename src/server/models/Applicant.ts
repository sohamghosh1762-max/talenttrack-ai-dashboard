import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplicantDocument extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  headline?: string | undefined;
  phone?: string | undefined;
  location?: string | undefined;
  skills: string[];
  experience?: string | undefined;
  education: string[];
  resume?: string | undefined;
  summary?: string | undefined;
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
      type: String,
      trim: true,
    },
    education: {
      type: [String],
      default: [],
    },
    resume: {
      type: String,
      trim: true,
    },
    summary: {
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

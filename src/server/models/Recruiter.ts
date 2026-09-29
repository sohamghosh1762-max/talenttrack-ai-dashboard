import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRecruiterDocument extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  companyName: string;
  designation: string;
  department: string;
  phone?: string | undefined;
  website?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const RecruiterSchema = new Schema<IRecruiterDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: "Recruiter",
      trim: true,
    },
    department: {
      type: String,
      default: "Talent Acquisition",
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
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

export const Recruiter: Model<IRecruiterDocument> =
  (mongoose.models["Recruiter"] as Model<IRecruiterDocument>) ||
  mongoose.model<IRecruiterDocument>("Recruiter", RecruiterSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplicantPreferencesDocument extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  applicationStatusUpdates: boolean;
  interviewReminders: boolean;
  jobRecommendationAlerts: boolean;
  messageNotifications: boolean;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantPreferencesSchema = new Schema<IApplicantPreferencesDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    applicationStatusUpdates: {
      type: Boolean,
      default: true,
    },
    interviewReminders: {
      type: Boolean,
      default: true,
    },
    jobRecommendationAlerts: {
      type: Boolean,
      default: true,
    },
    messageNotifications: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        ret["userId"] = ret["userId"] ? ret["userId"].toString() : ret["userId"];
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        ret["userId"] = ret["userId"] ? ret["userId"].toString() : ret["userId"];
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

export const ApplicantPreferences: Model<IApplicantPreferencesDocument> =
  (mongoose.models["ApplicantPreferences"] as Model<IApplicantPreferencesDocument>) ||
  mongoose.model<IApplicantPreferencesDocument>("ApplicantPreferences", ApplicantPreferencesSchema);

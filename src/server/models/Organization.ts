import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  IOrganization,
  OrganizationPlan,
  OrganizationStatus,
} from "../types/organization-types.ts";

export interface IOrganizationDocument extends Omit<IOrganization, "id">, Document {
  id: string;
}

const OrganizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    domain: { type: String, required: true, trim: true, lowercase: true, unique: true },
    plan: {
      type: String,
      enum: ["Enterprise", "Growth", "Starter"],
      default: "Growth",
    },
    status: {
      type: String,
      default: "Active",
    },
    membersCount: { type: Number, default: 0 },
    departmentsCount: { type: Number, default: 0 },
    jobsCount: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
    description: { type: String },
    website: { type: String },
    settings: {
      maxMembers: { type: Number, default: 50 },
      allowedDomains: { type: [String], default: [] },
      requireTwoFactor: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret["id"] = ret["_id"]?.toString();
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

OrganizationSchema.index({ domain: 1 });
OrganizationSchema.index({ status: 1 });

export const Organization: Model<IOrganizationDocument> =
  mongoose.models["Organization"] ||
  mongoose.model<IOrganizationDocument>("Organization", OrganizationSchema);

import mongoose, { Schema, Document, Model } from "mongoose";
import type { IDepartment } from "../types/organization-types.ts";

export interface IDepartmentDocument extends Omit<IDepartment, "id">, Document {
  id: string;
}

const DepartmentSchema = new Schema<IDepartmentDocument>(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String },
    managerUserId: { type: String },
    managerName: { type: String },
    memberCount: { type: Number, default: 0 },
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

DepartmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Department: Model<IDepartmentDocument> =
  mongoose.models["Department"] ||
  mongoose.model<IDepartmentDocument>("Department", DepartmentSchema);

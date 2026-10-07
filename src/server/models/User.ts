import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  IUser,
  UserRole,
  UserStatus,
  RecruiterProfileInfo,
  ApplicantProfileInfo,
  AdminProfileInfo,
  SafeUser,
} from "../types/user-types.ts";

export interface IUserDocument extends Omit<IUser, "id">, Document {
  id: string;
  toSafeUser(): SafeUser;
}

const RecruiterProfileSchema = new Schema<RecruiterProfileInfo>(
  {
    companyName: { type: String, required: true },
    jobTitle: { type: String, default: "Recruiter" },
    department: { type: String, default: "Talent Acquisition" },
  },
  { _id: false },
);

const ApplicantProfileSchema = new Schema<ApplicantProfileInfo>(
  {
    headline: { type: String },
    location: { type: String },
    phone: { type: String },
    bio: { type: String },
    summary: { type: String },
    skills: { type: [String], default: [] },
    experienceYears: { type: String },
    resumeFileName: { type: String },
    resumeId: { type: String },
    experiences: { type: Schema.Types.Mixed, default: [] },
    education: { type: Schema.Types.Mixed, default: [] },
    certifications: { type: Schema.Types.Mixed, default: [] },
    projects: { type: Schema.Types.Mixed, default: [] },
  },
  { _id: false },
);

const AdminProfileSchema = new Schema<AdminProfileInfo>(
  {
    platformRole: { type: String, default: "Administrator" },
    permissions: { type: [String], default: ["all"] },
    lastLogin: { type: String },
  },
  { _id: false },
);

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: [
        "ADMIN",
        "SUPER_ADMIN",
        "ORG_ADMIN",
        "RECRUITER",
        "HIRING_MANAGER",
        "INTERVIEWER",
        "APPLICANT",
      ],
      default: "APPLICANT",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "ACTIVE",
        "PENDING_VERIFICATION",
        "SUSPENDED",
        "LOCKED",
        "DEACTIVATED",
        "INACTIVE",
      ],
      default: "ACTIVE",
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: String },
    avatarUrl: { type: String },
    lastLoginAt: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: String, default: null },
    lastActive: { type: String },
    recruiterProfile: { type: RecruiterProfileSchema },
    applicantProfile: { type: ApplicantProfileSchema },
    adminProfile: { type: AdminProfileSchema },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        delete ret["_id"];
        delete ret["__v"];
        delete ret["passwordHash"];
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

UserSchema.methods["toSafeUser"] = function (this: any): SafeUser {
  const obj = this.toObject();
  const { passwordHash: _hash, ...safe } = obj;
  safe.id = (this._id ? this._id.toString() : this.id) as string;
  return safe as SafeUser;
};

export const User: Model<IUserDocument> =
  (mongoose.models["User"] as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>("User", UserSchema);

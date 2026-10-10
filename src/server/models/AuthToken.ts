import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuthTokenDocument extends Document {
  tokenId: string;
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  type: "PASSWORD_RESET" | "EMAIL_VERIFICATION";
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const AuthTokenSchema = new Schema<IAuthTokenDocument>(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["PASSWORD_RESET", "EMAIL_VERIFICATION"],
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic TTL cleanup
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

AuthTokenSchema.index({ userId: 1, type: 1, usedAt: 1 });

export const AuthToken: Model<IAuthTokenDocument> =
  (mongoose.models["AuthToken"] as Model<IAuthTokenDocument>) ||
  mongoose.model<IAuthTokenDocument>("AuthToken", AuthTokenSchema);

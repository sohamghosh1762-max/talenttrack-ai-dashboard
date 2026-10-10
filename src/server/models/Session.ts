import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISessionDocument extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date | null;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    sessionId: {
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
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB automatic TTL cleanup
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

SessionSchema.index({ userId: 1, revokedAt: 1 });

export const Session: Model<ISessionDocument> =
  (mongoose.models["Session"] as Model<ISessionDocument>) ||
  mongoose.model<ISessionDocument>("Session", SessionSchema);

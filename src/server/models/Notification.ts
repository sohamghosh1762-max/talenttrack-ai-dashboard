import mongoose, { Schema, Document, Model } from "mongoose";
import type { NotificationType } from "../types/notification-types.ts";

export interface INotificationDocument extends Document {
  id: string;
  userId: mongoose.Types.ObjectId | any;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: mongoose.Types.ObjectId | any;
  jobId?: mongoose.Types.ObjectId | any;
  interviewId?: mongoose.Types.ObjectId | any;
  conversationId?: mongoose.Types.ObjectId | any;
  metadata?: Record<string, any>;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      index: true,
    },
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        if (ret["userId"] && typeof ret["userId"] === "object" && "_id" in ret["userId"]) {
          ret["userId"] = ret["userId"]._id.toString();
        } else if (ret["userId"]) {
          ret["userId"] = ret["userId"].toString();
        }
        if (
          ret["applicationId"] &&
          typeof ret["applicationId"] === "object" &&
          "_id" in ret["applicationId"]
        ) {
          ret["applicationId"] = ret["applicationId"]._id.toString();
        } else if (ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"].toString();
        }
        if (ret["jobId"] && typeof ret["jobId"] === "object" && "_id" in ret["jobId"]) {
          ret["jobId"] = ret["jobId"]._id.toString();
        } else if (ret["jobId"]) {
          ret["jobId"] = ret["jobId"].toString();
        }
        if (
          ret["interviewId"] &&
          typeof ret["interviewId"] === "object" &&
          "_id" in ret["interviewId"]
        ) {
          ret["interviewId"] = ret["interviewId"]._id.toString();
        } else if (ret["interviewId"]) {
          ret["interviewId"] = ret["interviewId"].toString();
        }
        if (
          ret["conversationId"] &&
          typeof ret["conversationId"] === "object" &&
          "_id" in ret["conversationId"]
        ) {
          ret["conversationId"] = ret["conversationId"]._id.toString();
        } else if (ret["conversationId"]) {
          ret["conversationId"] = ret["conversationId"].toString();
        }
        if (ret["readAt"] instanceof Date) {
          ret["readAt"] = ret["readAt"].toISOString();
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
        if (ret["userId"] && typeof ret["userId"] === "object" && "_id" in ret["userId"]) {
          ret["userId"] = ret["userId"]._id.toString();
        } else if (ret["userId"]) {
          ret["userId"] = ret["userId"].toString();
        }
        if (ret["readAt"] instanceof Date) {
          ret["readAt"] = ret["readAt"].toISOString();
        }
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

export const Notification: Model<INotificationDocument> =
  (mongoose.models["Notification"] as Model<INotificationDocument>) ||
  mongoose.model<INotificationDocument>("Notification", NotificationSchema);

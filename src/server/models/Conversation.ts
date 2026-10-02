import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversationDocument extends Document {
  id: string;
  participantIds: mongoose.Types.ObjectId[];
  applicationId?: mongoose.Types.ObjectId | any;
  jobId?: mongoose.Types.ObjectId | any;
  lastMessageId?: mongoose.Types.ObjectId | any;
  lastMessageText?: string;
  lastMessageAt?: Date;
  lastMessageSenderId?: mongoose.Types.ObjectId | any;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    participantIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],
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
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageText: {
      type: String,
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      index: true,
    },
    lastMessageSenderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret["id"] = ret["_id"] ? ret["_id"].toString() : ret["id"];
        if (Array.isArray(ret["participantIds"])) {
          ret["participantIds"] = ret["participantIds"].map((p: any) =>
            typeof p === "object" && p && "_id" in p ? p._id.toString() : p.toString(),
          );
        }
        if (ret["applicationId"] && typeof ret["applicationId"] === "object" && "_id" in ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"]._id.toString();
        } else if (ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"].toString();
        }
        if (ret["jobId"] && typeof ret["jobId"] === "object" && "_id" in ret["jobId"]) {
          ret["jobId"] = ret["jobId"]._id.toString();
        } else if (ret["jobId"]) {
          ret["jobId"] = ret["jobId"].toString();
        }
        if (ret["lastMessageId"]) {
          ret["lastMessageId"] = ret["lastMessageId"].toString();
        }
        if (ret["lastMessageSenderId"]) {
          ret["lastMessageSenderId"] = ret["lastMessageSenderId"].toString();
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
        if (Array.isArray(ret["participantIds"])) {
          ret["participantIds"] = ret["participantIds"].map((p: any) =>
            typeof p === "object" && p && "_id" in p ? p._id.toString() : p.toString(),
          );
        }
        if (ret["applicationId"] && typeof ret["applicationId"] === "object" && "_id" in ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"]._id.toString();
        } else if (ret["applicationId"]) {
          ret["applicationId"] = ret["applicationId"].toString();
        }
        if (ret["jobId"] && typeof ret["jobId"] === "object" && "_id" in ret["jobId"]) {
          ret["jobId"] = ret["jobId"]._id.toString();
        } else if (ret["jobId"]) {
          ret["jobId"] = ret["jobId"].toString();
        }
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

ConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
ConversationSchema.index({ applicationId: 1, participantIds: 1 });

export const Conversation: Model<IConversationDocument> =
  (mongoose.models["Conversation"] as Model<IConversationDocument>) ||
  mongoose.model<IConversationDocument>("Conversation", ConversationSchema);

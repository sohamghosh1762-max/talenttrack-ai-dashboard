import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessageDocument extends Document {
  id: string;
  conversationId: mongoose.Types.ObjectId | any;
  senderId: mongoose.Types.ObjectId | any;
  recipientId: mongoose.Types.ObjectId | any;
  text: string;
  attachments?: string[];
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
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
        if (ret["conversationId"] && typeof ret["conversationId"] === "object" && "_id" in ret["conversationId"]) {
          ret["conversationId"] = ret["conversationId"]._id.toString();
        } else if (ret["conversationId"]) {
          ret["conversationId"] = ret["conversationId"].toString();
        }
        if (ret["senderId"] && typeof ret["senderId"] === "object" && "_id" in ret["senderId"]) {
          ret["senderId"] = ret["senderId"]._id.toString();
        } else if (ret["senderId"]) {
          ret["senderId"] = ret["senderId"].toString();
        }
        if (ret["recipientId"] && typeof ret["recipientId"] === "object" && "_id" in ret["recipientId"]) {
          ret["recipientId"] = ret["recipientId"]._id.toString();
        } else if (ret["recipientId"]) {
          ret["recipientId"] = ret["recipientId"].toString();
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
        if (ret["conversationId"] && typeof ret["conversationId"] === "object" && "_id" in ret["conversationId"]) {
          ret["conversationId"] = ret["conversationId"]._id.toString();
        } else if (ret["conversationId"]) {
          ret["conversationId"] = ret["conversationId"].toString();
        }
        if (ret["senderId"] && typeof ret["senderId"] === "object" && "_id" in ret["senderId"]) {
          ret["senderId"] = ret["senderId"]._id.toString();
        } else if (ret["senderId"]) {
          ret["senderId"] = ret["senderId"].toString();
        }
        if (ret["recipientId"] && typeof ret["recipientId"] === "object" && "_id" in ret["recipientId"]) {
          ret["recipientId"] = ret["recipientId"]._id.toString();
        } else if (ret["recipientId"]) {
          ret["recipientId"] = ret["recipientId"].toString();
        }
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, recipientId: 1, readAt: 1 });

export const Message: Model<IMessageDocument> =
  (mongoose.models["Message"] as Model<IMessageDocument>) ||
  mongoose.model<IMessageDocument>("Message", MessageSchema);

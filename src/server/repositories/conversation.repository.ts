import { Conversation, type IConversationDocument } from "../models/Conversation.ts";
import { Message, type IMessageDocument } from "../models/Message.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId, userRepository } from "../db/user-repository.ts";
import { jobRepository } from "./job.repository.ts";
import type {
  IConversation,
  IMessage,
  IConversationParticipant,
  IConversationJobSummary,
  ConversationQueryParams,
  MessageQueryParams,
} from "../types/message-types.ts";

const DEFAULT_SEED_CONVERSATIONS: IConversation[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c401",
    participantIds: [
      "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta (Applicant)
      "65f1a2b3c4d5e6f7a8b9c003", // Rahul Mehta (Recruiter)
    ],
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    lastMessageId: "65f1a2b3c4d5e6f7a8b9c502",
    lastMessageText:
      "Thanks for the update! I am available on Thursday afternoon for the technical round.",
    lastMessageAt: "2025-09-15T10:45:00.000Z",
    lastMessageSenderId: "65f1a2b3c4d5e6f7a8b9c008",
    createdAt: "2025-09-15T10:20:00.000Z",
    updatedAt: "2025-09-15T10:45:00.000Z",
  },
];

const DEFAULT_SEED_MESSAGES: IMessage[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c501",
    conversationId: "65f1a2b3c4d5e6f7a8b9c401",
    senderId: "65f1a2b3c4d5e6f7a8b9c003", // Rahul Mehta
    recipientId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
    text: "Hello Aarav! Our engineering team reviewed your profile and would love to schedule a 45-minute technical discussion regarding the Senior Frontend Developer role.",
    attachments: [],
    readAt: "2025-09-15T10:30:00.000Z",
    createdAt: "2025-09-15T10:20:00.000Z",
    updatedAt: "2025-09-15T10:20:00.000Z",
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c502",
    conversationId: "65f1a2b3c4d5e6f7a8b9c401",
    senderId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
    recipientId: "65f1a2b3c4d5e6f7a8b9c003", // Rahul Mehta
    text: "Thanks for the update! I am available on Thursday afternoon for the technical round.",
    attachments: [],
    readAt: "2025-09-15T11:00:00.000Z",
    createdAt: "2025-09-15T10:45:00.000Z",
    updatedAt: "2025-09-15T10:45:00.000Z",
  },
];

class ConversationRepository {
  private inMemoryConversations: Map<string, IConversation> = new Map();
  private inMemoryMessages: Map<string, IMessage> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryConversations.clear();
    this.inMemoryMessages.clear();

    for (const conv of DEFAULT_SEED_CONVERSATIONS) {
      this.inMemoryConversations.set(conv.id, JSON.parse(JSON.stringify(conv)));
    }
    for (const msg of DEFAULT_SEED_MESSAGES) {
      this.inMemoryMessages.set(msg.id, JSON.parse(JSON.stringify(msg)));
    }
  }

  public clearAll(): void {
    this.inMemoryConversations.clear();
    this.inMemoryMessages.clear();
  }

  private resolveParticipantSummary(userId: string): IConversationParticipant | undefined {
    const user = userRepository.findFullUserById(userId);
    if (!user) return undefined;

    const initials = (user.name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      headline: user.applicantProfile?.headline || user.recruiterProfile?.jobTitle,
      companyName: user.recruiterProfile?.companyName,
      initials,
    };
  }

  private async resolveJobSummary(jobId?: string): Promise<IConversationJobSummary | undefined> {
    if (!jobId) return undefined;
    const job = await jobRepository.findById(jobId);
    if (!job) return undefined;

    return {
      id: job.id,
      title: job.title,
      department: job.department,
      company: job.company || job.companyName || "Organization",
      location: job.location,
    };
  }

  private async enrichConversation(
    conv: IConversation,
    currentUserId?: string,
  ): Promise<IConversation> {
    const enriched = { ...conv };

    // Resolve participants
    const participants: IConversationParticipant[] = [];
    for (const pid of conv.participantIds) {
      const p = this.resolveParticipantSummary(pid);
      if (p) participants.push(p);
    }
    enriched.participants = participants;

    // Relative other participant
    if (currentUserId) {
      const other = participants.find((p) => p.id !== currentUserId) || participants[0];
      enriched.participant = other;
    } else {
      enriched.participant = participants[0];
    }

    // Resolve Job summary
    if (conv.jobId) {
      enriched.job = await this.resolveJobSummary(conv.jobId);
    }

    // Count unread messages for current user
    if (currentUserId) {
      enriched.unreadCount = await this.countUnreadMessages(conv.id, currentUserId);
    } else {
      enriched.unreadCount = 0;
    }

    return enriched;
  }

  public async countUnreadMessages(conversationId: string, recipientId: string): Promise<number> {
    if (isDatabaseConnected() && isValidObjectId(conversationId) && isValidObjectId(recipientId)) {
      return await Message.countDocuments({
        conversationId,
        recipientId,
        readAt: null,
      });
    }

    let count = 0;
    for (const msg of this.inMemoryMessages.values()) {
      if (msg.conversationId === conversationId && msg.recipientId === recipientId && !msg.readAt) {
        count++;
      }
    }
    return count;
  }

  public async findUserConversations(
    userId: string,
    params: ConversationQueryParams = {},
  ): Promise<IConversation[]> {
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const docs = await Conversation.find({
        participantIds: userId,
      })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean<IConversationDocument[]>();

      const conversations: IConversation[] = docs.map((doc: any) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        participantIds: (doc.participantIds || []).map((p: any) =>
          typeof p === "object" && p ? p._id?.toString() || p.toString() : p.toString(),
        ),
        applicationId: doc.applicationId?.toString() || undefined,
        jobId: doc.jobId?.toString() || undefined,
        lastMessageId: doc.lastMessageId?.toString() || undefined,
        lastMessageText: doc.lastMessageText || undefined,
        lastMessageAt: doc.lastMessageAt ? new Date(doc.lastMessageAt).toISOString() : undefined,
        lastMessageSenderId: doc.lastMessageSenderId?.toString() || undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      }));

      const enriched = await Promise.all(
        conversations.map((c) => this.enrichConversation(c, userId)),
      );

      if (params.search) {
        const q = params.search.toLowerCase().trim();
        return enriched.filter((c) => {
          const name = c.participant?.name?.toLowerCase() || "";
          const jobTitle = c.job?.title?.toLowerCase() || "";
          const lastText = c.lastMessageText?.toLowerCase() || "";
          return name.includes(q) || jobTitle.includes(q) || lastText.includes(q);
        });
      }

      return enriched;
    }

    // In-memory fallback
    const all = Array.from(this.inMemoryConversations.values()).filter((c) =>
      c.participantIds.includes(userId),
    );

    all.sort((a, b) => {
      const timeA = a.lastMessageAt
        ? new Date(a.lastMessageAt).getTime()
        : new Date(a.createdAt).getTime();
      const timeB = b.lastMessageAt
        ? new Date(b.lastMessageAt).getTime()
        : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    const enriched = await Promise.all(all.map((c) => this.enrichConversation(c, userId)));

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      return enriched.filter((c) => {
        const name = c.participant?.name?.toLowerCase() || "";
        const jobTitle = c.job?.title?.toLowerCase() || "";
        const lastText = c.lastMessageText?.toLowerCase() || "";
        return name.includes(q) || jobTitle.includes(q) || lastText.includes(q);
      });
    }

    return enriched;
  }

  public async findById(id: string, currentUserId?: string): Promise<IConversation | null> {
    if (!id) return null;

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Conversation.findById(id).lean<any>();
      if (!doc) return null;

      const conv: IConversation = {
        id: doc._id ? doc._id.toString() : doc.id,
        participantIds: (doc.participantIds || []).map((p: any) =>
          typeof p === "object" && p ? p._id?.toString() || p.toString() : p.toString(),
        ),
        applicationId: doc.applicationId?.toString() || undefined,
        jobId: doc.jobId?.toString() || undefined,
        lastMessageId: doc.lastMessageId?.toString() || undefined,
        lastMessageText: doc.lastMessageText || undefined,
        lastMessageAt: doc.lastMessageAt ? new Date(doc.lastMessageAt).toISOString() : undefined,
        lastMessageSenderId: doc.lastMessageSenderId?.toString() || undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };

      return this.enrichConversation(conv, currentUserId);
    }

    const conv = this.inMemoryConversations.get(id);
    if (!conv) return null;
    return this.enrichConversation(conv, currentUserId);
  }

  public async findOrCreateForApplication(
    applicationId: string,
    applicantId: string,
    recruiterId: string,
    jobId?: string,
  ): Promise<IConversation> {
    const participants = Array.from(new Set([applicantId, recruiterId])).sort();

    if (isDatabaseConnected() && isValidObjectId(applicationId)) {
      // Find existing conversation matching this applicationId or participants + job
      let doc = await Conversation.findOne({
        $or: [{ applicationId }, { participantIds: { $all: participants }, jobId }],
      }).lean<any>();

      if (!doc) {
        const id = generateObjectId();
        const now = new Date();
        doc = await Conversation.create({
          _id: id,
          participantIds: participants,
          applicationId,
          jobId,
          lastMessageAt: now,
        } as any);
      }

      const conv: IConversation = {
        id: doc._id ? doc._id.toString() : doc.id,
        participantIds: (doc.participantIds || []).map((p: any) =>
          typeof p === "object" && p ? p._id?.toString() || p.toString() : p.toString(),
        ),
        applicationId: doc.applicationId?.toString() || undefined,
        jobId: doc.jobId?.toString() || undefined,
        lastMessageId: doc.lastMessageId?.toString() || undefined,
        lastMessageText: doc.lastMessageText || undefined,
        lastMessageAt: doc.lastMessageAt ? new Date(doc.lastMessageAt).toISOString() : undefined,
        lastMessageSenderId: doc.lastMessageSenderId?.toString() || undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      };

      this.inMemoryConversations.set(conv.id, conv);
      return this.enrichConversation(conv, applicantId);
    }

    // In-memory fallback
    for (const c of this.inMemoryConversations.values()) {
      if (
        c.applicationId === applicationId ||
        (c.participantIds.includes(applicantId) &&
          c.participantIds.includes(recruiterId) &&
          (!jobId || c.jobId === jobId))
      ) {
        return this.enrichConversation(c, applicantId);
      }
    }

    const id = generateObjectId();
    const now = new Date().toISOString();
    const newConv: IConversation = {
      id,
      participantIds: participants,
      applicationId,
      jobId,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    };

    this.inMemoryConversations.set(id, newConv);
    return this.enrichConversation(newConv, applicantId);
  }

  public async findMessages(
    conversationId: string,
    params: MessageQueryParams = {},
  ): Promise<IMessage[]> {
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));

    if (isDatabaseConnected() && isValidObjectId(conversationId)) {
      const docs = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean<IMessageDocument[]>();

      return docs.map((doc: any) => {
        const sender = this.resolveParticipantSummary(doc.senderId?.toString());
        return {
          id: doc._id ? doc._id.toString() : doc.id,
          conversationId: doc.conversationId?.toString() || conversationId,
          senderId: doc.senderId?.toString() || "",
          recipientId: doc.recipientId?.toString() || "",
          text: doc.text,
          attachments: doc.attachments || [],
          readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
          createdAt: doc.createdAt
            ? new Date(doc.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: doc.updatedAt
            ? new Date(doc.updatedAt).toISOString()
            : new Date().toISOString(),
          sender: sender
            ? {
                id: sender.id,
                name: sender.name,
                role: sender.role,
                avatarUrl: sender.avatarUrl,
                initials: sender.initials,
              }
            : undefined,
        };
      });
    }

    // In-memory fallback
    const msgs = Array.from(this.inMemoryMessages.values()).filter(
      (m) => m.conversationId === conversationId,
    );

    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return msgs.slice(0, limit).map((m) => {
      const sender = this.resolveParticipantSummary(m.senderId);
      return {
        ...m,
        sender: sender
          ? {
              id: sender.id,
              name: sender.name,
              role: sender.role,
              avatarUrl: sender.avatarUrl,
              initials: sender.initials,
            }
          : undefined,
      };
    });
  }

  public async createMessage(
    conversationIdOrInput:
      string | { conversationId: string; senderId: string; recipientId: string; text: string },
    senderIdArg?: string,
    recipientIdArg?: string,
    textArg?: string,
  ): Promise<IMessage> {
    let conversationId: string;
    let senderId: string;
    let recipientId: string;
    let text: string;

    if (typeof conversationIdOrInput === "object" && conversationIdOrInput !== null) {
      conversationId = conversationIdOrInput.conversationId;
      senderId = conversationIdOrInput.senderId;
      recipientId = conversationIdOrInput.recipientId;
      text = conversationIdOrInput.text;
    } else {
      conversationId = conversationIdOrInput;
      senderId = senderIdArg || "";
      recipientId = recipientIdArg || "";
      text = textArg || "";
    }

    const now = new Date().toISOString();
    const id = generateObjectId();

    const messageData: IMessage = {
      id,
      conversationId,
      senderId,
      recipientId,
      text: (text || "").trim(),
      attachments: [],
      readAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected() && isValidObjectId(conversationId)) {
      const created = await Message.create({
        _id: id,
        conversationId,
        senderId,
        recipientId,
        text: messageData.text,
        attachments: [],
        readAt: null,
      } as any);

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          lastMessageId: created._id,
          lastMessageText: messageData.text,
          lastMessageAt: new Date(),
          lastMessageSenderId: senderId,
          updatedAt: new Date(),
        },
      });
    }

    this.inMemoryMessages.set(id, messageData);

    const conv = this.inMemoryConversations.get(conversationId);
    if (conv) {
      conv.lastMessageId = id;
      conv.lastMessageText = messageData.text;
      conv.lastMessageAt = now;
      conv.lastMessageSenderId = senderId;
      conv.updatedAt = now;
      this.inMemoryConversations.set(conversationId, conv);
    }

    const sender = this.resolveParticipantSummary(senderId);
    return {
      ...messageData,
      sender: sender
        ? {
            id: sender.id,
            name: sender.name,
            role: sender.role,
            avatarUrl: sender.avatarUrl,
            initials: sender.initials,
          }
        : undefined,
    };
  }

  public async markMessagesAsRead(conversationId: string, recipientId: string): Promise<number> {
    const now = new Date();

    if (isDatabaseConnected() && isValidObjectId(conversationId) && isValidObjectId(recipientId)) {
      const res = await Message.updateMany(
        {
          conversationId,
          recipientId,
          readAt: null,
        },
        {
          $set: { readAt: now },
        },
      );
      return res.modifiedCount || 0;
    }

    let modified = 0;
    for (const msg of this.inMemoryMessages.values()) {
      if (msg.conversationId === conversationId && msg.recipientId === recipientId && !msg.readAt) {
        msg.readAt = now.toISOString();
        this.inMemoryMessages.set(msg.id, msg);
        modified++;
      }
    }
    return modified;
  }
}

export const conversationRepository = new ConversationRepository();

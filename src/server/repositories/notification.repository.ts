import { Notification, type INotificationDocument } from "../models/Notification.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId } from "../db/user-repository.ts";
import type {
  INotification,
  CreateNotificationInput,
  NotificationQueryParams,
  PaginatedNotificationsResponse,
} from "../types/notification-types.ts";

const DEFAULT_SEED_NOTIFICATIONS: INotification[] = [
  {
    id: "65f1a2b3c4d5e6f7a8b9c701",
    userId: "65f1a2b3c4d5e6f7a8b9c008", // Aarav Mehta
    type: "INTERVIEW_SCHEDULED",
    title: "Interview Scheduled",
    message: "Technical Round for Senior Frontend Developer is scheduled for 15 Oct at 10:00 AM.",
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    interviewId: "65f1a2b3c4d5e6f7a8b9c601",
    readAt: null,
    createdAt: "2025-09-15T10:00:00.000Z",
    updatedAt: "2025-09-15T10:00:00.000Z",
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c702",
    userId: "65f1a2b3c4d5e6f7a8b9c008",
    type: "APPLICATION_SHORTLISTED",
    title: "Application Shortlisted 🎉",
    message: "Your application for Senior Frontend Developer has been shortlisted by the recruiting team.",
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    readAt: null,
    createdAt: "2025-09-14T12:00:00.000Z",
    updatedAt: "2025-09-14T12:00:00.000Z",
  },
  {
    id: "65f1a2b3c4d5e6f7a8b9c703",
    userId: "65f1a2b3c4d5e6f7a8b9c008",
    type: "APPLICATION_SUBMITTED",
    title: "Application Received",
    message: "Your application for Senior Frontend Developer has been submitted successfully.",
    applicationId: "65f1a2b3c4d5e6f7a8b9c201",
    jobId: "65f1a2b3c4d5e6f7a8b9c101",
    readAt: "2025-09-14T11:00:00.000Z",
    createdAt: "2025-09-14T10:00:00.000Z",
    updatedAt: "2025-09-14T11:00:00.000Z",
  },
];

class NotificationRepository {
  private inMemoryNotifications: Map<string, INotification> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryNotifications.clear();
    for (const notif of DEFAULT_SEED_NOTIFICATIONS) {
      this.inMemoryNotifications.set(notif.id, { ...notif });
    }
  }

  public clearAll(): void {
    this.inMemoryNotifications.clear();
  }

  public async findUserNotifications(
    userId: string,
    params: NotificationQueryParams = {},
  ): Promise<PaginatedNotificationsResponse> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const query: Record<string, unknown> = { userId };
      if (params.unreadOnly) {
        query["readAt"] = null;
      }

      const [docs, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<any[]>(),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId, readAt: null }),
      ]);

      const notifications: INotification[] = docs.map((doc) => ({
        id: doc._id ? doc._id.toString() : doc.id,
        userId: doc.userId?.toString() || userId,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        applicationId: doc.applicationId?.toString() || undefined,
        jobId: doc.jobId?.toString() || undefined,
        interviewId: doc.interviewId?.toString() || undefined,
        conversationId: doc.conversationId?.toString() || undefined,
        metadata: doc.metadata || undefined,
        readAt: doc.readAt instanceof Date ? doc.readAt.toISOString() : doc.readAt || null,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      }));

      return {
        notifications,
        total,
        unreadCount,
        page,
        limit,
      };
    }

    // In-memory fallback
    const all = Array.from(this.inMemoryNotifications.values()).filter((n) => n.userId === userId);
    const unreadCount = all.filter((n) => !n.readAt).length;

    let filtered = all;
    if (params.unreadOnly) {
      filtered = all.filter((n) => !n.readAt);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      notifications: paginated.map((n) => ({ ...n })),
      total,
      unreadCount,
      page,
      limit,
    };
  }

  public async getUnreadCount(userId: string): Promise<number> {
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      return Notification.countDocuments({ userId, readAt: null });
    }

    const all = Array.from(this.inMemoryNotifications.values());
    return all.filter((n) => n.userId === userId && !n.readAt).length;
  }

  public async findById(id: string): Promise<INotification | null> {
    if (isDatabaseConnected() && isValidObjectId(id)) {
      const doc = await Notification.findById(id).lean<any>();
      if (!doc) return null;
      return {
        id: doc._id ? doc._id.toString() : doc.id,
        userId: doc.userId?.toString() || "",
        type: doc.type,
        title: doc.title,
        message: doc.message,
        applicationId: doc.applicationId?.toString() || undefined,
        jobId: doc.jobId?.toString() || undefined,
        interviewId: doc.interviewId?.toString() || undefined,
        conversationId: doc.conversationId?.toString() || undefined,
        metadata: doc.metadata || undefined,
        readAt: doc.readAt instanceof Date ? doc.readAt.toISOString() : doc.readAt || null,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      };
    }

    const notif = this.inMemoryNotifications.get(id);
    return notif ? { ...notif } : null;
  }

  public async create(input: CreateNotificationInput): Promise<INotification> {
    const now = new Date().toISOString();
    const id = generateObjectId();

    const notifData: INotification = {
      id,
      userId: input.userId,
      type: input.type,
      title: input.title.trim(),
      message: input.message.trim(),
      applicationId: input.applicationId,
      jobId: input.jobId,
      interviewId: input.interviewId,
      conversationId: input.conversationId,
      metadata: input.metadata,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected() && isValidObjectId(input.userId)) {
      const created = await Notification.create({
        _id: id,
        userId: notifData.userId,
        type: notifData.type,
        title: notifData.title,
        message: notifData.message,
        applicationId: notifData.applicationId,
        jobId: notifData.jobId,
        interviewId: notifData.interviewId,
        conversationId: notifData.conversationId,
        metadata: notifData.metadata,
        readAt: null,
      } as any);

      notifData.id = (created as any)._id?.toString() || id;
    }

    this.inMemoryNotifications.set(notifData.id, notifData);
    return { ...notifData };
  }

  public async markAsRead(id: string, userId?: string): Promise<INotification | null> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(id)) {
      const query: Record<string, unknown> = { _id: id };
      if (userId) {
        query["userId"] = userId;
      }
      const updated = await Notification.findOneAndUpdate(
        query,
        { $set: { readAt: new Date() } },
        { new: true },
      ).lean<any>();

      if (!updated) return null;
      return {
        id: updated._id ? updated._id.toString() : updated.id,
        userId: updated.userId?.toString() || userId || "",
        type: updated.type,
        title: updated.title,
        message: updated.message,
        applicationId: updated.applicationId?.toString() || undefined,
        jobId: updated.jobId?.toString() || undefined,
        interviewId: updated.interviewId?.toString() || undefined,
        conversationId: updated.conversationId?.toString() || undefined,
        metadata: updated.metadata || undefined,
        readAt: updated.readAt instanceof Date ? updated.readAt.toISOString() : updated.readAt,
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
        updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
      };
    }

    const notif = this.inMemoryNotifications.get(id);
    if (!notif || (userId && notif.userId !== userId)) return null;

    notif.readAt = now;
    notif.updatedAt = now;
    this.inMemoryNotifications.set(id, notif);
    return { ...notif };
  }

  public async markAllAsRead(userId: string): Promise<number> {
    const now = new Date().toISOString();

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const res = await Notification.updateMany(
        { userId, readAt: null },
        { $set: { readAt: new Date() } },
      );
      return res.modifiedCount;
    }

    let count = 0;
    for (const [id, notif] of this.inMemoryNotifications.entries()) {
      if (notif.userId === userId && !notif.readAt) {
        notif.readAt = now;
        notif.updatedAt = now;
        this.inMemoryNotifications.set(id, notif);
        count++;
      }
    }
    return count;
  }
}

export const notificationRepository = new NotificationRepository();

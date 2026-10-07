import { authenticate } from "../middleware/auth-middleware.ts";
import { notificationRepository } from "../repositories/notification.repository.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.ts";
import type { NotificationQueryParams, NotificationType } from "../types/notification-types.ts";

/**
 * Handle GET /api/notifications
 * - Authenticated user only
 * - Strictly derives user from session (user.id)
 * - Returns user's persistent notifications (newest first)
 */
export async function handleGetNotifications(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const type = (searchParams.get("type") as NotificationType) || undefined;

  const queryParams: NotificationQueryParams = {
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100),
    unreadOnly,
    type,
  };

  const result = await notificationRepository.findUserNotifications(user.id, queryParams);
  return successResponse(result, "Notifications retrieved successfully.");
}

/**
 * Handle GET /api/notifications/unread-count
 * - Authenticated user only
 * - Strictly counts unread notifications for user.id
 */
export async function handleGetUnreadCount(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const count = await notificationRepository.getUnreadCount(user.id);
  return successResponse({ count }, "Unread notification count retrieved.");
}

/**
 * Handle PATCH /api/notifications/:id/read or POST /api/notifications/:id/read
 * - Authenticated user only
 * - Checks authorization: notification must belong to authenticated user
 */
export async function handleMarkNotificationRead(
  req: Request,
  notificationId: string,
): Promise<Response> {
  const user = await authenticate(req);

  if (!notificationId || typeof notificationId !== "string" || !notificationId.trim()) {
    throw new ValidationError("Notification ID is required.");
  }

  const existing = await notificationRepository.findById(notificationId.trim());
  if (!existing) {
    throw new NotFoundError("Notification not found.");
  }

  if (existing.userId !== user.id) {
    throw new ForbiddenError("You are not authorized to modify this notification.");
  }

  const updated = await notificationRepository.markAsRead(notificationId.trim(), user.id);
  if (!updated) {
    throw new NotFoundError("Notification not found.");
  }

  return successResponse(updated, "Notification marked as read.");
}

/**
 * Handle POST /api/notifications/read-all
 * - Authenticated user only
 * - Marks all unread notifications for authenticated user as read
 */
export async function handleMarkAllNotificationsRead(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const count = await notificationRepository.markAllAsRead(user.id);
  return successResponse({ count, success: true }, "All notifications marked as read.");
}

/**
 * Universal dispatcher for /api/notifications/*
 */
export async function handleNotificationApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/notifications")) {
    return null;
  }

  try {
    // 1. GET /api/notifications/unread-count
    if (pathname === "/api/notifications/unread-count" && req.method === "GET") {
      return await handleGetUnreadCount(req);
    }

    // 2. POST /api/notifications/read-all
    if (pathname === "/api/notifications/read-all" && req.method === "POST") {
      return await handleMarkAllNotificationsRead(req);
    }

    // 3. PATCH / POST /api/notifications/:id/read
    const markReadMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (markReadMatch) {
      const notificationId = markReadMatch[1]!;
      if (req.method === "PATCH" || req.method === "POST") {
        return await handleMarkNotificationRead(req, notificationId);
      }
    }

    // 4. GET /api/notifications
    if (pathname === "/api/notifications" && req.method === "GET") {
      return await handleGetNotifications(req);
    }

    throw new NotFoundError(`Notification endpoint not found: ${req.method} ${pathname}`);
  } catch (error) {
    return errorResponse(error);
  }
}

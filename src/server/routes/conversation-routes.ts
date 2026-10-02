import { conversationRepository } from "../repositories/conversation.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { notificationService } from "../services/notification-service.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { NotFoundError, ValidationError, ForbiddenError } from "../utils/errors.ts";
import { isValidObjectId } from "../db/user-repository.ts";
import type {
  CreateConversationInput,
  SendMessageInput,
  ConversationQueryParams,
} from "../types/message-types.ts";

/**
 * Handle GET /api/conversations
 * - Authenticated user only
 * - Strictly returns conversations where the user is a verified participant
 */
export async function handleGetConversations(req: Request): Promise<Response> {
  const user = await authenticate(req);
  const url = new URL(req.url);

  const params: ConversationQueryParams = {
    search: url.searchParams.get("search") || undefined,
  };

  const conversations = await conversationRepository.findUserConversations(user.id, params);
  return successResponse(conversations, "Conversations retrieved successfully.");
}

/**
 * Handle POST /api/conversations
 * - Creates or retrieves a conversation linked to an existing application or job relationship
 * - Never trusts client-submitted arbitrary participant IDs
 */
export async function handleCreateConversation(req: Request): Promise<Response> {
  const user = await authenticate(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = (body || {}) as Partial<CreateConversationInput>;

  // 1. Application-based conversation
  if (raw.applicationId && typeof raw.applicationId === "string" && raw.applicationId.trim()) {
    const appId = raw.applicationId.trim();
    const app = await applicationRepository.findById(appId);
    if (!app) {
      throw new NotFoundError(`Application with ID ${appId} not found.`);
    }

    const isApplicant = user.id === app.applicantId;
    const isRecruiter = user.id === app.recruiterId;
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    if (!isApplicant && !isRecruiter && !isAdmin) {
      throw new ForbiddenError(
        "You are not authorized to start a conversation for an application belonging to another candidate.",
      );
    }

    const conversation = await conversationRepository.findOrCreateForApplication(
      app.id,
      app.applicantId,
      app.recruiterId,
      app.jobId,
    );

    if (raw.initialMessage && typeof raw.initialMessage === "string" && raw.initialMessage.trim()) {
      const recipientId = user.id === app.applicantId ? app.recruiterId : app.applicantId;
      await conversationRepository.createMessage(
        conversation.id,
        user.id,
        recipientId,
        raw.initialMessage.trim(),
      );
    }

    const enriched = await conversationRepository.findById(conversation.id, user.id);
    return successResponse(enriched || conversation, "Conversation created successfully.", 201);
  }

  // 2. Direct job & recipient conversation (Recruiter initiating with applicant)
  if (raw.jobId && raw.recipientId) {
    const job = await jobRepository.findById(raw.jobId.trim());
    if (!job) {
      throw new NotFoundError(`Job opening with ID ${raw.jobId} not found.`);
    }

    const isRoleAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (user.role === "APPLICANT" && !isRoleAdmin) {
      throw new ForbiddenError(
        "Applicants must apply to a position or reference an application to start a conversation.",
      );
    }

    const conversation = await conversationRepository.findOrCreateForApplication(
      `direct-${raw.jobId}-${user.id}-${raw.recipientId}`,
      raw.recipientId,
      user.id,
      job.id,
    );

    if (raw.initialMessage && typeof raw.initialMessage === "string" && raw.initialMessage.trim()) {
      await conversationRepository.createMessage(
        conversation.id,
        user.id,
        raw.recipientId,
        raw.initialMessage.trim(),
      );
    }

    const enriched = await conversationRepository.findById(conversation.id, user.id);
    return successResponse(enriched || conversation, "Conversation created successfully.", 201);
  }

  throw new ValidationError("applicationId is required to start or locate a conversation.");
}

/**
 * Handle GET /api/conversations/:id
 */
export async function handleGetConversationById(
  req: Request,
  conversationId: string,
): Promise<Response> {
  const user = await authenticate(req);
  const conversation = await conversationRepository.findById(conversationId, user.id);

  if (!conversation) {
    throw new NotFoundError(`Conversation with ID ${conversationId} not found.`);
  }

  const isParticipant = conversation.participantIds.includes(user.id);
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isParticipant && !isAdmin) {
    throw new ForbiddenError("You are not authorized to access this conversation.");
  }

  return successResponse(conversation, "Conversation retrieved successfully.");
}

/**
 * Handle GET /api/conversations/:id/messages
 */
export async function handleGetConversationMessages(
  req: Request,
  conversationId: string,
): Promise<Response> {
  const user = await authenticate(req);
  const conversation = await conversationRepository.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError(`Conversation with ID ${conversationId} not found.`);
  }

  const isParticipant = conversation.participantIds.includes(user.id);
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isParticipant && !isAdmin) {
    throw new ForbiddenError("You are not authorized to view messages in this conversation.");
  }

  const messages = await conversationRepository.findMessages(conversationId);
  return successResponse(messages, "Messages retrieved successfully.");
}

/**
 * Handle POST /api/conversations/:id/messages
 * - Sender identity strictly derived from authentication session
 * - Validates membership and text payload
 */
export async function handleSendMessage(req: Request, conversationId: string): Promise<Response> {
  const user = await authenticate(req);
  const conversation = await conversationRepository.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError(`Conversation with ID ${conversationId} not found.`);
  }

  if (!conversation.participantIds.includes(user.id)) {
    throw new ForbiddenError("You are not authorized to send messages in this conversation.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const raw = (body || {}) as SendMessageInput;
  if (!raw.text || typeof raw.text !== "string" || !raw.text.trim()) {
    throw new ValidationError("Message text cannot be empty.");
  }

  if (raw.text.trim().length > 3000) {
    throw new ValidationError("Message text exceeds maximum length of 3000 characters.");
  }

  const recipientId = conversation.participantIds.find((p) => p !== user.id) || user.id;

  const message = await conversationRepository.createMessage(
    conversationId,
    user.id,
    recipientId,
    raw.text.trim(),
  );

  // Notify recipient if recipient is not the sender
  if (recipientId !== user.id) {
    try {
      const senderSummary = (conversationRepository as any).resolveParticipantSummary?.(user.id);
      const senderName = senderSummary?.name || user.email?.split("@")[0] || "Someone";
      const job = conversation.jobId ? await jobRepository.findById(conversation.jobId) : null;

      await notificationService.notifyNewMessage({
        recipientId,
        conversationId,
        senderName,
        messageText: raw.text.trim(),
        jobTitle: job?.title,
      });
    } catch (err) {
      console.error("Failed to create new message notification:", err);
    }
  }

  return successResponse(message, "Message sent successfully.", 201);
}

/**
 * Handle PATCH /api/conversations/:id/read and POST /api/conversations/:id/read
 */
export async function handleMarkConversationRead(
  req: Request,
  conversationId: string,
): Promise<Response> {
  const user = await authenticate(req);
  const conversation = await conversationRepository.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError(`Conversation with ID ${conversationId} not found.`);
  }

  if (!conversation.participantIds.includes(user.id)) {
    throw new ForbiddenError("You are not authorized to access this conversation.");
  }

  const readCount = await conversationRepository.markMessagesAsRead(conversationId, user.id);
  return successResponse({ readCount, success: true }, "Conversation marked as read.", 200);
}

/**
 * Universal dispatcher for /api/conversations/*
 */
export async function handleConversationApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/conversations")) {
    return null;
  }

  try {
    // 1. GET & POST /api/conversations
    if (pathname === "/api/conversations") {
      if (req.method === "GET") {
        return await handleGetConversations(req);
      }
      if (req.method === "POST") {
        return await handleCreateConversation(req);
      }
    }

    // 2. Match /api/conversations/:id/read
    const readMatch = pathname.match(/^\/api\/conversations\/([a-zA-Z0-9_-]+)\/read$/);
    if (readMatch && readMatch[1]) {
      if (req.method === "PATCH" || req.method === "POST") {
        return await handleMarkConversationRead(req, readMatch[1]);
      }
    }

    // 3. Match /api/conversations/:id/messages
    const messagesMatch = pathname.match(/^\/api\/conversations\/([a-zA-Z0-9_-]+)\/messages$/);
    if (messagesMatch && messagesMatch[1]) {
      if (req.method === "GET") {
        return await handleGetConversationMessages(req, messagesMatch[1]);
      }
      if (req.method === "POST") {
        return await handleSendMessage(req, messagesMatch[1]);
      }
    }

    // 4. Match /api/conversations/:id
    const convMatch = pathname.match(/^\/api\/conversations\/([a-zA-Z0-9_-]+)$/);
    if (convMatch && convMatch[1]) {
      if (req.method === "GET") {
        return await handleGetConversationById(req, convMatch[1]);
      }
    }

    return null;
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

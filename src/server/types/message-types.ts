export interface IConversationParticipant {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | undefined;
  headline?: string | undefined;
  companyName?: string | undefined;
  initials?: string | undefined;
}

export interface IConversationJobSummary {
  id: string;
  title: string;
  department?: string | undefined;
  company?: string | undefined;
  location?: string | undefined;
}

export interface IConversation {
  id: string;
  participantIds: string[];
  applicationId?: string | undefined;
  jobId?: string | undefined;
  lastMessageId?: string | undefined;
  lastMessageText?: string | undefined;
  lastMessageAt?: string | undefined;
  lastMessageSenderId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  participant?: IConversationParticipant | undefined;
  participants?: IConversationParticipant[] | undefined;
  job?: IConversationJobSummary | undefined;
  unreadCount?: number | undefined;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  attachments?: string[] | undefined;
  readAt?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  sender?:
    | {
        id: string;
        name: string;
        role: string;
        avatarUrl?: string | undefined;
        initials?: string | undefined;
      }
    | undefined;
}

export interface CreateConversationInput {
  applicationId?: string | undefined;
  jobId?: string | undefined;
  recipientId?: string | undefined;
  initialMessage?: string | undefined;
}

export interface SendMessageInput {
  text: string;
}

export interface ConversationQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
}

export interface MessageQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  before?: string | undefined;
}

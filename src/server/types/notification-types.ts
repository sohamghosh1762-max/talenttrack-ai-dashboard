export type NotificationType =
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_STATUS_CHANGED"
  | "APPLICATION_SHORTLISTED"
  | "APPLICATION_REJECTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_RESCHEDULED"
  | "INTERVIEW_CANCELLED"
  | "NEW_MESSAGE"
  | "RESUME_PARSED"
  | "ATS_ANALYSIS_READY"
  | "JOB_RECOMMENDATION";

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string | undefined;
  jobId?: string | undefined;
  interviewId?: string | undefined;
  conversationId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  readAt?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string | undefined;
  jobId?: string | undefined;
  interviewId?: string | undefined;
  conversationId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface NotificationQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  unreadOnly?: boolean | undefined;
  type?: NotificationType | undefined;
}

export interface PaginatedNotificationsResponse {
  notifications: INotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

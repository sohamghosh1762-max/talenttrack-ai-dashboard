import { notificationRepository } from "../repositories/notification.repository.ts";
import { applicantPreferencesRepository } from "../repositories/applicant-preferences.repository.ts";
import type {
  INotification,
  CreateNotificationInput,
  NotificationType,
} from "../types/notification-types.ts";

export class NotificationService {
  /**
   * Generic notification creation
   */
  public async create(input: CreateNotificationInput): Promise<INotification> {
    return notificationRepository.create(input);
  }

  /**
   * Triggered when candidate submits an application
   */
  public async notifyApplicationSubmitted(params: {
    applicantId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    companyName?: string | undefined;
  }): Promise<INotification | null> {
    // Check applicant preferences
    const prefs = await applicantPreferencesRepository.findByUserId(params.applicantId);
    if (!prefs.applicationStatusUpdates) {
      return null;
    }

    const company = params.companyName || "TalentTrack AI";
    return this.create({
      userId: params.applicantId,
      type: "APPLICATION_SUBMITTED",
      title: "Application Submitted Successfully",
      message: `Your application for ${params.jobTitle} at ${company} has been received and is under review.`,
      applicationId: params.applicationId,
      jobId: params.jobId,
    });
  }

  /**
   * Triggered when recruiter or hiring manager updates application stage/status
   */
  public async notifyApplicationStatusChanged(params: {
    applicantId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    companyName?: string | undefined;
    oldStage?: string | undefined;
    newStage: string;
    status?: string | undefined;
  }): Promise<INotification | null> {
    // Only notify if stage actually changed or meaningful status transition
    if (params.oldStage && params.oldStage === params.newStage) {
      return null;
    }

    // Check applicant preferences
    const prefs = await applicantPreferencesRepository.findByUserId(params.applicantId);
    if (!prefs.applicationStatusUpdates) {
      return null;
    }

    const company = params.companyName || "TalentTrack AI";
    const stageUpper = params.newStage.toUpperCase();

    let type: NotificationType = "APPLICATION_STATUS_CHANGED";
    let title = "Application Status Updated";
    let message = `Your application for ${params.jobTitle} at ${company} has been moved to ${params.newStage}.`;

    if (stageUpper === "SHORTLISTED") {
      type = "APPLICATION_SHORTLISTED";
      title = "Application Shortlisted 🎉";
      message = `Congratulations! You have been shortlisted for ${params.jobTitle} at ${company}.`;
    } else if (stageUpper === "INTERVIEW") {
      title = "Advanced to Interview Stage";
      message = `Your application for ${params.jobTitle} at ${company} has advanced to the interview stage. The team will coordinate schedule details.`;
    } else if (stageUpper === "OFFERED" || stageUpper === "OFFER") {
      title = "Job Offer Extended! 🎊";
      message = `Congratulations! You have received a formal offer for ${params.jobTitle} at ${company}.`;
    } else if (stageUpper === "REJECTED" || params.status?.toUpperCase() === "REJECTED") {
      type = "APPLICATION_REJECTED";
      title = "Application Update";
      message = `Thank you for your interest in ${params.jobTitle} at ${company}. The team has decided to move forward with other candidates at this time.`;
    }

    return this.create({
      userId: params.applicantId,
      type,
      title,
      message,
      applicationId: params.applicationId,
      jobId: params.jobId,
      metadata: {
        stage: params.newStage,
        status: params.status,
      },
    });
  }

  /**
   * Triggered when recruiter / HM schedules an interview
   */
  public async notifyInterviewScheduled(params: {
    applicantId: string;
    interviewId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    interviewTitle: string;
    scheduledAt: string;
    timezone?: string | undefined;
    type?: string | undefined;
    meetingUrl?: string | undefined;
  }): Promise<INotification | null> {
    // Check applicant preferences
    const prefs = await applicantPreferencesRepository.findByUserId(params.applicantId);
    if (!prefs.interviewReminders) {
      return null;
    }

    const date = new Date(params.scheduledAt);
    const dateFormatted = isNaN(date.getTime())
      ? params.scheduledAt
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: params.timezone || "Asia/Kolkata",
        });

    return this.create({
      userId: params.applicantId,
      type: "INTERVIEW_SCHEDULED",
      title: "Interview Scheduled 📅",
      message: `${params.interviewTitle} for ${params.jobTitle} is scheduled for ${dateFormatted} (${params.timezone || "Local Time"}).`,
      applicationId: params.applicationId,
      jobId: params.jobId,
      interviewId: params.interviewId,
      metadata: {
        scheduledAt: params.scheduledAt,
        type: params.type,
      },
    });
  }

  /**
   * Triggered when recruiter / HM reschedules an interview
   */
  public async notifyInterviewRescheduled(params: {
    applicantId: string;
    interviewId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    interviewTitle: string;
    scheduledAt: string;
    timezone?: string | undefined;
  }): Promise<INotification | null> {
    // Check applicant preferences
    const prefs = await applicantPreferencesRepository.findByUserId(params.applicantId);
    if (!prefs.interviewReminders) {
      return null;
    }

    const date = new Date(params.scheduledAt);
    const dateFormatted = isNaN(date.getTime())
      ? params.scheduledAt
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: params.timezone || "Asia/Kolkata",
        });

    return this.create({
      userId: params.applicantId,
      type: "INTERVIEW_RESCHEDULED",
      title: "Interview Rescheduled ↻",
      message: `${params.interviewTitle} for ${params.jobTitle} has been rescheduled to ${dateFormatted} (${params.timezone || "Local Time"}).`,
      applicationId: params.applicationId,
      jobId: params.jobId,
      interviewId: params.interviewId,
    });
  }

  /**
   * Triggered when recruiter / HM cancels an interview
   */
  public async notifyInterviewCancelled(params: {
    applicantId: string;
    interviewId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    interviewTitle: string;
  }): Promise<INotification | null> {
    // Check applicant preferences
    const prefs = await applicantPreferencesRepository.findByUserId(params.applicantId);
    if (!prefs.interviewReminders) {
      return null;
    }

    return this.create({
      userId: params.applicantId,
      type: "INTERVIEW_CANCELLED",
      title: "Interview Cancelled",
      message: `${params.interviewTitle} for ${params.jobTitle} has been cancelled. Your recruiter will follow up with next steps.`,
      applicationId: params.applicationId,
      jobId: params.jobId,
      interviewId: params.interviewId,
    });
  }

  /**
   * Triggered when recruiter sends candidate a direct message
   */
  public async notifyNewMessage(params: {
    recipientId: string;
    conversationId: string;
    senderName: string;
    messageText: string;
    jobTitle?: string | undefined;
  }): Promise<INotification | null> {
    // Check recipient preferences
    const prefs = await applicantPreferencesRepository.findByUserId(params.recipientId);
    if (!prefs.messageNotifications) {
      return null;
    }

    const snippet =
      params.messageText.length > 80
        ? `${params.messageText.substring(0, 77)}...`
        : params.messageText;

    const forJob = params.jobTitle ? ` regarding ${params.jobTitle}` : "";

    return this.create({
      userId: params.recipientId,
      type: "NEW_MESSAGE",
      title: `New Message from ${params.senderName}`,
      message: `"${snippet}"${forJob}`,
      conversationId: params.conversationId,
    });
  }

  /**
   * Triggered when candidate's ATS resume analysis is completed
   */
  public async notifyAtsScoreReady(params: {
    applicantId: string;
    overallScore: number;
    resumeFileName?: string | undefined;
  }): Promise<INotification> {
    return this.create({
      userId: params.applicantId,
      type: "ATS_ANALYSIS_READY",
      title: "ATS Resume Analysis Ready ⚡",
      message: `Your resume score is ${params.overallScore}/100. Review keyword matches and optimization suggestions.`,
    });
  }
}

export const notificationService = new NotificationService();

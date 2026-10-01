import { createEmailProvider, type EmailProvider } from "./provider.ts";
import { getVerificationEmailTemplate, getPasswordResetEmailTemplate } from "./templates.ts";
import { config } from "../../config/index.ts";

class EmailService {
  private provider: EmailProvider;

  constructor() {
    this.provider = createEmailProvider();
  }

  /**
   * Send account email verification link
   */
  async sendVerificationEmail(options: {
    to: string;
    userName: string;
    token: string;
  }): Promise<boolean> {
    const verificationUrl = `${config.app.appUrl}/verify-email?token=${encodeURIComponent(options.token)}`;
    const template = getVerificationEmailTemplate({
      userName: options.userName,
      verificationUrl,
    });

    const res = await this.provider.send({
      to: options.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
    });

    return res.success;
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(options: {
    to: string;
    userName: string;
    token: string;
  }): Promise<boolean> {
    const resetUrl = `${config.app.appUrl}/reset-password?token=${encodeURIComponent(options.token)}`;
    const template = getPasswordResetEmailTemplate({
      userName: options.userName,
      resetUrl,
    });

    const res = await this.provider.send({
      to: options.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
    });

    return res.success;
  }
  /**
   * Send interview scheduled notification email to candidate
   */
  async sendInterviewNotificationEmail(options: {
    to: string;
    candidateName: string;
    jobRole: string;
    interviewer: string;
    dateTime: string;
    meetingLink: string;
  }): Promise<boolean> {
    const subject = `Interview Scheduled for ${options.jobRole} — TalentTrack AI`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Interview Scheduled</h2>
        <p>Dear ${options.candidateName},</p>
        <p>Your interview for the <strong>${options.jobRole}</strong> position has been scheduled.</p>
        <ul>
          <li><strong>Interviewer:</strong> ${options.interviewer}</li>
          <li><strong>Date & Time:</strong> ${options.dateTime}</li>
          <li><strong>Meeting Link:</strong> <a href="${options.meetingLink}">${options.meetingLink}</a></li>
        </ul>
        <p>Best regards,<br/>TalentTrack AI Team</p>
      </div>
    `;

    const res = await this.provider.send({
      to: options.to,
      subject,
      html,
      text: `Your interview for ${options.jobRole} with ${options.interviewer} is scheduled for ${options.dateTime}. Join link: ${options.meetingLink}`,
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
    });

    return res.success;
  }

  /**
   * Send application status change email to candidate
   */
  async sendApplicationStatusEmail(options: {
    to: string;
    candidateName: string;
    jobRole: string;
    status: string;
  }): Promise<boolean> {
    const subject = `Application Status Update for ${options.jobRole} — TalentTrack AI`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Application Update</h2>
        <p>Dear ${options.candidateName},</p>
        <p>Your application status for <strong>${options.jobRole}</strong> has been updated to: <strong>${options.status}</strong>.</p>
        <p>Log into your TalentTrack AI candidate portal to view details.</p>
        <p>Best regards,<br/>TalentTrack AI Team</p>
      </div>
    `;

    const res = await this.provider.send({
      to: options.to,
      subject,
      html,
      text: `Your application for ${options.jobRole} has been updated to status: ${options.status}.`,
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
    });

    return res.success;
  }
}

export const emailService = new EmailService();

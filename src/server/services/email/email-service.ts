import { createEmailProvider, type EmailProvider, type SendEmailResult } from "./provider.ts";
import { getVerificationEmailTemplate, getPasswordResetEmailTemplate } from "./templates.ts";
import { config } from "../../config/index.ts";

export class EmailService {
  private provider: EmailProvider;

  constructor(provider?: EmailProvider) {
    this.provider = provider || createEmailProvider();
  }

  /**
   * Set custom provider (useful for testing or runtime reconfig)
   */
  public setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  /**
   * Get active provider instance
   */
  public getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Send account email verification link (returns boolean indicating submission success)
   */
  async sendVerificationEmail(options: {
    to: string;
    userName: string;
    token: string;
  }): Promise<boolean> {
    const res = await this.sendVerificationEmailDetailed(options);
    return res.success;
  }

  /**
   * Send account email verification link with detailed delivery report
   */
  async sendVerificationEmailDetailed(options: {
    to: string;
    userName: string;
    token: string;
  }): Promise<SendEmailResult> {
    const verificationUrl = `${config.app.appUrl}/verify-email?token=${encodeURIComponent(options.token)}`;
    const template = getVerificationEmailTemplate({
      userName: options.userName,
      verificationUrl,
    });

    return this.provider.send({
      to: options.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
    });
  }

  /**
   * Send password reset link (returns boolean indicating submission success)
   */
  async sendPasswordResetEmail(options: {
    to: string;
    userName: string;
    token: string;
  }): Promise<boolean> {
    const res = await this.sendPasswordResetEmailDetailed(options);
    return res.success;
  }

  /**
   * Send password reset link with detailed delivery report
   */
  async sendPasswordResetEmailDetailed(options: {
    to: string;
    userName: string;
    token: string;
  }): Promise<SendEmailResult> {
    const resetUrl = `${config.app.appUrl}/reset-password?token=${encodeURIComponent(options.token)}`;
    const template = getPasswordResetEmailTemplate({
      userName: options.userName,
      resetUrl,
    });

    return this.provider.send({
      to: options.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
    });
  }
}

export const emailService = new EmailService();

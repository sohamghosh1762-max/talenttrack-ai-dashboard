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
}

export const emailService = new EmailService();

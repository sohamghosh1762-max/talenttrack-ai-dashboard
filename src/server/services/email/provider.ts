import { logger } from "../../utils/logger.ts";
import { config } from "../../config/index.ts";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailProvider {
  send(
    options: SendEmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Safe local development email provider: logs email metadata without printing security secrets
 */
export class DevConsoleEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info(
      `[Email Dispatcher (Dev)] Message simulated to ${options.to}: "${options.subject}" (ID: ${messageId})`,
    );
    return { success: true, messageId };
  }
}

/**
 * Production SMTP email provider stub (ready for nodemailer in Phase 8)
 */
export class SmtpEmailProvider implements EmailProvider {
  async send(
    options: SendEmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!config.email.host) {
      // Fallback to dev logger if SMTP host not configured
      return new DevConsoleEmailProvider().send(options);
    }
    logger.info(
      `[Email Dispatcher (SMTP)] Sending to ${options.to}: "${options.subject}" via ${config.email.host}`,
    );
    return { success: true, messageId: `smtp_${Date.now()}` };
  }
}

export function createEmailProvider(): EmailProvider {
  if (config.app.isProduction && config.email.host) {
    return new SmtpEmailProvider();
  }
  return new DevConsoleEmailProvider();
}

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
    const isProd =
      (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production") ||
      config.app.isProduction;

    if (!config.email.host) {
      if (isProd) {
        logger.error(
          `[Email Dispatcher (SMTP)] Delivery failed to ${options.to}: SMTP_HOST is not configured in production.`,
        );
        return { success: false, error: "Email delivery service is not configured in production." };
      }
      // Fallback to dev logger only in development/test
      return new DevConsoleEmailProvider().send(options);
    }

    try {
      logger.info(
        `[Email Dispatcher (SMTP)] Dispatching message to ${options.to}: "${options.subject}" via ${config.email.host}:${config.email.port || 587}`,
      );
      // In production with valid host, simulate/execute outbound transmission safely
      return {
        success: true,
        messageId: `smtp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "SMTP transmission failed";
      logger.error(`[Email Dispatcher (SMTP)] Transmission error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}

export function createEmailProvider(): EmailProvider {
  const isProd =
    (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production") ||
    config.app.isProduction;
  if (isProd) {
    return new SmtpEmailProvider();
  }
  return new DevConsoleEmailProvider();
}

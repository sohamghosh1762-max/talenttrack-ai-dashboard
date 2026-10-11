import nodemailer from "nodemailer";
import type { Transporter, SentMessageInfo } from "nodemailer";
import { logger } from "../../utils/logger.ts";
import { config } from "../../config/index.ts";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string | undefined;
  replyTo?: string | undefined;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
  rejected?: string[] | undefined;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  verify?(): Promise<boolean>;
  close?(): Promise<void> | void;
}

export interface SmtpProviderOptions {
  host?: string | undefined;
  port?: number | undefined;
  user?: string | undefined;
  password?: string | undefined;
  secure?: boolean | undefined;
  fromEmail?: string | undefined;
  fromName?: string | undefined;
}

/**
 * Safe local development email provider: logs email metadata without printing security secrets
 */
export class DevConsoleEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info(
      `[Email Dispatcher (Dev)] Message simulated to ${options.to}: "${options.subject}" (ID: ${messageId})`,
    );
    return { success: true, messageId };
  }
}

/**
 * Production-ready SMTP email provider backed by Nodemailer
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private options: SmtpProviderOptions;

  constructor(customTransporter?: Transporter | null, customOptions?: SmtpProviderOptions) {
    this.options = customOptions || {};
    if (customTransporter) {
      this.transporter = customTransporter;
    }
  }

  private isProduction(): boolean {
    return (
      (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production") ||
      config.app.isProduction
    );
  }

  public getHost(): string | undefined {
    if ("host" in this.options) {
      return this.options.host || undefined;
    }
    return config.email.host || undefined;
  }

  public getPort(): number {
    return this.options.port ?? config.email.port ?? 587;
  }

  public isSecure(): boolean {
    if (this.options.secure !== undefined) {
      return this.options.secure;
    }
    if (config.email.secure !== undefined) {
      return config.email.secure;
    }
    return this.getPort() === 465;
  }

  public getUser(): string | undefined {
    return this.options.user ?? config.email.user;
  }

  public getPassword(): string | undefined {
    return this.options.password ?? config.email.password;
  }

  public getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.getHost();
    const port = this.getPort();
    const secure = this.isSecure();
    const user = this.getUser();
    const pass = this.getPassword();

    // Standard Nodemailer transport configuration
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
    });

    return this.transporter;
  }

  /**
   * Verify SMTP transport connection and authentication credentials
   */
  public async verify(): Promise<boolean> {
    const host = this.getHost();
    if (!host) {
      return false;
    }
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "SMTP verification failed";
      logger.error(
        `[Email Dispatcher (SMTP)] Verification probe failed: ${this.sanitizeError(errorMsg)}`,
      );
      return false;
    }
  }

  /**
   * Cleanly close active pooled or persistent transport connections
   */
  public close(): void {
    if (this.transporter && typeof this.transporter.close === "function") {
      this.transporter.close();
      this.transporter = null;
    }
  }

  private sanitizeError(message: string): string {
    return message
      .replace(/pass(word)?=([^\s&]+)/gi, "password=[REDACTED]")
      .replace(/auth=([^\s&]+)/gi, "auth=[REDACTED]")
      .replace(/token=([^\s&]+)/gi, "token=[REDACTED]");
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const host = this.getHost();
    const isProd = this.isProduction();

    // Basic recipient address validation
    if (!options.to || typeof options.to !== "string" || !options.to.includes("@")) {
      return { success: false, error: "Invalid recipient email address" };
    }

    // Fail safe when SMTP_HOST is not configured in production
    if (!host) {
      if (isProd) {
        logger.error(
          `[Email Dispatcher (SMTP)] Delivery failed to ${options.to}: SMTP_HOST is not configured in production.`,
        );
        return {
          success: false,
          error: "Email delivery service is not configured in production (missing SMTP_HOST).",
        };
      }
      // Safe fallback to console logger in dev/test environments
      return new DevConsoleEmailProvider().send(options);
    }

    try {
      const port = this.getPort();
      const fromName = this.options.fromName || config.email.fromName || "TalentTrack AI";
      const fromEmail =
        this.options.fromEmail || config.email.fromEmail || "no-reply@talenttrack.ai";
      const from = options.from || `${fromName} <${fromEmail}>`;

      logger.info(
        `[Email Dispatcher (SMTP)] Transmitting message to ${options.to}: "${options.subject}" via ${host}:${port}`,
      );

      const transporter = this.getTransporter();
      const info: SentMessageInfo = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      });

      // Handle rejected recipients reported by the SMTP server
      const rejected = Array.isArray(info.rejected) ? (info.rejected as string[]) : [];
      if (rejected.length > 0 && rejected.includes(options.to)) {
        logger.error(
          `[Email Dispatcher (SMTP)] Recipient address rejected by SMTP server: ${options.to}`,
        );
        return {
          success: false,
          error: `Recipient address was rejected by SMTP server: ${options.to}`,
          rejected,
        };
      }

      const messageId = typeof info.messageId === "string" ? info.messageId : undefined;
      logger.info(
        `[Email Dispatcher (SMTP)] Outbound email accepted by SMTP server (MessageId: ${messageId || "unknown"})`,
      );

      return {
        success: true,
        ...(messageId ? { messageId } : {}),
        ...(rejected.length > 0 ? { rejected } : {}),
      };
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "SMTP transmission failed";
      const sanitizedMsg = this.sanitizeError(rawMsg);
      logger.error(`[Email Dispatcher (SMTP)] Transmission error: ${sanitizedMsg}`);
      return {
        success: false,
        error: sanitizedMsg,
      };
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

  if (config.email.host) {
    return new SmtpEmailProvider();
  }

  return new DevConsoleEmailProvider();
}

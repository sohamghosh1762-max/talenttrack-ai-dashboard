import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SmtpEmailProvider,
  DevConsoleEmailProvider,
  createEmailProvider,
  type SendEmailOptions,
} from "../services/email/provider.ts";
import { EmailService } from "../services/email/email-service.ts";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
} from "../services/email/templates.ts";
import { validateProductionEnvironment } from "../config/env.ts";
import type { Transporter, SentMessageInfo } from "nodemailer";

describe("Real SMTP Email Delivery & Reliability Tests", () => {
  describe("Unit Tests: SmtpEmailProvider Transport & Submission", () => {
    it("initializes transport with expected parameters for STARTTLS port 587", () => {
      const provider = new SmtpEmailProvider(null, {
        host: "smtp.sendgrid.net",
        port: 587,
        user: "apikey",
        password: "secret_api_key_value",
        secure: false,
        fromEmail: "alerts@talenttrack.ai",
        fromName: "TalentTrack Hiring",
      });

      assert.equal(provider.getHost(), "smtp.sendgrid.net");
      assert.equal(provider.getPort(), 587);
      assert.equal(provider.isSecure(), false);
      assert.equal(provider.getUser(), "apikey");
      assert.equal(provider.getPassword(), "secret_api_key_value");

      const transporter = provider.getTransporter();
      assert.ok(transporter);
      assert.equal(typeof transporter.sendMail, "function");
    });

    it("initializes transport with secure: true for implicit TLS port 465", () => {
      const provider = new SmtpEmailProvider(null, {
        host: "smtp.gmail.com",
        port: 465,
        user: "admin@talenttrack.ai",
        password: "app_password_here",
      });

      assert.equal(provider.getHost(), "smtp.gmail.com");
      assert.equal(provider.getPort(), 465);
      assert.equal(provider.isSecure(), true);
    });

    it("configures Resend SMTP relay with port 465, user resend, and implicit TLS", () => {
      const provider = new SmtpEmailProvider(null, {
        host: "smtp.resend.com",
        port: 465,
        user: "resend",
        password: "mock_resend_api_key",
        secure: true,
        fromEmail: "onboarding@resend.dev",
        fromName: "TalentTrack AI",
      });

      assert.equal(provider.getHost(), "smtp.resend.com");
      assert.equal(provider.getPort(), 465);
      assert.equal(provider.isSecure(), true);
      assert.equal(provider.getUser(), "resend");
      assert.equal(provider.getPassword(), "mock_resend_api_key");
    });

    it("invokes transport and returns provider messageId upon successful delivery", async () => {
      let capturedMailOptions: unknown = null;
      const mockTransporter = {
        sendMail: async (options: unknown) => {
          capturedMailOptions = options;
          return {
            messageId: "<20261011.talenttrack.789@smtp.provider.net>",
            accepted: ["candidate@example.com"],
            rejected: [],
            response: "250 OK: Message accepted for delivery",
          } as unknown as SentMessageInfo;
        },
      } as unknown as Transporter;

      const provider = new SmtpEmailProvider(mockTransporter, {
        host: "smtp.mailgun.org",
        port: 587,
        fromEmail: "notifications@talenttrack.ai",
        fromName: "TalentTrack Dispatcher",
      });

      const result = await provider.send({
        to: "candidate@example.com",
        subject: "Verify your email address",
        html: "<p>Click here to verify</p>",
        text: "Click here to verify",
      });

      assert.equal(result.success, true);
      assert.equal(result.messageId, "<20261011.talenttrack.789@smtp.provider.net>");
      assert.deepEqual(capturedMailOptions, {
        from: "TalentTrack Dispatcher <notifications@talenttrack.ai>",
        to: "candidate@example.com",
        subject: "Verify your email address",
        text: "Click here to verify",
        html: "<p>Click here to verify</p>",
      });
    });

    it("handles SMTP authentication failure cleanly without exposing password", async () => {
      const mockTransporter = {
        sendMail: async () => {
          const authError = new Error(
            "Invalid login: 535 5.7.8 Username and Password not accepted password=supersecretpass123 auth=PLAIN",
          );
          throw authError;
        },
      } as unknown as Transporter;

      const provider = new SmtpEmailProvider(mockTransporter, {
        host: "smtp.sendgrid.net",
        port: 587,
        user: "apikey",
        password: "supersecretpass123",
      });

      const result = await provider.send({
        to: "recipient@example.com",
        subject: "Password Reset",
        html: "<p>Reset</p>",
        text: "Reset",
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
      assert.doesNotMatch(result.error, /supersecretpass123/);
      assert.match(result.error, /password=\[REDACTED\]/);
    });

    it("handles connection timeout and network failures gracefully", async () => {
      const mockTransporter = {
        sendMail: async () => {
          const timeoutErr = new Error("Connection timeout after 10000ms (ETIMEDOUT)");
          throw timeoutErr;
        },
      } as unknown as Transporter;

      const provider = new SmtpEmailProvider(mockTransporter, {
        host: "smtp.unreachable.net",
        port: 587,
      });

      const result = await provider.send({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
        text: "Hi",
      });

      assert.equal(result.success, false);
      assert.match(result.error || "", /ETIMEDOUT|Connection timeout/);
    });

    it("treats rejected recipient addresses as submission failure", async () => {
      const mockTransporter = {
        sendMail: async () => {
          return {
            messageId: "<rejected.msg.id@smtp.org>",
            accepted: [],
            rejected: ["undeliverable@invalid-domain.xyz"],
            response: "550 5.1.1 User unknown",
          } as unknown as SentMessageInfo;
        },
      } as unknown as Transporter;

      const provider = new SmtpEmailProvider(mockTransporter, {
        host: "smtp.mailgun.org",
      });

      const result = await provider.send({
        to: "undeliverable@invalid-domain.xyz",
        subject: "Notification",
        html: "<p>Test</p>",
        text: "Test",
      });

      assert.equal(result.success, false);
      assert.match(result.error || "", /rejected by SMTP server/);
      assert.deepEqual(result.rejected, ["undeliverable@invalid-domain.xyz"]);
    });

    it("rejects invalid recipient email formats early", async () => {
      const provider = new SmtpEmailProvider(null, { host: "smtp.provider.net" });
      const result = await provider.send({
        to: "not-an-email",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      });

      assert.equal(result.success, false);
      assert.match(result.error || "", /Invalid recipient email/);
    });

    it("verifies and closes transport connections cleanly", async () => {
      let verifyCalled = false;
      let closeCalled = false;

      const mockTransporter = {
        verify: async () => {
          verifyCalled = true;
          return true;
        },
        close: () => {
          closeCalled = true;
        },
      } as unknown as Transporter;

      const provider = new SmtpEmailProvider(mockTransporter, {
        host: "smtp.example.com",
      });

      const isVerified = await provider.verify();
      assert.equal(isVerified, true);
      assert.equal(verifyCalled, true);

      provider.close();
      assert.equal(closeCalled, true);
    });
  });

  describe("Production Safety & Fallback Isolation", () => {
    it("never falls back to DevConsoleEmailProvider in production when SMTP_HOST is missing", async () => {
      const originalEnv = process.env["NODE_ENV"];
      try {
        process.env["NODE_ENV"] = "production";
        const provider = new SmtpEmailProvider(null, { host: undefined });

        const result = await provider.send({
          to: "prod.user@company.com",
          subject: "Welcome",
          html: "<p>Welcome</p>",
          text: "Welcome",
        });

        assert.equal(result.success, false);
        assert.match(
          result.error || "",
          /SMTP_HOST is not configured in production|missing SMTP_HOST/i,
        );
      } finally {
        process.env["NODE_ENV"] = originalEnv;
      }
    });

    it("falls back to DevConsoleEmailProvider in development when SMTP_HOST is omitted", async () => {
      const originalEnv = process.env["NODE_ENV"];
      try {
        process.env["NODE_ENV"] = "development";
        const provider = new SmtpEmailProvider(null, { host: undefined });

        const result = await provider.send({
          to: "dev.user@local.test",
          subject: "Dev Simulation",
          html: "<p>Dev</p>",
          text: "Dev",
        });

        assert.equal(result.success, true);
        assert.ok(result.messageId?.startsWith("msg_"));
      } finally {
        process.env["NODE_ENV"] = originalEnv;
      }
    });

    it("createEmailProvider returns SmtpEmailProvider in production", () => {
      const originalEnv = process.env["NODE_ENV"];
      try {
        process.env["NODE_ENV"] = "production";
        const provider = createEmailProvider();
        assert.ok(provider instanceof SmtpEmailProvider);
      } finally {
        process.env["NODE_ENV"] = originalEnv;
      }
    });

    it("enforces SMTP configuration when REQUIRE_SMTP=true in production environment validation", () => {
      const validation = validateProductionEnvironment({
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/talenttrack",
        SESSION_SECRET: "c8f2a1b9e4d7f0123456789abcdef0123456789abcdef0123456789abcdef01",
        JWT_SECRET: "d9e3b2c1a4f7e0123456789abcdef0123456789abcdef0123456789abcdef01",
        ALLOW_DEMO_ACCOUNTS: "false",
        REQUIRE_SMTP: "true",
      });

      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some((e) => e.includes("SMTP_HOST")));
    });

    it("validates port range and credentials when SMTP_HOST is present in production", () => {
      const invalidPort = validateProductionEnvironment({
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/talenttrack",
        SESSION_SECRET: "c8f2a1b9e4d7f0123456789abcdef0123456789abcdef0123456789abcdef01",
        JWT_SECRET: "d9e3b2c1a4f7e0123456789abcdef0123456789abcdef0123456789abcdef01",
        ALLOW_DEMO_ACCOUNTS: "false",
        SMTP_HOST: "smtp.sendgrid.net",
        SMTP_PORT: "99999",
      });
      assert.equal(invalidPort.valid, false);
      assert.ok(invalidPort.errors.some((e) => e.includes("SMTP_PORT")));

      const missingPassword = validateProductionEnvironment({
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/talenttrack",
        SESSION_SECRET: "c8f2a1b9e4d7f0123456789abcdef0123456789abcdef0123456789abcdef01",
        JWT_SECRET: "d9e3b2c1a4f7e0123456789abcdef0123456789abcdef0123456789abcdef01",
        ALLOW_DEMO_ACCOUNTS: "false",
        SMTP_HOST: "smtp.sendgrid.net",
        SMTP_PORT: "587",
        SMTP_USER: "apikey",
      });
      assert.equal(missingPassword.valid, false);
      assert.ok(missingPassword.errors.some((e) => e.includes("SMTP_PASSWORD")));
    });
  });

  describe("Integration Tests: EmailService Dispatch & Templates", () => {
    it("builds valid verification email templates with encoded tokens", () => {
      const template = getVerificationEmailTemplate({
        userName: "Alice Applicant",
        verificationUrl: "https://talenttrack.ai/verify-email?token=tok_safe_test_123%2B456",
      });

      assert.match(template.subject, /Verify your email address/);
      assert.match(template.text, /Alice Applicant/);
      assert.match(template.text, /tok_safe_test_123%2B456/);
      assert.match(template.html, /Alice Applicant/);
      assert.match(template.html, /Verify Email Address/);
      assert.doesNotMatch(template.html, /password/i);
    });

    it("builds valid password reset email templates with security notices", () => {
      const template = getPasswordResetEmailTemplate({
        userName: "Bob Recruiter",
        resetUrl: "https://talenttrack.ai/reset-password?token=tok_reset_safe_789",
      });

      assert.match(template.subject, /Reset your password/);
      assert.match(template.text, /Bob Recruiter/);
      assert.match(template.text, /60 minutes/);
      assert.match(template.html, /Reset Password/);
      assert.doesNotMatch(template.html, /passwordHash|salt/i);
    });

    it("EmailService delegates correctly to injected provider and propagates submission status", async () => {
      const sentPayloads: SendEmailOptions[] = [];
      const testProvider = {
        send: async (options: SendEmailOptions) => {
          sentPayloads.push(options);
          return { success: true, messageId: "msg_custom_service_test_99" };
        },
      };

      const service = new EmailService(testProvider);

      const verifyResult = await service.sendVerificationEmail({
        to: "candidate@talenttrack.ai",
        userName: "Candidate One",
        token: "tok_verify_abc",
      });

      assert.equal(verifyResult, true);
      assert.equal(sentPayloads.length, 1);
      assert.equal(sentPayloads[0]?.to, "candidate@talenttrack.ai");
      assert.match(sentPayloads[0]?.subject || "", /Verify your email address/);

      const resetResult = await service.sendPasswordResetEmail({
        to: "candidate@talenttrack.ai",
        userName: "Candidate One",
        token: "tok_reset_xyz",
      });

      assert.equal(resetResult, true);
      assert.equal(sentPayloads.length, 2);
      assert.match(sentPayloads[1]?.subject || "", /Reset your password/);

      // Detailed dispatch methods
      const detailedVerify = await service.sendVerificationEmailDetailed({
        to: "candidate@talenttrack.ai",
        userName: "Candidate One",
        token: "tok_verify_detailed",
      });
      assert.equal(detailedVerify.success, true);
      assert.equal(detailedVerify.messageId, "msg_custom_service_test_99");
    });

    it("EmailService accurately reflects failed provider submission", async () => {
      const failingProvider = {
        send: async () => {
          return {
            success: false,
            error: "SMTP connection rejected: 554 Relay access denied",
          };
        },
      };

      const service = new EmailService(failingProvider);

      const sent = await service.sendVerificationEmail({
        to: "unreachable@relay-blocked.com",
        userName: "Unreachable User",
        token: "tok_fail_test",
      });

      assert.equal(sent, false);

      const detailed = await service.sendPasswordResetEmailDetailed({
        to: "unreachable@relay-blocked.com",
        userName: "Unreachable User",
        token: "tok_fail_test",
      });

      assert.equal(detailed.success, false);
      assert.match(detailed.error || "", /Relay access denied/);
    });
  });
});

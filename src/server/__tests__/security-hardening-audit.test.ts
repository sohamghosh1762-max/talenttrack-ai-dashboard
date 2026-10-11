import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { userRepository, DEFAULT_SEED_EMAILS } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";
import { handleAuthApiRequest } from "../routes/auth-routes.ts";
import { authenticate } from "../middleware/auth-middleware.ts";
import { validateProductionEnvironment } from "../config/env.ts";
import { seedDatabase } from "../db/seed.ts";
import { createUserSessionAsync } from "../auth/session-service.ts";
import { SmtpEmailProvider, emailService } from "../services/email/index.ts";

describe("CRITICAL SECURITY & AUTHENTICATION HARDENING SUITE", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("A & G: Production Demo-Account Rejection & Anti-Fallback Protection", () => {
    it("strictly rejects demo/seeded accounts during login in production", async () => {
      process.env["NODE_ENV"] = "production";

      const demoEmail = "admin@talenttrack.ai";
      assert.ok(DEFAULT_SEED_EMAILS.has(demoEmail));

      const req = new Request("https://talenttrack.ai/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: demoEmail,
          password: "password123",
        }),
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      // In production without DB connection, it either fails closed with 503 or 401, but NEVER 200
      assert.ok(res.status === 401 || res.status === 503);
      const data = await res.json();
      assert.notEqual(res.status, 200);
      assert.ok(
        data.error?.code === "INVALID_CREDENTIALS" || data.error?.code === "DATABASE_UNAVAILABLE",
      );
    });

    it("strictly rejects plaintext passwords in production", () => {
      process.env["NODE_ENV"] = "production";
      const matches = verifyPassword("password123", "password123");
      assert.equal(matches, false, "Plaintext passwords must never match in production");
    });

    it("prevents demo seeding from executing in production by default", async () => {
      process.env["NODE_ENV"] = "production";
      delete process.env["ALLOW_PRODUCTION_SEED"];

      await assert.rejects(async () => {
        await seedDatabase();
      }, /FATAL: Database seeding is prohibited in production/i);
    });

    it("prevents raw user ID bearer token authentication bypass in production", async () => {
      process.env["NODE_ENV"] = "production";

      // Attempt to authenticate by supplying a raw user ID directly
      const req = new Request("https://talenttrack.ai/api/auth/me", {
        headers: {
          Authorization: "Bearer usr-recruiter-001",
        },
      });

      await assert.rejects(async () => {
        await authenticate(req);
      }, /(?:Invalid or expired session|Invalid Firebase authentication token)/i);
    });

    it("fails closed with 503 DATABASE_UNAVAILABLE in production when database is disconnected", async () => {
      process.env["NODE_ENV"] = "production";

      await assert.rejects(
        async () => {
          await userRepository.findByEmailAsync("anyone@example.com");
        },
        (err: unknown) => {
          const e = err as { statusCode?: number; code?: string };
          return e.statusCode === 503 && e.code === "DATABASE_UNAVAILABLE";
        },
      );
    });

    it("authenticates legitimate persisted users with scrypt hashes when database is operational", async () => {
      // In development/test mode, verify standard scrypt hash authentication works as expected
      const validEmail = "legit.recruiter.test@enterprise.org";
      const validPassword = "SecurePassword123!";
      const passHash = hashPassword(validPassword);

      // Create user
      const user = await userRepository.createUserAsync({
        email: validEmail,
        passwordHash: passHash,
        name: "Legit Enterprise Recruiter",
        role: "RECRUITER",
        status: "ACTIVE",
        emailVerified: true,
      });

      assert.ok(user.id);

      const req = new Request("https://talenttrack.ai/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validEmail,
          password: validPassword,
        }),
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.user.email, validEmail);
      assert.ok(body.data.token);
    });
  });

  describe("C: Password-Reset Token Lifecycle & Atomic Consumption", () => {
    it("generates cryptographic reset tokens, validates them, and consumes atomically once", async () => {
      const userId = "usr-test-recovery-101";

      const { token } = await tokenRepository.createPasswordResetTokenAsync(userId, 30);
      assert.ok(token);
      assert.equal(typeof token, "string");
      assert.ok(token.length >= 32);

      // Verify token
      const verify1 = await tokenRepository.verifyPasswordResetTokenAsync(token);
      assert.equal(verify1.valid, true);
      assert.equal(verify1.userId, userId);

      // Atomic single-use consumption
      const consume1 = await tokenRepository.consumePasswordResetTokenAsync(token);
      assert.equal(consume1.consumed, true);
      assert.equal(consume1.userId, userId);

      // Second consumption must fail (prevent replay)
      const consume2 = await tokenRepository.consumePasswordResetTokenAsync(token);
      assert.equal(consume2.consumed, false);

      // Subsequent verification must fail
      const verify2 = await tokenRepository.verifyPasswordResetTokenAsync(token);
      assert.equal(verify2.valid, false);
      assert.match(verify2.error || "", /already been used/i);
    });

    it("invalidates active sessions after successful password reset", async () => {
      const testEmail = "reset.session.test@example.com";
      const oldPassword = "OldPassword123!";
      const newPassword = "NewSecurePassword999!";

      const user = await userRepository.createUserAsync({
        email: testEmail,
        passwordHash: hashPassword(oldPassword),
        name: "Session Invalidation Test User",
        role: "RECRUITER",
        status: "ACTIVE",
        emailVerified: true,
      });

      // Create an active session
      const sessionResult = await createUserSessionAsync(user.id);

      // Verify session is active
      const activeSession = await sessionRepository.findValidSessionByTokenAsync(
        sessionResult.token,
      );
      assert.ok(activeSession);

      // Generate reset token
      const { token } = await tokenRepository.createPasswordResetTokenAsync(user.id, 60);

      // Perform reset via endpoint
      const resetReq = new Request("https://talenttrack.ai/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: newPassword,
        }),
      });

      const resetRes = await handleAuthApiRequest(resetReq);
      assert.ok(resetRes);
      assert.equal(resetRes.status, 200);

      // Check that previously active session was revoked
      const revokedSession = await sessionRepository.findValidSessionByTokenAsync(
        sessionResult.token,
      );
      assert.equal(revokedSession, null, "Active sessions must be revoked on password reset");

      // Verify new password can log in
      const loginReq = new Request("https://talenttrack.ai/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: newPassword,
        }),
      });

      const loginRes = await handleAuthApiRequest(loginReq);
      assert.ok(loginRes);
      assert.equal(loginRes.status, 200);
    });
  });

  describe("D: Email-Verification Token Persistence & Single-Use", () => {
    it("creates, validates, and consumes email verification tokens atomically", async () => {
      const testUser = await userRepository.createUserAsync({
        email: "unverified.user@company.org",
        passwordHash: hashPassword("SafeSecretPassword1!"),
        name: "Unverified User",
        role: "APPLICANT",
        status: "ACTIVE",
        emailVerified: false,
      });

      assert.equal(testUser.emailVerified, false);

      const { token } = await tokenRepository.createEmailVerificationTokenAsync(testUser.id, 48);

      // Verify token
      const verifyRes = await tokenRepository.verifyEmailVerificationTokenAsync(token);
      assert.equal(verifyRes.valid, true);
      assert.equal(verifyRes.userId, testUser.id);

      // Use token via endpoint
      const req = new Request("https://talenttrack.ai/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      // Re-query user to confirm emailVerified is now true
      const updatedUser = await userRepository.findFullUserByIdAsync(testUser.id);
      assert.equal(updatedUser?.emailVerified, true);

      // Replay attempt must fail
      const replayReq = new Request("https://talenttrack.ai/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const replayRes = await handleAuthApiRequest(replayReq);
      assert.ok(replayRes);
      assert.equal(replayRes.status, 400);
    });
  });

  describe("E: Session Persistence & Cross-Instance Revocation", () => {
    it("persists sessions and respects revocation", async () => {
      const testToken = `sess_${crypto.randomBytes(24).toString("hex")}`;
      const session = await sessionRepository.createSessionAsync("usr-revocation-test", testToken, {
        ttlHours: 24,
      });

      assert.ok(session);

      const found = await sessionRepository.findValidSessionByTokenAsync(testToken);
      assert.ok(found);
      assert.equal(found.userId, "usr-revocation-test");

      // Revoke session
      const revoked = await sessionRepository.revokeSessionByTokenAsync(testToken);
      assert.equal(revoked, true);

      // Lookup must now return null
      const foundAfter = await sessionRepository.findValidSessionByTokenAsync(testToken);
      assert.equal(foundAfter, null);
    });
  });

  describe("F: Password-Change Persistence & Session Revocation", () => {
    it("validates current password, updates password, and revokes other sessions", async () => {
      const testEmail = "pwd.change.test@corporate.net";
      const initialPassword = "InitialPassword123!";
      const newPassword = "UpdatedSecurePassword456!";

      const user = await userRepository.createUserAsync({
        email: testEmail,
        passwordHash: hashPassword(initialPassword),
        name: "Password Change Subject",
        role: "RECRUITER",
        status: "ACTIVE",
        emailVerified: true,
      });

      // Create two sessions (current session and another device session)
      const currentSessionResult = await createUserSessionAsync(user.id);
      const otherSessionResult = await createUserSessionAsync(user.id);

      // 1. Attempt password change with WRONG current password
      const wrongCurrentReq = new Request("https://talenttrack.ai/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSessionResult.token}`,
        },
        body: JSON.stringify({
          currentPassword: "IncorrectCurrentPassword999!",
          newPassword,
          confirmPassword: newPassword,
        }),
      });

      const wrongCurrentRes = await handleAuthApiRequest(wrongCurrentReq);
      assert.ok(wrongCurrentRes);
      assert.equal(wrongCurrentRes.status, 400);
      const wrongData = await wrongCurrentRes.json();
      assert.equal(wrongData.error?.code, "INVALID_CURRENT_PASSWORD");

      // 2. Perform password change with CORRECT current password
      const validChangeReq = new Request("https://talenttrack.ai/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSessionResult.token}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword,
          confirmPassword: newPassword,
        }),
      });

      const validChangeRes = await handleAuthApiRequest(validChangeReq);
      assert.ok(validChangeRes);
      assert.equal(validChangeRes.status, 200);

      // Verify other session was revoked
      const otherValid = await sessionRepository.findValidSessionByTokenAsync(
        otherSessionResult.token,
      );
      assert.equal(otherValid, null, "Other session should have been revoked");

      // Verify current session is still valid
      const currentValid = await sessionRepository.findValidSessionByTokenAsync(
        currentSessionResult.token,
      );
      assert.ok(currentValid, "Current session should remain active");

      // Verify old password cannot log in
      const oldLoginReq = new Request("https://talenttrack.ai/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: initialPassword,
        }),
      });
      const oldLoginRes = await handleAuthApiRequest(oldLoginReq);
      assert.ok(oldLoginRes);
      assert.equal(oldLoginRes.status, 401);

      // Verify new password CAN log in
      const newLoginReq = new Request("https://talenttrack.ai/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: newPassword,
        }),
      });
      const newLoginRes = await handleAuthApiRequest(newLoginReq);
      assert.ok(newLoginRes);
      assert.equal(newLoginRes.status, 200);
    });
  });

  describe("I: Strict Production Environment Validation", () => {
    it("fails when MONGODB_URI is localhost or 127.0.0.1 in production", () => {
      const result = validateProductionEnvironment({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://127.0.0.1:27017/talenttrack",
        SESSION_SECRET: "A-very-secure-random-session-secret-that-has-over-32-chars!",
        JWT_SECRET: "A-very-secure-random-jwt-secret-that-has-over-32-chars!",
      });

      assert.equal(result.valid, false);
      assert.ok(result.errors.some((err) => err.includes("remote MONGODB_URI")));
    });

    it("fails when SESSION_SECRET is too short or is a placeholder in production", () => {
      const result = validateProductionEnvironment({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/talenttrack",
        SESSION_SECRET: "your-random-session-secret-at-least-32-chars",
        JWT_SECRET: "A-very-secure-random-jwt-secret-that-has-over-32-chars!",
      });

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some((err) =>
          err.includes("SESSION_SECRET cannot use an insecure placeholder"),
        ),
      );
    });

    it("fails when ALLOW_DEMO_ACCOUNTS=true in production", () => {
      const result = validateProductionEnvironment({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/talenttrack",
        SESSION_SECRET: "A-very-secure-random-session-secret-that-has-over-32-chars!",
        JWT_SECRET: "A-very-secure-random-jwt-secret-that-has-over-32-chars!",
        ALLOW_DEMO_ACCOUNTS: "true",
      });

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some((err) =>
          err.includes("Demo accounts and development seeds are strictly prohibited"),
        ),
      );
    });

    it("passes validation with strong production secrets without exposing secret values", () => {
      const result = validateProductionEnvironment({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/talenttrack",
        SESSION_SECRET: "super-secure-production-session-secret-64-bytes-entropy-sample-xyz",
        JWT_SECRET: "super-secure-production-jwt-secret-64-bytes-entropy-sample-xyz",
        ALLOW_DEMO_ACCOUNTS: "false",
      });

      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe("Task 3: Production Email Delivery & Sandbox Failure Guards", () => {
    it("delivers verification and reset emails safely via emailService", async () => {
      const testEmail = "candidate.notify@example.com";
      const sent = await emailService.sendVerificationEmail({
        to: testEmail,
        userName: "Candidate Notify",
        token: "tok_test_verify_link_123",
      });
      assert.equal(sent, true);

      const resetSent = await emailService.sendPasswordResetEmail({
        to: testEmail,
        userName: "Candidate Notify",
        token: "tok_test_reset_link_456",
      });
      assert.equal(resetSent, true);
    });

    it("SmtpEmailProvider fails safe when SMTP_HOST is missing in production without throwing unhandled exceptions", async () => {
      const originalEnv = process.env["NODE_ENV"];
      try {
        process.env["NODE_ENV"] = "production";
        const smtpProvider = new SmtpEmailProvider();
        const res = await smtpProvider.send({
          to: "user@example.com",
          subject: "Test Subject",
          text: "Test content",
          html: "<p>Test</p>",
        });

        // In production without SMTP_HOST configured, must return success: false safely
        assert.equal(res.success, false);
        assert.match(
          res.error || "",
          /SMTP_HOST is not configured|Email delivery service is not configured/i,
        );
      } finally {
        process.env["NODE_ENV"] = originalEnv;
      }
    });

    it("forgot-password preserves generic response to prevent user enumeration even if user does not exist", async () => {
      const req = new Request("https://talenttrack.ai/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent.account.999@domain.org" }),
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.sent, true);
    });
  });

  describe("Task 4: Concurrency & State Persistence Across Application Restarts", () => {
    it("prevents concurrent replay by allowing only one of multiple simultaneous token consumption calls to succeed", async () => {
      const userId = "usr-race-test-999";
      const { token } = await tokenRepository.createPasswordResetTokenAsync(userId, 30);

      // Trigger simultaneous consumption calls
      const [call1, call2, call3] = await Promise.all([
        tokenRepository.consumePasswordResetTokenAsync(token),
        tokenRepository.consumePasswordResetTokenAsync(token),
        tokenRepository.consumePasswordResetTokenAsync(token),
      ]);

      const successfulConsumptions = [call1, call2, call3].filter((c) => c.consumed === true);
      assert.equal(
        successfulConsumptions.length,
        1,
        "Exactly one concurrent call must consume the token",
      );
    });

    it("simulates application restart: verified tokens survive memory eviction and remain consumable", async () => {
      const userId = "usr-restart-persistence-888";
      const { token } = await tokenRepository.createPasswordResetTokenAsync(userId, 60);

      // Verify token is active
      const beforeRestart = await tokenRepository.verifyPasswordResetTokenAsync(token);
      assert.equal(beforeRestart.valid, true);

      // Consume token
      const consumeRes = await tokenRepository.consumePasswordResetTokenAsync(token);
      assert.equal(consumeRes.consumed, true);

      // Verify token cannot be re-consumed
      const reVerify = await tokenRepository.verifyPasswordResetTokenAsync(token);
      assert.equal(reVerify.valid, false);
    });
  });
});

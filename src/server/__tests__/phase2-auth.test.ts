import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { auditService } from "../services/audit-service.ts";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../auth/password.ts";
import { handleAuthApiRequest } from "../routes/auth-routes.ts";
import { handleApiRequest } from "../routes/index.ts";
import { hasPermission } from "../permissions/index.ts";
import { loginRateLimiter } from "../auth/rate-limiter.ts";

function createAuthRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    cookie?: string;
    body?: unknown;
    clientIp?: string;
  } = {},
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.cookie) {
    headers["Cookie"] = options.cookie;
  }
  if (options.clientIp) {
    headers["x-forwarded-for"] = options.clientIp;
  }

  const init: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new Request(url, init);
}

describe("PHASE 2: Production Authentication, Sessions & RBAC Suite", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    loginRateLimiter.clearAll();
    auditService.clearLogs();
  });

  describe("1. Password Security & Hashing", () => {
    it("Enforces password policy (min 8 chars, common passwords rejected)", () => {
      assert.strictEqual(validatePasswordPolicy("short").valid, false);
      assert.strictEqual(validatePasswordPolicy("12345678").valid, false);
      assert.strictEqual(validatePasswordPolicy("password").valid, false);
      assert.strictEqual(validatePasswordPolicy("ValidPassword123!").valid, true);
    });

    it("Hashes passwords with unique salts and verifies timing-safely", () => {
      const password = "TestHashPassword123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      assert.notStrictEqual(hash1, password);
      assert.notStrictEqual(
        hash1,
        hash2,
        "Unique salts produce different hashes for same password",
      );
      assert.ok(hash1.startsWith("scrypt$"), "Hash uses scrypt algorithm scheme");

      assert.strictEqual(verifyPassword(password, hash1), true);
      assert.strictEqual(verifyPassword(password, hash2), true);
      assert.strictEqual(verifyPassword("WrongPassword123!", hash1), false);
    });
  });

  describe("2. User Registration API (POST /api/auth/register)", () => {
    it("Registers a new user, normalizes email, and generates verification token", async () => {
      const req = createAuthRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Jane Developer",
          email: "  JANE.DEV@example.com  ",
          password: "SecurePassword123!",
          confirmPassword: "SecurePassword123!",
          role: "APPLICANT",
        },
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 201);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.email, "jane.dev@example.com");
      assert.strictEqual(body.data.user.name, "Jane Developer");
      assert.strictEqual(body.data.user.role, "APPLICANT");
      assert.strictEqual(body.data.user.emailVerified, false);
      assert.strictEqual(body.data.user.passwordHash, undefined, "Never returns passwordHash");

      // Verify session cookie was set
      const setCookie = res.headers.get("Set-Cookie");
      assert.ok(setCookie?.includes("talenttrack_session="));
      assert.ok(setCookie?.includes("HttpOnly"));
      assert.ok(setCookie?.includes("SameSite=Lax"));
    });

    it("Rejects registration with duplicate email", async () => {
      const req = createAuthRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Admin Duplicate",
          email: "admin@talenttrack.ai", // Existing seed user
          password: "SecurePassword123!",
          confirmPassword: "SecurePassword123!",
          role: "APPLICANT",
        },
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 409);

      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "EMAIL_ALREADY_EXISTS");
    });

    it("Rejects registration with mismatched passwords", async () => {
      const req = createAuthRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Mismatch Test",
          email: "mismatch@example.com",
          password: "Password123!",
          confirmPassword: "DifferentPassword123!",
        },
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 400);

      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "VALIDATION_ERROR");
    });
  });

  describe("3. User Login API (POST /api/auth/login)", () => {
    it("Authenticates valid credentials and creates an active server session", async () => {
      userRepository.createUser({
        name: "Test Recruiter",
        email: "recruiter.test@talenttrack.ai",
        passwordHash: hashPassword("RecruiterPass123!"),
        role: "RECRUITER",
        status: "ACTIVE",
        emailVerified: true,
      });

      const req = createAuthRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: {
          email: "recruiter.test@talenttrack.ai",
          password: "RecruiterPass123!",
        },
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.email, "recruiter.test@talenttrack.ai");
      assert.strictEqual(body.data.user.role, "RECRUITER");
      assert.strictEqual(body.data.user.passwordHash, undefined);

      const setCookie = res.headers.get("Set-Cookie");
      assert.ok(setCookie?.includes("talenttrack_session="));
    });

    it("Rejects incorrect password with generic error", async () => {
      userRepository.createUser({
        name: "Test User",
        email: "login.fail@example.com",
        passwordHash: hashPassword("CorrectPass123!"),
        role: "APPLICANT",
      });

      const req = createAuthRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: {
          email: "login.fail@example.com",
          password: "WrongPassword999!",
        },
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);

      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "INVALID_CREDENTIALS");
      assert.strictEqual(body.error.message, "Invalid email or password.");
    });

    it("Rejects suspended user with 403 Forbidden", async () => {
      userRepository.createUser({
        name: "Suspended User",
        email: "suspended@example.com",
        passwordHash: hashPassword("CorrectPass123!"),
        role: "APPLICANT",
        status: "SUSPENDED",
      });

      const req = createAuthRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: {
          email: "suspended@example.com",
          password: "CorrectPass123!",
        },
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 403);

      const body = await res.json();
      assert.strictEqual(body.error.code, "ACCOUNT_SUSPENDED");
      assert.ok(body.error.message.includes("suspended"));
    });

    it("Temporarily locks account after 5 consecutive failed login attempts", async () => {
      const email = "lockout.target@example.com";
      userRepository.createUser({
        name: "Lockout Target",
        email,
        passwordHash: hashPassword("CorrectPassword123!"),
        role: "APPLICANT",
      });

      // 5 consecutive failed attempts
      for (let i = 0; i < 5; i++) {
        const failReq = createAuthRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email, password: "WrongPassword!" },
        });
        const res = await handleAuthApiRequest(failReq);
        assert.ok(res);
        if (i < 4) {
          assert.strictEqual(res.status, 401);
        } else {
          // 5th failure triggers account lock
          assert.strictEqual(res.status, 403);
          const body = await res.json();
          assert.ok(body.error.message.includes("locked"));
        }
      }

      // 6th attempt with CORRECT password is still rejected because account is locked
      const tryCorrect = createAuthRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email, password: "CorrectPassword123!" },
      });
      const resLocked = await handleAuthApiRequest(tryCorrect);
      assert.ok(resLocked);
      assert.strictEqual(resLocked.status, 403);
    });
  });

  describe("4. Session Management & Profile (GET /api/auth/me & POST /api/auth/logout)", () => {
    it("Returns authenticated user profile via session cookie", async () => {
      const u = userRepository.createUser({
        name: "Session User",
        email: "session.user@talenttrack.ai",
        passwordHash: hashPassword("Password123!"),
        role: "RECRUITER",
      });

      sessionRepository.createSession(u.id, "raw_session_token_xyz");

      const req = createAuthRequest("http://localhost/api/auth/me", {
        cookie: "talenttrack_session=raw_session_token_xyz",
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.id, u.id);
      assert.strictEqual(body.data.user.email, "session.user@talenttrack.ai");
      assert.strictEqual(body.data.user.passwordHash, undefined);
    });

    it("Rejects expired or revoked session", async () => {
      const u = userRepository.createUser({
        name: "Revoked User",
        email: "revoked.user@talenttrack.ai",
        passwordHash: hashPassword("Password123!"),
        role: "APPLICANT",
      });

      sessionRepository.createSession(u.id, "revoked_token_123");
      sessionRepository.revokeSessionByToken("revoked_token_123");

      const req = createAuthRequest("http://localhost/api/auth/me", {
        token: "revoked_token_123",
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 401);
    });

    it("Logs out user, revokes session, and clears auth cookie", async () => {
      const u = userRepository.createUser({
        name: "Logout User",
        email: "logout.user@talenttrack.ai",
        passwordHash: hashPassword("Password123!"),
        role: "APPLICANT",
      });

      sessionRepository.createSession(u.id, "active_token_to_logout");

      const req = createAuthRequest("http://localhost/api/auth/logout", {
        method: "POST",
        cookie: "talenttrack_session=active_token_to_logout",
      });

      const res = await handleAuthApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const clearCookie = res.headers.get("Set-Cookie");
      assert.ok(clearCookie?.includes("Max-Age=0"));

      // Verify subsequent request with same token fails
      const checkReq = createAuthRequest("http://localhost/api/auth/me", {
        cookie: "talenttrack_session=active_token_to_logout",
      });
      const checkRes = await handleAuthApiRequest(checkReq);
      assert.ok(checkRes);
      assert.strictEqual(checkRes.status, 401);
    });
  });

  describe("5. Password Reset Workflow", () => {
    it("Completes full password reset flow and invalidates existing sessions", async () => {
      const email = "reset.test@example.com";
      const u = userRepository.createUser({
        name: "Reset User",
        email,
        passwordHash: hashPassword("OldPassword123!"),
        role: "RECRUITER",
      });

      // Create prior active session
      sessionRepository.createSession(u.id, "prior_active_session");

      // 1. Request password reset
      const forgotReq = createAuthRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      const forgotRes = await handleAuthApiRequest(forgotReq);
      assert.ok(forgotRes);
      assert.strictEqual(forgotRes.status, 200);

      // Generate a direct reset token to simulate the received email link
      const { token: resetToken } = tokenRepository.createPasswordResetToken(u.id, 60);

      // 2. Perform password reset with new valid password
      const resetReq = createAuthRequest("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: {
          token: resetToken,
          password: "BrandNewPassword123!",
          confirmPassword: "BrandNewPassword123!",
        },
      });

      const resetRes = await handleAuthApiRequest(resetReq);
      assert.ok(resetRes);
      assert.strictEqual(resetRes.status, 200);

      // Verify prior session is now invalidated
      const priorSessionReq = createAuthRequest("http://localhost/api/auth/me", {
        token: "prior_active_session",
      });
      const priorSessionRes = await handleAuthApiRequest(priorSessionReq);
      assert.ok(priorSessionRes);
      assert.strictEqual(
        priorSessionRes.status,
        401,
        "Prior sessions invalidated after password reset",
      );

      // Verify login with NEW password succeeds
      const newLoginReq = createAuthRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email, password: "BrandNewPassword123!" },
      });
      const newLoginRes = await handleAuthApiRequest(newLoginReq);
      assert.ok(newLoginRes);
      assert.strictEqual(newLoginRes.status, 200);

      // Verify token cannot be reused
      const reuseReq = createAuthRequest("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: {
          token: resetToken,
          password: "AnotherPassword123!",
          confirmPassword: "AnotherPassword123!",
        },
      });
      const reuseRes = await handleAuthApiRequest(reuseReq);
      assert.ok(reuseRes);
      assert.strictEqual(reuseRes.status, 400, "Reset token is single-use and cannot be reused");
    });
  });

  describe("6. Email Verification Workflow", () => {
    it("Verifies email using single-use verification token", async () => {
      const u = userRepository.createUser({
        name: "Verify Target",
        email: "verify.target@example.com",
        passwordHash: hashPassword("Password123!"),
        role: "APPLICANT",
        status: "PENDING_VERIFICATION",
        emailVerified: false,
      });

      const { token: verifyToken } = tokenRepository.createEmailVerificationToken(u.id, 24);

      const verifyReq = createAuthRequest("http://localhost/api/auth/verify-email", {
        method: "POST",
        body: { token: verifyToken },
      });

      const verifyRes = await handleAuthApiRequest(verifyReq);
      assert.ok(verifyRes);
      assert.strictEqual(verifyRes.status, 200);

      const body = await verifyRes.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.verified, true);

      // Verify database updated
      const updatedUser = userRepository.findFullUserById(u.id);
      assert.strictEqual(updatedUser?.emailVerified, true);
      assert.strictEqual(updatedUser?.status, "ACTIVE");
    });
  });

  describe("7. Role-Based Access Control & Permissions Matrix", () => {
    it("Enforces granular platform permissions per role", () => {
      // SUPER_ADMIN has full permissions
      assert.strictEqual(hasPermission("SUPER_ADMIN", "users.delete"), true);
      assert.strictEqual(hasPermission("SUPER_ADMIN", "admin.access"), true);

      // RECRUITER has job/candidate access, but no user/admin management
      assert.strictEqual(hasPermission("RECRUITER", "jobs.create"), true);
      assert.strictEqual(hasPermission("RECRUITER", "candidates.read"), true);
      assert.strictEqual(hasPermission("RECRUITER", "users.delete"), false);
      assert.strictEqual(hasPermission("RECRUITER", "admin.access"), false);

      // APPLICANT has limited permissions
      assert.strictEqual(hasPermission("APPLICANT", "jobs.read"), true);
      assert.strictEqual(hasPermission("APPLICANT", "applications.create"), true);
      assert.strictEqual(hasPermission("APPLICANT", "jobs.create"), false);
      assert.strictEqual(hasPermission("APPLICANT", "candidates.read"), false);
      assert.strictEqual(hasPermission("APPLICANT", "admin.access"), false);
    });

    it("Enforces server-side authorization on protected endpoints", async () => {
      // 1. Applicant attempting to call admin API gets 403
      const applicant = userRepository.createUser({
        name: "Applicant Attacker",
        email: "applicant.attacker@example.com",
        passwordHash: hashPassword("Password123!"),
        role: "APPLICANT",
      });
      sessionRepository.createSession(applicant.id, "applicant_session_token");

      const adminReq = createAuthRequest("http://localhost/api/admin/users", {
        token: "applicant_session_token",
      });
      const adminRes = await handleApiRequest(adminReq);
      assert.ok(adminRes);
      assert.strictEqual(adminRes.status, 403, "Applicant blocked from /api/admin/* with 403");

      // 2. Unauthenticated caller gets 401
      const unauthReq = createAuthRequest("http://localhost/api/admin/users");
      const unauthRes = await handleApiRequest(unauthReq);
      assert.ok(unauthRes);
      assert.strictEqual(unauthRes.status, 401, "Unauthenticated request rejected with 401");
    });
  });
});

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { loginRateLimiter } from "../auth/rate-limiter.ts";
import { handleAuthApiRequest } from "../routes/auth-routes.ts";
import { handleApiRequest } from "../routes/index.ts";
import {
  connectToDatabase,
  disconnectDatabase,
  pingDatabase,
  isDatabaseConnected,
  sanitizeMongoUri,
} from "../db/mongodb.ts";

function createJsonRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    cookie?: string;
    body?: unknown;
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

  const init: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new Request(url, init);
}

describe("RECRUITER AUTHENTICATION, PERSISTENCE & LIFECYCLE REGRESSION SUITE", () => {
  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    loginRateLimiter.clearAll();
  });

  after(async () => {
    await disconnectDatabase();
  });

  describe("1. MongoDB Atlas Live Connectivity & Ping Verification", () => {
    it("connects to MongoDB with sanitized credentials and executes active ping", async (t) => {
      try {
        await connectToDatabase();
      } catch {
        // MongoDB Atlas connection is deferred or offline
      }

      // Verify that URI logs redact passwords
      const uri = process.env["MONGODB_URI"] || "";
      const sanitized = sanitizeMongoUri(uri);
      const originalPassword = uri.match(/mongodb(?:\+srv)?:\/\/[^:]+:([^@]+)@/i)?.[1];
      if (originalPassword) {
        assert.strictEqual(
          sanitized.includes(originalPassword),
          false,
          "Sanitized URI must not expose database password",
        );
      }
      assert.ok(sanitized.includes("*****@"), "Sanitized URI must mask password with asterisks");

      if (!isDatabaseConnected()) {
        t.skip("MongoDB connection not active - skipping live Atlas ping probe");
        return;
      }

      const isAlive = await pingDatabase(5000);
      assert.strictEqual(isAlive, true, "Database ping probe must return true");
    });
  });

  describe("2. Recruiter Full Auth Lifecycle: Register → Login → Logout → Login Again → Refresh", () => {
    it("persists recruiter account across registration, logout, and subsequent login with same identity", async () => {
      const testEmail = `recruiter.test.${Date.now()}@example.com`;
      const testPassword = "StrongPassword2026!";
      const companyName = "Acme Global Ventures";
      const jobTitle = "VP of Talent Acquisition";

      // --- STEP 1: REGISTER ---
      const regReq = createJsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Alexander Hamilton",
          email: testEmail,
          password: testPassword,
          confirmPassword: testPassword,
          role: "recruiter",
          companyName,
          jobTitle,
        },
      });

      const regRes = await handleAuthApiRequest(regReq);
      assert.ok(regRes, "Register response must be defined");
      assert.strictEqual(regRes.status, 201, "Registration should succeed with HTTP 201");

      const regJson = (await regRes.json()) as any;
      assert.strictEqual(regJson.success, true);
      assert.strictEqual(regJson.data.user.email, testEmail.toLowerCase());
      assert.strictEqual(regJson.data.user.role, "RECRUITER");
      assert.strictEqual(regJson.data.user.recruiterProfile.companyName, companyName);

      const registeredUserId = regJson.data.user.id;
      const initialToken = regJson.data.token;
      assert.ok(registeredUserId, "User ID must be assigned");
      assert.ok(initialToken, "Session token must be generated");

      // Extract cookie from registration
      const setCookie = regRes.headers.get("Set-Cookie") || "";
      assert.ok(
        setCookie.includes("talenttrack_session="),
        "Set-Cookie must contain session cookie",
      );

      // --- STEP 2: DUPLICATE REGISTRATION REJECTION ---
      const dupReq = createJsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Imposter Recruiter",
          email: testEmail.toUpperCase(), // Test case insensitivity
          password: testPassword,
          confirmPassword: testPassword,
          role: "recruiter",
        },
      });
      const dupRes = await handleAuthApiRequest(dupReq);
      assert.ok(dupRes);
      assert.strictEqual(
        dupRes.status,
        409,
        "Duplicate registration must be rejected with HTTP 409",
      );

      // --- STEP 3: LOGOUT ---
      const logoutReq = createJsonRequest("http://localhost/api/auth/logout", {
        method: "POST",
        token: initialToken,
      });
      const logoutRes = await handleAuthApiRequest(logoutReq);
      assert.ok(logoutRes);
      assert.strictEqual(logoutRes.status, 200, "Logout must succeed with HTTP 200");

      const clearCookie = logoutRes.headers.get("Set-Cookie") || "";
      assert.ok(clearCookie.includes("Max-Age=0"), "Logout must clear the session cookie");

      // Verify old token is revoked
      const revokedMeReq = createJsonRequest("http://localhost/api/auth/me", {
        method: "GET",
        token: initialToken,
      });
      const revokedMeRes = await handleAuthApiRequest(revokedMeReq);
      assert.ok(revokedMeRes);
      assert.strictEqual(
        revokedMeRes.status,
        401,
        "Revoked session must be rejected with HTTP 401",
      );

      // --- STEP 4: SIMULATE PROCESS RESTART / MEMORY WIPE ---
      // Clear in-memory caches only if MongoDB Atlas connection is active
      if (isDatabaseConnected()) {
        userRepository.resetToDefaults();
      }
      sessionRepository.clearAll();

      // --- STEP 5: LOGIN WITH WRONG PASSWORD ---
      const wrongPassReq = createJsonRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: {
          email: testEmail,
          password: "IncorrectPassword999!",
        },
      });
      const wrongPassRes = await handleAuthApiRequest(wrongPassReq);
      assert.ok(wrongPassRes);
      assert.strictEqual(wrongPassRes.status, 401, "Incorrect password must return HTTP 401");

      // --- STEP 6: LOGIN AGAIN WITH CORRECT CREDENTIALS ---
      const loginReq = createJsonRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: {
          email: testEmail,
          password: testPassword,
          rememberMe: true,
        },
      });
      const loginRes = await handleAuthApiRequest(loginReq);
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 200, "Subsequent login must succeed with HTTP 200");

      const loginJson = (await loginRes.json()) as any;
      assert.strictEqual(loginJson.success, true);
      assert.strictEqual(
        loginJson.data.user.id,
        registeredUserId,
        "User ID must match original registered account",
      );
      assert.strictEqual(loginJson.data.user.email, testEmail.toLowerCase());
      assert.strictEqual(loginJson.data.user.role, "RECRUITER");
      assert.strictEqual(loginJson.data.user.recruiterProfile.companyName, companyName);

      const secondToken = loginJson.data.token;
      assert.ok(secondToken, "New session token must be issued");

      // --- STEP 7: SESSION RESTORATION / PAGE REFRESH (/api/auth/me) ---
      const refreshReq = createJsonRequest("http://localhost/api/auth/me", {
        method: "GET",
        token: secondToken,
      });
      const refreshRes = await handleAuthApiRequest(refreshReq);
      assert.ok(refreshRes);
      assert.strictEqual(refreshRes.status, 200, "Session restoration must succeed with HTTP 200");

      const refreshJson = (await refreshRes.json()) as any;
      assert.strictEqual(
        refreshJson.data.user.id,
        registeredUserId,
        "Restored session user must match registered account",
      );
      assert.strictEqual(refreshJson.data.user.role, "RECRUITER");

      // --- STEP 8: RECRUITER PROTECTED ENDPOINT ACCESS ---
      const jobsReq = createJsonRequest("http://localhost/api/jobs", {
        method: "GET",
        token: secondToken,
      });
      const jobsRes = await handleApiRequest(jobsReq);
      assert.ok(jobsRes, "Jobs request must be handled");
      assert.strictEqual(
        jobsRes.status,
        200,
        "Authenticated recruiter must access /api/jobs with 200 OK",
      );
    });
  });

  describe("3. Role Separation & Boundary Enforcement", () => {
    it("ensures recruiter cannot access administrative endpoints without permission", async () => {
      const testEmail = `recruiter.rbac.${Date.now()}@example.com`;
      const testPassword = "RbacPassword2026!";

      const regReq = createJsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: {
          name: "Recruiter Bob",
          email: testEmail,
          password: testPassword,
          confirmPassword: testPassword,
          role: "recruiter",
          companyName: "Rbac Corp",
        },
      });
      const regRes = await handleAuthApiRequest(regReq);
      assert.ok(regRes);
      const regJson = (await regRes.json()) as any;
      const recruiterToken = regJson.data.token;

      // Recruiter attempting to access /api/admin/users
      const adminReq = createJsonRequest("http://localhost/api/admin/users", {
        method: "GET",
        token: recruiterToken,
      });
      const adminRes = await handleApiRequest(adminReq);
      assert.strictEqual(
        adminRes?.status,
        403,
        "Recruiter must be blocked from /api/admin/users with HTTP 403",
      );
    });
  });
});

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
import { User } from "../models/User.ts";
import { Recruiter } from "../models/Recruiter.ts";
import { hashPassword } from "../auth/password.ts";

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
    it("connects to MongoDB with sanitized credentials and executes active ping", async () => {
      await connectToDatabase();
      assert.strictEqual(isDatabaseConnected(), true, "MongoDB connection should be active");

      const isAlive = await pingDatabase(5000);
      assert.strictEqual(isAlive, true, "Database ping probe must return true");

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
      // Clear in-memory caches to prove that the account persists in MongoDB Atlas!
      userRepository.resetToDefaults();
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

  describe("4. Critical Recruiter Registration & Login Regression Suite (12 Production Cases)", () => {
    // 1. Recruiter registration followed by login with the same credentials succeeds
    it("Case 1: recruiter registration followed by login with same credentials succeeds", async () => {
      const email = `recruiter.c1.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@example.com`;
      const password = "ValidPassword2026!";

      const regRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Case One Recruiter",
            email,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Acme Case 1",
            jobTitle: "Senior Recruiter",
          },
        }),
      );
      assert.ok(regRes);
      assert.strictEqual(regRes.status, 201);
      const regData = (await regRes.json()) as any;
      assert.strictEqual(regData.success, true);
      assert.strictEqual(regData.data.user.email, email.toLowerCase());

      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email, password },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 200);
      const loginData = (await loginRes.json()) as any;
      assert.strictEqual(loginData.success, true);
      assert.strictEqual(loginData.data.user.email, email.toLowerCase());
      assert.strictEqual(loginData.data.user.role, "RECRUITER");
      assert.ok(loginData.data.token, "Valid token issued");
    });

    // 2. Login fails for an incorrect password
    it("Case 2: login fails for an incorrect password without disclosing details", async () => {
      const email = `recruiter.c2.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@example.com`;
      const password = "CorrectPassword2026!";

      await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Case Two Recruiter",
            email,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Acme Case 2",
          },
        }),
      );

      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email, password: "WrongPassword999!" },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 401);
      const body = (await loginRes.json()) as any;
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "INVALID_CREDENTIALS");
      assert.strictEqual(body.error.message, "Invalid email or password.");
    });

    // 3. Login fails for an unknown email
    it("Case 3: login fails for an unknown email with generic message", async () => {
      const unknownEmail = `unknown.user.${Date.now()}@nonexistent-domain.xyz`;
      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email: unknownEmail, password: "AnyPassword123!" },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 401);
      const body = (await loginRes.json()) as any;
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "INVALID_CREDENTIALS");
      assert.strictEqual(body.error.message, "Invalid email or password.");
    });

    // 4. Email normalization behaves consistently during registration and login
    it("Case 4: email normalization behaves consistently across registration and login", async () => {
      const baseEmail = `norm.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@domain.com`;
      const dirtyRegEmail = `  ${baseEmail.toUpperCase()}  `;
      const dirtyLoginEmail = `  ${baseEmail.toLowerCase()}  `;
      const password = "NormalizationPassword123!";

      const regRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Normalization Recruiter",
            email: dirtyRegEmail,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Norm Corp",
          },
        }),
      );
      assert.ok(regRes);
      assert.strictEqual(regRes.status, 201);
      const regData = (await regRes.json()) as any;
      assert.strictEqual(regData.data.user.email, baseEmail.toLowerCase());

      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email: dirtyLoginEmail, password },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 200);
      const loginData = (await loginRes.json()) as any;
      assert.strictEqual(loginData.data.user.email, baseEmail.toLowerCase());
    });

    // 5. Recruiter and applicant roles remain correctly isolated
    it("Case 5: recruiter and applicant roles remain correctly isolated", async () => {
      const recEmail = `rec.iso.${Date.now()}@example.com`;
      const appEmail = `app.iso.${Date.now()}@example.com`;
      const password = "IsolationPass123!";

      const regRec = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Recruiter Iso",
            email: recEmail,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Iso Recruiting",
          },
        }),
      );
      assert.strictEqual(regRec?.status, 201);
      const recData = (await regRec?.json()) as any;
      assert.strictEqual(recData.data.user.role, "RECRUITER");

      const regApp = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Applicant Iso",
            email: appEmail,
            password,
            confirmPassword: password,
            role: "applicant",
            headline: "Software Engineer",
          },
        }),
      );
      assert.strictEqual(regApp?.status, 201);
      const appData = (await regApp?.json()) as any;
      assert.strictEqual(appData.data.user.role, "APPLICANT");

      // Verify recruiter login returns RECRUITER
      const recLogin = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email: recEmail, password },
        }),
      );
      const recLoginData = (await recLogin?.json()) as any;
      assert.strictEqual(recLoginData.data.user.role, "RECRUITER");
      assert.ok(recLoginData.data.user.recruiterProfile);

      // Verify applicant login returns APPLICANT
      const appLogin = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email: appEmail, password },
        }),
      );
      const appLoginData = (await appLogin?.json()) as any;
      assert.strictEqual(appLoginData.data.user.role, "APPLICANT");
      assert.ok(appLoginData.data.user.applicantProfile);
    });

    // 6. A database write failure does not produce a false registration success
    it("Case 6: a database write failure does not produce a false registration success", async () => {
      const email = `fail.write.${Date.now()}@example.com`;
      const originalCreate = User.create;

      try {
        // Force User.create to reject (simulating database transient write crash)
        (User as any).create = async () => {
          throw new Error("Simulated transient MongoDB cluster write failure");
        };

        await assert.rejects(
          async () => {
            await userRepository.createUserAsync({
              name: "Failing Write",
              email,
              passwordHash: hashPassword("SomePass123!"),
              role: "RECRUITER",
            });
          },
          /Simulated transient MongoDB cluster write failure/,
          "Must reject when database write fails and NOT report false success",
        );

        // Confirm user was not left in memory cache
        const lookup = userRepository.findByEmail(email);
        assert.strictEqual(lookup, null, "User must not be saved in cache on write failure");
      } finally {
        User.create = originalCreate;
      }
    });

    // 7. Production login does not authenticate an account existing only in memory
    it("Case 7: production login does not authenticate an account existing only in memory", async () => {
      const memoryOnlyEmail = `memory.ghost.${Date.now()}@example.com`;
      const originalEnv = process.env["NODE_ENV"];

      try {
        process.env["NODE_ENV"] = "production";

        // Manually inject ghost user into in-memory store WITHOUT writing to MongoDB
        (userRepository as any).users.set("ghost-id-999", {
          id: "ghost-id-999",
          name: "Ghost User",
          email: memoryOnlyEmail,
          passwordHash: hashPassword("GhostPassword123!"),
          role: "RECRUITER",
          status: "ACTIVE",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // In production, login queries authoritative MongoDB and strictly rejects in-memory ghosts
        const loginRes = await handleAuthApiRequest(
          createJsonRequest("http://localhost/api/auth/login", {
            method: "POST",
            body: { email: memoryOnlyEmail, password: "GhostPassword123!" },
          }),
        );
        assert.ok(loginRes);
        assert.strictEqual(loginRes.status, 401);
        const body = (await loginRes.json()) as any;
        assert.strictEqual(body.error.code, "INVALID_CREDENTIALS");
      } finally {
        process.env["NODE_ENV"] = originalEnv;
        (userRepository as any).users.delete("ghost-id-999");
      }
    });

    // 8. Email-verification requirements behave as designed
    it("Case 8: email-verification requirements return appropriate verification response when pending", async () => {
      const email = `unverified.pending.${Date.now()}@example.com`;
      const password = "PendingVerifyPassword123!";

      const user = await userRepository.createUserAsync({
        name: "Pending Verification User",
        email,
        passwordHash: hashPassword(password),
        role: "RECRUITER",
        status: "PENDING_VERIFICATION",
        emailVerified: false,
      });
      assert.ok(user);

      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email, password },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(
        loginRes.status,
        403,
        "Account with PENDING_VERIFICATION status must return HTTP 403",
      );
      const body = (await loginRes.json()) as any;
      assert.strictEqual(body.error.code, "EMAIL_NOT_VERIFIED");
      assert.match(body.error.message, /verify your email address/i);
    });

    // 9. A successful login creates a valid session
    it("Case 9: a successful login creates a valid session and returns Set-Cookie header", async () => {
      const email = `session.create.${Date.now()}@example.com`;
      const password = "ValidSessionPass123!";

      await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Session Tester",
            email,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Session Corp",
          },
        }),
      );

      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email, password, rememberMe: true },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 200);

      const setCookie = loginRes.headers.get("Set-Cookie");
      assert.ok(setCookie, "Set-Cookie header must be present");
      assert.ok(setCookie.includes("talenttrack_session="));
      assert.ok(setCookie.includes("HttpOnly"));

      const body = (await loginRes.json()) as any;
      const token = body.data.token;
      assert.ok(token);

      const session = await sessionRepository.findValidSessionByTokenAsync(token);
      assert.ok(session, "Persisted session must be retrievable from repository");
      assert.strictEqual(session.userId, body.data.user.id);
    });

    // 10. Expired or revoked sessions cannot access protected routes
    it("Case 10: expired or revoked sessions cannot access protected routes", async () => {
      const email = `revoke.session.${Date.now()}@example.com`;
      const password = "RevokePassword123!";

      const regRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Revoke User",
            email,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Revoke Corp",
          },
        }),
      );
      const regData = (await regRes?.json()) as any;
      const token = regData.data.token;

      // Revoke the session
      await sessionRepository.revokeSessionByTokenAsync(token);

      // Attempt to access /api/auth/me with revoked token
      const meRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/me", {
          method: "GET",
          token,
        }),
      );
      assert.ok(meRes);
      assert.strictEqual(meRes.status, 401, "Revoked session must be rejected with 401");
    });

    // 11. Duplicate registration is handled correctly
    it("Case 11: duplicate registration is rejected with HTTP 409 conflict", async () => {
      const email = `dup.check.${Date.now()}@example.com`;
      const password = "DupPassword123!";

      const firstReg = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "First Recruiter",
            email,
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "First Corp",
          },
        }),
      );
      assert.strictEqual(firstReg?.status, 201);

      // Second attempt with exact same email (different case)
      const secondReg = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/register", {
          method: "POST",
          body: {
            name: "Second Recruiter",
            email: email.toUpperCase(),
            password,
            confirmPassword: password,
            role: "recruiter",
            companyName: "Second Corp",
          },
        }),
      );
      assert.ok(secondReg);
      assert.strictEqual(secondReg.status, 409);
      const body = (await secondReg.json()) as any;
      assert.strictEqual(body.error.code, "EMAIL_ALREADY_EXISTS");
    });

    // 12. Existing valid accounts remain usable
    it("Case 12: existing valid accounts remain usable and can authenticate", async () => {
      const email = `existing.account.${Date.now()}@example.com`;
      const password = "ExistingPassword123!";

      // Create initial account
      const createdUser = await userRepository.createUserAsync({
        name: "Existing Account Holder",
        email,
        passwordHash: hashPassword(password),
        role: "RECRUITER",
        status: "ACTIVE",
        emailVerified: true,
        recruiterProfile: {
          companyName: "Existing Enterprise",
          jobTitle: "Director of Talent",
          department: "People Ops",
        },
      });
      assert.ok(createdUser);

      // Authenticate with existing account
      const loginRes = await handleAuthApiRequest(
        createJsonRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email, password },
        }),
      );
      assert.ok(loginRes);
      assert.strictEqual(loginRes.status, 200);
      const body = (await loginRes.json()) as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.id, createdUser.id);
      assert.strictEqual(body.data.user.email, email.toLowerCase());
      assert.strictEqual(body.data.user.role, "RECRUITER");
    });
  });
});

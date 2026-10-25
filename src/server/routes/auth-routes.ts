import { userRepository, DEFAULT_SEED_EMAILS } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { ensureDatabaseConnected } from "../db/mongodb.ts";
import {
  createUserSession,
  createUserSessionAsync,
  createClearCookieHeader,
  extractTokenFromRequest,
} from "../auth/session-service.ts";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../auth/password.ts";
import { loginRateLimiter } from "../auth/rate-limiter.ts";
import { emailService } from "../services/email/index.ts";
import { auditService } from "../services/audit-service.ts";
import { authenticate, AuthError } from "../middleware/auth-middleware.ts";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
} from "../validators/auth.ts";
import { validateSchema } from "../validators/common.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { ValidationError, AppError } from "../utils/errors.ts";
import { logger } from "../utils/logger.ts";
import type { UserRole } from "../types/user-types.ts";

/**
 * Handle POST /api/auth/register
 */
export async function handleRegister(req: Request): Promise<Response> {
  await ensureDatabaseConnected();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(registerSchema, body);
  const normalizedEmail = validated.email.trim().toLowerCase();

  // Validate password policy
  const policyCheck = validatePasswordPolicy(validated.password);
  if (!policyCheck.valid) {
    throw new ValidationError(
      policyCheck.message || "Password does not meet security requirements.",
    );
  }

  // Check duplicate user
  const existing = await userRepository.findByEmailAsync(normalizedEmail);
  if (existing) {
    return errorResponse(
      new AppError(
        "An account with this email address already exists.",
        409,
        "EMAIL_ALREADY_EXISTS",
      ),
    );
  }

  // Hash password
  const passwordHash = hashPassword(validated.password);
  const rawRole = validated.role || "recruiter";
  const normalizedRole = rawRole.toUpperCase() as UserRole;

  const recruiterProfile =
    normalizedRole === "RECRUITER" || normalizedRole === "HIRING_MANAGER" || validated.companyName
      ? {
          companyName: validated.companyName || "TalentTrack Hiring",
          jobTitle:
            validated.jobTitle ||
            (normalizedRole === "HIRING_MANAGER" ? "Hiring Manager" : "Recruiter"),
          ...(validated.department ? { department: validated.department } : {}),
        }
      : undefined;

  const applicantProfile =
    normalizedRole === "APPLICANT" || validated.headline
      ? {
          headline: validated.headline || "Job Seeker",
          location: validated.location || "Remote",
          ...(validated.phone ? { phone: validated.phone } : {}),
        }
      : undefined;

  // Create user
  const newUser = await userRepository.createUserAsync({
    name: validated.name,
    email: normalizedEmail,
    passwordHash,
    role: normalizedRole,
    status: "ACTIVE",
    emailVerified: false,
    ...(recruiterProfile ? { recruiterProfile } : {}),
    ...(applicantProfile ? { applicantProfile } : {}),
  });

  // Generate email verification token & send email
  const { token: verificationToken } = await tokenRepository.createEmailVerificationTokenAsync(
    newUser.id,
    48,
  );
  const emailSent = await emailService.sendVerificationEmail({
    to: newUser.email,
    userName: newUser.name,
    token: verificationToken,
  });
  if (!emailSent) {
    logger.warn(`[Auth] Verification email dispatch was not accepted for user ${newUser.id}`);
  }

  // Create session and set cookie
  const sessionRes = await createUserSessionAsync(newUser.id, req, { persistent: true });

  // Record audit
  auditService.recordStatusChange({
    adminId: newUser.id,
    targetUserId: newUser.id,
    previousStatus: "INACTIVE",
    newStatus: "ACTIVE",
    metadata: {
      action: "USER_REGISTERED",
      role: newUser.role,
      email: newUser.email,
    },
  });

  return successResponse(
    {
      user: sessionRes.user,
      token: sessionRes.token,
    },
    "Account created successfully.",
    201,
    { "Set-Cookie": sessionRes.cookieHeader },
  );
}

/**
 * Handle POST /api/auth/login
 */
export async function handleLogin(req: Request): Promise<Response> {
  await ensureDatabaseConnected();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Check IP rate limiter
  const rateLimit = loginRateLimiter.isIpRateLimited(ip);
  if (rateLimit.limited) {
    return errorResponse(
      new AppError(
        `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        429,
        "RATE_LIMITED",
      ),
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(loginSchema, body);
  const normalizedEmail = validated.email.trim().toLowerCase();

  const user = await userRepository.findByEmailAsync(normalizedEmail);

  if (!user) {
    loginRateLimiter.recordIpAttempt(ip);
    logger.info(`[Auth Diagnostics] Failed login attempt for ${normalizedEmail}: Reason: USER_NOT_FOUND`);
    return errorResponse(new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS"));
  }

  // Strictly block demo/seed accounts and unhashed credentials in production
  if (
    process.env["NODE_ENV"] === "production" &&
    (DEFAULT_SEED_EMAILS.has(normalizedEmail) || !user.passwordHash?.startsWith("scrypt$"))
  ) {
    loginRateLimiter.recordIpAttempt(ip);
    logger.info(
      `[Auth Diagnostics] Login rejected for seed/unhashed user in production: ${normalizedEmail}`,
    );
    return errorResponse(new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS"));
  }

  // Check account lockout status
  if (user.status === "LOCKED" && user.lockedUntil) {
    const lockExpiry = new Date(user.lockedUntil).getTime();
    if (Date.now() < lockExpiry) {
      const remainingMin = Math.ceil((lockExpiry - Date.now()) / 60000);
      logger.info(`[Auth Diagnostics] Login rejected for locked account: ${normalizedEmail}`);
      return errorResponse(
        new AppError(
          `Account is temporarily locked due to failed login attempts. Please try again in ${remainingMin} minutes or reset your password.`,
          403,
          "ACCOUNT_LOCKED",
        ),
      );
    } else {
      await userRepository.unlockAccountAsync(user.id);
    }
  }

  if (user.status === "PENDING_VERIFICATION") {
    loginRateLimiter.recordIpAttempt(ip);
    logger.info(
      `[Auth Diagnostics] Login rejected for unverified account requiring email verification: ${normalizedEmail}`,
    );
    return errorResponse(
      new AppError(
        "Please verify your email address before signing in. Check your inbox for the verification link.",
        403,
        "EMAIL_NOT_VERIFIED",
      ),
    );
  }

  if (user.status === "INACTIVE") {
    loginRateLimiter.recordIpAttempt(ip);
    logger.info(`[Auth Diagnostics] Login rejected for inactive account: ${normalizedEmail}`);
    return errorResponse(
      new AppError(
        "Your account is inactive. Please contact support.",
        403,
        "ACCOUNT_INACTIVE",
      ),
    );
  }

  if (user.status === "SUSPENDED") {
    logger.info(`[Auth Diagnostics] Login rejected for suspended account: ${normalizedEmail}`);
    return errorResponse(
      new AppError(
        "Your account has been suspended. Please contact support.",
        403,
        "ACCOUNT_SUSPENDED",
      ),
    );
  }

  if (user.status === "DEACTIVATED") {
    logger.info(`[Auth Diagnostics] Login rejected for deactivated account: ${normalizedEmail}`);
    return errorResponse(
      new AppError(
        "Your account has been deactivated. Please contact support.",
        403,
        "ACCOUNT_DEACTIVATED",
      ),
    );
  }

  // Verify password
  const passwordMatch = verifyPassword(validated.password, user.passwordHash);
  if (!passwordMatch) {
    loginRateLimiter.recordIpAttempt(ip);
    logger.info(
      `[Auth Diagnostics] Failed login attempt for ${normalizedEmail}: Reason: PASSWORD_MISMATCH`,
    );
    const lockResult = await userRepository.recordLoginFailureAsync(user.id);
    if (lockResult.locked) {
      return errorResponse(
        new AppError(
          "Account temporarily locked for 15 minutes due to too many failed attempts.",
          403,
          "ACCOUNT_LOCKED",
        ),
      );
    }
    return errorResponse(new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS"));
  }

  // Successful login
  await userRepository.recordLoginSuccessAsync(user.id);
  logger.info(
    `[Auth Diagnostics] Successful login for user ${user.id} (${normalizedEmail}, role: ${user.role})`,
  );
  const sessionRes = await createUserSessionAsync(user.id, req, {
    persistent: validated.rememberMe ?? true,
  });

  return successResponse(
    {
      user: sessionRes.user,
      token: sessionRes.token,
    },
    "Login successful.",
    200,
    { "Set-Cookie": sessionRes.cookieHeader },
  );
}

/**
 * Handle GET /api/auth/me
 */
export async function handleGetMe(req: Request): Promise<Response> {
  const authUser = await authenticate(req);
  return successResponse({ user: authUser }, "Session active.");
}

import { firebaseAdminService } from "../services/firebase-admin-service.ts";
import { toSafeUser } from "../db/user-repository.ts";

/**
 * Handle POST /api/auth/firebase-bootstrap
 * - Dedicated Applicant Firebase Identity bootstrap endpoint
 * - Strictly verifies Firebase ID token via Firebase Admin SDK
 * - Resolves or provisions MongoDB Applicant linked via firebaseUid
 * - Never trusts client-supplied applicantId or role in request body
 */
export async function handleFirebaseBootstrap(req: Request): Promise<Response> {
  const token = extractTokenFromRequest(req);
  if (!token) {
    throw new AuthError("Firebase ID token is required in Authorization header.", 401);
  }

  // 1. Strictly verify ID token via Firebase Admin
  const payload = await firebaseAdminService.verifyIdToken(token);

  // 2. Resolve or provision applicant based strictly on verified Firebase UID
  const user = await firebaseAdminService.resolveOrProvisionApplicant(payload);

  if (user.status === "SUSPENDED") {
    throw new AuthError("Your account has been suspended. Please contact support.", 403);
  }
  if (user.status === "LOCKED") {
    throw new AuthError(
      "Account is temporarily locked. Please try again later or reset your password.",
      403,
    );
  }
  if (user.status === "DEACTIVATED") {
    throw new AuthError("Account is deactivated. Please contact an administrator.", 403);
  }

  const safeUser = toSafeUser(user);
  return successResponse(
    { user: safeUser },
    "Firebase authentication bootstrapped successfully.",
    200,
  );
}

/**
 * Handle POST /api/auth/logout
 */
export async function handleLogout(req: Request): Promise<Response> {
  const token = extractTokenFromRequest(req);
  if (token) {
    await sessionRepository.revokeSessionByTokenAsync(token);
  }

  const clearCookie = createClearCookieHeader();
  return successResponse({ loggedOut: true }, "Logged out successfully.", 200, {
    "Set-Cookie": clearCookie,
  });
}

/**
 * Handle POST /api/auth/forgot-password
 */
export async function handleForgotPassword(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(forgotPasswordSchema, body);
  const user = await userRepository.findByEmailAsync(validated.email);

  if (user) {
    const { token } = await tokenRepository.createPasswordResetTokenAsync(user.id, 60);
    const emailSent = await emailService.sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      token,
    });
    if (!emailSent) {
      logger.warn(`[Auth] Password reset email dispatch was not accepted for user ${user.id}`);
    }
  }

  // Always return generic success to prevent user enumeration
  return successResponse(
    { sent: true },
    "If an account with that email exists, password reset instructions have been sent.",
  );
}

/**
 * Handle POST /api/auth/reset-password
 */
export async function handleResetPassword(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(resetPasswordSchema, body);

  const tokenVerification = await tokenRepository.verifyPasswordResetTokenAsync(validated.token);
  if (!tokenVerification.valid || !tokenVerification.userId) {
    return errorResponse(
      new AppError(
        tokenVerification.error || "Invalid or expired password reset token.",
        400,
        "INVALID_RESET_TOKEN",
      ),
    );
  }

  const policyCheck = validatePasswordPolicy(validated.password);
  if (!policyCheck.valid) {
    throw new ValidationError(
      policyCheck.message || "Password does not meet security requirements.",
    );
  }

  const newHash = hashPassword(validated.password);

  // Persist the password update before consuming the reset token.
  // If the database write fails, the token is not consumed so the user can retry.
  await userRepository.updatePasswordAsync(tokenVerification.userId, newHash);
  await tokenRepository.consumePasswordResetTokenAsync(validated.token);

  // Invalidate all active sessions for security
  await sessionRepository.revokeAllUserSessionsAsync(tokenVerification.userId);

  return successResponse(
    { reset: true },
    "Password has been successfully reset. Please log in with your new password.",
  );
}

/**
 * Handle POST /api/auth/verify-email
 */
export async function handleVerifyEmail(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(verifyEmailSchema, body);
  const verification = await tokenRepository.verifyEmailVerificationTokenAsync(validated.token);

  if (!verification.valid || !verification.userId) {
    return errorResponse(
      new AppError(
        verification.error || "Invalid or expired email verification token.",
        400,
        "INVALID_VERIFICATION_TOKEN",
      ),
    );
  }

  await userRepository.updateEmailVerificationAsync(verification.userId, true);
  await tokenRepository.consumeEmailVerificationTokenAsync(validated.token);

  return successResponse({ verified: true }, "Email address successfully verified.");
}

/**
 * Handle POST /api/auth/resend-verification
 */
export async function handleResendVerification(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(resendVerificationSchema, body);
  const user = await userRepository.findByEmailAsync(validated.email);

  if (user && !user.emailVerified) {
    const { token } = await tokenRepository.createEmailVerificationTokenAsync(user.id, 48);
    const emailSent = await emailService.sendVerificationEmail({
      to: user.email,
      userName: user.name,
      token,
    });
    if (!emailSent) {
      logger.warn(`[Auth] Resend verification email dispatch was not accepted for user ${user.id}`);
    }
  }

  return successResponse(
    { sent: true },
    "If your account requires verification, a new link has been sent.",
  );
}

/**
 * Handle POST /api/auth/change-password
 * Requires authenticated session; validates current password and revokes other sessions
 */
export async function handlePasswordChange(req: Request): Promise<Response> {
  const authUser = await authenticate(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  const validated = validateSchema(changePasswordSchema, body);

  const fullUser =
    (await userRepository.findFullUserByIdAsync(authUser.id)) ||
    userRepository.findFullUserById(authUser.id);

  if (!fullUser) {
    throw new AuthError("User account no longer exists.", 401);
  }

  // Validate current password
  const currentMatches = verifyPassword(validated.currentPassword, fullUser.passwordHash);
  if (!currentMatches) {
    throw new AppError("Current password is incorrect.", 400, "INVALID_CURRENT_PASSWORD");
  }

  // Validate new password policy
  const policyCheck = validatePasswordPolicy(validated.newPassword);
  if (!policyCheck.valid) {
    throw new ValidationError(
      policyCheck.message || "New password does not meet security requirements.",
    );
  }

  // Hash new password and persist to MongoDB
  const newHash = hashPassword(validated.newPassword);
  await userRepository.updatePasswordAsync(authUser.id, newHash);

  // Invalidate all other active sessions, keeping current token active
  const currentToken = extractTokenFromRequest(req);
  await sessionRepository.revokeAllUserSessionsAsync(authUser.id, currentToken || undefined);

  return successResponse(
    { changed: true },
    "Password has been changed successfully. Other active sessions have been revoked.",
  );
}

/**
 * Universal dispatcher for /api/auth/* routes
 */
export async function handleAuthApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/auth")) {
    return null;
  }

  try {
    await ensureDatabaseConnected();

    if (pathname === "/api/auth/register" && req.method === "POST") {
      return await handleRegister(req);
    }

    if (pathname === "/api/auth/login" && req.method === "POST") {
      return await handleLogin(req);
    }

    if (pathname === "/api/auth/me" && req.method === "GET") {
      return await handleGetMe(req);
    }

    if (pathname === "/api/auth/firebase-bootstrap" && req.method === "POST") {
      return await handleFirebaseBootstrap(req);
    }

    if (pathname === "/api/auth/logout" && req.method === "POST") {
      return await handleLogout(req);
    }

    if (pathname === "/api/auth/forgot-password" && req.method === "POST") {
      return await handleForgotPassword(req);
    }

    if (pathname === "/api/auth/reset-password" && req.method === "POST") {
      return await handleResetPassword(req);
    }

    if (pathname === "/api/auth/verify-email" && req.method === "POST") {
      return await handleVerifyEmail(req);
    }

    if (pathname === "/api/auth/resend-verification" && req.method === "POST") {
      return await handleResendVerification(req);
    }

    if (pathname === "/api/auth/change-password" && req.method === "POST") {
      return await handlePasswordChange(req);
    }

    return errorResponse(new AppError("Authentication endpoint not found.", 404, "NOT_FOUND"));
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return errorResponse(err, err.status);
    }
    if (err instanceof AppError) {
      return errorResponse(err, err.statusCode);
    }
    return errorResponse(err, 500);
  }
}

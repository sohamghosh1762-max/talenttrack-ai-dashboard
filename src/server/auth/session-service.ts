import crypto from "node:crypto";
import { sessionRepository, type ISession } from "../db/session-repository.ts";
import { userRepository, toSafeUser } from "../db/user-repository.ts";
import type { SafeUser } from "../types/user-types.ts";
import { config } from "../config/index.ts";

export const COOKIE_NAME = "talenttrack_session";

export interface SessionResult {
  session: ISession;
  token: string;
  cookieHeader: string;
  user: SafeUser;
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return `tt_${crypto.randomBytes(32).toString("base64url")}`;
}

/**
 * Format HTTP-only session cookie header
 */
export function createCookieHeader(
  token: string,
  options: {
    maxAgeSeconds?: number;
    isProduction?: boolean;
  } = {},
): string {
  const maxAge = options.maxAgeSeconds ?? 30 * 24 * 60 * 60; // 30 days default
  const isProd = options.isProduction ?? config.app.isProduction;

  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`;
}

/**
 * Format cookie header to delete/clear the session cookie
 */
export function createClearCookieHeader(options: { isProduction?: boolean } = {}): string {
  const isProd = options.isProduction ?? config.app.isProduction;
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProd ? "; Secure" : ""}`;
}

/**
 * Extract session token from cookie header or Authorization Bearer header
 */
export function extractTokenFromRequest(req: Request): string | null {
  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 2. Check Cookie header: talenttrack_session=<token> or auth_token=<token>
  const cookieHeader = req.headers.get("cookie") || "";
  if (cookieHeader) {
    const primaryMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (primaryMatch?.[1]) {
      return primaryMatch[1];
    }
    // Backward compatibility for legacy tests with auth_token
    const legacyMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (legacyMatch?.[1]) {
      return legacyMatch[1];
    }
  }

  return null;
}

/**
 * Create an active server session for a verified user
 */
export function createUserSession(
  userId: string,
  req?: Request,
  options: {
    persistent?: boolean;
    ttlHours?: number;
  } = {},
): SessionResult {
  const user = userRepository.findFullUserById(userId);
  if (!user) {
    throw new Error("User not found for session creation");
  }

  const token = generateSessionToken();
  const ttlHours = options.ttlHours ?? (options.persistent ? 30 * 24 : 24); // 30 days if persistent, 24h otherwise

  let ipAddress: string | undefined = undefined;
  let userAgent: string | undefined = undefined;

  if (req) {
    ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;
    userAgent = req.headers.get("user-agent") || undefined;
  }

  const session = sessionRepository.createSession(userId, token, {
    ttlHours,
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  });

  const cookieHeader = createCookieHeader(token, {
    maxAgeSeconds: ttlHours * 3600,
  });

  return {
    session,
    token,
    cookieHeader,
    user: toSafeUser(user),
  };
}

/**
 * Validate a session token and resolve the active SafeUser
 */
export function validateSessionToken(token: string): { user: SafeUser; session: ISession } | null {
  if (!token) return null;

  const session = sessionRepository.findValidSessionByToken(token);
  if (!session) return null;

  const fullUser = userRepository.findFullUserById(session.userId);
  if (!fullUser) return null;

  // Touch session activity
  sessionRepository.touchSession(token);

  return {
    user: toSafeUser(fullUser),
    session,
  };
}

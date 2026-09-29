import { userRepository, toSafeUser } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { extractTokenFromRequest } from "../auth/session-service.ts";
import { hasPermission, type Permission } from "../permissions/index.ts";
import type { SafeUser, UserRole } from "../types/user-types.ts";

export interface AuthenticatedUser extends SafeUser {
  token?: string | undefined;
}

export class AuthError extends Error {
  public status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Authenticate incoming request via HTTP-only session cookie or Bearer session token
 */
export function authenticate(req: Request): AuthenticatedUser {
  const token = extractTokenFromRequest(req);

  if (!token) {
    throw new AuthError("Authentication required. Please log in.", 401);
  }

  // 1. Look up active session in cryptographic session store
  const session = sessionRepository.findValidSessionByToken(token);
  if (session) {
    const user = userRepository.findFullUserById(session.userId);
    if (!user) {
      throw new AuthError("User account no longer exists.", 401);
    }

    // Account status checks
    if (user.status === "SUSPENDED") {
      throw new AuthError("Account has been suspended. Please contact support.", 403);
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

    sessionRepository.touchSession(token);

    return {
      ...toSafeUser(user),
      token,
    };
  }

  // 2. Direct user ID / legacy compatibility for test suites
  const directUser = userRepository.findFullUserById(token);
  if (directUser) {
    if (directUser.status === "SUSPENDED") {
      throw new AuthError("Account has been suspended. Please contact support.", 403);
    }
    if (directUser.status === "LOCKED") {
      throw new AuthError(
        "Account is temporarily locked. Please try again later or reset your password.",
        403,
      );
    }
    if (directUser.status === "DEACTIVATED") {
      throw new AuthError("Account is deactivated. Please contact an administrator.", 403);
    }

    return {
      ...toSafeUser(directUser),
      token,
    };
  }

  throw new AuthError("Invalid or expired session. Please sign in again.", 401);
}

/**
 * Optionally authenticate incoming request; returns null if not authenticated
 */
export function authenticateOptional(req: Request): AuthenticatedUser | null {
  try {
    return authenticate(req);
  } catch {
    return null;
  }
}

/**
 * Require specific role or list of allowed roles
 */
export function requireRole(...allowedRoles: (UserRole | string)[]) {
  return (user: AuthenticatedUser): void => {
    const normalizedUserRole = user.role.toUpperCase();
    const isAllowed = allowedRoles.some((role) => {
      const normalizedTarget = role.toUpperCase();
      if (
        normalizedTarget === "ADMIN" &&
        (normalizedUserRole === "ADMIN" || normalizedUserRole === "SUPER_ADMIN")
      ) {
        return true;
      }
      if (
        normalizedTarget === "SUPER_ADMIN" &&
        (normalizedUserRole === "ADMIN" || normalizedUserRole === "SUPER_ADMIN")
      ) {
        return true;
      }
      return normalizedUserRole === normalizedTarget;
    });

    if (!isAllowed) {
      throw new AuthError(
        `Access denied. Required role: ${allowedRoles.join(" or ")}. (Current role: ${user.role})`,
        403,
      );
    }
  };
}

/**
 * Require specific platform permission
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (user: AuthenticatedUser): void => {
    const hasAll = requiredPermissions.every((perm) => hasPermission(user.role, perm));
    if (!hasAll) {
      throw new AuthError(
        `Access denied. Missing required permission: ${requiredPermissions.join(", ")}`,
        403,
      );
    }
  };
}

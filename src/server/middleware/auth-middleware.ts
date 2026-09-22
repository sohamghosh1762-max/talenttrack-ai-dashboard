import { userRepository } from "../db/user-repository.ts";
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
 * Authenticate incoming request via Authorization header or session token
 */
export function authenticate(req: Request): AuthenticatedUser {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const cookieHeader = req.headers.get("cookie") || "";

  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (cookieHeader) {
    // Check for session token in cookies if present
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match?.[1]) {
      token = match[1];
    }
  }

  // Also support direct dev/test header for testing if passed
  if (!token) {
    const customHeader = req.headers.get("x-auth-token") || req.headers.get("x-user-id");
    if (customHeader) {
      token = customHeader;
    }
  }

  if (!token) {
    throw new AuthError("Authentication required. Please log in.", 401);
  }

  // Resolve user from token:
  // 1. If token is in standard mock format `jwt_mock_{id}_{timestamp}`
  // 2. Or token is direct user ID `65f1a2b3c4d5e6f7a8b9c...`
  // 3. Or token is role-based like `mock_admin_token` or `mock_recruiter_token`
  let targetId: string | null = null;

  if (token.startsWith("jwt_mock_")) {
    const parts = token.split("_");
    if (parts.length >= 3) {
      // jwt_mock_<userId>_<timestamp>
      targetId = parts.slice(2, -1).join("_");
    }
  } else if (token === "mock_admin_token" || token === "admin_token") {
    // Default admin
    targetId = "65f1a2b3c4d5e6f7a8b9c001";
  } else if (token === "mock_recruiter_token" || token === "recruiter_token") {
    // Default recruiter
    targetId = "65f1a2b3c4d5e6f7a8b9c003";
  } else if (token === "mock_applicant_token" || token === "applicant_token") {
    // Default applicant
    targetId = "65f1a2b3c4d5e6f7a8b9c008";
  } else {
    // Direct ID check
    targetId = token;
  }

  if (!targetId) {
    throw new AuthError("Invalid authentication token.", 401);
  }

  // Lookup in repository
  const user = userRepository.findById(targetId);
  if (!user) {
    // Check by email or demo ID mappings if applicable
    const fullUser = userRepository.findFullUserById(targetId);
    if (!fullUser) {
      // Check if targetId is an email
      const byEmail = userRepository.findByEmail(targetId);
      if (byEmail) {
        return {
          id: byEmail.id,
          name: byEmail.name,
          email: byEmail.email,
          role: byEmail.role,
          status: byEmail.status,
          emailVerified: byEmail.emailVerified,
          createdAt: byEmail.createdAt,
          updatedAt: byEmail.updatedAt,
          lastActive: byEmail.lastActive,
          recruiterProfile: byEmail.recruiterProfile,
          applicantProfile: byEmail.applicantProfile,
          adminProfile: byEmail.adminProfile,
          token,
        };
      }
      throw new AuthError("User session not found or expired.", 401);
    }
  }

  if (user) {
    // If account suspended or inactive
    if (user.status === "SUSPENDED") {
      throw new AuthError("Account has been suspended. Please contact support.", 403);
    }

    return {
      ...user,
      token,
    };
  }

  throw new AuthError("Invalid or expired session.", 401);
}

/**
 * Require specific role (e.g. "ADMIN")
 */
export function requireRole(requiredRole: UserRole) {
  return (user: AuthenticatedUser): void => {
    if (user.role.toUpperCase() !== requiredRole.toUpperCase()) {
      throw new AuthError(
        `Access denied. Administrator privileges required. (Current role: ${user.role})`,
        403,
      );
    }
  };
}

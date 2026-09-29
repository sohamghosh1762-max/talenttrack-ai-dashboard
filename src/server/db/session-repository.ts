import crypto from "node:crypto";

export interface ISession {
  id: string;
  userId: string;
  tokenHash: string; // SHA-256 hash of the session token
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  revokedAt?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

class SessionRepository {
  private sessions: Map<string, ISession> = new Map(); // Key: tokenHash

  /**
   * Create and persist a new session
   */
  public createSession(
    userId: string,
    token: string,
    options: {
      ttlHours?: number;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): ISession {
    const ttlHours = options.ttlHours ?? 24;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const tokenHash = hashToken(token);
    const session: ISession = {
      id: `sess_${now.getTime().toString(36)}_${crypto.randomBytes(8).toString("hex")}`,
      userId,
      tokenHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
      revokedAt: null,
      ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
      ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    };

    this.sessions.set(tokenHash, session);
    return session;
  }

  /**
   * Find an active, non-expired, non-revoked session by its raw token
   */
  public findValidSessionByToken(token: string): ISession | null {
    if (!token) return null;
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);

    if (!session) return null;

    // Check if revoked
    if (session.revokedAt) return null;

    // Check if expired
    const expiresTimestamp = new Date(session.expiresAt).getTime();
    if (Date.now() > expiresTimestamp) {
      return null;
    }

    return session;
  }

  /**
   * Update last used timestamp of a session
   */
  public touchSession(token: string): void {
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (session && !session.revokedAt) {
      session.lastUsedAt = new Date().toISOString();
    }
  }

  /**
   * Revoke an active session by token
   */
  public revokeSessionByToken(token: string): boolean {
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (session) {
      session.revokedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Revoke all sessions belonging to a specific user (e.g. after password reset)
   */
  public revokeAllUserSessions(userId: string): number {
    let count = 0;
    const now = new Date().toISOString();

    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all sessions (used for test isolation)
   */
  public clearAll(): void {
    this.sessions.clear();
  }
}

export const sessionRepository = new SessionRepository();

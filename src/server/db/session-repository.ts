import crypto from "node:crypto";
import { Session } from "../models/Session.ts";
import { isDatabaseConnected, ensureDatabaseConnected } from "./mongodb.ts";
import { isValidObjectId } from "./user-repository.ts";
import mongoose from "mongoose";

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

interface ISessionDoc {
  _id: mongoose.Types.ObjectId | string;
  sessionId?: string;
  userId: mongoose.Types.ObjectId | string;
  tokenHash: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  lastUsedAt?: Date | string;
  revokedAt?: Date | string | null;
  ipAddress?: string;
  userAgent?: string;
}

class SessionRepository {
  private sessions: Map<string, ISession> = new Map(); // Key: tokenHash

  /**
   * Create and persist a new session in-memory and in MongoDB (when connected)
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
    const sessionId = `sess_${now.getTime().toString(36)}_${crypto.randomBytes(8).toString("hex")}`;
    const session: ISession = {
      id: sessionId,
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

    // Persist to MongoDB when connected
    if (isDatabaseConnected()) {
      const mongoUserId = isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();

      Session.create({
        sessionId,
        userId: mongoUserId,
        tokenHash,
        ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
        ...(options.userAgent ? { userAgent: options.userAgent } : {}),
        createdAt: now,
        expiresAt,
        lastUsedAt: now,
        revokedAt: null,
      }).catch((err) => {
        console.warn("[SessionRepository] MongoDB session write warning:", err.message);
      });
    }

    return session;
  }

  /**
   * Find an active, non-expired, non-revoked session by its raw token (cache check)
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
   * Authoritative session validation checking MongoDB Atlas for cross-instance validity
   */
  public async findValidSessionByTokenAsync(token: string): Promise<ISession | null> {
    if (!token) return null;
    const tokenHash = hashToken(token);

    await ensureDatabaseConnected();

    if (isDatabaseConnected()) {
      try {
        const doc = await Session.findOne({
          tokenHash,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        }).lean<ISessionDoc>();

        if (doc) {
          const session: ISession = {
            id: doc.sessionId || doc._id.toString(),
            userId: doc.userId.toString(),
            tokenHash: doc.tokenHash,
            createdAt: new Date(doc.createdAt).toISOString(),
            expiresAt: new Date(doc.expiresAt).toISOString(),
            lastUsedAt: doc.lastUsedAt
              ? new Date(doc.lastUsedAt).toISOString()
              : new Date().toISOString(),
            revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
            ...(doc.ipAddress ? { ipAddress: doc.ipAddress } : {}),
            ...(doc.userAgent ? { userAgent: doc.userAgent } : {}),
          };
          this.sessions.set(tokenHash, session);
          return session;
        }

        // If not found in database or revoked, invalidate local cache
        this.sessions.delete(tokenHash);
        return null;
      } catch (err) {
        if (process.env["NODE_ENV"] === "production") {
          return null; // Fail closed in production on database error
        }
      }
    } else if (process.env["NODE_ENV"] === "production") {
      return null; // Fail closed when database is unavailable in production
    }

    // In-memory fallback for local development & unit tests
    return this.findValidSessionByToken(token);
  }

  /**
   * Update last used timestamp of a session
   */
  public touchSession(token: string): void {
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (session && !session.revokedAt) {
      session.lastUsedAt = new Date().toISOString();
      if (isDatabaseConnected()) {
        Session.updateOne({ tokenHash }, { lastUsedAt: new Date() }).catch(() => {});
      }
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
      if (isDatabaseConnected()) {
        Session.updateOne({ tokenHash }, { revokedAt: new Date() }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  /**
   * Asynchronously create and persist a new session in MongoDB Atlas before returning
   */
  public async createSessionAsync(
    userId: string,
    token: string,
    options: {
      ttlHours?: number;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<ISession> {
    const ttlHours = options.ttlHours ?? 24;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const tokenHash = hashToken(token);
    const sessionId = `sess_${now.getTime().toString(36)}_${crypto.randomBytes(8).toString("hex")}`;
    const session: ISession = {
      id: sessionId,
      userId,
      tokenHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
      revokedAt: null,
      ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
      ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    };

    await ensureDatabaseConnected();

    if (isDatabaseConnected()) {
      const mongoUserId = isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();

      await Session.create({
        sessionId,
        userId: mongoUserId,
        tokenHash,
        ...(options.ipAddress ? { ipAddress: options.ipAddress } : {}),
        ...(options.userAgent ? { userAgent: options.userAgent } : {}),
        createdAt: now,
        expiresAt,
        lastUsedAt: now,
        revokedAt: null,
      });
    } else {
      const hasDbConfig = !!(process.env["MONGODB_URI"] || process.env["DATABASE_URL"]);
      if (process.env["NODE_ENV"] === "production" || hasDbConfig) {
        throw new Error("Cannot create session: Database is unavailable.");
      }
    }

    this.sessions.set(tokenHash, session);
    return session;
  }

  /**
   * Asynchronously revoke active session in both memory and MongoDB
   */
  public async revokeSessionByTokenAsync(token: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = hashToken(token);
    const now = new Date();

    if (isDatabaseConnected()) {
      const res = await Session.updateOne({ tokenHash }, { $set: { revokedAt: now } });
      const session = this.sessions.get(tokenHash);
      if (session) {
        session.revokedAt = now.toISOString();
      }
      return res.matchedCount > 0;
    } else if (process.env["NODE_ENV"] === "production") {
      throw new Error("Cannot revoke session: Database is unavailable.");
    }

    return this.revokeSessionByToken(token);
  }

  /**
   * Sync active unexpired sessions from MongoDB Atlas into memory cache
   */
  public async syncFromDatabase(): Promise<number> {
    if (!isDatabaseConnected()) return 0;
    try {
      const docs = await Session.find({
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean<ISessionDoc[]>();

      for (const doc of docs) {
        const session: ISession = {
          id: doc.sessionId || doc._id.toString(),
          userId: doc.userId.toString(),
          tokenHash: doc.tokenHash,
          createdAt: new Date(doc.createdAt).toISOString(),
          expiresAt: new Date(doc.expiresAt).toISOString(),
          lastUsedAt: doc.lastUsedAt
            ? new Date(doc.lastUsedAt).toISOString()
            : new Date().toISOString(),
          revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
          ...(doc.ipAddress ? { ipAddress: doc.ipAddress } : {}),
          ...(doc.userAgent ? { userAgent: doc.userAgent } : {}),
        };
        this.sessions.set(session.tokenHash, session);
      }
      return docs.length;
    } catch (err) {
      console.warn("[SessionRepository] Failed to sync sessions from database:", err);
      return 0;
    }
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

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      Session.updateMany(
        { userId: new mongoose.Types.ObjectId(userId) },
        { revokedAt: new Date() },
      ).catch(() => {});
    }

    return count;
  }

  /**
   * Asynchronously revoke all sessions for a user, optionally preserving the current active token
   */
  public async revokeAllUserSessionsAsync(userId: string, exceptToken?: string): Promise<number> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      userId: isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId,
      revokedAt: null,
    };
    if (exceptToken) {
      filter["tokenHash"] = { $ne: hashToken(exceptToken) };
    }

    let modifiedCount = 0;
    if (isDatabaseConnected()) {
      const res = await Session.updateMany(filter, { $set: { revokedAt: now } });
      modifiedCount = res.modifiedCount;
    } else if (process.env["NODE_ENV"] === "production") {
      throw new Error("Cannot revoke user sessions: Database is unavailable.");
    }

    for (const session of this.sessions.values()) {
      if (
        session.userId === userId &&
        (!exceptToken || session.tokenHash !== hashToken(exceptToken))
      ) {
        session.revokedAt = now.toISOString();
      }
    }

    return modifiedCount;
  }

  /**
   * Clear all sessions (used for test isolation)
   */
  public clearAll(): void {
    this.sessions.clear();
  }
}

export const sessionRepository = new SessionRepository();

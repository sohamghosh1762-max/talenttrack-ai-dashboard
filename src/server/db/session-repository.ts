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
   * Async finder that checks MongoDB if not found in memory cache
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
        }).lean<any>();

        if (doc) {
          const session: ISession = {
            id: doc.sessionId || doc._id.toString(),
            userId: doc.userId.toString(),
            tokenHash: doc.tokenHash,
            createdAt: doc.createdAt?.toISOString?.() || new Date(doc.createdAt).toISOString(),
            expiresAt: doc.expiresAt?.toISOString?.() || new Date(doc.expiresAt).toISOString(),
            lastUsedAt: doc.lastUsedAt
              ? (doc.lastUsedAt.toISOString?.() || new Date(doc.lastUsedAt).toISOString())
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
    }

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
   * Async create and persist a new session in MongoDB Atlas
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
      try {
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
      } catch (err: any) {
        console.warn("[SessionRepository] MongoDB session write warning:", err.message);
      }
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
   * Async revoke active session in both memory and MongoDB
   */
  public async revokeSessionByTokenAsync(token: string): Promise<boolean> {
    const res = this.revokeSessionByToken(token);
    const tokenHash = hashToken(token);
    if (isDatabaseConnected()) {
      await Session.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } }).catch(() => {});
    }
    return res;
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
      }).lean<any>();

      for (const doc of docs) {
        const session: ISession = {
          id: doc.sessionId || doc._id.toString(),
          userId: doc.userId.toString(),
          tokenHash: doc.tokenHash,
          createdAt: doc.createdAt?.toISOString?.() || new Date(doc.createdAt).toISOString(),
          expiresAt: doc.expiresAt?.toISOString?.() || new Date(doc.expiresAt).toISOString(),
          lastUsedAt: doc.lastUsedAt?.toISOString?.() || new Date().toISOString(),
          revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
          ipAddress: doc.ipAddress,
          userAgent: doc.userAgent,
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
   * Clear all sessions (used for test isolation)
   */
  public clearAll(): void {
    this.sessions.clear();
  }
}

export const sessionRepository = new SessionRepository();

import crypto from "node:crypto";
import { hashToken } from "./session-repository.ts";
import { AuthToken } from "../models/AuthToken.ts";
import { isDatabaseConnected } from "./mongodb.ts";
import { isValidObjectId } from "./user-repository.ts";
import mongoose from "mongoose";

export interface IAuthToken {
  id: string;
  userId: string;
  tokenHash: string;
  type: "PASSWORD_RESET" | "EMAIL_VERIFICATION";
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

class TokenRepository {
  private tokens: Map<string, IAuthToken> = new Map(); // Key: tokenHash

  /**
   * Asynchronously generate and persist a password reset token in MongoDB Atlas
   */
  public async createPasswordResetTokenAsync(
    userId: string,
    ttlMinutes: number = 60,
  ): Promise<{ token: string; expiresAt: string }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const tokenId = `tok_${now.getTime().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;

    if (isDatabaseConnected()) {
      const mongoUserId = isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();

      await AuthToken.create({
        tokenId,
        userId: mongoUserId,
        tokenHash,
        type: "PASSWORD_RESET",
        expiresAt,
        usedAt: null,
      });
    } else if (process.env["NODE_ENV"] === "production") {
      throw new Error("Cannot create password reset token: Database is unavailable.");
    }

    const record: IAuthToken = {
      id: tokenId,
      userId,
      tokenHash,
      type: "PASSWORD_RESET",
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: now.toISOString(),
    };
    this.tokens.set(tokenHash, record);

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Asynchronously validate password reset token against MongoDB Atlas
   */
  public async verifyPasswordResetTokenAsync(rawToken: string): Promise<{
    valid: boolean;
    userId?: string;
    error?: string;
  }> {
    if (!rawToken) return { valid: false, error: "Token is required." };
    const tokenHash = hashToken(rawToken);

    if (isDatabaseConnected()) {
      const doc = await AuthToken.findOne({
        tokenHash,
        type: "PASSWORD_RESET",
      }).exec();

      if (!doc) {
        if (process.env["NODE_ENV"] === "production") {
          return { valid: false, error: "Invalid password reset token." };
        }
      } else {
        if (doc.usedAt) {
          return { valid: false, error: "Password reset token has already been used." };
        }
        if (Date.now() > doc.expiresAt.getTime()) {
          return { valid: false, error: "Password reset token has expired." };
        }
        return { valid: true, userId: doc.userId.toString() };
      }
    } else if (process.env["NODE_ENV"] === "production") {
      return { valid: false, error: "Authentication service temporarily unavailable." };
    }

    // In-memory fallback for local development & unit tests
    const record = this.tokens.get(tokenHash);
    if (!record || record.type !== "PASSWORD_RESET") {
      return { valid: false, error: "Invalid password reset token." };
    }
    if (record.usedAt) {
      return { valid: false, error: "Password reset token has already been used." };
    }
    if (Date.now() > new Date(record.expiresAt).getTime()) {
      return { valid: false, error: "Password reset token has expired." };
    }
    return { valid: true, userId: record.userId };
  }

  /**
   * Atomically consume a password reset token in MongoDB to prevent concurrent reuse
   */
  public async consumePasswordResetTokenAsync(rawToken: string): Promise<{
    consumed: boolean;
    userId?: string;
  }> {
    if (!rawToken) return { consumed: false };
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    if (isDatabaseConnected()) {
      const updated = await AuthToken.findOneAndUpdate(
        {
          tokenHash,
          type: "PASSWORD_RESET",
          usedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { new: true },
      ).exec();

      if (updated) {
        const record = this.tokens.get(tokenHash);
        if (record) record.usedAt = now.toISOString();
        return { consumed: true, userId: updated.userId.toString() };
      }
      return { consumed: false };
    }

    if (process.env["NODE_ENV"] === "production") {
      return { consumed: false };
    }

    // In-memory fallback for unit testing
    const record = this.tokens.get(tokenHash);
    if (record && !record.usedAt && Date.now() <= new Date(record.expiresAt).getTime()) {
      record.usedAt = now.toISOString();
      return { consumed: true, userId: record.userId };
    }
    return { consumed: false };
  }

  /**
   * Asynchronously generate and store an email verification token in MongoDB Atlas
   */
  public async createEmailVerificationTokenAsync(
    userId: string,
    ttlHours: number = 48,
  ): Promise<{ token: string; expiresAt: string }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    const tokenId = `tok_${now.getTime().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;

    if (isDatabaseConnected()) {
      const mongoUserId = isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();

      await AuthToken.create({
        tokenId,
        userId: mongoUserId,
        tokenHash,
        type: "EMAIL_VERIFICATION",
        expiresAt,
        usedAt: null,
      });
    } else if (process.env["NODE_ENV"] === "production") {
      throw new Error("Cannot create email verification token: Database is unavailable.");
    }

    const record: IAuthToken = {
      id: tokenId,
      userId,
      tokenHash,
      type: "EMAIL_VERIFICATION",
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: now.toISOString(),
    };
    this.tokens.set(tokenHash, record);

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Asynchronously validate email verification token
   */
  public async verifyEmailVerificationTokenAsync(rawToken: string): Promise<{
    valid: boolean;
    userId?: string;
    error?: string;
  }> {
    if (!rawToken) return { valid: false, error: "Token is required." };
    const tokenHash = hashToken(rawToken);

    if (isDatabaseConnected()) {
      const doc = await AuthToken.findOne({
        tokenHash,
        type: "EMAIL_VERIFICATION",
      }).exec();

      if (!doc) {
        if (process.env["NODE_ENV"] === "production") {
          return { valid: false, error: "Invalid verification token." };
        }
      } else {
        if (doc.usedAt) {
          return { valid: false, error: "Verification token has already been used." };
        }
        if (Date.now() > doc.expiresAt.getTime()) {
          return { valid: false, error: "Verification token has expired." };
        }
        return { valid: true, userId: doc.userId.toString() };
      }
    } else if (process.env["NODE_ENV"] === "production") {
      return { valid: false, error: "Authentication service temporarily unavailable." };
    }

    // In-memory fallback
    const record = this.tokens.get(tokenHash);
    if (!record || record.type !== "EMAIL_VERIFICATION") {
      return { valid: false, error: "Invalid verification token." };
    }
    if (record.usedAt) {
      return { valid: false, error: "Verification token has already been used." };
    }
    if (Date.now() > new Date(record.expiresAt).getTime()) {
      return { valid: false, error: "Verification token has expired." };
    }
    return { valid: true, userId: record.userId };
  }

  /**
   * Atomically consume email verification token in MongoDB
   */
  public async consumeEmailVerificationTokenAsync(rawToken: string): Promise<{
    consumed: boolean;
    userId?: string;
  }> {
    if (!rawToken) return { consumed: false };
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    if (isDatabaseConnected()) {
      const updated = await AuthToken.findOneAndUpdate(
        {
          tokenHash,
          type: "EMAIL_VERIFICATION",
          usedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { new: true },
      ).exec();

      if (updated) {
        const record = this.tokens.get(tokenHash);
        if (record) record.usedAt = now.toISOString();
        return { consumed: true, userId: updated.userId.toString() };
      }
      return { consumed: false };
    }

    if (process.env["NODE_ENV"] === "production") {
      return { consumed: false };
    }

    const record = this.tokens.get(tokenHash);
    if (record && !record.usedAt && Date.now() <= new Date(record.expiresAt).getTime()) {
      record.usedAt = now.toISOString();
      return { consumed: true, userId: record.userId };
    }
    return { consumed: false };
  }

  /**
   * Invalidate existing tokens of a given type for a user asynchronously
   */
  public async invalidateUserTokensAsync(
    userId: string,
    type: "PASSWORD_RESET" | "EMAIL_VERIFICATION",
  ): Promise<void> {
    const now = new Date();
    for (const record of this.tokens.values()) {
      if (record.userId === userId && record.type === type && !record.usedAt) {
        record.usedAt = now.toISOString();
      }
    }

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      await AuthToken.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), type, usedAt: null },
        { $set: { usedAt: now } },
      );
    }
  }

  // --- SYNCHRONOUS BACKWARD COMPATIBILITY HELPERS FOR TESTS ---

  public createPasswordResetToken(
    userId: string,
    ttlMinutes: number = 60,
  ): { token: string; expiresAt: string } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const tokenId = `tok_${now.getTime().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;

    const record: IAuthToken = {
      id: tokenId,
      userId,
      tokenHash,
      type: "PASSWORD_RESET",
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: now.toISOString(),
    };
    this.tokens.set(tokenHash, record);

    if (isDatabaseConnected()) {
      const mongoUserId = isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();
      AuthToken.create({
        tokenId,
        userId: mongoUserId,
        tokenHash,
        type: "PASSWORD_RESET",
        expiresAt,
        usedAt: null,
      }).catch(() => {});
    }

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  public verifyPasswordResetToken(rawToken: string): {
    valid: boolean;
    userId?: string;
    error?: string;
  } {
    if (!rawToken) return { valid: false, error: "Token is required." };
    const tokenHash = hashToken(rawToken);
    const record = this.tokens.get(tokenHash);

    if (!record || record.type !== "PASSWORD_RESET") {
      return { valid: false, error: "Invalid password reset token." };
    }
    if (record.usedAt) {
      return { valid: false, error: "Password reset token has already been used." };
    }
    if (Date.now() > new Date(record.expiresAt).getTime()) {
      return { valid: false, error: "Password reset token has expired." };
    }
    return { valid: true, userId: record.userId };
  }

  public consumePasswordResetToken(rawToken: string): boolean {
    const tokenHash = hashToken(rawToken);
    const record = this.tokens.get(tokenHash);
    if (record && !record.usedAt) {
      const now = new Date();
      record.usedAt = now.toISOString();
      if (isDatabaseConnected()) {
        AuthToken.updateOne({ tokenHash }, { $set: { usedAt: now } }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public createEmailVerificationToken(
    userId: string,
    ttlHours: number = 48,
  ): { token: string; expiresAt: string } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    const tokenId = `tok_${now.getTime().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;

    const record: IAuthToken = {
      id: tokenId,
      userId,
      tokenHash,
      type: "EMAIL_VERIFICATION",
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: now.toISOString(),
    };
    this.tokens.set(tokenHash, record);

    if (isDatabaseConnected()) {
      const mongoUserId = isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();
      AuthToken.create({
        tokenId,
        userId: mongoUserId,
        tokenHash,
        type: "EMAIL_VERIFICATION",
        expiresAt,
        usedAt: null,
      }).catch(() => {});
    }

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  public verifyEmailVerificationToken(rawToken: string): {
    valid: boolean;
    userId?: string;
    error?: string;
  } {
    if (!rawToken) return { valid: false, error: "Token is required." };
    const tokenHash = hashToken(rawToken);
    const record = this.tokens.get(tokenHash);

    if (!record || record.type !== "EMAIL_VERIFICATION") {
      return { valid: false, error: "Invalid verification token." };
    }
    if (record.usedAt) {
      return { valid: false, error: "Verification token has already been used." };
    }
    if (Date.now() > new Date(record.expiresAt).getTime()) {
      return { valid: false, error: "Verification token has expired." };
    }
    return { valid: true, userId: record.userId };
  }

  public consumeEmailVerificationToken(rawToken: string): boolean {
    const tokenHash = hashToken(rawToken);
    const record = this.tokens.get(tokenHash);
    if (record && !record.usedAt) {
      const now = new Date();
      record.usedAt = now.toISOString();
      if (isDatabaseConnected()) {
        AuthToken.updateOne({ tokenHash }, { $set: { usedAt: now } }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public invalidateUserTokens(userId: string, type: "PASSWORD_RESET" | "EMAIL_VERIFICATION"): void {
    this.invalidateUserTokensAsync(userId, type).catch(() => {});
  }

  public clearAll(): void {
    this.tokens.clear();
  }
}

export const tokenRepository = new TokenRepository();

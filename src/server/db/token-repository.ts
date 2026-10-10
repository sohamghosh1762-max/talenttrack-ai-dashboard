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
   * Generate and store a password reset token
   */
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
      }).catch((err) => {
        console.warn("[TokenRepository] MongoDB token write warning:", err.message);
      });
    }

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Validate password reset token
   */
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

  /**
   * Consume password reset token
   */
  public consumePasswordResetToken(rawToken: string): boolean {
    const tokenHash = hashToken(rawToken);
    const record = this.tokens.get(tokenHash);
    if (record && !record.usedAt) {
      const now = new Date();
      record.usedAt = now.toISOString();
      if (isDatabaseConnected()) {
        AuthToken.updateOne({ tokenHash }, { usedAt: now }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  /**
   * Generate and store an email verification token
   */
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
      }).catch((err) => {
        console.warn("[TokenRepository] MongoDB verification token write warning:", err.message);
      });
    }

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Validate email verification token
   */
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

  /**
   * Consume email verification token
   */
  public consumeEmailVerificationToken(rawToken: string): boolean {
    const tokenHash = hashToken(rawToken);
    const record = this.tokens.get(tokenHash);
    if (record && !record.usedAt) {
      const now = new Date();
      record.usedAt = now.toISOString();
      if (isDatabaseConnected()) {
        AuthToken.updateOne({ tokenHash }, { usedAt: now }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  /**
   * Invalidate existing tokens of a given type for a user
   */
  public invalidateUserTokens(userId: string, type: "PASSWORD_RESET" | "EMAIL_VERIFICATION"): void {
    const now = new Date();
    for (const record of this.tokens.values()) {
      if (record.userId === userId && record.type === type && !record.usedAt) {
        record.usedAt = now.toISOString();
      }
    }

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      AuthToken.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), type, usedAt: null },
        { usedAt: now },
      ).catch(() => {});
    }
  }

  /**
   * Clear all tokens (used for test isolation)
   */
  public clearAll(): void {
    this.tokens.clear();
  }
}

export const tokenRepository = new TokenRepository();

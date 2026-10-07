import crypto from "node:crypto";
import { hashToken } from "./session-repository.ts";

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
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

    const record: IAuthToken = {
      id: `tok_${now.getTime().toString(36)}_${crypto.randomBytes(6).toString("hex")}`,
      userId,
      tokenHash,
      type: "PASSWORD_RESET",
      expiresAt,
      usedAt: null,
      createdAt: now.toISOString(),
    };

    this.tokens.set(tokenHash, record);
    return { token: rawToken, expiresAt };
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
      record.usedAt = new Date().toISOString();
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
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();

    const record: IAuthToken = {
      id: `tok_${now.getTime().toString(36)}_${crypto.randomBytes(6).toString("hex")}`,
      userId,
      tokenHash,
      type: "EMAIL_VERIFICATION",
      expiresAt,
      usedAt: null,
      createdAt: now.toISOString(),
    };

    this.tokens.set(tokenHash, record);
    return { token: rawToken, expiresAt };
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
      return { valid: false, error: "Invalid email verification token." };
    }

    if (record.usedAt) {
      return { valid: false, error: "Email verification token has already been used." };
    }

    if (Date.now() > new Date(record.expiresAt).getTime()) {
      return { valid: false, error: "Email verification token has expired." };
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
      record.usedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Clear all tokens
   */
  public clearAll(): void {
    this.tokens.clear();
  }
}

export const tokenRepository = new TokenRepository();

import crypto from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

const COMMON_WEAK_PASSWORDS = new Set([
  "12345678",
  "password",
  "password123",
  "123456789",
  "1234567890",
  "qwerty123",
  "admin123",
  "welcome1",
  "talenttrack123",
]);

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate password against production security policy:
 * - Minimum 8 characters
 * - Max length 128 characters
 * - Rejection of common weak passwords
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must contain at least 8 characters." };
  }

  if (password.length > 128) {
    return { valid: false, message: "Password cannot exceed 128 characters." };
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      message: "Password is too common. Please choose a stronger, unique password.",
    };
  }

  return { valid: true };
}

/**
 * Cryptographically hash a password using scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

/**
 * Verify a candidate password against a stored hashed password
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // Handle scrypt formatted hashes: scrypt$salt$hash
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;

    const salt = parts[1]!;
    const hashHex = parts[2]!;

    const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
    const keyBuffer = Buffer.from(derivedKey.toString("hex"), "hex");
    const hashBuffer = Buffer.from(hashHex, "hex");

    if (keyBuffer.length !== hashBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  }

  // Strictly reject non-cryptographic or plain text passwords in production
  if (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production") {
    return false;
  }

  // Fallback for legacy plain text passwords in isolated development/test environments
  return password === storedHash;
}

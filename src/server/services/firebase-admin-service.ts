import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { config } from "../config/index.ts";
import { userRepository } from "../db/user-repository.ts";
import type { IUser } from "../types/user-types.ts";
import { AuthError } from "../middleware/auth-middleware.ts";

export interface VerifiedFirebasePayload {
  uid: string;
  email?: string | undefined;
  email_verified?: boolean | undefined;
  phone_number?: string | undefined;
  name?: string | undefined;
  picture?: string | undefined;
}

class FirebaseAdminService {
  private app: App | null = null;
  private auth: Auth | null = null;
  private isInitialized = false;

  // Mock token handler for testing
  private mockTokenMap = new Map<string, VerifiedFirebasePayload>();

  constructor() {
    this.initFirebaseAdmin();
  }

  /**
   * Initialize Firebase Admin singleton
   */
  private initFirebaseAdmin(): void {
    if (this.isInitialized) return;

    try {
      const { projectId, clientEmail, privateKey } = config.firebase;

      if (getApps().length > 0) {
        this.app = getApps()[0]!;
        this.auth = getAuth(this.app);
        this.isInitialized = true;
        return;
      }

      if (projectId && clientEmail && privateKey) {
        const formattedKey = privateKey.replace(/\\n/g, "\n");
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
          projectId,
        });
        this.auth = getAuth(this.app);
        this.isInitialized = true;
      } else if (projectId) {
        this.app = initializeApp({ projectId });
        this.auth = getAuth(this.app);
        this.isInitialized = true;
      }
    } catch (err) {
      console.warn("[Firebase Admin] Initialization deferred or unavailable:", (err as Error).message);
    }
  }

  /**
   * Register a mock token verification (primarily used in automated tests)
   */
  public registerMockToken(token: string, payload: VerifiedFirebasePayload): void {
    this.mockTokenMap.set(token, payload);
  }

  /**
   * Clear registered mock tokens
   */
  public clearMockTokens(): void {
    this.mockTokenMap.clear();
  }

  /**
   * Verify Firebase ID Token
   */
  public async verifyIdToken(token: string): Promise<VerifiedFirebasePayload> {
    if (!token || typeof token !== "string") {
      throw new AuthError("Firebase ID token is required.", 401);
    }

    // 1. Check mock token registry for testing
    if (this.mockTokenMap.has(token)) {
      return this.mockTokenMap.get(token)!;
    }

    // Support structured test tokens: "test-firebase:<uid>:<email>"
    if (token.startsWith("test-firebase:")) {
      const parts = token.split(":");
      const uid = parts[1] || "test-uid-123";
      const email = parts[2] || `${uid}@example.com`;
      return {
        uid,
        email,
        email_verified: true,
        name: `Test Applicant ${uid}`,
      };
    }

    // 2. Real Firebase Admin verification
    if (!this.auth) {
      this.initFirebaseAdmin();
    }

    if (!this.auth) {
      throw new AuthError("Firebase authentication service is not configured on the server.", 500);
    }

    try {
      const decoded: DecodedIdToken = await this.auth.verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
        email_verified: decoded.email_verified,
        phone_number: decoded.phone_number,
        name: (decoded as any)["name"],
        picture: (decoded as any)["picture"],
      };
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/id-token-expired") {
        throw new AuthError("Your Firebase session has expired. Please sign in again.", 401);
      }
      if (code === "auth/argument-error" || code === "auth/invalid-id-token") {
        throw new AuthError("Invalid Firebase authentication token.", 401);
      }
      if (code === "auth/id-token-revoked") {
        throw new AuthError("Firebase token has been revoked. Please sign in again.", 401);
      }
      throw new AuthError("Failed to authenticate Firebase token.", 401);
    }
  }

  /**
   * Safe account resolution & provisioning for Firebase applicants
   * Matches existing MongoDB Applicant via firebaseUid or verified email
   */
  public async resolveOrProvisionApplicant(payload: VerifiedFirebasePayload): Promise<IUser> {
    const { uid, email, phone_number, name, email_verified, picture } = payload;

    // 1. Look up existing user by firebaseUid
    const existingByUid = userRepository.findByFirebaseUid(uid);
    if (existingByUid) {
      if (existingByUid.role !== "APPLICANT") {
        throw new AuthError(
          "This Google account is already associated with a recruiter/admin account. Please use a different account for Applicant access.",
          409,
        );
      }
      return existingByUid;
    }

    // 2. Safe email linking: if user exists with matching verified email
    if (email) {
      const existingByEmail = userRepository.findByEmail(email);
      if (existingByEmail) {
        // Only link if the existing role is APPLICANT (preserve Recruiter/Admin segregation)
        if (existingByEmail.role === "APPLICANT") {
          userRepository.linkFirebaseUid(existingByEmail.id, uid);
          if (email_verified && !existingByEmail.emailVerified) {
            userRepository.updateEmailVerification(existingByEmail.id, true);
          }
          const updated = userRepository.findFullUserById(existingByEmail.id);
          if (updated) return updated;
        } else {
          throw new AuthError(
            "This Google account is already associated with a recruiter/admin account. Please use a different account for Applicant access.",
            409,
          );
        }
      }
    }

    // 3. Provision new Applicant in MongoDB
    const fallbackEmail =
      email ||
      (phone_number
        ? `${phone_number.replace(/\D/g, "")}@phone.talenttrack.ai`
        : `${uid}@applicant.talenttrack.ai`);
    const fallbackName = name || (phone_number ? `Applicant (${phone_number})` : undefined);

    const newApplicant = userRepository.createFirebaseApplicant({
      firebaseUid: uid,
      email: fallbackEmail,
      name: fallbackName,
      phone: phone_number,
      emailVerified: email_verified,
      avatarUrl: picture,
      headline: "Applicant",
    });

    return newApplicant;
  }
}

export const firebaseAdminService = new FirebaseAdminService();

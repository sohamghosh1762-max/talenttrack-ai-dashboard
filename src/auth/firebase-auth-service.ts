import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  RecaptchaVerifier,
  type ConfirmationResult,
  type User as FirebaseUser,
  type Unsubscribe,
} from "firebase/auth";
import { auth, googleAuthProvider, firebaseConfig } from "../lib/firebase";

export interface FirebaseBootstrapResponse {
  success: boolean;
  message?: string;
  user?: any;
}

export const firebaseAuthService = {
  /**
   * Translate Firebase error codes into friendly user-facing messages
   */
  mapErrorMessage(error: any): string {
    const code = error?.code || "";
    const msg = error?.message || "";

    if (msg.includes("Firebase Web API key is not configured")) {
      return "Firebase Web API key is not configured.";
    }

    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/user-not-found":
        return "No account was found with these credentials.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please sign in instead.";
      case "auth/weak-password":
        return "Please choose a stronger password (at least 6 characters).";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/popup-blocked":
        return "Your browser blocked the Google sign-in popup. Please allow popups.";
      case "auth/invalid-verification-code":
        return "The verification code is invalid. Please check and try again.";
      case "auth/code-expired":
        return "The verification code has expired. Please request a new code.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/invalid-phone-number":
        return "Please enter a valid phone number with country code (e.g. +91 9876543210).";
      case "auth/captcha-check-failed":
        return "Security verification failed. Please try again.";
      case "auth/network-request-failed":
        return "Network connection error. Please check your internet connection.";
      default:
        return msg || "An authentication error occurred. Please try again.";
    }
  },

  /**
   * Get current authenticated Firebase user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  /**
   * Retrieve valid Firebase ID token
   */
  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  },

  /**
   * Check whether Firebase client is configured with a valid API key
   */
  isConfigured(): boolean {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0);
  },

  /**
   * Assert configuration before initiating network requests
   */
  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error("Firebase Web API key is not configured.");
    }
  },

  /**
   * Sign up with Email and Password
   */
  async signUpWithEmail(
    email: string,
    pass: string,
    name?: string,
  ): Promise<{ user: FirebaseUser; token: string }> {
    this.assertConfigured();
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name && name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() }).catch(() => {});
    }
    const token = await credential.user.getIdToken(true);
    return { user: credential.user, token };
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser; token: string }> {
    this.assertConfigured();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const token = await credential.user.getIdToken();
    return { user: credential.user, token };
  },

  /**
   * Sign in / Sign up with Google Popup
   */
  async signInWithGoogle(): Promise<{ user: FirebaseUser; token: string }> {
    this.assertConfigured();
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const token = await credential.user.getIdToken();
    return { user: credential.user, token };
  },

  /**
   * Setup RecaptchaVerifier for Phone OTP verification
   */
  setupRecaptcha(containerId: string): RecaptchaVerifier {
    return new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {},
    });
  },

  /**
   * Send Phone Number OTP
   */
  async sendPhoneOtp(
    phoneNumber: string,
    verifier: RecaptchaVerifier,
  ): Promise<ConfirmationResult> {
    this.assertConfigured();
    const normalizedPhone = phoneNumber.trim().startsWith("+")
      ? phoneNumber.trim()
      : `+${phoneNumber.trim()}`;
    return await signInWithPhoneNumber(auth, normalizedPhone, verifier);
  },

  /**
   * Verify Phone Number OTP confirmation
   */
  async verifyPhoneOtp(
    confirmationResult: ConfirmationResult,
    code: string,
  ): Promise<{ user: FirebaseUser; token: string }> {
    const result = await confirmationResult.confirm(code.trim());
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  },

  /**
   * Send Password Reset Email
   */
  async sendPasswordReset(email: string): Promise<void> {
    this.assertConfigured();
    await sendPasswordResetEmail(auth, email.trim());
  },

  /**
   * Sign out Firebase session
   */
  async signOutUser(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Bootstrap verified Firebase User with backend MongoDB Applicant record
   */
  async bootstrapBackend(token: string): Promise<any> {
    const res = await fetch("/api/auth/firebase-bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || data?.message || "Failed to sync applicant profile.");
    }

    return data.data?.user;
  },

  /**
   * Listen for Firebase Auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
  },
};

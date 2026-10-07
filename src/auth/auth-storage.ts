import type { AuthSession, User } from "./auth-types";

const LEGACY_SESSION_STORAGE_KEY = "talenttrack_legacy_auth_session_v1";
const APPLICANT_SESSION_STORAGE_KEY = "talenttrack_applicant_auth_session_v1";
const GENERAL_SESSION_STORAGE_KEY = "talenttrack_auth_session_v1";

/**
 * Storage abstraction separating Legacy Recruiter/Admin sessions from Firebase Applicant sessions.
 */
class AuthStorage {
  private inMemoryLegacySession: AuthSession | null = null;
  private inMemoryApplicantSession: AuthSession | null = null;

  // --- Applicant Session ---
  public getApplicantSession(): AuthSession | null {
    if (this.inMemoryApplicantSession) {
      if (Date.now() > this.inMemoryApplicantSession.expiresAt) {
        this.clearApplicantSession();
        return null;
      }
      return this.inMemoryApplicantSession;
    }

    if (typeof window === "undefined") return null;

    try {
      const raw =
        localStorage.getItem(APPLICANT_SESSION_STORAGE_KEY) ||
        sessionStorage.getItem(APPLICANT_SESSION_STORAGE_KEY);
      if (!raw) return null;

      const session: AuthSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearApplicantSession();
        return null;
      }

      this.inMemoryApplicantSession = session;
      return session;
    } catch {
      return null;
    }
  }

  public setApplicantSession(session: AuthSession, persistent: boolean = true): void {
    this.inMemoryApplicantSession = session;
    this.clearLegacySession();

    if (typeof window === "undefined") return;

    try {
      const serialized = JSON.stringify(session);
      if (persistent) {
        localStorage.setItem(APPLICANT_SESSION_STORAGE_KEY, serialized);
        localStorage.setItem(GENERAL_SESSION_STORAGE_KEY, serialized);
      } else {
        sessionStorage.setItem(APPLICANT_SESSION_STORAGE_KEY, serialized);
        sessionStorage.setItem(GENERAL_SESSION_STORAGE_KEY, serialized);
      }
    } catch {
      // Ignore storage quota issues in sandboxes
    }
  }

  public clearApplicantSession(): void {
    this.inMemoryApplicantSession = null;
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(APPLICANT_SESSION_STORAGE_KEY);
      sessionStorage.removeItem(APPLICANT_SESSION_STORAGE_KEY);
      localStorage.removeItem(GENERAL_SESSION_STORAGE_KEY);
      sessionStorage.removeItem(GENERAL_SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  // --- Legacy Recruiter / Admin Session ---
  public getLegacySession(): AuthSession | null {
    if (this.inMemoryLegacySession) {
      if (Date.now() > this.inMemoryLegacySession.expiresAt) {
        this.clearLegacySession();
        return null;
      }
      return this.inMemoryLegacySession;
    }

    if (typeof window === "undefined") return null;

    try {
      const raw =
        localStorage.getItem(LEGACY_SESSION_STORAGE_KEY) ||
        sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
      if (!raw) return null;

      const session: AuthSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearLegacySession();
        return null;
      }

      this.inMemoryLegacySession = session;
      return session;
    } catch {
      return null;
    }
  }

  public setLegacySession(session: AuthSession, persistent: boolean = true): void {
    this.inMemoryLegacySession = session;
    this.clearApplicantSession();

    if (typeof window === "undefined") return;

    try {
      const serialized = JSON.stringify(session);
      if (persistent) {
        localStorage.setItem(LEGACY_SESSION_STORAGE_KEY, serialized);
        localStorage.setItem(GENERAL_SESSION_STORAGE_KEY, serialized);
      } else {
        sessionStorage.setItem(LEGACY_SESSION_STORAGE_KEY, serialized);
        sessionStorage.setItem(GENERAL_SESSION_STORAGE_KEY, serialized);
      }
    } catch {
      // Ignore storage quota issues in sandboxes
    }
  }

  public clearLegacySession(): void {
    this.inMemoryLegacySession = null;
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
      localStorage.removeItem(GENERAL_SESSION_STORAGE_KEY);
      sessionStorage.removeItem(GENERAL_SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  // --- General Compatibility APIs ---
  public getSession(): AuthSession | null {
    const applicantSession = this.getApplicantSession();
    if (applicantSession) return applicantSession;

    const legacySession = this.getLegacySession();
    if (legacySession) return legacySession;

    if (typeof window === "undefined") return null;

    try {
      const raw =
        localStorage.getItem(GENERAL_SESSION_STORAGE_KEY) ||
        sessionStorage.getItem(GENERAL_SESSION_STORAGE_KEY);
      if (!raw) return null;

      const session: AuthSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  public setSession(session: AuthSession, persistent: boolean = true): void {
    const roleUpper = String(session.user?.role || "").toUpperCase();
    if (roleUpper === "APPLICANT") {
      this.setApplicantSession(session, persistent);
    } else {
      this.setLegacySession(session, persistent);
    }
  }

  public clearSession(): void {
    this.clearApplicantSession();
    this.clearLegacySession();
  }

  public clearAll(): void {
    this.clearSession();
  }

  public getCurrentUser(): User | null {
    const session = this.getSession();
    return session ? session.user : null;
  }
}

export const authStorage = new AuthStorage();

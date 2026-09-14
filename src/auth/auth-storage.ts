import type { AuthSession, User } from "./auth-types";

const SESSION_STORAGE_KEY = "talenttrack_auth_session_v1";

/**
 * Storage abstraction for client-side prototype sessions.
 * In Phase 3, this will be replaced with HTTP-only secure cookie sessions from the backend API.
 */
class AuthStorage {
  private inMemorySession: AuthSession | null = null;

  public getSession(): AuthSession | null {
    if (this.inMemorySession) {
      if (Date.now() > this.inMemorySession.expiresAt) {
        this.clearSession();
        return null;
      }
      return this.inMemorySession;
    }

    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw =
        localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;

      const session: AuthSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      this.inMemorySession = session;
      return session;
    } catch {
      return null;
    }
  }

  public setSession(session: AuthSession, persistent: boolean = true): void {
    this.inMemorySession = session;
    if (typeof window === "undefined") return;

    try {
      const serialized = JSON.stringify(session);
      if (persistent) {
        localStorage.setItem(SESSION_STORAGE_KEY, serialized);
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      }
    } catch {
      // Ignore storage quota issues in strict sandboxes
    }
  }

  public clearSession(): void {
    this.inMemorySession = null;
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  public getCurrentUser(): User | null {
    const session = this.getSession();
    return session ? session.user : null;
  }
}

export const authStorage = new AuthStorage();

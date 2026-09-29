interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

const MAX_IP_ATTEMPTS = 15; // Max 15 login requests per 15 minutes per IP
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes temporary lockout

class LoginRateLimiter {
  private ipLimits: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if an IP address is currently rate-limited
   */
  public isIpRateLimited(ip: string): { limited: boolean; retryAfterSeconds?: number } {
    if (!ip) return { limited: false };

    const entry = this.ipLimits.get(ip);
    if (!entry) return { limited: false };

    const now = Date.now();
    if (now - entry.firstAttemptAt > WINDOW_MS) {
      this.ipLimits.delete(ip);
      return { limited: false };
    }

    if (entry.attempts >= MAX_IP_ATTEMPTS) {
      const remainingMs = WINDOW_MS - (now - entry.firstAttemptAt);
      return { limited: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
    }

    return { limited: false };
  }

  /**
   * Record a login attempt from an IP
   */
  public recordIpAttempt(ip: string): void {
    if (!ip) return;

    const now = Date.now();
    const entry = this.ipLimits.get(ip);

    if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
      this.ipLimits.set(ip, {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      });
    } else {
      entry.attempts += 1;
      entry.lastAttemptAt = now;
    }
  }

  /**
   * Reset rate limit state (for tests)
   */
  public clearAll(): void {
    this.ipLimits.clear();
  }
}

export const loginRateLimiter = new LoginRateLimiter();

import type { AuthResponse, LoginCredentials, RegisterData, User, UserRole } from "./auth-types";
import { authStorage } from "./auth-storage";

export const authService = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  /**
   * Authenticate user with email and password via real /api/auth/login API
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: credentials.email.trim(),
          password: credentials.password,
          rememberMe: !!credentials.rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data?.error?.message || data?.message || "Invalid email or password.";
        return { success: false, message: errorMsg };
      }

      const user = data.data.user as User;
      const token = data.data.token as string;

      // Save token in client storage for Authorization header fallback
      authStorage.setSession(
        {
          token,
          user,
          expiresAt: Date.now() + (credentials.rememberMe ? 30 * 86400000 : 86400000),
        },
        !!credentials.rememberMe,
      );

      return {
        success: true,
        user,
        token,
      };
    } catch {
      return {
        success: false,
        message: "Failed to connect to authentication service. Please try again.",
      };
    }
  },

  /**
   * Register a new Recruiter or Applicant via real /api/auth/register API
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          role: data.role,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          department: data.department,
          headline: data.headline,
          location: data.location,
          phone: data.phone,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const errorMsg = json?.error?.message || json?.message || "Failed to create account.";
        return { success: false, message: errorMsg };
      }

      const user = json.data.user as User;
      const token = json.data.token as string;

      authStorage.setSession(
        {
          token,
          user,
          expiresAt: Date.now() + 86400000,
        },
        true,
      );

      return {
        success: true,
        user,
        token,
      };
    } catch {
      return {
        success: false,
        message: "Failed to connect to registration service. Please try again.",
      };
    }
  },

  /**
   * Check current session on server via /api/auth/me
   */
  async getMe(): Promise<User | null> {
    try {
      const session = authStorage.getSession();
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
      }

      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        authStorage.clearSession();
        return null;
      }

      const json = await res.json();
      if (json.success && json.data?.user) {
        return json.data.user as User;
      }
      return null;
    } catch {
      return authStorage.getCurrentUser();
    }
  },

  /**
   * Log out and invalidate server session via /api/auth/logout
   */
  async logout(): Promise<void> {
    try {
      const session = authStorage.getSession();
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
      }

      await fetch("/api/auth/logout", {
        method: "POST",
        headers,
        credentials: "include",
      });
    } catch {
      // Ignore network errors during logout
    } finally {
      authStorage.clearSession();
    }
  },

  /**
   * Request password reset link via /api/auth/forgot-password
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();
      return {
        success: json.success ?? true,
        message:
          json.message ||
          "If an account with that email exists, password reset instructions have been sent.",
      };
    } catch {
      return {
        success: false,
        message: "Failed to process request. Please try again.",
      };
    }
  },

  /**
   * Reset password via /api/auth/reset-password
   */
  async resetPassword(
    token: string,
    password: string,
    confirmPassword?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json?.error?.message || json?.message || "Failed to reset password.",
        };
      }

      return {
        success: true,
        message:
          json.message ||
          "Password has been successfully reset. Please log in with your new password.",
      };
    } catch {
      return {
        success: false,
        message: "Failed to connect to reset service. Please try again.",
      };
    }
  },

  /**
   * Verify email via /api/auth/verify-email
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json?.error?.message || json?.message || "Failed to verify email.",
        };
      }

      return {
        success: true,
        message: json.message || "Email address successfully verified.",
      };
    } catch {
      return {
        success: false,
        message: "Failed to connect to verification service. Please try again.",
      };
    }
  },

  /**
   * Retrieve active authenticated user from storage
   */
  getCurrentUser(): User | null {
    return authStorage.getCurrentUser();
  },

  /**
   * Get seed credentials for quick demo access
   */
  getDemoCredentials(role: UserRole | string) {
    const raw = String(role).trim().toUpperCase();
    if (raw === "ADMIN" || raw === "SUPER_ADMIN" || raw === "ORG_ADMIN") {
      return {
        email: "admin@talenttrack.ai",
        password: "password123",
      };
    }
    if (raw === "RECRUITER" || raw === "HIRING_MANAGER" || raw === "INTERVIEWER") {
      return {
        email: "rahul.mehta@talenttrack.ai",
        password: "password123",
      };
    }
    return {
      email: "aarav.mehta@example.com",
      password: "password123",
    };
  },
};

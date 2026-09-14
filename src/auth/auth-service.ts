import type { AuthResponse, AuthSession, LoginCredentials, RegisterData, User } from "./auth-types";
import { authStorage } from "./auth-storage";

// Demo pre-seeded accounts for Phase 2 prototype
const DEMO_USERS: User[] = [
  {
    id: "user_recruiter_001",
    name: "Rahul Mehta",
    email: "rahul.mehta@talenttrack.ai",
    role: "recruiter",
    recruiterProfile: {
      companyName: "TalentTrack Technologies",
      jobTitle: "Senior Technical Recruiter",
      department: "Global Talent Acquisition",
    },
    createdAt: "2025-08-01T00:00:00Z",
  },
  {
    id: "user_applicant_001",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    role: "applicant",
    applicantProfile: {
      headline: "Senior Frontend Engineer | React, TypeScript & Next.js",
      location: "San Jose, CA",
      phone: "+1 (555) 234-5678",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
      experienceYears: "4 years",
      resumeFileName: "Aarav_Mehta_Resume_2025.pdf",
    },
    createdAt: "2025-08-10T00:00:00Z",
  },
];

// In-memory registered user database for this session
const registeredUsers: Map<string, { user: User; passwordHash: string }> = new Map();

// Initialize demo accounts with known hash simulation
DEMO_USERS.forEach((u) => {
  registeredUsers.set(u.email.toLowerCase(), {
    user: u,
    passwordHash: "password123",
  });
});

export const authService = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Artificial network latency simulation (250ms)
    await new Promise((resolve) => setTimeout(resolve, 250));

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email || !this.isValidEmail(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    if (!password || password.length < 6) {
      return { success: false, message: "Password must contain at least 6 characters." };
    }

    const account = registeredUsers.get(email);
    if (!account || account.passwordHash !== password) {
      return { success: false, message: "Email or password is incorrect." };
    }

    const session: AuthSession = {
      token: `jwt_mock_${account.user.id}_${Date.now()}`,
      user: account.user,
      expiresAt:
        Date.now() + (credentials.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
    };

    authStorage.setSession(session, !!credentials.rememberMe);

    return {
      success: true,
      user: account.user,
      token: session.token,
    };
  },

  /**
   * Register a new Recruiter or Applicant
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!name) {
      return { success: false, message: "Full name is required." };
    }

    if (!email || !this.isValidEmail(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    if (registeredUsers.has(email)) {
      return { success: false, message: "An account with this email already exists." };
    }

    if (!password || password.length < 8) {
      return { success: false, message: "Password must contain at least 8 characters." };
    }

    if (data.confirmPassword && data.confirmPassword !== password) {
      return { success: false, message: "Passwords do not match." };
    }

    if (data.role === "recruiter" && !data.companyName?.trim()) {
      return { success: false, message: "Company name is required for recruiters." };
    }

    const newUser: User = {
      id: `user_${data.role}_${Date.now()}`,
      name,
      email,
      role: data.role,
      recruiterProfile:
        data.role === "recruiter"
          ? {
              companyName: data.companyName?.trim() || "Independent Hiring",
              jobTitle: data.jobTitle?.trim() || "Recruiter",
            }
          : undefined,
      applicantProfile:
        data.role === "applicant"
          ? {
              headline: data.headline?.trim() || "Job Seeker",
              location: data.location?.trim() || "Remote",
            }
          : undefined,
      createdAt: new Date().toISOString(),
    };

    registeredUsers.set(email, { user: newUser, passwordHash: password });

    const session: AuthSession = {
      token: `jwt_mock_${newUser.id}_${Date.now()}`,
      user: newUser,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    authStorage.setSession(session, true);

    return {
      success: true,
      user: newUser,
      token: session.token,
    };
  },

  /**
   * Log out and destroy session
   */
  async logout(): Promise<void> {
    authStorage.clearSession();
  },

  /**
   * Retrieve active authenticated user
   */
  getCurrentUser(): User | null {
    return authStorage.getCurrentUser();
  },

  /**
   * Get demo credentials for instant testing
   */
  getDemoCredentials(role: "recruiter" | "applicant") {
    if (role === "recruiter") {
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

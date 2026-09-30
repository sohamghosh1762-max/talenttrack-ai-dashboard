"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import type { AuthResponse, LoginCredentials, RegisterData, User, UserRole } from "./auth-types";
import { authService } from "./auth-service";
import { authStorage } from "./auth-storage";
import { firebaseAuthService } from "./firebase-auth-service";

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole | string) => Promise<void>;
  checkSessionExpiry: () => boolean;
  expireSession: () => void;
  refreshUser: () => Promise<void>;
  setApplicantAuth: (applicantUser: User, token: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStorage.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);

  const setApplicantAuth = useCallback((applicantUser: User, token: string) => {
    authStorage.setApplicantSession(
      {
        token,
        user: applicantUser,
        expiresAt: Date.now() + 30 * 86400000,
      },
      true,
    );
    setUser(applicantUser);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      // 1. If active user is an applicant or Firebase has current user, refresh via Firebase bootstrap
      const fbUser = firebaseAuthService.getCurrentUser();
      if (fbUser || (user && user.role === "APPLICANT")) {
        const token = await firebaseAuthService.getIdToken(true);
        if (token) {
          const applicantUser = await firebaseAuthService.bootstrapBackend(token);
          setApplicantAuth(applicantUser, token);
          return;
        }
      }

      // 2. Otherwise refresh legacy recruiter/admin session
      const activeUser = await authService.getMe();
      if (activeUser && activeUser.role !== "APPLICANT") {
        setUser(activeUser);
      } else {
        setUser(activeUser);
      }
    } catch {
      // Keep existing user if transient network error
    }
  }, [user, setApplicantAuth]);

  const checkSessionExpiry = useCallback((): boolean => {
    const session = authStorage.getSession();
    if (!session && user) {
      setUser(null);
      return true;
    }
    return false;
  }, [user]);

  const expireSession = useCallback(() => {
    authStorage.clearSession();
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("talenttrack:auth-session-expired"));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirebase: (() => void) | null = null;

    if (firebaseAuthService.isConfigured()) {
      unsubscribeFirebase = firebaseAuthService.onAuthStateChange(async (fbUser) => {
        if (!isMounted) return;

        if (fbUser) {
          try {
            const token = await fbUser.getIdToken();
            const applicantUser = await firebaseAuthService.bootstrapBackend(token);
            if (isMounted) {
              authStorage.setApplicantSession(
                {
                  token,
                  user: applicantUser,
                  expiresAt: Date.now() + 30 * 86400000,
                },
                true,
              );
              setUser(applicantUser);
              setIsLoading(false);
              isInitializedRef.current = true;
            }
          } catch {
            if (isMounted) {
              authStorage.clearApplicantSession();
              setUser(null);
              setIsLoading(false);
              isInitializedRef.current = true;
            }
          }
        } else {
          // No Firebase user active: check for legacy Recruiter/Admin session
          const legacySession = authStorage.getLegacySession();
          if (legacySession) {
            try {
              const activeUser = await authService.getMe();
              if (isMounted) {
                setUser(activeUser);
              }
            } catch {
              if (isMounted) {
                setUser(null);
              }
            }
          } else {
            if (isMounted) {
              if (authStorage.getApplicantSession()) {
                authStorage.clearApplicantSession();
              }
              setUser(null);
            }
          }

          if (isMounted) {
            setIsLoading(false);
            isInitializedRef.current = true;
          }
        }
      });
    } else {
      // Fallback for non-Firebase environments (test suites or SSR)
      const legacySession = authStorage.getLegacySession();
      if (legacySession) {
        authService
          .getMe()
          .then((activeUser) => {
            if (isMounted) {
              setUser(activeUser);
              setIsLoading(false);
              isInitializedRef.current = true;
            }
          })
          .catch(() => {
            if (isMounted) {
              setUser(null);
              setIsLoading(false);
              isInitializedRef.current = true;
            }
          });
      } else {
        const current = authStorage.getCurrentUser();
        if (isMounted) {
          setUser(current);
          setIsLoading(false);
          isInitializedRef.current = true;
        }
      }
    }

    // Listen for custom session-expired event
    const handleExpiredEvent = () => {
      setUser(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "talenttrack_auth_session_v1" ||
        e.key === "talenttrack_applicant_auth_session_v1" ||
        e.key === "talenttrack_legacy_auth_session_v1"
      ) {
        const currentUser = authStorage.getCurrentUser();
        setUser(currentUser);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("talenttrack:auth-session-expired", handleExpiredEvent);
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      isMounted = false;
      if (unsubscribeFirebase) {
        unsubscribeFirebase();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("talenttrack:auth-session-expired", handleExpiredEvent);
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      if (res.success && res.user) {
        setUser(res.user);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      if (res.success && res.user) {
        setUser(res.user);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const currentRole = user?.role ? String(user.role).toUpperCase() : "";
      if (currentRole === "APPLICANT") {
        try {
          await firebaseAuthService.signOutUser();
        } catch {
          // Ignore
        }
        authStorage.clearApplicantSession();
      } else {
        await authService.logout();
        authStorage.clearLegacySession();
      }
      authStorage.clearAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: UserRole | string): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      const creds = authService.getDemoCredentials(targetRole);
      const res = await authService.login(creds);
      if (res.success && res.user) {
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
        checkSessionExpiry,
        expireSession,
        refreshUser,
        setApplicantAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

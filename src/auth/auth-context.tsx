"use client";

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import type { AuthResponse, LoginCredentials, RegisterData, User, UserRole } from "./auth-types";
import { authService } from "./auth-service";
import { authStorage } from "./auth-storage";

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  checkSessionExpiry: () => boolean;
  expireSession: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    // Check initial session
    const existing = authStorage.getCurrentUser();
    if (existing) {
      setUser(existing);
    }
    setIsLoading(false);

    // Set up periodic session check every 10 seconds
    const interval = setInterval(() => {
      const session = authStorage.getSession();
      if (!session && user) {
        setUser(null);
      }
    }, 10000);

    // Listen for custom session-expired event
    const handleExpiredEvent = () => {
      setUser(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "talenttrack_auth_session_v1") {
        const currentUser = authStorage.getCurrentUser();
        setUser(currentUser);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("talenttrack:auth-session-expired", handleExpiredEvent);
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("talenttrack:auth-session-expired", handleExpiredEvent);
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, [user]);

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
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: UserRole): Promise<void> => {
    const creds = authService.getDemoCredentials(targetRole);
    await login(creds);
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

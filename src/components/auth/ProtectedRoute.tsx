"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import type { UserRole } from "@/auth/auth-types";
import { UnauthorizedView } from "./UnauthorizedView";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const { user, role, isAuthenticated, isLoading, checkSessionExpiry } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasNotifiedExpiry, setHasNotifiedExpiry] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Check if session has expired
    const isExpired = checkSessionExpiry ? checkSessionExpiry() : false;
    if (isExpired && !hasNotifiedExpiry) {
      setHasNotifiedExpiry(true);
      toast.error("Your session has expired. Please sign in again.");
    }

    // 1. Not authenticated (401) -> Redirect to /login
    if (!isAuthenticated || !user) {
      navigate({
        to: "/login",
        search: {
          redirect: location.pathname,
        } as Record<string, string>,
      });
      return;
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    checkSessionExpiry,
    hasNotifiedExpiry,
    navigate,
    location.pathname,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 text-brand-blue animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">
            Verifying administrative authorization...
          </span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Do not render content while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  // 2. Role restriction check (403 Forbidden)
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAllowed = role && allowedRoles.includes(role);
    if (!isRoleAllowed) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <UnauthorizedView
          attemptedPath={location.pathname}
          requiredRole={allowedRoles.join(" or ")}
        />
      );
    }
  }

  return <>{children}</>;
}

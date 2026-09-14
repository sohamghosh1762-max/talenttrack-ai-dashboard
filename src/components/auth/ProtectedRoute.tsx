"use client";

import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import type { UserRole } from "@/auth/auth-types";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // 1. Not authenticated -> Redirect to /login
    if (!isAuthenticated || !user) {
      navigate({
        to: "/login",
        search: {
          redirect: location.pathname,
        } as Record<string, string>,
      });
      return;
    }

    // 2. Role restriction check
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        // Redirect to user's home dashboard
        if (role === "applicant") {
          navigate({ to: "/applicant" });
        } else if (role === "recruiter") {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/login" });
        }
      }
    }
  }, [isAuthenticated, isLoading, user, role, allowedRoles, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 text-brand-blue animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">
            Verifying authentication...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}

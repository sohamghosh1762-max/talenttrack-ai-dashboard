import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import type { UserRole } from "@/auth/auth-types";
import { isRoleAllowed, getRouteAccessRule } from "@/auth/route-access";
import { UnauthorizedView } from "./UnauthorizedView";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: (UserRole | string)[];
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

    // 1. Not authenticated (401) -> Redirect to /login with route-aware intent
    if (!isAuthenticated || !user) {
      const isAdministrative = location.pathname.startsWith("/admin");
      const isApplicant = location.pathname.startsWith("/applicant");
      const targetRole = isAdministrative ? "admin" : isApplicant ? "applicant" : "recruiter";

      navigate({
        to: "/login",
        search: {
          redirect: location.pathname,
          role: targetRole,
          intent: targetRole,
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
            Verifying session authorization...
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
  // Determine effective allowed roles (either explicitly provided or from centralized route configuration)
  const routeRule = getRouteAccessRule(location.pathname);
  const effectiveAllowedRoles =
    allowedRoles && allowedRoles.length > 0 ? allowedRoles : routeRule?.allowedRoles;

  if (effectiveAllowedRoles && effectiveAllowedRoles.length > 0) {
    const isAllowed = isRoleAllowed(role, effectiveAllowedRoles);
    if (!isAllowed) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <UnauthorizedView
          attemptedPath={location.pathname}
          requiredRole={effectiveAllowedRoles.join(" or ")}
        />
      );
    }
  }

  return <>{children}</>;
}

"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/auth/AuthProvider";
import {
  getDefaultRouteForRole,
  isUserAuthorizedForRoute,
  normalizeRole,
  USER_ROLES,
} from "@/auth/route-access";

interface LoginFormProps {
  redirectPath?: string | undefined;
  targetRole?: "applicant" | "recruiter" | "admin" | undefined;
  onChangeRole?: (() => void) | undefined;
}

export function LoginForm({ redirectPath, targetRole, onChangeRole }: LoginFormProps) {
  const { login, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    const res = await login({ email, password, rememberMe });
    if (res.success && res.user) {
      const canonicalRole = normalizeRole(res.user.role);

      // Account type mismatch protection (Section 16)
      if (targetRole === "applicant" && canonicalRole !== USER_ROLES.APPLICANT) {
        const detectedRoleLabel =
          canonicalRole === USER_ROLES.ADMIN ||
          canonicalRole === USER_ROLES.SUPER_ADMIN ||
          canonicalRole === USER_ROLES.ORG_ADMIN
            ? "an Administrator"
            : "a Recruiter";
        setErrorMessage(
          `Account type mismatch: This account is registered as ${detectedRoleLabel}. Please choose the correct account type.`,
        );
        await logout();
        return;
      }

      if (targetRole === "recruiter" && canonicalRole === USER_ROLES.APPLICANT) {
        setErrorMessage(
          "Account type mismatch: This account is registered as an Applicant. Please choose the correct account type.",
        );
        await logout();
        return;
      }

      if (
        targetRole === "admin" &&
        canonicalRole !== USER_ROLES.ADMIN &&
        canonicalRole !== USER_ROLES.SUPER_ADMIN
      ) {
        setErrorMessage(
          "Access denied: This account does not have platform administrator privileges. Please sign in with an administrator account.",
        );
        await logout();
        return;
      }

      // Route according to server-authoritative role (Sections 4, 5, 6)
      if (canonicalRole === USER_ROLES.ADMIN || canonicalRole === USER_ROLES.SUPER_ADMIN) {
        const destination =
          redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
            ? redirectPath
            : "/admin";
        navigate({ to: destination });
        return;
      }

      if (
        canonicalRole === USER_ROLES.ORG_ADMIN ||
        canonicalRole === USER_ROLES.RECRUITER ||
        canonicalRole === USER_ROLES.HIRING_MANAGER ||
        canonicalRole === USER_ROLES.INTERVIEWER
      ) {
        const destination =
          redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
            ? redirectPath
            : "/dashboard";
        navigate({ to: destination });
        return;
      }

      if (canonicalRole === USER_ROLES.APPLICANT) {
        const destination =
          redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
            ? redirectPath
            : "/applicant";
        navigate({ to: destination });
        return;
      }

      // Fallback
      const fallbackRoute = getDefaultRouteForRole(res.user.role);
      const destination =
        redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
          ? redirectPath
          : fallbackRoute;
      navigate({ to: destination });
    } else {
      setErrorMessage(res.message || "Invalid email or password.");
    }
  };

  const roleTitle =
    targetRole === "admin"
      ? "Admin Sign In"
      : targetRole === "applicant"
        ? "Applicant Sign In"
        : targetRole === "recruiter"
          ? "Recruiter Sign In"
          : "Sign In";

  const roleSubtitle =
    targetRole === "admin"
      ? "Sign in to access the TalentTrack AI administration portal."
      : targetRole === "applicant"
        ? "Sign in to access your candidate workspace, applications, and saved jobs."
        : targetRole === "recruiter"
          ? "Sign in to manage jobs, screen candidates, and track your hiring pipeline."
          : "Sign in to continue to your TalentTrack AI workspace.";

  const emailLabel =
    targetRole === "admin"
      ? "Administrator Email"
      : targetRole === "applicant"
        ? "Candidate Email"
        : "Work / Personal Email";

  const emailPlaceholder =
    targetRole === "admin"
      ? "admin@talenttrack.ai"
      : targetRole === "applicant"
        ? "candidate@example.com"
        : "name@company.com";

  const submitButtonText =
    targetRole === "admin"
      ? "Sign In to Admin Portal"
      : targetRole === "applicant"
        ? "Sign In as Applicant"
        : targetRole === "recruiter"
          ? "Sign In to Recruiter Workspace"
          : "Sign In";

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-6">
        {onChangeRole && (
          <div>
            <button
              type="button"
              onClick={onChangeRole}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
            >
              ← Change Role
            </button>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {roleTitle}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{roleSubtitle}</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes("Account type mismatch") && onChangeRole && (
              <div className="pl-6 pt-0.5">
                <button
                  type="button"
                  onClick={onChangeRole}
                  className="font-semibold text-brand-blue hover:underline cursor-pointer"
                >
                  ← Change Role
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              {emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={emailPlaceholder}
                className="h-10 w-full rounded-lg border border-input bg-card pl-9.5 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-foreground"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-[11px] font-semibold text-brand-blue hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-input bg-card pl-9.5 pr-10 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded text-brand-blue focus:ring-brand-blue/30"
              />
              <span>Remember this session for 30 days</span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs transition-transform active:scale-[0.99] gap-1.5 cursor-pointer"
          >
            {isLoading ? "Signing in..." : submitButtonText}
            <ArrowRight className="size-3.5" />
          </Button>
        </form>

        {targetRole !== "admin" ? (
          <div className="text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-brand-blue hover:underline">
              Create an account
            </Link>
          </div>
        ) : (
          <div className="text-center text-[11px] text-muted-foreground">
            Platform administrator accounts are managed via enterprise provisioning.
          </div>
        )}
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Reset Your Password</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your email address and we'll send a secure password reset link.
            </DialogDescription>
          </DialogHeader>

          {resetEmailSent ? (
            <div className="py-4 text-center text-xs text-brand-green font-semibold">
              Password reset link sent to {email || "your email address"}.
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <input
                type="email"
                placeholder="name@company.com"
                defaultValue={email}
                className="h-9 w-full rounded-md border border-input px-3 text-xs outline-none focus:border-brand-blue"
              />
              <Button
                className="w-full h-9 bg-brand-blue text-primary-foreground text-xs font-semibold"
                onClick={() => setResetEmailSent(true)}
              >
                Send Reset Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

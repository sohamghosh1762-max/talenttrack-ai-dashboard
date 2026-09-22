"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/auth/AuthProvider";

interface LoginFormProps {
  redirectPath?: string | undefined;
}

export function LoginForm({ redirectPath }: LoginFormProps) {
  const { login, switchDemoRole, isLoading } = useAuth();
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
      const destination =
        redirectPath ||
        (res.user.role === "admin"
          ? "/admin"
          : res.user.role === "recruiter"
            ? "/dashboard"
            : "/applicant");
      navigate({ to: destination });
    } else {
      setErrorMessage(res.message || "Invalid email or password.");
    }
  };

  const handleDemoLogin = async (role: "recruiter" | "applicant" | "admin") => {
    setErrorMessage("");
    await switchDemoRole(role);
    const destination =
      role === "admin" ? "/admin" : role === "recruiter" ? "/dashboard" : "/applicant";
    navigate({ to: destination });
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Sign in to continue to your TalentTrack AI workspace.
          </p>
        </div>

        {/* Demo Quick Switchers */}
        <div className="rounded-xl border border-brand-blue/20 bg-surface-blue/50 p-3.5 space-y-2">
          <div className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
            Quick One-Click Demo Access
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleDemoLogin("admin")}
              className="h-8.5 px-2 text-[11px] font-semibold justify-center bg-card hover:bg-surface-blue hover:text-brand-blue border-border"
            >
              <Shield className="size-3.5 mr-1 text-brand-purple shrink-0" />
              Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleDemoLogin("recruiter")}
              className="h-8.5 px-2 text-[11px] font-semibold justify-center bg-card hover:bg-surface-blue hover:text-brand-blue border-border"
            >
              <Briefcase className="size-3.5 mr-1 text-brand-blue shrink-0" />
              Recruiter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleDemoLogin("applicant")}
              className="h-8.5 px-2 text-[11px] font-semibold justify-center bg-card hover:bg-surface-blue hover:text-brand-blue border-border"
            >
              <UserRound className="size-3.5 mr-1 text-brand-green shrink-0" />
              Applicant
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Work / Personal Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
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
                className="text-[11px] font-semibold text-brand-blue hover:underline"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            className="w-full h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs transition-transform active:scale-[0.99] gap-1.5"
          >
            {isLoading ? "Signing in..." : "Sign In to Workspace"}
            <ArrowRight className="size-3.5" />
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-brand-blue hover:underline">
            Create an account
          </Link>
        </div>
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

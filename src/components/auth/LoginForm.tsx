import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, RotateCw } from "lucide-react";
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
import { firebaseAuthService } from "@/auth/firebase-auth-service";
import { PhoneOtpModal } from "./PhoneOtpModal";
import { authStorage } from "@/auth/auth-storage";

interface LoginFormProps {
  redirectPath?: string | undefined;
  targetRole?: "applicant" | "recruiter" | "hiring_manager" | "admin" | undefined;
  onChangeRole?: (() => void) | undefined;
}

export function LoginForm({ redirectPath, targetRole, onChangeRole }: LoginFormProps) {
  const { login, logout, setApplicantAuth, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const isLoading = isAuthLoading || isFirebaseLoading;

  const handleSuccessfulApplicantAuth = (user: any, token: string) => {
    setApplicantAuth(user, token);
    const destination =
      redirectPath && isUserAuthorizedForRoute(user.role, redirectPath)
        ? redirectPath
        : "/applicant";
    navigate({ to: destination });
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsFirebaseLoading(true);
    try {
      const { token } = await firebaseAuthService.signInWithGoogle();
      const backendUser = await firebaseAuthService.bootstrapBackend(token);
      handleSuccessfulApplicantAuth(backendUser, token);
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.mapErrorMessage(err));
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      setErrorMessage("Please enter your email address for password reset.");
      return;
    }

    try {
      if (targetRole === "applicant") {
        await firebaseAuthService.sendPasswordReset(targetEmail);
      }
      setResetEmailSent(true);
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.mapErrorMessage(err));
    }
  };

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

    // Applicant specific login: try Firebase Auth first, fallback to standard auth
    if (targetRole === "applicant") {
      setIsFirebaseLoading(true);
      try {
        const { token } = await firebaseAuthService.signInWithEmail(email, password);
        const backendUser = await firebaseAuthService.bootstrapBackend(token);
        handleSuccessfulApplicantAuth(backendUser, token);
        return;
      } catch (fbErr: any) {
        // If Firebase says wrong credentials, also try existing backend session login for legacy applicants
        const res = await login({ email, password, rememberMe });
        if (res.success && res.user) {
          const canonicalRole = normalizeRole(res.user.role);
          if (canonicalRole !== USER_ROLES.APPLICANT) {
            setErrorMessage("Account type mismatch: This account is registered as a Recruiter or Admin.");
            await logout();
            return;
          }
          const destination =
            redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
              ? redirectPath
              : "/applicant";
          navigate({ to: destination });
          return;
        } else {
          setErrorMessage(firebaseAuthService.mapErrorMessage(fbErr));
          return;
        }
      } finally {
        setIsFirebaseLoading(false);
      }
    }

    // Recruiter, Hiring Manager, and Admin login
    const res = await login({ email, password, rememberMe });
    if (res.success && res.user) {
      const canonicalRole = normalizeRole(res.user.role);

      // Account type mismatch protection
      if ((targetRole === "recruiter" || targetRole === "hiring_manager") && canonicalRole === USER_ROLES.APPLICANT) {
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

      if (canonicalRole === USER_ROLES.ADMIN || canonicalRole === USER_ROLES.SUPER_ADMIN) {
        const destination =
          redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
            ? redirectPath
            : "/admin";
        navigate({ to: destination });
        return;
      }

      if (canonicalRole === USER_ROLES.HIRING_MANAGER) {
        const destination =
          redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
            ? redirectPath
            : "/hiring-manager";
        navigate({ to: destination });
        return;
      }

      if (
        canonicalRole === USER_ROLES.ORG_ADMIN ||
        canonicalRole === USER_ROLES.RECRUITER ||
        canonicalRole === USER_ROLES.INTERVIEWER
      ) {
        const destination =
          redirectPath && isUserAuthorizedForRoute(res.user.role, redirectPath)
            ? redirectPath
            : "/dashboard";
        navigate({ to: destination });
        return;
      }

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
        : targetRole === "hiring_manager"
          ? "Hiring Manager Sign In"
          : targetRole === "recruiter"
            ? "Recruiter Sign In"
            : "Sign In";

  const roleSubtitle =
    targetRole === "admin"
      ? "Sign in to access the TalentTrack AI administration portal."
      : targetRole === "applicant"
        ? "Sign in to access your candidate workspace, applications, and saved jobs."
        : targetRole === "hiring_manager"
          ? "Sign in to review candidates, collaborate on hiring, and make team decisions."
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
        ? "Sign In with Email"
        : targetRole === "hiring_manager"
          ? "Sign In to Hiring Manager Portal"
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
          </div>
        )}

        {/* Applicant Social / Phone Auth Options */}
        {targetRole === "applicant" && (
          <div className="space-y-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full h-10 border-input bg-card hover:bg-muted font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {isFirebaseLoading ? "Connecting to Google..." : "Continue with Google"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => setPhoneModalOpen(true)}
              className="w-full h-10 border-input bg-card hover:bg-muted font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="size-4 text-brand-blue" />
              Continue with Phone
            </Button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative bg-background px-3 text-[11px] font-medium uppercase text-muted-foreground">
                or sign in with email
              </span>
            </div>
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
                onClick={() => {
                  setResetEmail(email);
                  setForgotPasswordOpen(true);
                }}
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
            {isLoading ? (
              <>
                <RotateCw className="size-3.5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                {submitButtonText}
                <ArrowRight className="size-3.5" />
              </>
            )}
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

      {/* Phone OTP Modal */}
      <PhoneOtpModal
        open={phoneModalOpen}
        onOpenChange={setPhoneModalOpen}
        onSuccess={handleSuccessfulApplicantAuth}
      />

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
              Password reset link sent to {resetEmail || email || "your email address"}.
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <input
                type="email"
                placeholder="name@company.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="h-9 w-full rounded-md border border-input px-3 text-xs outline-none focus:border-brand-blue"
              />
              <Button
                className="w-full h-9 bg-brand-blue text-primary-foreground text-xs font-semibold cursor-pointer"
                onClick={handleForgotPasswordSubmit}
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


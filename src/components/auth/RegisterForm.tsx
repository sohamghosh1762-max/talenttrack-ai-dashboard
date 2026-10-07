import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCw,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "./RoleSelector";
import { useAuth } from "@/auth/AuthProvider";
import type { UserRole } from "@/auth/auth-types";
import { getDefaultRouteForRole } from "@/auth/route-access";
import { firebaseAuthService } from "@/auth/firebase-auth-service";
import { PhoneOtpModal } from "./PhoneOtpModal";
import { authStorage } from "@/auth/auth-storage";

interface RegisterFormProps {
  initialRole?: UserRole;
  onChangeRole?: () => void;
}

export function RegisterForm({ initialRole = "recruiter", onChangeRole }: RegisterFormProps) {
  const { register, setApplicantAuth, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Recruiter specific
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  // Applicant specific
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  const isLoading = isAuthLoading || isFirebaseLoading;

  const handleSuccessfulApplicantAuth = (user: any, token: string) => {
    setApplicantAuth(user, token);
    setIsSuccess(true);
    setTimeout(() => {
      navigate({ to: "/applicant" });
    }, 800);
  };

  const handleGoogleSignUp = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if ((role === "recruiter" || role === "hiring_manager") && !companyName.trim()) {
      setErrorMessage(`Company name is required for ${role === "hiring_manager" ? "hiring managers" : "recruiters"}.`);
      return;
    }

    if (role === "applicant") {
      setIsFirebaseLoading(true);
      try {
        const { token } = await firebaseAuthService.signUpWithEmail(email, password, name);
        const backendUser = await firebaseAuthService.bootstrapBackend(token);
        handleSuccessfulApplicantAuth(backendUser, token);
        return;
      } catch (fbErr: any) {
        setErrorMessage(firebaseAuthService.mapErrorMessage(fbErr));
        return;
      } finally {
        setIsFirebaseLoading(false);
      }
    }

    // Recruiter / Hiring Manager registration
    const res = await register({
      name,
      email,
      password,
      confirmPassword,
      role,
      companyName,
      department: companyName, // Map organization to department
      jobTitle,
      headline,
      location,
    });

    if (res.success && res.user) {
      setIsSuccess(true);
      setTimeout(() => {
        const dest = getDefaultRouteForRole(res.user?.role || role);
        navigate({ to: dest });
      }, 1000);
    } else {
      setErrorMessage(res.message || "Failed to create account.");
    }
  };

  return (
    <>
      <div className="w-full max-w-lg mx-auto space-y-5">
      {onChangeRole && (
        <div>
          <button
            type="button"
            onClick={onChangeRole}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
          >
            ← Choose a different account type
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Create your{" "}
          {role === "recruiter"
            ? "Recruiter"
            : role === "hiring_manager"
              ? "Hiring Manager"
              : "Applicant"}{" "}
          account
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {role === "recruiter"
            ? "Create job postings, screen resumes with AI, and manage candidate pipelines."
            : role === "hiring_manager"
              ? "Review candidates, collaborate with recruiters, and make team hiring decisions."
              : "Discover career opportunities, apply for roles, and track applications in real-time."}
        </p>
      </div>

      {/* Role Selection Selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-foreground">Select Account Type</label>
        <RoleSelector value={role} onChange={setRole} />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Alert */}
      {isSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-green/20 bg-surface-green p-3 text-xs text-brand-green animate-in zoom-in-95">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Account created successfully! Redirecting to workspace...</span>
        </div>
      )}

      {/* Applicant Social / Phone Auth Options */}
      {role === "applicant" && (
        <div className="space-y-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || isSuccess}
            onClick={handleGoogleSignUp}
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
            {isFirebaseLoading ? "Connecting to Google..." : "Sign up with Google"}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isLoading || isSuccess}
            onClick={() => setPhoneModalOpen(true)}
            className="w-full h-10 border-input bg-card hover:bg-muted font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="size-4 text-brand-blue" />
            Sign up with Phone
          </Button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-background px-3 text-[11px] font-medium uppercase text-muted-foreground">
              or register with email
            </span>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold text-foreground mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Mehta"
                className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-foreground mb-1">
              {role === "applicant" ? "Email Address" : "Work Email"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "applicant" ? "name@gmail.com" : "name@company.com"}
                className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Role Fields */}
        {role === "recruiter" || role === "hiring_manager" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in-50 duration-200">
            <div>
              <label
                htmlFor="reg-company"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                {role === "hiring_manager" ? "Company / Org" : "Company Name"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-company"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-jobtitle"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                {role === "hiring_manager" ? "Department / Team" : "Your Title"}
              </label>
              <input
                id="reg-jobtitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={
                  role === "hiring_manager"
                    ? "e.g. Engineering Lead, Product Director"
                    : "e.g. Talent Lead, HR Manager"
                }
                className="h-9.5 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in-50 duration-200">
            <div>
              <label
                htmlFor="reg-headline"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Professional Headline
              </label>
              <input
                id="reg-headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="h-9.5 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label
                htmlFor="reg-location"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Jose, CA / Remote"
                  className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Password (min 8 chars) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-10 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-confirmpass"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="reg-confirmpass"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || isSuccess}
          className="w-full h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs transition-transform active:scale-[0.99] gap-1.5 mt-2"
        >
          {isLoading ? (
            "Creating account..."
          ) : (
            <>
              <Sparkles className="size-3.5" />
              Create{" "}
              {role === "recruiter"
                ? "Recruiter"
                : role === "hiring_manager"
                  ? "Hiring Manager"
                  : "Applicant"}{" "}
              Account
              <ArrowRight className="size-3.5" />
            </>
          )}
        </Button>
      </form>

        <div className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-brand-blue hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      <PhoneOtpModal
        open={phoneModalOpen}
        onOpenChange={setPhoneModalOpen}
        onSuccess={handleSuccessfulApplicantAuth}
      />
    </>
  );
}

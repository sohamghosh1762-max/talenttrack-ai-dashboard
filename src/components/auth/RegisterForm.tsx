"use client";

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
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "./RoleSelector";
import { useAuth } from "@/auth/AuthProvider";
import type { UserRole } from "@/auth/auth-types";

interface RegisterFormProps {
  initialRole?: UserRole;
}

export function RegisterForm({ initialRole = "recruiter" }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
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

    if (role === "recruiter" && !companyName.trim()) {
      setErrorMessage("Company name is required for recruiters.");
      return;
    }

    const res = await register({
      name,
      email,
      password,
      confirmPassword,
      role,
      companyName,
      jobTitle,
      headline,
      location,
    });

    if (res.success && res.user) {
      setIsSuccess(true);
      setTimeout(() => {
        const dest = role === "recruiter" ? "/dashboard" : "/applicant";
        navigate({ to: dest });
      }, 1000);
    } else {
      setErrorMessage(res.message || "Failed to create account.");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Join TalentTrack AI to experience smarter candidate screening.
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
              {role === "recruiter" ? "Work Email" : "Email Address"}{" "}
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
                placeholder={role === "recruiter" ? "name@company.com" : "name@gmail.com"}
                className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Role Fields */}
        {role === "recruiter" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in-50 duration-200">
            <div>
              <label
                htmlFor="reg-company"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Company Name <span className="text-destructive">*</span>
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
                Your Title
              </label>
              <input
                id="reg-jobtitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Talent Lead, HR Manager"
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
              Create {role === "recruiter" ? "Recruiter" : "Job Seeker"} Account
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
  );
}

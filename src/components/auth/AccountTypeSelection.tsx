"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type AccountType = "applicant" | "recruiter";
export type AuthMode = "login" | "signup";

interface AccountTypeSelectionProps {
  mode?: AuthMode;
  onSelectRole?: (role: AccountType) => void;
  redirectPath?: string | undefined;
}

export function AccountTypeSelection({
  mode = "login",
  onSelectRole,
  redirectPath,
}: AccountTypeSelectionProps) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<AccountType>("applicant");

  const handleProceed = (roleToUse?: AccountType) => {
    const finalRole = roleToUse || selectedRole;
    if (onSelectRole) {
      onSelectRole(finalRole);
      return;
    }

    if (mode === "signup") {
      navigate({
        to: "/register",
        search: {
          role: finalRole,
          step: "form",
        } as Record<string, string>,
      });
    } else {
      navigate({
        to: "/login",
        search: {
          role: finalRole,
          step: "form",
          ...(redirectPath ? { redirect: redirectPath } : {}),
        } as Record<string, string>,
      });
    }
  };

  const handleCardClick = (role: AccountType) => {
    setSelectedRole(role);
    handleProceed(role);
  };

  const handleKeyDown = (e: React.KeyboardEvent, role: AccountType) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedRole(role);
      handleProceed(role);
    }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_1.15fr] selection:bg-brand-blue/20">
      {/* Left Branding & Promotional Visual Panel (Desktop) */}
      <div className="sidebar-gradient hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white relative overflow-hidden">
        {/* Subtle Decorative Ambient Background Glows */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="relative grid size-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/15 shadow-inner">
              <Users className="size-5.5 text-sky-400" />
              <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-sky-300 animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">
                TalentTrack <span className="text-sky-400">AI</span>
              </span>
              <span className="text-[10px] tracking-wide text-white/70 block uppercase font-medium">
                Smarter Hiring. Brighter Teams.
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Center Hero Marketing Message */}
        <div className="relative z-10 max-w-lg space-y-7 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-300 backdrop-blur-sm">
            <Brain className="size-4 text-sky-400 shrink-0" />
            <span>Intelligent Recruitment & Career Platform</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white">
              Build Your Career. <br />
              <span className="bg-gradient-to-r from-sky-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                Discover Better Talent.
              </span>
            </h1>
            <p className="text-sm text-white/80 leading-relaxed font-normal">
              An intelligent recruitment platform connecting talent with meaningful opportunities
              through semantic AI matching and streamlined hiring pipelines.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-sky-300 font-semibold text-xs">
                <GraduationCap className="size-4" />
                <span>For Candidates</span>
              </div>
              <p className="text-[11px] text-white/70 leading-normal">
                AI resume analysis, instant skill matching, and real-time application status.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                <BriefcaseBusiness className="size-4" />
                <span>For Employers</span>
              </div>
              <p className="text-[11px] text-white/70 leading-normal">
                Structured hiring workflows, automated applicant scoring, and candidate Kanban.
              </p>
            </div>
          </div>

          {/* Social Proof / Stats Pill */}
          <div className="flex items-center gap-4 pt-1 text-xs text-white/75 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Semantic AI Scoring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-sky-400" />
              <span>5-Stage Kanban Board</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-purple-400" />
              <span>Role Security</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Text */}
        <div className="relative z-10 text-[11px] text-white/60 flex items-center justify-between">
          <span>© 2026 TalentTrack AI • Enterprise Applicant Tracking</span>
          <span className="text-white/40">Secure Role-Based Access</span>
        </div>
      </div>

      {/* Right Account Selection Container */}
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-card min-h-screen overflow-y-auto">
        {/* Mobile Header Nav */}
        <div className="flex items-center justify-between pb-6 lg:hidden border-b border-border/60">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
              <Users className="size-4.5" />
            </div>
            <span className="text-base font-bold text-foreground">TalentTrack AI</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="size-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="w-full max-w-lg mx-auto my-auto py-4 space-y-7">
          {/* Back Action for Desktop */}
          <div className="hidden lg:flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors group"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Home</span>
            </Link>

            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Step 1 of 2 • Account Type
            </span>
          </div>

          {/* Section Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-surface-blue px-2.5 py-1 text-[11px] font-bold text-brand-blue uppercase tracking-wider">
              {mode === "signup" ? "Create New Account" : "Welcome Back"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Choose your account type
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tell us how you'll use TalentTrack AI to personalize your workspace.
            </p>
          </div>

          {/* Interactive Account Type Cards */}
          <div
            className="space-y-3.5"
            role="radiogroup"
            aria-label="Choose your TalentTrack AI account type"
          >
            {/* 1. Applicant Card */}
            <div
              role="radio"
              tabIndex={0}
              aria-checked={selectedRole === "applicant"}
              aria-labelledby="applicant-card-title"
              aria-describedby="applicant-card-desc"
              onClick={() => handleCardClick("applicant")}
              onKeyDown={(e) => handleKeyDown(e, "applicant")}
              className={`group relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
                selectedRole === "applicant"
                  ? "border-brand-blue bg-surface-blue/50 shadow-md ring-1 ring-brand-blue/30"
                  : "border-border bg-card hover:border-brand-blue/40 hover:bg-muted/30 shadow-xs"
              }`}
            >
              {/* Icon Container */}
              <div
                className={`grid size-12 place-items-center rounded-xl shrink-0 transition-colors duration-200 ${
                  selectedRole === "applicant"
                    ? "bg-brand-blue text-primary-foreground shadow-sm ring-2 ring-brand-blue/20"
                    : "bg-surface-blue text-brand-blue group-hover:bg-brand-blue group-hover:text-primary-foreground"
                }`}
              >
                <UserRound className="size-6" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <h3
                    id="applicant-card-title"
                    className={`text-base font-bold tracking-tight ${
                      selectedRole === "applicant" ? "text-brand-blue" : "text-foreground"
                    }`}
                  >
                    I'm an Applicant
                  </h3>
                  <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Candidate
                  </span>
                </div>
                <p
                  id="applicant-card-desc"
                  className="mt-1 text-xs text-muted-foreground leading-relaxed font-normal"
                >
                  Discover opportunities, apply for jobs, and track your applications.
                </p>
              </div>

              {/* Radio Indicator */}
              <div className="absolute top-5 right-5 flex items-center justify-center">
                <div
                  className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedRole === "applicant"
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-muted-foreground/40 group-hover:border-brand-blue"
                  }`}
                >
                  {selectedRole === "applicant" && <div className="size-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            {/* 2. Recruiter Card */}
            <div
              role="radio"
              tabIndex={0}
              aria-checked={selectedRole === "recruiter"}
              aria-labelledby="recruiter-card-title"
              aria-describedby="recruiter-card-desc"
              onClick={() => handleCardClick("recruiter")}
              onKeyDown={(e) => handleKeyDown(e, "recruiter")}
              className={`group relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
                selectedRole === "recruiter"
                  ? "border-brand-blue bg-surface-blue/50 shadow-md ring-1 ring-brand-blue/30"
                  : "border-border bg-card hover:border-brand-blue/40 hover:bg-muted/30 shadow-xs"
              }`}
            >
              {/* Icon Container */}
              <div
                className={`grid size-12 place-items-center rounded-xl shrink-0 transition-colors duration-200 ${
                  selectedRole === "recruiter"
                    ? "bg-brand-blue text-primary-foreground shadow-sm ring-2 ring-brand-blue/20"
                    : "bg-surface-blue text-brand-blue group-hover:bg-brand-blue group-hover:text-primary-foreground"
                }`}
              >
                <BriefcaseBusiness className="size-6" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <h3
                    id="recruiter-card-title"
                    className={`text-base font-bold tracking-tight ${
                      selectedRole === "recruiter" ? "text-brand-blue" : "text-foreground"
                    }`}
                  >
                    I'm a Recruiter
                  </h3>
                  <span className="inline-flex items-center rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                    Employer
                  </span>
                </div>
                <p
                  id="recruiter-card-desc"
                  className="mt-1 text-xs text-muted-foreground leading-relaxed font-normal"
                >
                  Create jobs, discover talent, manage candidates, and build your recruitment
                  pipeline.
                </p>
              </div>

              {/* Radio Indicator */}
              <div className="absolute top-5 right-5 flex items-center justify-center">
                <div
                  className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedRole === "recruiter"
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-muted-foreground/40 group-hover:border-brand-blue"
                  }`}
                >
                  {selectedRole === "recruiter" && <div className="size-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 space-y-3">
            <Button
              type="button"
              onClick={() => handleProceed()}
              className="w-full h-11 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm gap-2 active:scale-[0.99]"
            >
              <span>Continue as {selectedRole === "applicant" ? "Applicant" : "Recruiter"}</span>
              <ArrowRight className="size-4" />
            </Button>

            {/* Toggle Mode Switcher */}
            <div className="text-center text-xs text-muted-foreground pt-1 space-y-1.5">
              <div>
                {mode === "login" ? (
                  <>
                    Don't have an account yet?{" "}
                    <Link
                      to="/register"
                      className="font-bold text-brand-blue hover:underline focus:outline-none focus:ring-1 focus:ring-brand-blue rounded"
                    >
                      Sign up
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-bold text-brand-blue hover:underline focus:outline-none focus:ring-1 focus:ring-brand-blue rounded"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>

              <div>
                <Link
                  to="/login"
                  search={
                    {
                      role: "admin",
                      step: "form",
                      ...(redirectPath ? { redirect: redirectPath } : {}),
                    } as Record<string, string>
                  }
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Platform Administrator? Sign in with Admin credentials
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Terms & Privacy Legal Notices */}
        <div className="w-full max-w-lg mx-auto pt-6 text-center text-[11px] text-muted-foreground border-t border-border/50">
          By continuing, you agree to our{" "}
          <Link to="/" className="underline hover:text-foreground font-medium">
            Terms of Service
          </Link>{" "}
          and acknowledge our{" "}
          <Link to="/" className="underline hover:text-foreground font-medium">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

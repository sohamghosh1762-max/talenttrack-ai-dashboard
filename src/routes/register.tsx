"use client";

import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Brain, CheckCircle2, Sparkles, Users } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AccountTypeSelection, type AccountType } from "@/components/auth/AccountTypeSelection";
import type { UserRole } from "@/auth/auth-types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — TalentTrack AI" },
      {
        name: "description",
        content: "Register for a Recruiter or Applicant account on TalentTrack AI.",
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    role?: UserRole | undefined;
    step?: "select" | "form" | undefined;
  } => {
    const r = search["role"];
    const s = search["step"];
    return {
      role:
        r === "applicant" || r === "recruiter" || r === "hiring_manager"
          ? (r as UserRole)
          : undefined,
      step: s === "select" || s === "form" ? s : undefined,
    };
  },
  component: RegisterPage,
});

function RegisterPage() {
  const search = useSearch({ from: "/register" });
  const navigate = useNavigate();

  // If no account type role is chosen yet, show the Account Type Selection screen first
  if (!search.role || search.step === "select") {
    return (
      <AccountTypeSelection
        mode="signup"
        onSelectRole={(role: AccountType) =>
          navigate({
            to: "/register",
            search: {
              role,
              step: "form",
            } as Record<string, string>,
          })
        }
      />
    );
  }

  const roleLabel =
    search.role === "applicant"
      ? "Applicant Registration"
      : search.role === "hiring_manager"
        ? "Hiring Manager Registration"
        : "Employer & Recruiter Registration";

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_1.25fr]">
      {/* Left Branding Panel (Desktop) */}
      <div className="sidebar-gradient hidden lg:flex flex-col justify-between p-10 xl:p-12 text-white relative overflow-hidden">
        {/* Decorative Glows */}
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 size-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative grid size-9 place-items-center rounded-lg bg-white/10 text-white">
              <Users className="size-5 text-sky-400" />
              <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-sky-300" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">
                TalentTrack AI
              </span>
              <span className="text-[10px] text-white/70 block">
                Smarter Hiring. Brighter Teams.
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/register",
                search: { step: "select" } as Record<string, string>,
              })
            }
            className="inline-flex items-center gap-1.5 text-xs text-white/75 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
          >
            <ArrowLeft className="size-3.5" />
            <span>Change Role</span>
          </button>
        </div>

        <div className="relative z-10 max-w-md space-y-6 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <Brain className="size-3.5 text-sky-400" />
            <span>{roleLabel}</span>
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-white">
            {search.role === "applicant"
              ? "Discover opportunities and track your career applications."
              : "Whether you're hiring top talent or building a modern recruitment pipeline."}
          </h2>

          <div className="space-y-3 pt-2 text-xs text-white/90">
            {search.role === "applicant" ? (
              <>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>
                    Applicants: Track applications, manage profile, receive interview invites
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>AI resume analysis and instant skill match score preview</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Fast 30-second candidate registration with instant role setup</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Recruiters: Post roles, score resumes, advance candidate pipelines</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Structured organization setup and multi-stage Kanban workflows</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Automated AI resume screening and semantic qualification ranking</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-white/70">
          © 2026 TalentTrack AI • Enterprise Applicant Tracking
        </div>
      </div>

      {/* Right Registration Form Container */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 bg-card overflow-y-auto">
        {/* Mobile Header Logo */}
        <div className="mb-6 lg:hidden flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
              <Users className="size-5" />
            </div>
            <span className="text-base font-bold text-foreground">TalentTrack AI</span>
          </Link>

          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/register",
                search: { step: "select" } as Record<string, string>,
              })
            }
            className="inline-flex items-center gap-1 text-xs text-brand-blue font-semibold"
          >
            <ArrowLeft className="size-3.5" />
            <span>Change</span>
          </button>
        </div>

        <RegisterForm
          initialRole={search.role}
          onChangeRole={() =>
            navigate({
              to: "/register",
              search: { step: "select" } as Record<string, string>,
            })
          }
        />
      </div>
    </div>
  );
}

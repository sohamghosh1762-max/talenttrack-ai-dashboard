"use client";

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Brain, CheckCircle2, Sparkles, Users } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import type { UserRole } from "@/auth/auth-types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — TalentTrack AI" },
      {
        name: "description",
        content: "Register for a Recruiter or Job Seeker account on TalentTrack AI.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { role?: UserRole } => {
    return {
      role: search.role === "applicant" || search.role === "recruiter" ? search.role : undefined,
    };
  },
  component: RegisterPage,
});

function RegisterPage() {
  const search = useSearch({ from: "/register" });

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_1.25fr]">
      {/* Left Branding Panel (Desktop) */}
      <div className="sidebar-gradient hidden lg:flex flex-col justify-between p-10 text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative grid size-9 place-items-center rounded-lg bg-sidebar-soft/60 text-sidebar-primary-foreground">
            <Users className="size-5 text-brand-blue" />
            <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-brand-blue" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-sidebar-primary-foreground block">
              TalentTrack AI
            </span>
            <span className="text-[10px] text-sidebar-foreground/70 block">
              Smarter Hiring. Brighter Teams.
            </span>
          </div>
        </Link>

        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border/40 bg-sidebar-soft/50 px-3 py-1 text-xs font-semibold text-brand-blue">
            <Brain className="size-3.5" />
            Next-Gen Hiring Experience
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-sidebar-primary-foreground">
            Whether you're hiring top talent or landing your dream job.
          </h2>

          <div className="space-y-3 pt-2 text-xs text-sidebar-foreground/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-green shrink-0" />
              <span>Recruiters: Post roles, score resumes, advance candidate pipelines</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-green shrink-0" />
              <span>
                Job Seekers: Track applications, manage profile, receive interview invites
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-green shrink-0" />
              <span>Fast 30-second registration with instant role setup</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-sidebar-foreground/60">
          © 2026 TalentTrack AI • Enterprise Applicant Tracking
        </div>
      </div>

      {/* Right Registration Form Container */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 bg-card overflow-y-auto">
        {/* Mobile Header Logo */}
        <div className="mb-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
              <Users className="size-5" />
            </div>
            <span className="text-base font-bold text-foreground">TalentTrack AI</span>
          </Link>
        </div>

        <RegisterForm initialRole={search.role || "recruiter"} />
      </div>
    </div>
  );
}

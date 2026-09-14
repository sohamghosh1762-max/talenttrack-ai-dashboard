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
      <div className="sidebar-gradient hidden lg:flex flex-col justify-between p-10 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative grid size-9 place-items-center rounded-lg bg-white/10 text-white">
            <Users className="size-5 text-sky-400" />
            <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-sky-300" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">
              TalentTrack AI
            </span>
            <span className="text-[10px] text-white/70 block">Smarter Hiring. Brighter Teams.</span>
          </div>
        </Link>

        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <Brain className="size-3.5 text-sky-400" />
            Next-Gen Hiring Experience
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-white">
            Whether you're hiring top talent or landing your dream job.
          </h2>

          <div className="space-y-3 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Recruiters: Post roles, score resumes, advance candidate pipelines</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>
                Job Seekers: Track applications, manage profile, receive interview invites
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Fast 30-second registration with instant role setup</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-white/70">
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

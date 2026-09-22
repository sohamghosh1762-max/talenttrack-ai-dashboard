"use client";

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Brain, CheckCircle2, Sparkles, Users } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — TalentTrack AI" },
      { name: "description", content: "Sign in to your TalentTrack AI workspace." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => {
    const r = search["redirect"];
    return {
      redirect: typeof r === "string" ? r : undefined,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const search = useSearch({ from: "/login" });

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_1fr]">
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
            AI-Assisted Candidate Intelligence
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-white">
            Transform recruitment into a structured, data-driven workflow.
          </h2>

          <div className="space-y-3 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Semantic resume matching against job technical criteria</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Interactive 5-stage Kanban hiring pipeline board</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Dedicated portal for candidate applications and job search</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-white/70">
          © 2026 TalentTrack AI • Enterprise Applicant Tracking
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-card">
        {/* Mobile Header Logo */}
        <div className="mb-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
              <Users className="size-5" />
            </div>
            <span className="text-base font-bold text-foreground">TalentTrack AI</span>
          </Link>
        </div>

        <LoginForm redirectPath={search.redirect} />
      </div>
    </div>
  );
}

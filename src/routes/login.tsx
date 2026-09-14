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
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const search = useSearch({ from: "/login" });

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_1fr]">
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
            AI-Assisted Candidate Intelligence
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-sidebar-primary-foreground">
            Transform recruitment into a structured, data-driven workflow.
          </h2>

          <div className="space-y-3 pt-2 text-xs text-sidebar-foreground/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-green shrink-0" />
              <span>Semantic resume matching against job technical criteria</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-green shrink-0" />
              <span>Interactive 5-stage Kanban hiring pipeline board</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-green shrink-0" />
              <span>Dedicated portal for candidate applications and job search</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-sidebar-foreground/60">
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

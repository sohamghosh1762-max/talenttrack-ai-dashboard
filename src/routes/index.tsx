"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  CheckCircle2,
  FileCheck,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentTrack AI — AI-Powered ATS for Smarter Hiring" },
      {
        name: "description",
        content:
          "AI-powered applicant tracking system supporting faster, more consistent candidate screening and pipeline management.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-brand-blue selection:text-white">
      {/* 1. Public Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative grid size-9 place-items-center rounded-lg bg-surface-blue text-brand-blue">
              <Users className="size-5.5" />
              <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-brand-blue" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground block leading-tight">
                TalentTrack AI
              </span>
              <span className="text-[9.5px] text-muted-foreground block">
                Smarter Hiring. Brighter Teams.
              </span>
            </div>
          </Link>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-muted-foreground">
            <Link
              to="/"
              className="text-foreground font-semibold hover:text-brand-blue transition-colors"
            >
              Home
            </Link>
            <a href="#features" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#for-employers" className="hover:text-foreground transition-colors">
              For Employers
            </a>
            <a href="#candidates" className="hover:text-foreground transition-colors">
              For Candidates
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <Button
                size="sm"
                className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
                onClick={() =>
                  navigate({
                    to: user.role === "recruiter" ? "/dashboard" : "/applicant",
                  })
                }
              >
                Go to Workspace ({user.name.split(" ")[0]})
                <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold shadow-xs"
                >
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-blue/80 via-transparent to-transparent -z-10" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-surface-blue px-3.5 py-1 text-xs font-semibold text-brand-blue shadow-2xs">
            <Sparkles className="size-3.5" />
            Next-Generation AI Applicant Tracking System
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl sm:leading-[1.15] max-w-4xl mx-auto">
            Smarter candidate matching. <br className="hidden sm:inline" />
            <span className="text-brand-blue">Faster, collaborative hiring.</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground sm:text-base leading-relaxed">
            TalentTrack AI combines intelligent resume analysis, skill extraction, and structured
            pipeline management to help recruitment teams screen candidates faster and more
            consistently.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto h-11 px-7 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs shadow-md"
            >
              <Link to="/register">
                <Briefcase className="size-4 mr-2" />
                Find a Job
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full sm:w-auto h-11 px-7 border-border hover:bg-surface-blue hover:border-brand-blue/30 font-semibold text-xs"
            >
              <Link to="/login">
                <Users className="size-4 mr-2 text-brand-blue" />
                I'm a Recruiter
              </Link>
            </Button>
          </div>

          {/* Social Proof / Stats */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-border/60">
            <div>
              <strong className="block text-2xl font-extrabold text-foreground">90%+</strong>
              <span className="text-[11px] text-muted-foreground">Skill Extraction Match</span>
            </div>
            <div>
              <strong className="block text-2xl font-extrabold text-foreground">3.4x</strong>
              <span className="text-[11px] text-muted-foreground">Faster Screening Velocity</span>
            </div>
            <div>
              <strong className="block text-2xl font-extrabold text-foreground">5-Stage</strong>
              <span className="text-[11px] text-muted-foreground">Structured Pipeline Board</span>
            </div>
            <div>
              <strong className="block text-2xl font-extrabold text-foreground">100%</strong>
              <span className="text-[11px] text-muted-foreground">Human-in-the-Loop Decisions</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Section */}
      <section id="features" className="py-16 bg-muted/30 border-y border-border/70">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              Engineered for Modern Talent Teams
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Streamline every step of the talent acquisition lifecycle with responsible AI
              assistance.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="dashboard-card p-6 space-y-3 bg-card">
              <div className="grid size-11 place-items-center rounded-xl bg-surface-blue text-brand-blue">
                <Brain className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">AI-Powered Skill Extraction</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically extract technical competencies, frameworks, and domain experience from
                uploaded resumes for instant comparison against job specifications.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="dashboard-card p-6 space-y-3 bg-card">
              <div className="grid size-11 place-items-center rounded-xl bg-surface-green text-brand-green">
                <Sparkles className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Semantic Match Scoring</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Receive semantic similarity rankings (90%+, 70-89%) to prioritize candidate reviews
                while ensuring recruiter oversight remains central.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="dashboard-card p-6 space-y-3 bg-card">
              <div className="grid size-11 place-items-center rounded-xl bg-surface-purple text-brand-purple">
                <BarChart3 className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Visual Pipeline Stages</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Track candidate progression seamlessly across Applied, Screening, Interview,
                Offered, and Rejected stages on an interactive Kanban board.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="dashboard-card p-6 space-y-3 bg-card">
              <div className="grid size-11 place-items-center rounded-xl bg-surface-peach text-brand-orange">
                <Bot className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Actionable Hiring Insights</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get real-time decision-support suggestions highlighting top candidates, surge
                applications, and pipeline velocity bottlenecks.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="dashboard-card p-6 space-y-3 bg-card">
              <div className="grid size-11 place-items-center rounded-xl bg-surface-blue text-brand-blue">
                <Search className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Centralized Talent Pool</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quickly search and filter past applicants by skills, experience range, and previous
                evaluation notes to source talent for new openings.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="dashboard-card p-6 space-y-3 bg-card">
              <div className="grid size-11 place-items-center rounded-xl bg-surface-pink text-brand-red">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Role-Based Data Privacy</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Strict separation of Recruiter workspace management and Candidate portal profiles
                for enterprise data governance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. For Employers vs For Candidates */}
      <section id="for-employers" className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                For Recruitment Teams
              </span>
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                Close roles faster with automated candidate ranking
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm leading-relaxed">
                Spend less time manually reading through hundreds of mismatched resumes and more
                time interviewing qualified finalists.
              </p>
              <ul className="space-y-2 text-xs text-foreground/90 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green shrink-0" />
                  Instant skill match scoring and candidate comparison
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green shrink-0" />
                  Multi-member hiring team reviews & interview tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green shrink-0" />
                  Visual candidate pipeline with stage progression
                </li>
              </ul>
              <div className="pt-2">
                <Button
                  asChild
                  className="bg-brand-blue hover:bg-brand-blue/90 text-xs font-semibold"
                >
                  <Link to="/register">Create Recruiter Account</Link>
                </Button>
              </div>
            </div>

            <div className="dashboard-card p-5 bg-card space-y-3 border-brand-blue/20">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold text-foreground">
                  Live Candidate Screening Preview
                </span>
                <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green">
                  92% Match
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-blue text-primary-foreground font-bold grid place-items-center text-xs">
                  AM
                </div>
                <div>
                  <strong className="block text-xs">Aarav Mehta</strong>
                  <span className="text-[11px] text-muted-foreground">
                    Frontend Developer • 4 yrs exp
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {["React", "TypeScript", "Next.js", "Tailwind CSS"].map((s) => (
                  <span
                    key={s}
                    className="rounded bg-surface-blue px-2 py-0.5 text-[10px] text-brand-blue font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="mt-auto border-t border-border bg-card py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-brand-blue" />
            <span className="text-xs font-bold text-foreground">TalentTrack AI</span>
            <span className="text-[11px] text-muted-foreground">
              — Smarter Hiring. Brighter Teams.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">
              Recruiter Login
            </Link>
            <Link to="/register" className="hover:text-foreground">
              Candidate Sign Up
            </Link>
            <span>© 2026 TalentTrack AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

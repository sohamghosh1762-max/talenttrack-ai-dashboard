"use client";

import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Brain, CheckCircle2, Sparkles, Users } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AccountTypeSelection, type AccountType } from "@/components/auth/AccountTypeSelection";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — TalentTrack AI" },
      { name: "description", content: "Sign in to your TalentTrack AI workspace." },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    redirect?: string | undefined;
    role?: "applicant" | "recruiter" | "admin" | undefined;
    intent?: "applicant" | "recruiter" | "admin" | undefined;
    step?: "select" | "form" | undefined;
  } => {
    const r = search["role"];
    const i = search["intent"];
    const s = search["step"];
    const redirect = search["redirect"];
    const parsedRole = r === "applicant" || r === "recruiter" || r === "admin" ? r : undefined;
    const parsedIntent = i === "applicant" || i === "recruiter" || i === "admin" ? i : undefined;
    return {
      redirect: typeof redirect === "string" ? redirect : undefined,
      role: parsedRole,
      intent: parsedIntent,
      step: s === "select" || s === "form" ? s : undefined,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const search = useSearch({ from: "/login" });
  const navigate = useNavigate();

  // Determine effective target role and auth intent (route-aware)
  // Administrative redirect takes absolute top priority over any previously selected role
  const isRedirectAdmin = Boolean(search.redirect?.startsWith("/admin"));
  const isRedirectApplicant = Boolean(search.redirect?.startsWith("/applicant"));
  const isRedirectRecruiter = Boolean(
    search.redirect?.startsWith("/dashboard") ||
      search.redirect?.startsWith("/pipeline") ||
      search.redirect?.startsWith("/candidates") ||
      search.redirect?.startsWith("/jobs") ||
      search.redirect?.startsWith("/ai-screening") ||
      search.redirect?.startsWith("/messages") ||
      search.redirect?.startsWith("/reports") ||
      search.redirect?.startsWith("/interviews"),
  );

  const authIntent: "applicant" | "recruiter" | "admin" | undefined = isRedirectAdmin
    ? "admin"
    : isRedirectApplicant
      ? "applicant"
      : isRedirectRecruiter
        ? "recruiter"
        : search.role || search.intent;

  // If user explicitly requests account selection or if neither role, intent nor redirect is specified:
  const shouldShowAccountTypeSelection =
    search.step === "select" || (!authIntent && !search.redirect);

  if (shouldShowAccountTypeSelection) {
    return (
      <AccountTypeSelection
        mode="login"
        redirectPath={search.redirect}
        onSelectRole={(role: AccountType) =>
          navigate({
            to: "/login",
            search: {
              role,
              intent: role,
              step: "form",
              ...(search.redirect ? { redirect: search.redirect } : {}),
            } as Record<string, string>,
          })
        }
      />
    );
  }

  const roleLabel =
    authIntent === "admin"
      ? "Admin Portal"
      : authIntent === "applicant"
        ? "Applicant Portal"
        : "Recruiter Workspace";

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_1fr]">
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

          {authIntent !== "admin" ? (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/login",
                  search: {
                    step: "select",
                    ...(search.redirect ? { redirect: search.redirect } : {}),
                  } as Record<string, string>,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs text-white/75 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Change Role</span>
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-white/75 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          )}
        </div>

        <div className="relative z-10 max-w-md space-y-6 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <Brain className="size-3.5 text-sky-400" />
            <span>{roleLabel}</span>
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-white">
            {authIntent === "admin"
              ? "Enterprise platform administration and tenant governance."
              : authIntent === "applicant"
                ? "Access your job applications and explore AI-matched roles."
                : "Transform recruitment into a structured, data-driven workflow."}
          </h2>

          <div className="space-y-3 pt-2 text-xs text-white/90">
            {authIntent === "admin" ? (
              <>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Multi-tenant enterprise organization and seat management</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Full platform user auditing, role-based access & permissions</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Compliance logging, system health & operational analytics</span>
                </div>
              </>
            ) : authIntent === "applicant" ? (
              <>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Personalized candidate profile and resume management</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Real-time status tracking for every submitted application</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Semantic AI role matching tailored to your core technical skills</span>
                </div>
              </>
            ) : (
              <>
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
                  <span>Automated AI candidate scoring & qualification ranker</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-white/70">
          © 2026 TalentTrack AI • Enterprise Applicant Tracking
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-card">
        {/* Mobile Header Logo */}
        <div className="mb-6 lg:hidden flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
              <Users className="size-5" />
            </div>
            <span className="text-base font-bold text-foreground">TalentTrack AI</span>
          </Link>

          {authIntent !== "admin" ? (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/login",
                  search: {
                    step: "select",
                    ...(search.redirect ? { redirect: search.redirect } : {}),
                  } as Record<string, string>,
                })
              }
              className="inline-flex items-center gap-1 text-xs text-brand-blue font-semibold cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Change Role</span>
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-brand-blue font-semibold"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          )}
        </div>

        <LoginForm
          redirectPath={search.redirect}
          targetRole={authIntent}
          onChangeRole={
            authIntent !== "admin"
              ? () => {
                  void navigate({
                    to: "/login",
                    search: {
                      step: "select",
                      ...(search.redirect ? { redirect: search.redirect } : {}),
                    } as Record<string, string>,
                  });
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

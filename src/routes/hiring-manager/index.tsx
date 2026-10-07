"use client";

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  HelpCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/auth/AuthProvider";
import { useHiringManagerDashboard } from "@/hooks/api/useHiringManager";
import { FeedbackModal } from "@/components/hiring-manager/FeedbackModal";
import { DecisionModal } from "@/components/hiring-manager/DecisionModal";

export const Route = createFileRoute("/hiring-manager/")({
  head: () => ({
    meta: [
      { title: "Hiring Manager Dashboard — TalentTrack AI" },
      {
        name: "description",
        content: "Review candidates, track hiring progress, and make informed hiring decisions.",
      },
    ],
  }),
  component: HiringManagerDashboardPage,
});

function HiringManagerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useHiringManagerDashboard();

  // Modal states for quick feedback/decision from dashboard
  const [feedbackCandidate, setFeedbackCandidate] = useState<{
    id: string;
    name: string;
    jobTitle: string;
  } | null>(null);

  const [decisionCandidate, setDecisionCandidate] = useState<{
    id: string;
    name: string;
    jobTitle: string;
    type: "APPROVED" | "REJECTED";
  } | null>(null);

  const managerName = data?.manager?.name || user?.name || "Hiring Manager";
  const metrics = data?.metrics || {
    openPositions: 0,
    candidatesToReview: 0,
    shortlistedCandidates: 0,
    interviewsScheduled: 0,
    pendingDecisions: 0,
    decidedCandidates: 0,
  };

  const filteredCandidates = (data?.recentCandidates || []).filter((cand) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cand.candidateName.toLowerCase().includes(q) ||
      cand.jobTitle.toLowerCase().includes(q) ||
      cand.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <HiringManagerLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Welcome back, {managerName}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Review candidates, track hiring progress, and make informed hiring decisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate({ to: "/hiring-manager/candidates" })}
              className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs h-9 gap-1.5 cursor-pointer"
            >
              <Users className="size-3.5" />
              <span>View All Candidates</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load hiring manager dashboard data. Please try again.</span>
          </div>
        )}

        {/* 5 Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Open Positions */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Open Positions</span>
              <div className="grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Briefcase className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {metrics.openPositions}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">Assigned to you</span>
            </div>
          </div>

          {/* 2. Candidates to Review */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Candidates to Review</span>
              <div className="grid size-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {metrics.candidatesToReview}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">In active pipeline</span>
            </div>
          </div>

          {/* 3. Shortlisted Candidates */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Shortlisted</span>
              <div className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {metrics.shortlistedCandidates}
                </span>
              )}
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                High match
              </span>
            </div>
          </div>

          {/* 4. Interviews Scheduled */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Interviews</span>
              <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CalendarDays className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {metrics.interviewsScheduled}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">Scheduled</span>
            </div>
          </div>

          {/* 5. Pending Decisions */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Pending Decisions</span>
              <div className="grid size-7 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {metrics.pendingDecisions}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">Requires action</span>
            </div>
          </div>
        </div>

        {/* Assigned Positions Grid & Quick Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Candidates for Decision Making */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="size-4.5 text-brand-blue" />
                  <span>Candidates Awaiting Review & Decision</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Review applicant profiles, ATS scores, and record hiring decisions.
                </p>
              </div>

              <Link
                to="/hiring-manager/candidates"
                className="text-xs font-semibold text-brand-blue hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
                <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
                  <Users className="size-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No candidates to review</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Candidates who apply to your assigned positions will appear here for review and feedback.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredCandidates.slice(0, 6).map((cand) => (
                  <div
                    key={cand.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-brand-blue/40 transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs shrink-0">
                        {cand.candidateName.charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to="/hiring-manager/candidates/$candidateId"
                            params={{ candidateId: cand.id }}
                            className="text-sm font-bold text-foreground hover:text-brand-blue transition-colors truncate"
                          >
                            {cand.candidateName}
                          </Link>

                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                            {cand.stage}
                          </span>

                          {(cand.decision?.status === "APPROVED" || (cand.decision as any) === "APPROVED") && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                              <ThumbsUp className="size-3" /> Approved
                            </span>
                          )}

                          {(cand.decision?.status === "REJECTED" || (cand.decision as any) === "REJECTED") && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600">
                              <ThumbsDown className="size-3" /> Rejected
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {cand.jobTitle} • {cand.department}
                        </p>

                        {/* Skills Pill */}
                        {cand.skills && cand.skills.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {cand.skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-blue text-brand-blue font-medium"
                              >
                                {s}
                              </span>
                            ))}
                            {cand.skills.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                +{cand.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {cand.atsScore !== undefined && (
                        <div className="text-right mr-1">
                          <div className="text-xs font-black text-foreground">{cand.atsScore}%</div>
                          <div className="text-[9px] text-muted-foreground">ATS Score</div>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFeedbackCandidate({
                            id: cand.id,
                            name: cand.candidateName,
                            jobTitle: cand.jobTitle,
                          })
                        }
                        className="text-xs h-8 gap-1 cursor-pointer"
                      >
                        <MessageSquare className="size-3 text-muted-foreground" />
                        <span>Feedback</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: "/hiring-manager/candidates/$candidateId",
                            params: { candidateId: cand.id },
                          })
                        }
                        className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs h-8 gap-1 cursor-pointer"
                      >
                        <span>Review</span>
                        <ExternalLink className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Col: Assigned Positions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="size-4.5 text-brand-blue" />
                  <span>Your Assigned Roles</span>
                </h2>
                <p className="text-xs text-muted-foreground">Open requisitions you manage.</p>
              </div>

              <Link
                to="/hiring-manager/jobs"
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                View all
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : (data?.assignedJobs || []).length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
                No active positions currently assigned to your profile.
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.assignedJobs || []).slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-brand-blue/30 transition-all space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground hover:text-brand-blue transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {job.department} • {job.location}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          job.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span>{job.applicantCount} total applicants</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {job.shortlistedCount} shortlisted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Structured Feedback Modal */}
      {feedbackCandidate && (
        <FeedbackModal
          open={!!feedbackCandidate}
          onOpenChange={(open) => !open && setFeedbackCandidate(null)}
          candidateId={feedbackCandidate.id}
          candidateName={feedbackCandidate.name}
          jobTitle={feedbackCandidate.jobTitle}
          onSuccess={() => {
            setFeedbackCandidate(null);
            refetch();
          }}
        />
      )}

      {/* Quick Decision Modal */}
      {decisionCandidate && (
        <DecisionModal
          open={!!decisionCandidate}
          onOpenChange={(open) => !open && setDecisionCandidate(null)}
          candidateId={decisionCandidate.id}
          candidateName={decisionCandidate.name}
          jobTitle={decisionCandidate.jobTitle}
          decisionType={decisionCandidate.type}
          onSuccess={() => {
            setDecisionCandidate(null);
            refetch();
          }}
        />
      )}
    </HiringManagerLayout>
  );
}

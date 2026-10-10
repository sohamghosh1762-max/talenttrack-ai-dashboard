"use client";

import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  PieChart,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHiringManagerAnalytics } from "@/hooks/api/useHiringManager";

export const Route = createFileRoute("/hiring-manager/analytics")({
  head: () => ({
    meta: [
      { title: "Hiring Analytics — Hiring Manager" },
      {
        name: "description",
        content: "Real-time hiring metrics and pipeline distribution for your assigned roles.",
      },
    ],
  }),
  component: HiringManagerAnalyticsPage,
});

function HiringManagerAnalyticsPage() {
  const { data, isLoading, error, refetch, isFetching } = useHiringManagerAnalytics();

  const metrics = data?.metrics || {
    openPositions: 0,
    totalApplicants: 0,
    shortlistedCandidates: 0,
    interviewsScheduled: 0,
    approvedCandidates: 0,
    rejectedCandidates: 0,
    pendingDecisions: 0,
    averageAtsScore: 0,
  };

  const stageDistribution = data?.stageDistribution || {};
  const jobsBreakdown = data?.jobsBreakdown || [];

  const maxStageCount = Math.max(...Object.values(stageDistribution), 1);

  return (
    <HiringManagerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <BarChart3 className="size-6 text-brand-blue" />
              <span>Hiring Analytics & Pipeline Throughput</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Real-time recruitment metrics calculated strictly across your assigned job
              requisitions.
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
              <span>Refresh Metrics</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to calculate analytics metrics. Please try again.</span>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Total Applicants */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Applicants</span>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <Users className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : metrics.totalApplicants}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Across {metrics.openPositions} positions
            </div>
          </div>

          {/* 2. Shortlisted Candidates */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Shortlisted</span>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : metrics.shortlistedCandidates}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Qualified candidates</div>
          </div>

          {/* 3. Average ATS Score */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Average ATS Score</span>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <Sparkles className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : `${metrics.averageAtsScore}%`}
            </div>
            <div className="text-[11px] text-muted-foreground">Resume match average</div>
          </div>

          {/* 4. Approved Decisions */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Approved Candidates
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : metrics.approvedCandidates}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {metrics.rejectedCandidates} rejected
            </div>
          </div>
        </div>

        {/* Pipeline Distribution Charts and Job Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pipeline Stage Distribution */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <PieChart className="size-4.5 text-brand-blue" />
                <span>Hiring Pipeline Stage Distribution</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Distribution of assigned candidates across each recruitment stage.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-lg" />
                ))}
              </div>
            ) : Object.keys(stageDistribution).length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No pipeline stage data recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {Object.entries(stageDistribution).map(([stage, count]) => {
                  const percentage = Math.round((count / (metrics.totalApplicants || 1)) * 100);
                  const barWidth = Math.max(Math.round((count / maxStageCount) * 100), 4);

                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-foreground font-semibold">{stage}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full bg-brand-blue rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Job-by-Job Breakdown */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Briefcase className="size-4.5 text-brand-blue" />
                <span>Positions Requisition Breakdown</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Applicant funnel breakdown per assigned role.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : jobsBreakdown.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No assigned position requisitions found.
              </div>
            ) : (
              <div className="space-y-3">
                {jobsBreakdown.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{job.title}</h4>
                        <span className="text-[10px] text-muted-foreground">{job.department}</span>
                      </div>
                      <span className="text-xs font-bold text-brand-blue">
                        {job.totalApplicants} applicants
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/50 text-center">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Shortlisted</div>
                        <div className="text-xs font-bold text-foreground">{job.shortlisted}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Pending</div>
                        <div className="text-xs font-bold text-amber-600">
                          {job.pendingDecision}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Approved</div>
                        <div className="text-xs font-bold text-emerald-600">{job.approved}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Rejected</div>
                        <div className="text-xs font-bold text-rose-600">{job.rejected}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </HiringManagerLayout>
  );
}

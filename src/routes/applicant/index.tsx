"use client";

import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Bookmark,
  Briefcase,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/auth/AuthProvider";
import { useMyApplications, useCreateApplication } from "@/hooks/api/useApplications";
import { useMyInterviews } from "@/hooks/api/useInterviews";
import { useJobs } from "@/hooks/api/useJobs";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import {
  calculateProfileCompletion,
  formatApplicationDate,
  calculateJobMatch,
  PIPELINE_STAGES,
  getStageStepIndex,
} from "@/lib/applicant-utils";
import type { IJob } from "@/server/types/job-types";
import type { IApplication } from "@/server/types/application-types";
import { toast } from "sonner";

import { AtsScoreCard } from "@/components/applicant/AtsScoreCard";

export const Route = createFileRoute("/applicant/")({
  head: () => ({
    meta: [
      { title: "Applicant Portal — TalentTrack AI" },
      { name: "description", content: "Track your job applications and explore AI-matched roles." },
    ],
  }),
  component: ApplicantDashboardPage,
});

export function ApplicantDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { savedCount } = useSavedJobs();

  // Queries
  const {
    data: applications = [],
    isLoading: isAppsLoading,
    error: appsError,
    refetch: refetchApps,
  } = useMyApplications();

  const {
    data: interviews = [],
    isLoading: isInterviewsLoading,
  } = useMyInterviews();

  const {
    data: jobsData,
    isLoading: isJobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useJobs({ status: "PUBLISHED", limit: 6 });

  const createApplicationMutation = useCreateApplication();

  // State
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Dynamic user details
  const firstName = user?.name ? user.name.split(" ")[0] : "Candidate";
  const userSkills = user?.applicantProfile?.skills || [];
  const profileCompletion = useMemo(() => calculateProfileCompletion(user), [user]);

  // Derive application statistics
  const appliedJobIds = useMemo(() => {
    return new Set(applications.map((a) => a.jobId));
  }, [applications]);

  const activeApplicationsCount = useMemo(() => {
    return applications.filter(
      (a) =>
        a.status !== "REJECTED" &&
        a.status !== "WITHDRAWN" &&
        a.currentStage !== "REJECTED" &&
        a.currentStage !== "WITHDRAWN",
    ).length;
  }, [applications]);

  const activeInterviewsCount = useMemo(() => {
    return interviews.filter(
      (i) => i.status !== "CANCELLED" && i.status !== "COMPLETED",
    ).length;
  }, [interviews]);


  // Derived recommended jobs
  const publishedJobs: IJob[] = jobsData?.jobs || jobsData?.data || [];
  const recommendedJobs = useMemo(() => {
    return publishedJobs
      .map((job) => {
        const match = calculateJobMatch(job, userSkills);
        const hasApplied = appliedJobIds.has(job.id);
        return {
          job,
          match,
          hasApplied,
        };
      })
      .sort((a, b) => {
        // Prioritize unapplied jobs with highest match score
        if (a.hasApplied && !b.hasApplied) return 1;
        if (!a.hasApplied && b.hasApplied) return -1;
        return b.match.matchScore - a.match.matchScore;
      })
      .slice(0, 4);
  }, [publishedJobs, userSkills, appliedJobIds]);

  // Top 4 dynamic KPI cards
  const kpis = [
    {
      title: "Your Applications",
      value: isAppsLoading ? "—" : `${applications.length}`,
      change:
        applications.length === 0
          ? "No applications submitted"
          : `${activeApplicationsCount} under active review`,
      icon: FileCheck,
      bg: "bg-surface-blue",
      tone: "text-brand-blue",
      href: "/applicant/applications",
    },
    {
      title: "Interviews Scheduled",
      value: isInterviewsLoading ? "—" : `${activeInterviewsCount}`,
      change:
        activeInterviewsCount > 0
          ? `${activeInterviewsCount} scheduled session${activeInterviewsCount > 1 ? "s" : ""}`
          : "No scheduled interviews",
      icon: CalendarDays,
      bg: "bg-surface-peach",
      tone: "text-brand-orange",
      href: "/applicant/interviews",
    },
    {
      title: "Saved Jobs",
      value: `${savedCount}`,
      change: savedCount > 0 ? `${savedCount} bookmarked roles` : "No saved jobs",
      icon: Bookmark,
      bg: "bg-surface-purple",
      tone: "text-brand-purple",
      href: "/applicant/saved-jobs",
    },
    {
      title: "Profile Completion",
      value: `${profileCompletion.percentage}%`,
      change: profileCompletion.nextSuggestion,
      icon: UserCheck,
      bg: "bg-surface-green",
      tone: "text-brand-green",
      href: "/applicant/profile",
      isClickable: true,
    },
  ];

  const handleApply = async () => {
    if (!selectedJob) return;
    setApplyError(null);

    try {
      const resumeId = (user?.applicantProfile as Record<string, unknown>)?.[
        "resumeId"
      ] as string | undefined;

      await createApplicationMutation.mutateAsync({
        jobId: selectedJob.id,
        resumeId,
      });

      toast.success("Application submitted successfully!", {
        description: `Your profile was submitted for ${selectedJob.title}.`,
      });
      setSelectedJob(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit application";
      setApplyError(msg);
    }
  };

  return (
    <ApplicantLayout>
      <div className="space-y-4">
        {/* Welcome Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Here is an overview of your job applications and AI recommended matches.
            </p>
          </div>

          <Button
            asChild
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold shadow-xs"
          >
            <Link to="/applicant/jobs">
              <BriefcaseBusiness className="size-3.5 mr-1.5" />
              Explore Open Roles
            </Link>
          </Button>
        </section>

        {/* 4 Dynamic KPI Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.title}
              to={kpi.href}
              className={`${kpi.bg} rounded-xl border border-border/50 p-4 shadow-xs transition-all hover:shadow-sm hover:border-border cursor-pointer block`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground/80">{kpi.title}</span>
                <span
                  className={`grid size-7 place-items-center rounded-md bg-card/70 ${kpi.tone}`}
                >
                  <kpi.icon className="size-4" />
                </span>
              </div>
              <strong className="block text-2xl font-extrabold text-foreground">
                {kpi.value}
              </strong>
              <span className="text-[10.5px] font-semibold text-foreground/75 mt-1 block truncate">
                {kpi.change}
              </span>
            </Link>
          ))}
        </div>

        {/* Applications Tracking & Recommended Roles Grid */}
        <div className="grid gap-3.5 lg:grid-cols-[1.25fr_1fr]">
          {/* Active Applications */}
          <div className="dashboard-card p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Your Active Applications</h2>
                  <span className="text-[11px] text-muted-foreground">
                    Track recruiter updates in real-time
                  </span>
                </div>
                {applications.length > 0 && (
                  <Link
                    to="/applicant/applications"
                    className="text-[11px] font-semibold text-brand-blue hover:underline"
                  >
                    View All ({applications.length})
                  </Link>
                )}
              </div>

              {/* Applications Content */}
              <div className="mt-3 space-y-3">
                {/* Loading Skeleton */}
                {isAppsLoading && (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="rounded-lg border border-border/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2 w-full pt-1" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State */}
                {!isAppsLoading && appsError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
                    <AlertCircle className="size-6 text-destructive mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      Unable to load your applications
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refetchApps()}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className="size-3" /> Retry
                    </Button>
                  </div>
                )}

                {/* Empty State */}
                {!isAppsLoading && !appsError && applications.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/70 p-6 text-center space-y-2.5 bg-muted/20">
                    <div className="grid size-10 place-items-center rounded-full bg-surface-blue text-brand-blue mx-auto">
                      <Briefcase className="size-5" />
                    </div>
                    <h3 className="text-xs font-bold text-foreground">No applications yet</h3>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Explore open jobs that match your skills and start your first application.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="h-7.5 text-xs bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold mt-1"
                    >
                      <Link to="/applicant/jobs">Explore Jobs</Link>
                    </Button>
                  </div>
                )}

                {/* Real Applications List */}
                {!isAppsLoading &&
                  !appsError &&
                  applications.slice(0, 3).map((app: IApplication) => {
                    const currentStageName = app.currentStage || app.status || "APPLIED";
                    const isRejected =
                      currentStageName.toUpperCase() === "REJECTED" ||
                      currentStageName.toUpperCase() === "WITHDRAWN";
                    const activeStepIdx = getStageStepIndex(currentStageName);

                    return (
                      <div
                        key={app.id}
                        className="rounded-lg border border-border p-3 space-y-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to="/applicant/jobs/$jobId"
                              params={{ jobId: app.jobId }}
                              className="text-xs font-bold text-foreground hover:text-brand-blue transition-colors block truncate"
                            >
                              {app.job?.title || app.jobTitle || "Job Position"}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {app.job?.company || "TalentTrack AI"} •{" "}
                              {app.job?.location || "Remote"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {app.aiScore !== undefined && (
                              <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green border border-brand-green/20 flex items-center gap-1">
                                <Sparkles className="size-2.5" />
                                {app.aiScore}% Match
                              </span>
                            )}
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                isRejected
                                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                                  : "bg-surface-blue text-brand-blue border border-brand-blue/20"
                              }`}
                            >
                              {currentStageName}
                            </span>
                          </div>
                        </div>

                        {/* Compact Linear Pipeline Progress Stepper */}
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[9.5px] font-medium text-muted-foreground pb-1">
                            {PIPELINE_STAGES.map((stage, idx) => {
                              const isCompleted = !isRejected && activeStepIdx > idx;
                              const isCurrent = !isRejected && activeStepIdx === idx;
                              return (
                                <span
                                  key={stage.id}
                                  className={`flex items-center gap-1 ${
                                    isCurrent
                                      ? "font-bold text-brand-blue"
                                      : isCompleted
                                        ? "text-foreground/80 font-semibold"
                                        : "text-muted-foreground/60"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <Check className="size-2.5 text-brand-green stroke-[3]" />
                                  ) : isCurrent ? (
                                    <span className="size-1.5 rounded-full bg-brand-blue" />
                                  ) : null}
                                  {stage.label}
                                </span>
                              );
                            })}
                          </div>

                          {/* Progress bar line */}
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                            {PIPELINE_STAGES.map((stage, idx) => {
                              const isPassed = !isRejected && activeStepIdx >= idx;
                              return (
                                <div
                                  key={stage.id}
                                  className={`h-full flex-1 border-r border-card last:border-0 transition-colors ${
                                    isPassed
                                      ? activeStepIdx === idx
                                        ? "bg-brand-blue"
                                        : "bg-brand-green"
                                      : isRejected
                                        ? "bg-muted"
                                        : "bg-muted/80"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom date stamp */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            Applied {formatApplicationDate(app.appliedAt)}
                          </span>
                          <Link
                            to="/applicant/applications"
                            className="text-[10.5px] font-medium text-brand-blue hover:underline"
                          >
                            Track Progress →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {applications.length > 3 && (
              <div className="pt-2 text-center border-t border-border/50 mt-2">
                <Link
                  to="/applicant/applications"
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  View all {applications.length} applications
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: ATS Resume Score Card & Recommended AI Matched Jobs */}
          <div className="space-y-3.5 flex flex-col">
            <AtsScoreCard />

            {/* Recommended AI Matched Jobs */}
            <div className="dashboard-card p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-4 text-brand-blue" />
                      Recommended Jobs for You
                    </h2>
                    <span className="text-[11px] text-muted-foreground">
                      Based on your extracted skill profile
                    </span>
                  </div>
                  <Link
                    to="/applicant/jobs"
                    className="text-[11px] font-semibold text-brand-blue hover:underline"
                  >
                    All Jobs
                  </Link>
                </div>

                {/* Jobs Content */}
                <div className="mt-3 space-y-3">
                  {/* Loading Skeleton */}
                  {isJobsLoading && (
                    <div className="space-y-2.5">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="rounded-lg border border-border/50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-4 w-14" />
                          </div>
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-6 w-full mt-1" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error State */}
                  {!isJobsLoading && jobsError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
                      <AlertCircle className="size-6 text-destructive mx-auto" />
                      <p className="text-xs font-semibold text-foreground">
                        Unable to load job recommendations
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetchJobs()}
                        className="h-7 text-xs gap-1"
                      >
                        <RefreshCw className="size-3" /> Retry
                      </Button>
                    </div>
                  )}

                  {/* Empty State */}
                  {!isJobsLoading && !jobsError && recommendedJobs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/70 p-6 text-center space-y-2 bg-muted/20">
                      <Briefcase className="size-6 text-muted-foreground mx-auto" />
                      <h3 className="text-xs font-bold text-foreground">No open roles found</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Check back soon as new verified positions are published.
                      </p>
                    </div>
                  )}

                  {/* Real Recommended Jobs */}
                  {!isJobsLoading &&
                    !jobsError &&
                    recommendedJobs.map(({ job, match, hasApplied }) => (
                      <div
                        key={job.id}
                        className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to="/applicant/jobs/$jobId"
                              params={{ jobId: job.id }}
                              className="text-xs font-bold text-foreground hover:text-brand-blue transition-colors block truncate"
                            >
                              {job.title}
                            </Link>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="size-3 shrink-0" />
                              {job.location || "Remote"} • {job.department || "Engineering"}
                            </span>
                          </div>

                          {match.isAvailable && (
                            <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green shrink-0 border border-brand-green/20">
                              {match.matchScore}% Match
                            </span>
                          )}
                        </div>

                        {/* AI Match Explanation Badge */}
                        <div className="text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1 flex items-center gap-1">
                          <Sparkles className="size-3 text-brand-blue shrink-0" />
                          <span className="truncate">{match.explanation}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <span className="text-[10px] text-muted-foreground">
                            {job.employmentType || "Full-time"} • {job.experienceRequired || "Mid-Senior"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                            >
                              <Link to="/applicant/jobs/$jobId" params={{ jobId: job.id }}>
                                Details
                              </Link>
                            </Button>

                            {hasApplied ? (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[11px] font-semibold border-brand-green/30 bg-surface-green text-brand-green hover:bg-surface-green"
                              >
                                <Link to="/applicant/applications">
                                  <CheckCircle2 className="size-3 mr-1" />
                                  Applied
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-[11px] font-semibold bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground"
                                onClick={() => {
                                  setApplyError(null);
                                  setSelectedJob(job);
                                }}
                              >
                                Quick Apply
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2 text-center border-t border-border/50 mt-2">
                <Link
                  to="/applicant/jobs"
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  Explore all verified opportunities →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Apply Confirmation Dialog */}
        <Dialog
          open={selectedJob !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedJob(null);
              setApplyError(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Apply for {selectedJob?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submit your verified profile and resume to the {selectedJob?.department || "hiring"} team.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {applyError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {/* Applicant Profile Snapshot */}
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <div className="font-semibold text-foreground">{user?.name || "Applicant"}</div>
                <div className="text-muted-foreground">{user?.email}</div>
                <div className="text-[11px] text-brand-blue font-medium">
                  {user?.applicantProfile?.headline || "Software Professional"}
                </div>
              </div>

              {/* Default Resume Snapshot */}
              <div className="rounded-lg border border-dashed border-border p-3 text-center bg-card">
                <span className="text-muted-foreground text-[11px] flex items-center justify-center gap-1.5">
                  <FileText className="size-3.5 text-brand-blue" />
                  Using profile resume:{" "}
                  <strong className="text-foreground">
                    {user?.applicantProfile?.resumeFileName || "Default Candidate Resume.pdf"}
                  </strong>
                </span>
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedJob(null)}
                  disabled={createApplicationMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                  onClick={handleApply}
                  disabled={createApplicationMutation.isPending}
                >
                  {createApplicationMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Confirm & Submit Application"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ApplicantLayout>
  );
}

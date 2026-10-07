"use client";

import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Sparkles,
  User as UserIcon,
  Video,
  XCircle,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyInterviews } from "@/hooks/api/useInterviews";
import { useMyApplications } from "@/hooks/api/useApplications";
import type { IInterview, InterviewStatus, InterviewType } from "@/server/types/interview-types";
import type { IApplication } from "@/server/types/application-types";

export const Route = createFileRoute("/applicant/interviews")({
  head: () => ({
    meta: [
      { title: "My Scheduled Interviews — TalentTrack AI" },
      {
        name: "description",
        content: "View your verified scheduled candidate interviews, meeting links, and session details.",
      },
    ],
  }),
  component: ApplicantInterviewsPage,
});

function formatInterviewDateTime(isoString: string, timezone?: string): { date: string; time: string } {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { date: "Date TBD", time: "Time TBD" };

    const tzOption = timezone ? { timeZone: timezone } : {};

    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      ...tzOption,
    });

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      ...tzOption,
    });

    return { date: dateStr, time: timeStr };
  } catch {
    return { date: "Date TBD", time: "Time TBD" };
  }
}

function getStatusBadge(status: InterviewStatus) {
  switch (status) {
    case "SCHEDULED":
      return (
        <Badge variant="outline" className="bg-brand-blue/10 text-brand-blue border-brand-blue/30 font-semibold text-[11px]">
          ● Scheduled
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge variant="outline" className="bg-surface-green text-brand-green border-brand-green/30 font-semibold text-[11px]">
          ✓ Confirmed
        </Badge>
      );
    case "RESCHEDULED":
      return (
        <Badge variant="outline" className="bg-surface-peach text-brand-orange border-brand-orange/30 font-semibold text-[11px]">
          ↻ Rescheduled
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-semibold text-[11px]">
          ✓ Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-semibold text-[11px]">
          ✕ Cancelled
        </Badge>
      );
    case "NO_SHOW":
      return (
        <Badge variant="outline" className="bg-surface-peach text-destructive border-destructive/30 font-semibold text-[11px]">
          ⚠ No Show
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTypeBadge(type: InterviewType) {
  switch (type) {
    case "VIDEO":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md">
          <Video className="size-3" />
          Video Call
        </span>
      );
    case "PHONE":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-md">
          <Phone className="size-3" />
          Phone Call
        </span>
      );
    case "ONSITE":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-green bg-surface-green px-2 py-0.5 rounded-md">
          <MapPin className="size-3" />
          Onsite
        </span>
      );
  }
}

function ApplicantInterviewsPage() {
  const [activeTab, setActiveTab] = useState<"All" | "Upcoming" | "Completed" | "Cancelled">("All");

  // Real Database Queries
  const {
    data: interviews = [],
    isLoading: isLoadingInterviews,
    isError: isInterviewsError,
    error: interviewsError,
    refetch: refetchInterviews,
  } = useMyInterviews();

  const { data: applications = [], isLoading: isLoadingApplications } = useMyApplications();

  // Categorize interviews
  const upcomingInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      if (iv.status === "CANCELLED" || iv.status === "COMPLETED" || iv.status === "NO_SHOW") {
        return false;
      }
      return true;
    });
  }, [interviews]);

  const completedInterviews = useMemo(() => {
    return interviews.filter((iv) => iv.status === "COMPLETED" || iv.status === "NO_SHOW");
  }, [interviews]);

  const cancelledInterviews = useMemo(() => {
    return interviews.filter((iv) => iv.status === "CANCELLED");
  }, [interviews]);

  const displayInterviews = useMemo(() => {
    if (activeTab === "All") return interviews;
    if (activeTab === "Upcoming") return upcomingInterviews;
    if (activeTab === "Completed") return completedInterviews;
    if (activeTab === "Cancelled") return cancelledInterviews;
    return interviews;
  }, [interviews, upcomingInterviews, completedInterviews, cancelledInterviews, activeTab]);

  // Identify applications in interview stage that don't have scheduled interview records yet
  const unscheduledInterviewApps = useMemo(() => {
    const scheduledAppIds = new Set(interviews.map((iv) => iv.applicationId));
    return applications.filter(
      (app: IApplication) =>
        (app.currentStage?.toUpperCase() === "INTERVIEW" || app.status?.toUpperCase() === "INTERVIEW") &&
        !scheduledAppIds.has(app.id),
    );
  }, [applications, interviews]);

  return (
    <ApplicantLayout>
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue shadow-xs">
                <CalendarDays className="size-5" />
              </span>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Interviews
                </h1>
                {upcomingInterviews.length > 0 && (
                  <Badge variant="default" className="bg-brand-blue text-primary-foreground text-xs font-semibold h-5 px-2">
                    {upcomingInterviews.length} upcoming
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track your verified scheduled interview sessions, meeting links, and recruiter instructions.
            </p>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-xs">
              {(["All", "Upcoming", "Completed", "Cancelled"] as const).map((tab) => {
                const count =
                  tab === "All"
                    ? interviews.length
                    : tab === "Upcoming"
                    ? upcomingInterviews.length
                    : tab === "Completed"
                    ? completedInterviews.length
                    : cancelledInterviews.length;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === tab
                        ? "bg-card text-brand-blue shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`text-[10px] px-1 rounded-full ${
                        activeTab === tab ? "bg-brand-blue/10 text-brand-blue" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchInterviews()}
              disabled={isLoadingInterviews}
              className="h-8 px-2.5 text-xs gap-1"
              aria-label="Refresh interviews"
            >
              <RefreshCw className={`size-3.5 ${isLoadingInterviews ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </section>

        {/* Notice for Applications in Interview Stage without scheduled event */}
        {unscheduledInterviewApps.length > 0 && (
          <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand-blue flex-shrink-0" />
              <h3 className="text-xs font-bold text-foreground">
                Interview Stage Reached ({unscheduledInterviewApps.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your application has advanced to the interview stage for:{" "}
              <strong className="text-foreground">
                {unscheduledInterviewApps.map((a: IApplication) => a.job?.title || a.jobTitle || "Open Role").join(", ")}
              </strong>
              . The hiring team is preparing your session and you will see the scheduled time and meeting link here as soon as it is finalized.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingInterviews && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="dashboard-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoadingInterviews && isInterviewsError && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/30">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Unable to load interviews</h3>
            <p className="text-xs text-muted-foreground">
              {interviewsError instanceof Error ? interviewsError.message : "Network error. Please try again."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetchInterviews()} className="text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State: Zero interviews total */}
        {!isLoadingInterviews && !isInterviewsError && interviews.length === 0 && unscheduledInterviewApps.length === 0 && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-muted mx-auto text-muted-foreground">
              <CalendarDays className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No interviews scheduled yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              When a recruiter coordinates an interview for your submitted applications, scheduled dates, times, meeting links, and preparation instructions will appear here.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/applicant/applications">View Applications</Link>
              </Button>
              <Button asChild size="sm" className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs">
                <Link to="/applicant/jobs">Explore Jobs</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Tab Filter Empty State */}
        {!isLoadingInterviews && !isInterviewsError && interviews.length > 0 && displayInterviews.length === 0 && (
          <div className="dashboard-card p-10 text-center space-y-2">
            <Calendar className="size-8 text-muted-foreground/60 mx-auto" />
            <h3 className="text-xs font-semibold text-foreground">No {activeTab.toLowerCase()} interviews found</h3>
            <p className="text-[11px] text-muted-foreground">
              Switch filter tabs or check back once updates are scheduled.
            </p>
          </div>
        )}

        {/* Real Interviews List */}
        {!isLoadingInterviews && !isInterviewsError && displayInterviews.length > 0 && (
          <div className="space-y-4">
            {displayInterviews.map((iv: IInterview) => {
              const { date, time } = formatInterviewDateTime(iv.scheduledAt, iv.timezone);
              const isVideo = iv.type === "VIDEO";
              const hasMeetingUrl = Boolean(iv.meetingUrl && iv.meetingUrl.trim().length > 0);
              const isPastOrCancelled = iv.status === "COMPLETED" || iv.status === "CANCELLED" || iv.status === "NO_SHOW";

              return (
                <div
                  key={iv.id}
                  className={`dashboard-card p-5 space-y-4 transition-all duration-200 border border-border/80 ${
                    iv.status === "SCHEDULED" || iv.status === "CONFIRMED"
                      ? "hover:border-brand-blue/40 bg-card shadow-xs"
                      : "bg-muted/10 opacity-90"
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-foreground hover:text-brand-blue transition-colors">
                          <Link to="/applicant/jobs/$jobId" params={{ jobId: iv.jobId }}>
                            {iv.job?.title || "Job Position"}
                          </Link>
                        </h2>
                        {getStatusBadge(iv.status)}
                        {getTypeBadge(iv.type)}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="text-foreground font-semibold">
                          {iv.job?.company || iv.interviewer?.companyName || "TalentTrack AI"}
                        </span>
                        {iv.job?.location && (
                          <>
                            <span>•</span>
                            <span>{iv.job.location}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-brand-blue font-semibold">{iv.title}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
                      <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
                        <Link to="/applicant/jobs/$jobId" params={{ jobId: iv.jobId }}>
                          <Briefcase className="size-3.5 text-brand-blue" />
                          <span>Job Details</span>
                        </Link>
                      </Button>

                      <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
                        <Link to="/applicant/messages">
                          <MessageSquare className="size-3.5 text-muted-foreground" />
                          <span>Message</span>
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Schedule & Meeting Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    {/* Date & Time */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/50">
                      <Calendar className="size-4 text-brand-blue flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-semibold text-foreground">{date}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {time} ({iv.timezone || "Local Time"})
                        </span>
                      </div>
                    </div>

                    {/* Duration & Mode */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/50">
                      <Clock className="size-4 text-brand-orange flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-semibold text-foreground">{iv.durationMinutes} Minutes</span>
                        <span className="text-muted-foreground text-[11px]">
                          {iv.type === "VIDEO" ? "Video Conference" : iv.type === "PHONE" ? "Phone Call" : "In-Person Interview"}
                        </span>
                      </div>
                    </div>

                    {/* Interviewer */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/50 sm:col-span-2 md:col-span-1">
                      <UserIcon className="size-4 text-brand-green flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="block font-semibold text-foreground truncate">
                          {iv.interviewer?.name || "Hiring Team"}
                        </span>
                        <span className="text-muted-foreground text-[11px] truncate block">
                          {iv.interviewer?.role || "Interviewer"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Onsite / Phone Specific Details */}
                  {iv.type === "ONSITE" && iv.location && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs flex items-start gap-2 text-foreground">
                      <MapPin className="size-4 text-brand-red flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Interview Location:</strong>
                        <span className="text-muted-foreground">{iv.location}</span>
                      </div>
                    </div>
                  )}

                  {iv.type === "PHONE" && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs flex items-start gap-2 text-muted-foreground">
                      <Phone className="size-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>The interviewer will initiate the call to your profile phone number at the scheduled time.</span>
                    </div>
                  )}

                  {/* Candidate Instructions */}
                  {iv.instructions && (
                    <div className="rounded-lg bg-muted/30 p-3.5 border border-border/70 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="size-3.5 text-brand-blue" />
                        <span>Preparation & Session Instructions:</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line pl-5">
                        {iv.instructions}
                      </p>
                    </div>
                  )}

                  {/* Meeting Action Bar */}
                  {isVideo && !isPastOrCancelled && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Video className="size-4 text-brand-blue flex-shrink-0" />
                        {hasMeetingUrl ? (
                          <span>Online video meeting link is ready.</span>
                        ) : (
                          <span>Meeting link will be provided prior to the session.</span>
                        )}
                      </div>

                      {hasMeetingUrl ? (
                        <Button
                          asChild
                          size="sm"
                          className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          <a href={iv.meetingUrl} target="_blank" rel="noreferrer noopener">
                            <ExternalLink className="size-3.5" />
                            <span>Join Video Meeting</span>
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="text-xs opacity-75">
                          Meeting Link Pending
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
}

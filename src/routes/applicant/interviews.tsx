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
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useMyApplications } from "@/hooks/api/useApplications";
import { formatApplicationDate } from "@/lib/applicant-utils";
import type { IApplication } from "@/server/types/application-types";

export const Route = createFileRoute("/applicant/interviews")({
  head: () => ({
    meta: [
      { title: "My Scheduled Interviews — TalentTrack AI" },
      {
        name: "description",
        content:
          "View your scheduled technical and recruiter interviews, meeting links, and preparation tips.",
      },
    ],
  }),
  component: ApplicantInterviewsPage,
});

function ApplicantInterviewsPage() {
  const [filter, setFilter] = useState<"All" | "Upcoming" | "Completed">("All");
  const { data: applications = [], isLoading, error } = useMyApplications();

  // Dynamically derive interview items from authenticated applicant applications
  const interviewApplications = useMemo(() => {
    return applications.filter(
      (app) =>
        app.currentStage?.toUpperCase() === "INTERVIEW" ||
        app.status?.toUpperCase() === "INTERVIEW",
    );
  }, [applications]);

  const filteredInterviews = useMemo(() => {
    if (filter === "All") return interviewApplications;
    if (filter === "Upcoming") {
      return interviewApplications.filter(
        (app) => app.status !== "REJECTED" && app.status !== "WITHDRAWN",
      );
    }
    return interviewApplications.filter(
      (app) => app.status === "OFFERED" || app.status === "REJECTED",
    );
  }, [interviewApplications, filter]);

  return (
    <ApplicantLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-peach text-brand-orange">
                <CalendarDays className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Interviews</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track your scheduled candidate interviews, hiring stages, and recruiter communication.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
            {(["All", "Upcoming", "Completed"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  filter === tab
                    ? "bg-card text-brand-blue shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {/* Loading */}
        {isLoading && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground">Loading your scheduled interviews...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/30">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Failed to load interviews</h3>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredInterviews.length === 0 && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-surface-peach text-brand-orange mx-auto">
              <CalendarDays className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No interviews scheduled yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When a recruiter advances your application to the interview stage, scheduled sessions, meeting links, and preparation tips will appear here.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Link to="/applicant/applications">
                <Button variant="outline" size="sm" className="text-xs">
                  View Applications
                </Button>
              </Link>
              <Link to="/applicant/jobs">
                <Button size="sm" className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs">
                  Explore Jobs
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Dynamic Interviews List */}
        {!isLoading && !error && filteredInterviews.length > 0 && (
          <div className="space-y-4">
            {filteredInterviews.map((app: IApplication) => (
              <div
                key={app.id}
                className="dashboard-card p-5 space-y-4 transition-all duration-200 hover:border-brand-blue/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        <Link
                          to="/applicant/jobs/$jobId"
                          params={{ jobId: app.jobId }}
                          className="hover:text-brand-blue transition-colors"
                        >
                          {app.job?.title || app.jobTitle || "Job Position"}
                        </Link>
                      </h2>
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold bg-surface-green text-brand-green border border-brand-green/20">
                        Interview Stage
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-brand-blue mt-0.5">
                      {app.job?.company || "TalentTrack AI"} •{" "}
                      <span className="text-foreground">{app.job?.location || "Remote"}</span>
                    </p>
                  </div>

                  <Link to="/applicant/jobs/$jobId" params={{ jobId: app.jobId }}>
                    <Button
                      size="sm"
                      className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm shrink-0"
                    >
                      <Briefcase className="size-3.5" />
                      View Position
                    </Button>
                  </Link>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-brand-blue shrink-0" />
                    <span>Applied: <strong className="text-foreground">{formatApplicationDate(app.appliedAt)}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-brand-green shrink-0" />
                    <span>
                      AI Match Score: <strong className="text-foreground">{app.aiScore ? `${app.aiScore}%` : "Calculated upon review"}</strong>
                    </span>
                  </div>
                </div>

                {app.notes && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-muted-foreground" />
                      Recruiter Note / Instructions:
                    </div>
                    <p className="text-[11px] leading-relaxed">{app.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
}

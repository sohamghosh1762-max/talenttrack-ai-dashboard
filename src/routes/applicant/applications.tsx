"use client";

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Clock,
  Download,
  FileCheck,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useMyApplications } from "@/hooks/api/useApplications";

export const Route = createFileRoute("/applicant/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — TalentTrack AI" },
      { name: "description", content: "Track status of your submitted job applications." },
    ],
  }),
  component: ApplicantApplicationsPage,
});

function ApplicantApplicationsPage() {
  const [filter, setFilter] = useState("All");
  const { data: applications = [], isLoading, error, refetch, isFetching } = useMyApplications();

  const getStatusBg = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SHORTLISTED":
      case "OFFERED":
        return "bg-surface-green text-brand-green border-brand-green/30";
      case "INTERVIEW":
        return "bg-surface-peach text-brand-orange border-brand-orange/30";
      case "SCREENING":
      case "UNDER REVIEW":
        return "bg-surface-blue text-brand-blue border-brand-blue/30";
      case "REJECTED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const filtered = applications.filter((app) => {
    if (filter === "All") return true;
    const statusUpper = app.status?.toUpperCase();
    const filterUpper = filter.toUpperCase();
    if (filterUpper === "INTERVIEW") return statusUpper === "INTERVIEW";
    if (filterUpper === "UNDER REVIEW") return statusUpper === "SCREENING" || statusUpper === "UNDER REVIEW" || statusUpper === "SHORTLISTED";
    if (filterUpper === "APPLIED") return statusUpper === "APPLIED";
    return statusUpper === filterUpper;
  });

  return (
    <ApplicantLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                <FileCheck className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                My Submitted Applications
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track status, updates, and progress for your active job applications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
              {["All", "Interview", "Under Review", "Applied"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    filter === tab
                      ? "bg-card text-brand-blue shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground">Loading your submitted applications...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/30">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Failed to load applications</h3>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button size="sm" onClick={() => refetch()} className="text-xs bg-brand-blue">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-muted mx-auto text-muted-foreground">
              <Briefcase className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {filter === "All" ? "No applications submitted yet" : `No applications in "${filter}" status`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Explore open positions on the job board and submit your profile for instant AI matching.
            </p>
            <Link to="/applicant/jobs">
              <Button size="sm" className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs">
                Browse Open Jobs
              </Button>
            </Link>
          </div>
        )}

        {/* Applications List */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((app) => {
              const formattedDate = new Date(app.appliedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={app.id}
                  className="dashboard-card p-4 space-y-3 transition-all hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/applicant/jobs/$jobId"
                          params={{ jobId: app.jobId }}
                          className="text-sm font-bold text-foreground hover:text-brand-blue transition-colors"
                        >
                          {app.job?.title || app.jobTitle || "Position Applied"}
                        </Link>
                        {app.job?.department && (
                          <span className="rounded bg-surface-blue px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                            {app.job.department}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{app.job?.company || "TalentTrack AI"}</span>
                        {app.job?.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {app.job.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {app.aiScore !== undefined && (
                        <span className="rounded bg-surface-green px-2 py-0.5 text-xs font-bold text-brand-green border border-brand-green/20 flex items-center gap-1">
                          <Sparkles className="size-3" />
                          {app.aiScore}% Match
                        </span>
                      )}
                      <span className={`rounded px-2.5 py-0.5 text-xs font-bold border ${getStatusBg(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <strong className="text-foreground font-semibold">Stage: </strong>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10.5px] font-medium text-foreground">
                        {app.currentStage || "APPLIED"}
                      </span>
                      {app.resume && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
                          <FileText className="size-3 text-brand-blue" />
                          {app.resume.originalFileName}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground" />
                      Submitted on {formattedDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
}

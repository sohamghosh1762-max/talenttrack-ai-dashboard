"use client";

import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  Briefcase,
  Building,
  CheckCircle2,
  Loader2,
  MapPin,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/hooks/api/useJobs";
import { useMyApplications } from "@/hooks/api/useApplications";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import type { IJob } from "@/server/types/job-types";

export const Route = createFileRoute("/applicant/saved-jobs")({
  head: () => ({
    meta: [
      { title: "Saved Jobs — TalentTrack AI" },
      { name: "description", content: "View your saved and bookmarked job openings." },
    ],
  }),
  component: ApplicantSavedJobsPage,
});

function ApplicantSavedJobsPage() {
  const { savedJobIds, removeSavedJob } = useSavedJobs();
  const { data: jobsResponse, isLoading } = useJobs({ status: "PUBLISHED" });
  const { data: myApps = [] } = useMyApplications();

  const allJobs: IJob[] = jobsResponse?.jobs || jobsResponse?.data || [];

  const savedJobs = useMemo(() => {
    return allJobs.filter((job) => savedJobIds.includes(job.id));
  }, [allJobs, savedJobIds]);

  const appliedJobIds = useMemo(() => {
    return new Set(myApps.map((a) => a.jobId));
  }, [myApps]);

  return (
    <ApplicantLayout>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-purple text-brand-purple">
              <Bookmark className="size-5" />
            </span>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Saved Job Openings
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Bookmarked positions you want to apply to or track later.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground">Loading your saved jobs...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && savedJobs.length === 0 && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-surface-purple/40 text-brand-purple mx-auto">
              <Bookmark className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No saved jobs yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Save jobs you're interested in and find them here anytime to compare requirements and
              apply.
            </p>
            <Link to="/applicant/jobs">
              <Button
                size="sm"
                className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs"
              >
                Find Jobs
              </Button>
            </Link>
          </div>
        )}

        {/* Saved Jobs List */}
        {!isLoading && savedJobs.length > 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {savedJobs.map((job) => {
              const hasApplied = appliedJobIds.has(job.id);

              return (
                <div
                  key={job.id}
                  className="dashboard-card flex flex-col justify-between p-4 transition-all hover:shadow-md"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <span className="rounded bg-surface-blue px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                        {job.department || "Engineering"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSavedJob(job.id)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                        title="Remove from saved"
                        aria-label="Remove job from saved"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-foreground">
                      <Link
                        to="/applicant/jobs/$jobId"
                        params={{ jobId: job.id }}
                        className="hover:text-brand-blue transition-colors"
                      >
                        {job.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>

                    <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3 text-muted-foreground" />
                        <span>{job.location || "Remote"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="size-3 text-muted-foreground" />
                        <span>
                          {job.employmentType || "Full-time"} •{" "}
                          {job.experienceRequired || "Mid-Senior"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {job.applicationsCount || 0} applied
                    </span>
                    {hasApplied ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7.5 border-brand-green/30 bg-surface-green text-brand-green hover:bg-surface-green text-xs font-semibold"
                      >
                        <Link to="/applicant/applications">
                          <CheckCircle2 className="size-3 mr-1" /> Applied
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        className="h-7.5 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
                      >
                        <Link to="/applicant/jobs/$jobId" params={{ jobId: job.id }}>
                          View & Apply
                        </Link>
                      </Button>
                    )}
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

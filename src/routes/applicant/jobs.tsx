"use client";

import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  Building,
  CheckCircle2,
  DollarSign,
  Filter,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  AlertCircle,
  FileText,
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
import { useAuth } from "@/auth/AuthProvider";
import { useJobs } from "@/hooks/api/useJobs";
import { useMyApplications, useCreateApplication } from "@/hooks/api/useApplications";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { calculateJobMatch } from "@/lib/applicant-utils";
import type { IJob } from "@/server/types/job-types";
import { toast } from "sonner";

export const Route = createFileRoute("/applicant/jobs")({
  head: () => ({
    meta: [
      { title: "Browse Jobs — TalentTrack AI" },
      { name: "description", content: "Explore open job opportunities and apply directly." },
    ],
  }),
  component: ApplicantJobsPage,
});

function ApplicantJobsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const { isSaved, toggleSave } = useSavedJobs();
  const { data: myApps = [] } = useMyApplications();
  const createApplicationMutation = useCreateApplication();

  const { data: jobsResponse, isLoading, error } = useJobs({
    status: "PUBLISHED",
    search: search.trim() || undefined,
    department: selectedDept === "All" ? undefined : selectedDept,
  });

  const jobs: IJob[] = jobsResponse?.jobs || jobsResponse?.data || [];
  const userSkills = user?.applicantProfile?.skills || [];

  const appliedJobIds = useMemo(() => {
    return new Set(myApps.map((a) => a.jobId));
  }, [myApps]);

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
        description: `Submitted for ${selectedJob.title}.`,
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
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
            Explore Open Job Positions
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Browse verified openings and apply with AI resume matching.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, skill, or location..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="size-3.5 text-muted-foreground ml-1 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-8.5 rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Research">Research</option>
              <option value="Design">Design</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Product">Product</option>
              <option value="Marketing">Marketing</option>
              <option value="Analytics">Analytics</option>
            </select>
          </div>
        </div>

        {/* Job Listings Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs gap-2">
            <Loader2 className="size-8 animate-spin text-brand-blue" />
            <span>Loading published job openings...</span>
          </div>
        ) : error ? (
          <div className="dashboard-card p-8 text-center text-xs text-destructive">
            Failed to load jobs: {(error as Error).message}
          </div>
        ) : jobs.length === 0 ? (
          <div className="dashboard-card p-12 text-center text-xs text-muted-foreground">
            No published jobs found matching your criteria.
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const saved = isSaved(job.id);
              const hasApplied = appliedJobIds.has(job.id);
              const match = calculateJobMatch(job, userSkills);

              return (
                <div
                  key={job.id}
                  className="dashboard-card flex flex-col justify-between p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="rounded bg-surface-blue px-2 py-0.5 text-[9.5px] font-semibold text-brand-blue">
                          {job.department || "Engineering"}
                        </span>
                        <Link to="/applicant/jobs/$jobId" params={{ jobId: job.id }}>
                          <h3 className="text-sm font-bold text-foreground mt-1.5 hover:text-brand-blue transition-colors truncate">
                            {job.title}
                          </h3>
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSave(job.id)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                          saved
                            ? "text-brand-purple bg-surface-purple"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-label="Save job"
                      >
                        <Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{job.location || "Remote"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="size-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {job.employmentType || "Full-time"} {job.experienceRequired ? `• ${job.experienceRequired}` : ""}
                        </span>
                      </div>
                      {job.salaryRange && (job.salaryRange.min || job.salaryRange.max) && (
                        <div className="flex items-center gap-1.5 text-brand-green font-medium">
                          <DollarSign className="size-3.5 shrink-0" />
                          <span>
                            ${job.salaryRange.min?.toLocaleString()}
                            {job.salaryRange.max ? ` - $${job.salaryRange.max?.toLocaleString()}` : "+"} / yr
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    {match.isAvailable ? (
                      <span className="flex items-center gap-1 text-[10.5px] font-bold text-brand-green">
                        <Sparkles className="size-3" />
                        {match.matchScore}% Match
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {job.department || "Open Role"}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Link to="/applicant/jobs/$jobId" params={{ jobId: job.id }}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7.5 px-2.5 text-xs font-semibold"
                        >
                          Details
                        </Button>
                      </Link>

                      {hasApplied ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7.5 px-2.5 text-xs font-semibold border-brand-green/30 bg-surface-green text-brand-green hover:bg-surface-green"
                        >
                          <Link to="/applicant/applications">
                            <CheckCircle2 className="size-3 mr-1" /> Applied
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7.5 px-3 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
                          onClick={() => {
                            setApplyError(null);
                            setSelectedJob(job);
                          }}
                        >
                          Apply Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Apply Dialog */}
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
                Your authenticated profile and resume will be submitted to the {selectedJob?.department || "hiring"} team.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {applyError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <div className="font-semibold text-foreground">{user?.name || "Applicant"}</div>
                <div className="text-muted-foreground">{user?.email}</div>
                <div className="text-[11px] text-brand-blue">
                  {user?.applicantProfile?.headline || "Software Professional"}
                </div>
              </div>

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
                    "Submit Application"
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

"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Building, CheckCircle2, Filter, MapPin, Search, Sparkles } from "lucide-react";
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
import { jobOpeningsData, type JobOpening } from "@/data/mockData";

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
  const [jobs] = useState<JobOpening[]>(jobOpeningsData);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<string[]>(["job-1", "job-4"]);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === "All" || j.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const toggleSave = (jobId: string) => {
    setSavedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId],
    );
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
            </select>
          </div>
        </div>

        {/* Job Listings Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const isSaved = savedJobIds.includes(job.id);

            return (
              <div
                key={job.id}
                className="dashboard-card flex flex-col justify-between p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded bg-surface-blue px-2 py-0.5 text-[9.5px] font-semibold text-brand-blue">
                        {job.department}
                      </span>
                      <h3 className="text-sm font-bold text-foreground mt-1.5">{job.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSave(job.id)}
                      className={`p-1.5 rounded-md transition-colors ${
                        isSaved
                          ? "text-brand-purple bg-surface-purple"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="Save job"
                    >
                      <Bookmark className={`size-4 ${isSaved ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {job.type} • {job.experience}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="flex items-center gap-1 text-[10.5px] font-bold text-brand-green">
                    <Sparkles className="size-3" />
                    90%+ Match
                  </span>
                  <Button
                    size="sm"
                    className="h-7.5 px-3 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
                    onClick={() => setSelectedJob(job)}
                  >
                    Apply Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Apply Dialog */}
        <Dialog open={selectedJob !== null} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Apply for {selectedJob?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Your profile will be matched against this role's criteria.
              </DialogDescription>
            </DialogHeader>

            {appliedSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="grid size-12 place-items-center rounded-full bg-surface-green text-brand-green mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Application Sent!</h4>
              </div>
            ) : (
              <div className="space-y-3 py-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="font-semibold text-foreground">{selectedJob?.title}</div>
                  <div className="text-muted-foreground text-[11px]">{selectedJob?.location}</div>
                </div>
                <DialogFooter className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                    onClick={() => {
                      setAppliedSuccess(true);
                      setTimeout(() => {
                        setAppliedSuccess(false);
                        setSelectedJob(null);
                      }, 1000);
                    }}
                  >
                    Submit Application
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ApplicantLayout>
  );
}

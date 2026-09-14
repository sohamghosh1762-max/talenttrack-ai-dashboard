"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Building, MapPin, Trash2 } from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { jobOpeningsData, type JobOpening } from "@/data/mockData";

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
  const [savedJobs, setSavedJobs] = useState<JobOpening[]>(jobOpeningsData.slice(0, 3));

  const handleRemove = (id: string) => {
    setSavedJobs((prev) => prev.filter((j) => j.id !== id));
  };

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
            Bookmarked positions you want to apply to later.
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {savedJobs.map((job) => (
            <div
              key={job.id}
              className="dashboard-card flex flex-col justify-between p-4 transition-all hover:shadow-md"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <span className="rounded bg-surface-blue px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                    {job.department}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(job.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Remove from saved"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-foreground">{job.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>

                <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3 text-muted-foreground" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building className="size-3 text-muted-foreground" />
                    <span>
                      {job.type} • {job.experience}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {job.applications} applied
                </span>
                <Button
                  size="sm"
                  className="h-7.5 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        {savedJobs.length === 0 && (
          <div className="dashboard-card p-12 text-center text-xs text-muted-foreground">
            You have no saved jobs. Explore open roles to bookmark positions.
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
}

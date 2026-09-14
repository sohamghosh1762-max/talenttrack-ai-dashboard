"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Clock, FileCheck, MapPin, Sparkles } from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";

export const Route = createFileRoute("/applicant/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — TalentTrack AI" },
      { name: "description", content: "Track status of your submitted job applications." },
    ],
  }),
  component: ApplicantApplicationsPage,
});

const applicationsData = [
  {
    id: "app-1",
    jobTitle: "Senior Frontend Engineer",
    company: "TalentTrack Technologies",
    location: "San Francisco, CA (Hybrid)",
    appliedOn: "Sep 12, 2025",
    status: "Interview",
    score: 92,
    statusBg: "bg-surface-peach text-brand-orange",
    nextStep: "Technical Interview Round 1 on Thursday 2:00 PM PST",
  },
  {
    id: "app-2",
    jobTitle: "Staff React Architect",
    company: "CloudScale Systems",
    location: "Austin, TX (Remote)",
    appliedOn: "Sep 10, 2025",
    status: "Under Review",
    score: 88,
    statusBg: "bg-surface-blue text-brand-blue",
    nextStep: "Hiring Manager reviewing profile & extracted skill breakdown",
  },
  {
    id: "app-3",
    jobTitle: "Fullstack TypeScript Developer",
    company: "Nexus AI Labs",
    location: "Seattle, WA (Remote)",
    appliedOn: "Sep 05, 2025",
    status: "Applied",
    score: 78,
    statusBg: "bg-muted text-muted-foreground",
    nextStep: "Resume received and queued for automated ATS pre-screening",
  },
];

function ApplicantApplicationsPage() {
  const [filter, setFilter] = useState("All");

  const filtered = applicationsData.filter((a) => {
    if (filter === "All") return true;
    return a.status === filter;
  });

  return (
    <ApplicantLayout>
      <div className="space-y-4">
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
              Review and manage candidate applications.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
            {["All", "Interview", "Under Review", "Applied"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
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

        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="dashboard-card p-4 space-y-3 transition-all hover:shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{app.jobTitle}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{app.company}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {app.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-green px-2 py-0.5 text-xs font-bold text-brand-green border border-brand-green/20 flex items-center gap-1">
                    <Sparkles className="size-3" />
                    {app.score}% Match
                  </span>
                  <span className={`rounded px-2.5 py-0.5 text-xs font-bold ${app.statusBg}`}>
                    {app.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-muted-foreground">
                  <strong className="text-foreground font-semibold">Latest Update: </strong>
                  {app.nextStep}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" />
                  Submitted {app.appliedOn}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ApplicantLayout>
  );
}

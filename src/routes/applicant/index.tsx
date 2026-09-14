"use client";

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck,
  MapPin,
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
import { useAuth } from "@/auth/AuthProvider";
import { jobOpeningsData, type JobOpening } from "@/data/mockData";

export const Route = createFileRoute("/applicant/")({
  head: () => ({
    meta: [
      { title: "Candidate Dashboard — TalentTrack AI" },
      { name: "description", content: "Track your job applications and explore AI-matched roles." },
    ],
  }),
  component: ApplicantDashboardPage,
});

const applicantKPIs = [
  {
    title: "Your Applications",
    value: "3",
    change: "1 under active review",
    icon: FileCheck,
    bg: "bg-surface-blue",
    tone: "text-brand-blue",
  },
  {
    title: "Interviews Scheduled",
    value: "1",
    change: "Upcoming on Thursday",
    icon: CalendarDays,
    bg: "bg-surface-peach",
    tone: "text-brand-red",
  },
  {
    title: "Saved Jobs",
    value: "6",
    change: "2 roles closing soon",
    icon: Bookmark,
    bg: "bg-surface-purple",
    tone: "text-brand-purple",
  },
  {
    title: "Profile Completion",
    value: "80%",
    change: "Add 2 more skills to hit 100%",
    icon: UserCheck,
    bg: "bg-surface-green",
    tone: "text-brand-green",
  },
];

const mockCandidateApplications = [
  {
    id: "app-101",
    jobTitle: "Senior Frontend Engineer",
    company: "TalentTrack Technologies",
    location: "San Francisco, CA (Hybrid)",
    appliedDate: "Sep 12, 2025",
    matchScore: 92,
    stage: "Interview",
    stageColor: "bg-surface-peach text-brand-orange",
  },
  {
    id: "app-102",
    jobTitle: "Staff React Architect",
    company: "CloudScale Systems",
    location: "Remote",
    appliedDate: "Sep 10, 2025",
    matchScore: 88,
    stage: "Screening",
    stageColor: "bg-surface-purple text-brand-purple",
  },
  {
    id: "app-103",
    jobTitle: "Fullstack TypeScript Developer",
    company: "Nexus AI Labs",
    location: "Austin, TX (Hybrid)",
    appliedDate: "Sep 05, 2025",
    matchScore: 78,
    stage: "Applied",
    stageColor: "bg-surface-blue text-brand-blue",
  },
];

function ApplicantDashboardPage() {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const firstName = user?.name ? user.name.split(" ")[0] : "Candidate";

  const handleApply = () => {
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setSelectedJob(null);
    }, 1200);
  };

  return (
    <ApplicantLayout>
      <div className="space-y-4">
        {/* Welcome Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Here is an overview of your job applications and AI recommended matches.
            </p>
          </div>

          <Button
            asChild
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
          >
            <Link to="/applicant/jobs">
              <BriefcaseBusiness className="size-3.5 mr-1.5" />
              Explore Open Roles
            </Link>
          </Button>
        </section>

        {/* 4 KPI Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {applicantKPIs.map((kpi) => (
            <div
              key={kpi.title}
              className={`${kpi.bg} rounded-xl border border-border/50 p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground/80">{kpi.title}</span>
                <span
                  className={`grid size-7 place-items-center rounded-md bg-card/60 ${kpi.tone}`}
                >
                  <kpi.icon className="size-4" />
                </span>
              </div>
              <strong className="block text-2xl font-extrabold text-foreground">{kpi.value}</strong>
              <span className="text-[10.5px] font-semibold text-brand-green mt-1 block">
                {kpi.change}
              </span>
            </div>
          ))}
        </div>

        {/* Applications Tracking & Recommended Roles */}
        <div className="grid gap-3.5 lg:grid-cols-[1.2fr_1fr]">
          {/* Active Applications */}
          <div className="dashboard-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Your Active Applications</h2>
                <span className="text-[11px] text-muted-foreground">
                  Track recruiter updates in real-time
                </span>
              </div>
              <Link
                to="/applicant/applications"
                className="text-[11px] font-semibold text-brand-blue hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {mockCandidateApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{app.jobTitle}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {app.company} • {app.location}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="size-3" />
                      Applied on {app.appliedDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green border border-brand-green/20">
                      {app.matchScore}% Match
                    </span>
                    <span
                      className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${app.stageColor}`}
                    >
                      {app.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended AI Matched Jobs */}
          <div className="dashboard-card p-4 space-y-3">
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
            </div>

            <div className="space-y-3">
              {jobOpeningsData.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground">{job.title}</h3>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3" />
                        {job.location}
                      </span>
                    </div>
                    <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green">
                      90%+ Match
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">
                      {job.type} • {job.experience}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold text-brand-blue hover:bg-surface-blue"
                      onClick={() => setSelectedJob(job)}
                    >
                      Quick Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Apply Dialog */}
        <Dialog open={selectedJob !== null} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Apply for {selectedJob?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submit your profile and resume to {selectedJob?.department} team.
              </DialogDescription>
            </DialogHeader>

            {appliedSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="grid size-12 place-items-center rounded-full bg-surface-green text-brand-green mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Application Submitted!</h4>
                <p className="text-xs text-muted-foreground">
                  The hiring team has received your application.
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <div className="font-semibold text-foreground">{user?.name}</div>
                  <div className="text-muted-foreground">{user?.email}</div>
                  <div className="text-[11px] text-brand-blue font-medium">
                    {user?.applicantProfile?.headline || "Frontend Engineer"}
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-border p-3 text-center">
                  <span className="text-muted-foreground text-[11px]">
                    Using default resume: <strong>Aarav_Mehta_Resume_2025.pdf</strong>
                  </span>
                </div>

                <DialogFooter className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                    onClick={handleApply}
                  >
                    Confirm & Submit Application
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

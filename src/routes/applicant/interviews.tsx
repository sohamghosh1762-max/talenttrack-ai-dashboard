"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";

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

interface ScheduledInterview {
  id: string;
  role: string;
  company: string;
  stage: string;
  interviewers: string[];
  dateTime: string;
  duration: string;
  meetingLink: string;
  status: "Upcoming" | "Completed" | "Rescheduled";
  notes?: string;
  prepTips?: string[];
}

const mockApplicantInterviews: ScheduledInterview[] = [
  {
    id: "interview-1",
    role: "Senior Frontend Engineer",
    company: "TalentTrack Technologies",
    stage: "Technical Deep Dive & Architecture",
    interviewers: ["Sarah Jenkins (VP Engineering)", "David Kim (Lead Architect)"],
    dateTime: "Tomorrow, Oct 2, 2025 at 3:00 PM EST",
    duration: "45 minutes",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    status: "Upcoming",
    notes:
      "Please be ready to share your screen for live system design and React component walkthrough.",
    prepTips: [
      "Review state management patterns with Redux & Context API",
      "Prepare questions about the team's engineering roadmap",
      "Ensure web camera and microphone permissions are enabled",
    ],
  },
  {
    id: "interview-2",
    role: "Staff React Architect",
    company: "CloudScale Systems",
    stage: "Hiring Manager Introduction",
    interviewers: ["Michael Brown (Director of Talent)"],
    dateTime: "Friday, Oct 5, 2025 at 11:30 AM EST",
    duration: "30 minutes",
    meetingLink: "https://zoom.us/j/9876543210",
    status: "Upcoming",
    notes: "General overview of career experience, company culture, and expectations.",
    prepTips: [
      "Review recent projects and leadership achievements",
      "Prepare your career timeline summary",
    ],
  },
  {
    id: "interview-3",
    role: "Fullstack TypeScript Developer",
    company: "Nexus AI Labs",
    stage: "Initial Recruiter Screen",
    interviewers: ["Elena Rostova (Senior Technical Recruiter)"],
    dateTime: "Sep 24, 2025 at 2:00 PM EST",
    duration: "25 minutes",
    meetingLink: "https://meet.google.com/xyz-uvwx-rst",
    status: "Completed",
    notes: "Completed successfully. Advanced to technical interview stage.",
  },
];

function ApplicantInterviewsPage() {
  const [filter, setFilter] = useState<"All" | "Upcoming" | "Completed">("All");

  const filteredInterviews = mockApplicantInterviews.filter((item) => {
    if (filter === "All") return true;
    return item.status === filter;
  });

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
              Keep track of your scheduled candidate interviews, interviewers, and direct video
              meeting links.
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

        {/* Interviews List */}
        <div className="space-y-4">
          {filteredInterviews.map((interview) => (
            <div
              key={interview.id}
              className="dashboard-card p-5 space-y-4 transition-all duration-200 hover:border-brand-blue/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{interview.role}</h2>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        interview.status === "Upcoming"
                          ? "bg-surface-green text-brand-green border border-brand-green/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {interview.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-brand-blue mt-0.5">
                    {interview.company} • <span className="text-foreground">{interview.stage}</span>
                  </p>
                </div>

                {interview.status === "Upcoming" && (
                  <Button
                    asChild
                    size="sm"
                    className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm shrink-0"
                  >
                    <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="size-3.5" />
                      Join Video Meeting
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-brand-blue shrink-0" />
                  <span className="font-semibold text-foreground">{interview.dateTime}</span>
                  <span className="text-[11px]">({interview.duration})</span>
                </div>

                <div className="flex items-center gap-2">
                  <User className="size-4 text-brand-purple shrink-0" />
                  <span>
                    <strong className="text-foreground">Interviewers:</strong>{" "}
                    {interview.interviewers.join(", ")}
                  </span>
                </div>
              </div>

              {interview.notes && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    Session Details & Instructions:
                  </div>
                  <p className="text-[11px] leading-relaxed">{interview.notes}</p>
                </div>
              )}

              {interview.prepTips && interview.prepTips.length > 0 && (
                <div className="rounded-lg bg-surface-blue/30 border border-brand-blue/20 p-3 text-xs space-y-1.5">
                  <div className="font-bold text-brand-blue flex items-center gap-1.5 text-[11.5px]">
                    <Sparkles className="size-3.5" />
                    Recommended Preparation Tips:
                  </div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                    {interview.prepTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {filteredInterviews.length === 0 && (
            <div className="dashboard-card p-12 text-center text-xs text-muted-foreground">
              No {filter.toLowerCase()} interviews found.
            </div>
          )}
        </div>
      </div>
    </ApplicantLayout>
  );
}

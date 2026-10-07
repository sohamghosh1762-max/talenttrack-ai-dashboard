"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/interviews")({
  head: () => ({
    meta: [
      { title: "Interview Management — TalentTrack AI" },
      {
        name: "description",
        content: "Schedule, coordinate, and review recruiter and hiring manager interviews.",
      },
    ],
  }),
  component: RecruiterInterviewsPage,
});

interface RecruiterInterview {
  id: string;
  candidateName: string;
  candidateInitials: string;
  jobRole: string;
  stage: string;
  interviewer: string;
  dateTime: string;
  meetingLink: string;
  status: "Scheduled" | "Completed" | "Pending Feedback";
  feedbackNotes?: string;
  score?: number;
}

const mockRecruiterInterviews: RecruiterInterview[] = [
  {
    id: "rec-int-1",
    candidateName: "Aarav Mehta",
    candidateInitials: "AM",
    jobRole: "Frontend Developer",
    stage: "Technical Deep Dive",
    interviewer: "Sarah Jenkins (VP Eng)",
    dateTime: "Oct 2, 2025 at 3:00 PM EST",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    status: "Scheduled",
    score: 92,
  },
  {
    id: "rec-int-2",
    candidateName: "Rohit Singh",
    candidateInitials: "RS",
    jobRole: "Backend Developer",
    stage: "System Design & Architecture",
    interviewer: "David Kim (Lead Architect)",
    dateTime: "Oct 3, 2025 at 1:30 PM EST",
    meetingLink: "https://zoom.us/j/1234567890",
    status: "Scheduled",
    score: 76,
  },
  {
    id: "rec-int-3",
    candidateName: "Priya Nair",
    candidateInitials: "PN",
    jobRole: "AI/ML Engineer",
    stage: "Technical Problem Solving",
    interviewer: "Dr. Alex Chen (AI Lead)",
    dateTime: "Sep 28, 2025 at 10:00 AM EST",
    meetingLink: "https://meet.google.com/qrs-tuvw-xyz",
    status: "Pending Feedback",
    score: 88,
    feedbackNotes:
      "Candidate demonstrated exceptional domain knowledge on transformer fine-tuning.",
  },
  {
    id: "rec-int-4",
    candidateName: "Sneha Kapoor",
    candidateInitials: "SK",
    jobRole: "Product Designer",
    stage: "Portfolio Review",
    interviewer: "Rachel Morgan (Design Lead)",
    dateTime: "Sep 26, 2025 at 4:00 PM EST",
    meetingLink: "https://meet.google.com/klm-nopq-rst",
    status: "Completed",
    score: 85,
    feedbackNotes: "Strong design systems leadership. Recommend proceeding to executive round.",
  },
];

function RecruiterInterviewsPage() {
  const [interviews, setInterviews] = useState<RecruiterInterview[]>(mockRecruiterInterviews);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // New Interview Form
  const [newCandidate, setNewCandidate] = useState("");
  const [newJob, setNewJob] = useState("Frontend Developer");
  const [newInterviewer, setNewInterviewer] = useState("Rahul Mehta");
  const [newDate, setNewDate] = useState("Tomorrow at 2:00 PM");

  const filtered = interviews.filter((item) => {
    const matchesSearch =
      item.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      item.jobRole.toLowerCase().includes(search.toLowerCase()) ||
      item.interviewer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.trim()) return;

    const created: RecruiterInterview = {
      id: `int-${Date.now()}`,
      candidateName: newCandidate,
      candidateInitials: newCandidate
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      jobRole: newJob,
      stage: "Technical Screen",
      interviewer: newInterviewer,
      dateTime: newDate,
      meetingLink: "https://meet.google.com/new-session",
      status: "Scheduled",
      score: 90,
    };

    setInterviews([created, ...interviews]);
    setScheduleModalOpen(false);
    setNewCandidate("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-peach text-brand-orange">
                <CalendarDays className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Interviews</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Schedule candidate interviews, assign interviewers, and collect evaluation feedback.
            </p>
          </div>

          <Button
            onClick={() => setScheduleModalOpen(true)}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="size-4 font-bold" />
            Schedule Interview
          </Button>
        </section>

        {/* Filters and Search Bar */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, role, or interviewer..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs overflow-x-auto w-full sm:w-auto">
            <Filter className="size-3.5 text-muted-foreground ml-1 mr-0.5" />
            {["All", "Scheduled", "Pending Feedback", "Completed"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === status
                    ? "bg-card text-brand-blue shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Interviews Table */}
        <div className="dashboard-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-3 py-3">Role & Stage</th>
                  <th className="px-3 py-3">Interviewer</th>
                  <th className="px-3 py-3">Date & Time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Meeting Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-full bg-surface-blue text-xs font-bold text-brand-blue shrink-0">
                          {item.candidateInitials}
                        </div>
                        <div>
                          <strong className="block text-xs font-semibold text-foreground">
                            {item.candidateName}
                          </strong>
                          {item.score && (
                            <span className="text-[10px] text-brand-green font-semibold">
                              {item.score}% Match
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div>
                        <span className="font-semibold text-foreground">{item.jobRole}</span>
                        <span className="block text-[11px] text-brand-blue">{item.stage}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-muted-foreground" />
                        {item.interviewer}
                      </span>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        {item.dateTime}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          item.status === "Scheduled"
                            ? "bg-surface-green text-brand-green border border-brand-green/20"
                            : item.status === "Pending Feedback"
                              ? "bg-surface-peach text-brand-orange border border-brand-orange/20"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-semibold text-brand-blue hover:bg-surface-blue gap-1"
                      >
                        <a href={item.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Video className="size-3" />
                          Join
                          <ExternalLink className="size-2.5" />
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No interviews found matching your criteria.
              </div>
            )}
          </div>
        </div>

        {/* Schedule Interview Modal */}
        <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Schedule Candidate Interview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up a new video interview round with a candidate.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInterview} className="space-y-3 py-2 text-xs">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  required
                  value={newCandidate}
                  onChange={(e) => setNewCandidate(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Target Job Opening
                </label>
                <select
                  value={newJob}
                  onChange={(e) => setNewJob(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="AI/ML Engineer">AI/ML Engineer</option>
                  <option value="Product Designer">Product Designer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Assigned Interviewer
                </label>
                <input
                  type="text"
                  value={newInterviewer}
                  onChange={(e) => setNewInterviewer(e.target.value)}
                  placeholder="e.g. Rahul Mehta (Recruiter)"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Date & Time
                </label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="e.g. Tomorrow, 2:00 PM EST"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                >
                  Confirm Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

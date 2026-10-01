"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  Search,
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
import { useInterviews, useCreateInterview, type RecruiterInterview } from "@/hooks/api/useInterviews";
import { toast } from "sonner";

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

function RecruiterInterviewsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const queryParams: { search?: string; status?: string } = {};
  if (search.trim()) queryParams.search = search.trim();
  if (statusFilter !== "All") queryParams.status = statusFilter;

  const { data: interviews = [], isLoading } = useInterviews(queryParams);

  const createInterviewMutation = useCreateInterview();

  // New Interview Form State
  const [newCandidate, setNewCandidate] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newJob, setNewJob] = useState("Senior Frontend Developer");
  const [newInterviewer, setNewInterviewer] = useState("Rahul Mehta");
  const [newDate, setNewDate] = useState("Tomorrow at 2:00 PM EST");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/abc-defg-hij");

  const filtered = interviews.filter((item) => {
    const matchesSearch =
      item.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      item.jobRole.toLowerCase().includes(search.toLowerCase()) ||
      item.interviewer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.trim()) {
      toast.error("Candidate name is required.");
      return;
    }

    try {
      const payload: Partial<RecruiterInterview> = {
        candidateName: newCandidate.trim(),
        jobRole: newJob.trim(),
        stage: "Technical Screen",
        interviewer: newInterviewer.trim(),
        dateTime: newDate.trim(),
        meetingLink: meetingLink.trim(),
        status: "Scheduled",
      };
      if (newEmail.trim()) {
        payload.candidateEmail = newEmail.trim();
      }

      await createInterviewMutation.mutateAsync(payload);

      toast.success("Interview scheduled & email notification dispatched to candidate!");
      setScheduleModalOpen(false);
      setNewCandidate("");
      setNewEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule interview.");
    }
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
              Schedule candidate interviews, assign interviewers, and send automated email reminders.
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
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-brand-blue" />
              <span>Loading interview schedules...</span>
            </div>
          ) : (
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
                  {filtered.map((item) => {
                    const initials = item.candidateInitials || item.candidateName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-8 place-items-center rounded-full bg-surface-blue text-xs font-bold text-brand-blue shrink-0">
                              {initials}
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
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No interviews found matching your criteria.
                </div>
              )}
            </div>
          )}
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
                  Candidate Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCandidate}
                  onChange={(e) => setNewCandidate(e.target.value)}
                  placeholder="e.g. Aarav Mehta"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Candidate Email (for Notification)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. candidate@example.com"
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
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue cursor-pointer"
                >
                  <option value="Senior Frontend Developer">Senior Frontend Developer</option>
                  <option value="Lead Backend Developer">Lead Backend Developer</option>
                  <option value="AI/ML Systems Engineer">AI/ML Systems Engineer</option>
                  <option value="Product Designer">Product Designer</option>
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
                  placeholder="e.g. Tomorrow at 2:00 PM EST"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
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
                  disabled={createInterviewMutation.isPending}
                  className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90 font-semibold gap-1.5"
                >
                  {createInterviewMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
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

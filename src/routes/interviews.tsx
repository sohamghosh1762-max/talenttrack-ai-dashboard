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
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Video,
  XCircle,
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
import {
  useInterviews,
  useCreateInterview,
  useUpdateInterview,
  useDeleteInterview,
} from "@/hooks/api/useInterviews";
import { useRecruiterApplications } from "@/hooks/api/useApplications";
import type { InterviewType, InterviewStatus } from "@/server/types/interview-types";
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

  // Form state
  const [selectedAppId, setSelectedAppId] = useState("");
  const [interviewTitle, setInterviewTitle] = useState("Technical Screening");
  const [interviewType, setInterviewType] = useState<InterviewType>("VIDEO");
  const [scheduledAtTime, setScheduledAtTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingUrl, setMeetingUrl] = useState("https://meet.google.com/talenttrack-live");
  const [interviewNotes, setInterviewNotes] = useState("");

  const {
    data: dbInterviews = [],
    isLoading,
    isFetching,
    refetch,
  } = useInterviews();

  const { data: applications = [] } = useRecruiterApplications();
  const createInterviewMutation = useCreateInterview();
  const updateInterviewMutation = useUpdateInterview();
  const deleteInterviewMutation = useDeleteInterview();

  const filtered = dbInterviews.filter((item) => {
    const candidateName = item.applicant?.name || "";
    const jobTitle = item.job?.title || "";
    const query = search.toLowerCase();

    const matchesSearch =
      !query ||
      candidateName.toLowerCase().includes(query) ||
      jobTitle.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Scheduled" && (item.status === "SCHEDULED" || item.status === "CONFIRMED")) ||
      (statusFilter === "Completed" && item.status === "COMPLETED") ||
      (statusFilter === "Cancelled" && item.status === "CANCELLED");

    return matchesSearch && matchesStatus;
  });

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) {
      toast.error("Please select an application for the interview");
      return;
    }

    try {
      await createInterviewMutation.mutateAsync({
        applicationId: selectedAppId,
        title: interviewTitle.trim() || "Technical Interview",
        type: interviewType,
        scheduledAt: new Date(scheduledAtTime).toISOString(),
        durationMinutes,
        meetingUrl: meetingUrl.trim(),
        instructions: interviewNotes.trim() || undefined,
      });

      setScheduleModalOpen(false);
      setSelectedAppId("");
      setInterviewNotes("");
      toast.success("Interview scheduled and invitation recorded in MongoDB!");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule interview");
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await updateInterviewMutation.mutateAsync({
        id,
        data: { status: "COMPLETED" },
      });
      toast.success("Interview marked as Completed.");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update interview");
    }
  };

  const handleCancelInterview = async (id: string) => {
    try {
      await updateInterviewMutation.mutateAsync({
        id,
        data: { status: "CANCELLED" },
      });
      toast.success("Interview cancelled.");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel interview");
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
              Schedule candidate interviews, assign interviewers, and collect evaluation feedback.
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
            <Button
              onClick={() => {
                if (applications.length > 0 && !selectedAppId) {
                  setSelectedAppId(applications[0]?.id || "");
                }
                setScheduleModalOpen(true);
              }}
              className="h-8 px-3.5 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="size-3.5 font-bold" />
              Schedule Interview
            </Button>
          </div>
        </section>

        {/* Filters and Search Bar */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, role, or title..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs overflow-x-auto w-full sm:w-auto">
            <Filter className="size-3.5 text-muted-foreground ml-1 mr-0.5" />
            {["All", "Scheduled", "Completed", "Cancelled"].map((status) => (
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

        {/* Loading State */}
        {isLoading && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading interview schedules...</p>
          </div>
        )}

        {/* Interviews Table */}
        {!isLoading && (
          <div className="dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-3 py-3">Round & Job Role</th>
                    <th className="px-3 py-3">Type & Duration</th>
                    <th className="px-3 py-3">Scheduled At</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((item) => {
                    const candidateName = item.applicant?.name || "Candidate";
                    const initials = candidateName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const jobTitle = item.job?.title || "Engineering Role";
                    const isUpcoming = item.status === "SCHEDULED" || item.status === "CONFIRMED";

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-8 place-items-center rounded-full bg-surface-blue text-xs font-bold text-brand-blue shrink-0">
                              {initials}
                            </div>
                            <div>
                              <strong className="block text-xs font-semibold text-foreground">
                                {candidateName}
                              </strong>
                              <span className="text-[10px] text-muted-foreground">
                                {item.applicant?.email || "candidate@example.com"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div>
                            <span className="font-semibold text-foreground">{item.title}</span>
                            <span className="block text-[11px] text-brand-blue">{jobTitle}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Video className="size-3 text-muted-foreground" />
                            {item.type} ({item.durationMinutes}m)
                          </span>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            {new Date(item.scheduledAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                              item.status === "SCHEDULED" || item.status === "CONFIRMED"
                                ? "bg-surface-green text-brand-green border-brand-green/20"
                                : item.status === "COMPLETED"
                                  ? "bg-surface-blue text-brand-blue border-brand-blue/20"
                                  : "bg-surface-peach text-brand-orange border-brand-orange/20"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.meetingUrl && isUpcoming && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] font-semibold text-brand-blue hover:bg-surface-blue gap-1"
                              >
                                <a href={item.meetingUrl} target="_blank" rel="noopener noreferrer">
                                  <Video className="size-3" />
                                  Join
                                </a>
                              </Button>
                            )}

                            {isUpcoming && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updateInterviewMutation.isPending}
                                  onClick={() => handleMarkComplete(item.id)}
                                  className="h-7 px-2 text-[10.5px] font-semibold text-brand-green hover:bg-surface-green gap-1"
                                >
                                  <CheckCircle2 className="size-3" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={updateInterviewMutation.isPending}
                                  onClick={() => handleCancelInterview(item.id)}
                                  className="h-7 px-2 text-[10.5px] text-destructive hover:bg-destructive/10"
                                >
                                  <XCircle className="size-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <p>No interviews found in the recruitment database.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScheduleModalOpen(true)}
                    className="text-xs"
                  >
                    Schedule an Interview
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Interview Modal */}
        <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Schedule Candidate Interview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up a validated interview round with an applicant from your pipeline.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInterview} className="space-y-3 py-2 text-xs">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Candidate Application
                </label>
                {applications.length > 0 ? (
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                    className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
                  >
                    <option value="">Select Candidate Application...</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.applicant?.name || app.applicantName || "Candidate"} — {app.job?.title || app.jobTitle || "Role"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter Application ID..."
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Interview Title / Round
                  </label>
                  <input
                    type="text"
                    required
                    value={interviewTitle}
                    onChange={(e) => setInterviewTitle(e.target.value)}
                    placeholder="e.g. Technical Deep Dive"
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Format Type
                  </label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                    className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
                  >
                    <option value="VIDEO">Video Call</option>
                    <option value="PHONE">Phone Screen</option>
                    <option value="ONSITE">On-Site</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAtTime}
                    onChange={(e) => setScheduledAtTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Meeting URL
                </label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Preparation Notes / Agenda
                </label>
                <textarea
                  rows={2}
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Focus on microservices design, concurrency, and culture fit..."
                  className="w-full rounded-md border border-input bg-card p-2 text-xs outline-none focus:border-brand-blue"
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
                  className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                >
                  {createInterviewMutation.isPending ? "Scheduling..." : "Confirm Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CheckSquare,
  Download,
  Eye,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  MoveRight,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  CandidateDetailModal,
  type CandidateModalData,
} from "@/components/dashboard/CandidateDetailModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useRecruiterApplications,
  useBulkApplicationAction,
  downloadCandidatesCsv,
} from "@/hooks/api/useApplications";
import { toast } from "sonner";

export const Route = createFileRoute("/applications")({
  head: () => ({
    meta: [
      { title: "Candidate Applications — TalentTrack AI" },
      { name: "description", content: "Review and manage candidate applications." },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [statusTab, setStatusTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("appliedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [bulkStageModalOpen, setBulkStageModalOpen] = useState(false);
  const [bulkNoteModalOpen, setBulkNoteModalOpen] = useState(false);
  const [targetBulkStage, setTargetBulkStage] = useState<string>("SCREENING");
  const [bulkNoteText, setBulkNoteText] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModalData | null>(null);

  const bulkActionMutation = useBulkApplicationAction();

  const {
    data: rawApplications = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useRecruiterApplications({
    search: search.trim() || undefined,
    stage: statusTab === "All" ? undefined : statusTab.toUpperCase(),
    sortBy,
    sortOrder,
    page,
    limit: 100,
  });

  const filteredApplications = rawApplications.filter((app) => {
    if (statusTab === "All") return true;
    const current = (app.currentStage || app.status || "").toUpperCase();
    const tabUpper = statusTab.toUpperCase();
    if (tabUpper === "SHORTLISTED") return current === "SHORTLISTED" || current === "OFFERED";
    if (tabUpper === "UNDER REVIEW") return current === "UNDER REVIEW" || current === "SCREENING";
    return current === tabUpper;
  });

  const totalFiltered = filteredApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const pagedApplications = filteredApplications.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAllPage = () => {
    const pageIds = pagedApplications.map((a) => a.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedAppIds.includes(id));
    if (allSelected) {
      setSelectedAppIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedAppIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkStageChange = async () => {
    if (selectedAppIds.length === 0) return;
    try {
      const res = await bulkActionMutation.mutateAsync({
        action: "UPDATE_STAGE",
        applicationIds: selectedAppIds,
        stage: targetBulkStage,
      });
      setBulkStageModalOpen(false);
      setSelectedAppIds([]);
      toast.success(`Moved ${res.successCount} applications to ${targetBulkStage}.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update applications");
    }
  };

  const handleBulkAddNote = async () => {
    if (selectedAppIds.length === 0 || !bulkNoteText.trim()) return;
    try {
      const res = await bulkActionMutation.mutateAsync({
        action: "ADD_NOTE",
        applicationIds: selectedAppIds,
        note: bulkNoteText.trim(),
      });
      setBulkNoteModalOpen(false);
      setBulkNoteText("");
      setSelectedAppIds([]);
      toast.success(`Note saved to ${res.successCount} applications.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add shared note");
    }
  };

  const handleExportCsv = async () => {
    try {
      toast.info("Exporting applications dataset...");
      await downloadCandidatesCsv({
        search: search.trim() || undefined,
        stage: statusTab === "All" ? undefined : statusTab.toUpperCase(),
      });
      toast.success("CSV export downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export applications.");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SHORTLISTED":
      case "OFFERED":
        return "bg-surface-green text-brand-green border-brand-green/30";
      case "UNDER REVIEW":
      case "SCREENING":
        return "bg-surface-blue text-brand-blue border-brand-blue/30";
      case "INTERVIEW":
        return "bg-surface-purple text-brand-purple border-brand-purple/30";
      case "REJECTED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getScoreStyle = (score: number) => {
    if (score >= 90) return "bg-surface-green text-brand-green border-brand-green/20";
    if (score >= 70) return "bg-surface-purple text-brand-purple border-brand-purple/20";
    return "bg-surface-peach text-brand-orange border-brand-orange/20";
  };

  const isAllPageSelected =
    pagedApplications.length > 0 &&
    pagedApplications.every((a) => selectedAppIds.includes(a.id));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-green text-brand-green">
                <Users className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Applications</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Review and manage candidate applications submitted for your active job postings.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
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
            <span className="rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20">
              {totalFiltered} Active Applicants
            </span>
          </div>
        </section>

        {/* Filter bar */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by name, role, or skill..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <Filter className="size-3.5 text-muted-foreground ml-1 shrink-0" />
              {["All", "Shortlisted", "Under Review", "Interview", "Applied"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setStatusTab(tab);
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusTab === tab
                      ? "bg-card text-brand-blue shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
              <ArrowUpDown className="size-3" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split("-");
                  if (f && o) {
                    setSortBy(f);
                    setSortOrder(o as "asc" | "desc");
                  }
                }}
                className="rounded border border-input bg-card px-2 py-1 text-[11px] text-foreground"
              >
                <option value="appliedAt-desc">Latest Application</option>
                <option value="appliedAt-asc">Earliest Application</option>
                <option value="aiScore-desc">Highest AI Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Sticky Bar */}
        {selectedAppIds.length > 0 && (
          <div className="sticky top-2 z-20 flex items-center justify-between p-3 rounded-xl bg-brand-blue text-primary-foreground shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckSquare className="size-4" />
              <span>{selectedAppIds.length} applications selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkStageModalOpen(true)}
                className="h-7 text-xs font-semibold gap-1"
              >
                <MoveRight className="size-3.5" />
                Move Stage
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkNoteModalOpen(true)}
                className="h-7 text-xs font-semibold gap-1"
              >
                <MessageSquare className="size-3.5" />
                Add Shared Note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedAppIds([])}
                className="h-7 text-xs text-primary-foreground/90 hover:text-white"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground">Loading candidate applications...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/30">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Failed to load applications</h3>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button size="sm" onClick={() => refetch()} className="text-xs bg-brand-blue">
              Retry
            </Button>
          </div>
        )}

        {/* Candidate Applications Table */}
        {!isLoading && !error && (
          <div className="dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <button
                        type="button"
                        onClick={toggleSelectAllPage}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isAllPageSelected ? (
                          <CheckSquare className="size-4 text-brand-blue" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3">Candidate</th>
                    <th className="px-3 py-3">Job Applied For</th>
                    <th className="px-3 py-3">AI Match Score</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Applied On</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {pagedApplications.map((app, i) => {
                    const candidateName = app.applicant?.name || app.applicantName || "Candidate";
                    const candidateEmail =
                      app.applicant?.email || app.applicantEmail || "applicant@example.com";
                    const candidatePhone = app.applicant?.phone || "+1 (555) 234-5678";
                    const candidateLocation = app.applicant?.location || "San Francisco, CA";
                    const candidateInitials =
                      app.applicant?.initials ||
                      candidateName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                    const jobTitle = app.job?.title || app.jobTitle || "Job Position";
                    const score = app.aiScore ?? 88;
                    const appliedDateStr = new Date(app.appliedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    const modalData: CandidateModalData = {
                      id: app.id,
                      name: candidateName,
                      email: candidateEmail,
                      phone: candidatePhone,
                      job: jobTitle,
                      location: candidateLocation,
                      score,
                      status: app.status,
                      currentStage: app.currentStage,
                      initials: candidateInitials,
                      appliedOn: appliedDateStr,
                      skills: app.applicant?.skills || ["React", "TypeScript", "Node.js"],
                      resumeId: app.resumeId || app.resume?.id,
                      resumeFileName: app.resume?.originalFileName,
                    };

                    const isSelected = selectedAppIds.includes(app.id);

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedCandidate(modalData)}
                        className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                          isSelected ? "bg-surface-blue/20" : ""
                        }`}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(app.id)}
                            className="text-muted-foreground hover:text-brand-blue"
                          >
                            {isSelected ? (
                              <CheckSquare className="size-4 text-brand-blue" />
                            ) : (
                              <Square className="size-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`grid size-8 place-items-center rounded-full text-xs font-bold shrink-0 ${
                                i % 2 === 0
                                  ? "bg-surface-blue text-brand-blue"
                                  : "bg-surface-purple text-brand-purple"
                              }`}
                            >
                              {candidateInitials}
                            </span>
                            <div>
                              <strong className="block text-xs font-semibold text-foreground">
                                {candidateName}
                              </strong>
                              <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Mail className="size-2.5" />
                                  {candidateEmail}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{jobTitle}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${getScoreStyle(
                              score,
                            )}`}
                          >
                            <Sparkles className="size-2.5" />
                            {score}%
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold border ${getStatusStyle(
                              app.currentStage || app.status,
                            )}`}
                          >
                            {app.currentStage || app.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" />
                            {appliedDateStr}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[10.5px] font-semibold text-brand-blue hover:bg-surface-blue"
                            onClick={() => setSelectedCandidate(modalData)}
                          >
                            <Eye className="size-3 mr-1" />
                            Profile
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredApplications.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No applications found for the selected filter.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border/60 text-xs">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages} ({totalFiltered} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 px-2.5 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Move Modal */}
        <Dialog open={bulkStageModalOpen} onOpenChange={setBulkStageModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Move Selected Applications</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update recruitment stage for {selectedAppIds.length} candidate applications.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2 text-xs">
              <label className="font-semibold text-foreground">Target Recruitment Stage:</label>
              <select
                value={targetBulkStage}
                onChange={(e) => setTargetBulkStage(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
              >
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFERED">Offered</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBulkStageModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={bulkActionMutation.isPending}
                onClick={handleBulkStageChange}
                className="bg-brand-blue text-primary-foreground"
              >
                {bulkActionMutation.isPending ? "Updating..." : "Confirm Move"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Add Note Modal */}
        <Dialog open={bulkNoteModalOpen} onOpenChange={setBulkNoteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add Shared Internal Note</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Append an internal note to {selectedAppIds.length} applications.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2 text-xs">
              <Textarea
                value={bulkNoteText}
                onChange={(e) => setBulkNoteText(e.target.value)}
                placeholder="Log internal batch note..."
                rows={3}
              />
            </div>
            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBulkNoteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={bulkActionMutation.isPending || !bulkNoteText.trim()}
                onClick={handleBulkAddNote}
                className="bg-brand-blue text-primary-foreground"
              >
                {bulkActionMutation.isPending ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          candidate={selectedCandidate}
          open={selectedCandidate !== null}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
          onStageUpdated={() => refetch()}
        />
      </div>
    </DashboardLayout>
  );
}

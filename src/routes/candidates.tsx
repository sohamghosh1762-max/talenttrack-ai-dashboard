"use client";

import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Check,
  CheckSquare,
  CircleUserRound,
  Download,
  Eye,
  Filter,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  MoveRight,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  X,
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
import { useCandidates } from "@/hooks/api/useCandidates";
import { useBulkApplicationAction, downloadCandidatesCsv } from "@/hooks/api/useApplications";
import { type Applicant } from "@/data/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "Candidate Talent Pool — TalentTrack AI" },
      {
        name: "description",
        content: "Search, filter, and manage your complete candidate database.",
      },
    ],
  }),
  component: CandidatesPage,
});

const PIPELINE_STAGES = [
  { value: "ALL", label: "All Stages" },
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFERED", label: "Offered" },
  { value: "REJECTED", label: "Rejected" },
];

const SKILL_OPTIONS = [
  "All",
  "React",
  "TypeScript",
  "Python",
  "Node.js",
  "Kubernetes",
  "Docker",
  "SQL",
  "GraphQL",
];

const SCORE_OPTIONS = [
  { value: 0, label: "Any Score" },
  { value: 85, label: "85%+ (Top Tier)" },
  { value: 75, label: "75%+ (Strong Match)" },
  { value: 65, label: "65%+ (Acceptable)" },
];

function CandidatesPage() {
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("All");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Selection & Bulk Actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [bulkStageModalOpen, setBulkStageModalOpen] = useState(false);
  const [bulkNoteModalOpen, setBulkNoteModalOpen] = useState(false);
  const [targetBulkStage, setTargetBulkStage] = useState<string>("SCREENING");
  const [bulkNoteText, setBulkNoteText] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModalData | null>(null);

  const bulkActionMutation = useBulkApplicationAction();

  const {
    data: candidatesResponse,
    isLoading,
    isFetching,
    refetch,
  } = useCandidates({
    search: search.trim() || undefined,
    skill: selectedSkill === "All" ? undefined : selectedSkill,
    stage: selectedStage === "ALL" ? undefined : selectedStage,
    minScore: minScore > 0 ? minScore : undefined,
    sortBy,
    sortOrder,
    page,
    limit: pageSize,
  });

  const candidatesList = candidatesResponse?.candidates || [];
  const pagination = candidatesResponse?.pagination;
  const totalCount = pagination?.total ?? candidatesList.length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

  // Handle active filter indicators
  const hasActiveFilters =
    search.trim() !== "" ||
    selectedSkill !== "All" ||
    selectedStage !== "ALL" ||
    minScore > 0 ||
    sortBy !== "createdAt";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedSkill("All");
    setSelectedStage("ALL");
    setMinScore(0);
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    setSelectedCandidateIds([]);
  };

  const toggleSelectAllPage = () => {
    const pageIds = candidatesList.map((c) => c.id);
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedCandidateIds.includes(id));
    if (allSelected) {
      setSelectedCandidateIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedCandidateIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkStageChange = async () => {
    if (selectedCandidateIds.length === 0) return;
    try {
      const res = await bulkActionMutation.mutateAsync({
        action: "UPDATE_STAGE",
        applicationIds: selectedCandidateIds,
        stage: targetBulkStage,
      });
      setBulkStageModalOpen(false);
      setSelectedCandidateIds([]);
      toast.success(
        `Bulk stage update finished: ${res.successCount} succeeded, ${res.failureCount} failed.`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute bulk stage update");
    }
  };

  const handleBulkAddNote = async () => {
    if (selectedCandidateIds.length === 0 || !bulkNoteText.trim()) return;
    try {
      const res = await bulkActionMutation.mutateAsync({
        action: "ADD_NOTE",
        applicationIds: selectedCandidateIds,
        note: bulkNoteText.trim(),
      });
      setBulkNoteModalOpen(false);
      setBulkNoteText("");
      setSelectedCandidateIds([]);
      toast.success(`Shared note added to ${res.successCount} candidate applications.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add bulk note");
    }
  };

  const handleExportCsv = async () => {
    try {
      toast.info("Generating secure candidates export...");
      await downloadCandidatesCsv({
        search: search.trim() || undefined,
        stage: selectedStage === "ALL" ? undefined : selectedStage,
        jobId: undefined,
      });
      toast.success("Candidate export downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download candidates CSV.");
    }
  };

  const isAllPageSelected =
    candidatesList.length > 0 && candidatesList.every((c) => selectedCandidateIds.includes(c.id));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-purple text-brand-purple">
                <CircleUserRound className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                Candidates Talent Pool
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Search, filter, and manage applicant profiles across all vacancies.
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
            <span className="rounded-lg bg-surface-purple px-3 py-1.5 text-xs font-semibold text-brand-purple border border-brand-purple/20">
              {totalCount} Candidates Found
            </span>
          </div>
        </section>

        {/* Filter Bar */}
        <div className="dashboard-card p-3.5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by candidate name, email, skills, or headline..."
                className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
              />
            </div>

            {/* Stage Filter */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    Stage: {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Score Filter */}
            <div>
              <select
                value={minScore}
                onChange={(e) => {
                  setMinScore(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
              >
                {SCORE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    AI Match: {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub Filters: Skills, Sorting & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
                Skills:
              </span>
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    setSelectedSkill(skill);
                    setPage(1);
                  }}
                  className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors shrink-0 ${
                    selectedSkill === skill
                      ? "bg-brand-blue text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ArrowUpDown className="size-3" />
                <span>Sort:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [f, o] = e.target.value.split("-");
                    if (f && o) {
                      setSortBy(f);
                      setSortOrder(o as "asc" | "desc");
                    }
                  }}
                  className="rounded border border-input bg-card px-1.5 py-0.5 text-[11px] text-foreground"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="score-desc">Highest AI Score</option>
                  <option value="name-asc">Name (A-Z)</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-semibold text-destructive hover:underline flex items-center gap-0.5"
                >
                  <X className="size-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selection & Bulk Actions Floating Bar */}
        {selectedCandidateIds.length > 0 && (
          <div className="sticky top-2 z-20 flex items-center justify-between p-3 rounded-xl bg-brand-blue text-primary-foreground shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckSquare className="size-4" />
              <span>{selectedCandidateIds.length} candidates selected</span>
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
                onClick={() => setSelectedCandidateIds([])}
                className="h-7 text-xs text-primary-foreground/90 hover:text-white"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="dashboard-card p-16 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">
              Loading candidate talent pool...
            </p>
          </div>
        )}

        {/* Candidate Cards Grid */}
        {!isLoading && (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <button
                type="button"
                onClick={toggleSelectAllPage}
                className="flex items-center gap-1.5 hover:text-foreground font-medium cursor-pointer"
              >
                {isAllPageSelected ? (
                  <CheckSquare className="size-4 text-brand-blue" />
                ) : (
                  <Square className="size-4 text-muted-foreground" />
                )}
                <span>Select all on page ({candidatesList.length})</span>
              </button>
              <span>
                Showing {candidatesList.length} of {totalCount} records
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {candidatesList.map((candidate, i) => {
                const isSelected = selectedCandidateIds.includes(candidate.id);

                return (
                  <div
                    key={candidate.id}
                    className={`dashboard-card flex flex-col justify-between p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-2 ${
                      isSelected
                        ? "border-brand-blue ring-1 ring-brand-blue/30 bg-surface-blue/20"
                        : "border-border/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleSelectCandidate(candidate.id)}
                            className="text-muted-foreground hover:text-brand-blue focus:outline-none"
                          >
                            {isSelected ? (
                              <CheckSquare className="size-4 text-brand-blue" />
                            ) : (
                              <Square className="size-4" />
                            )}
                          </button>
                          <div
                            className={`grid size-9 place-items-center rounded-full text-xs font-bold ${
                              i % 2 === 0
                                ? "bg-surface-blue text-brand-blue"
                                : "bg-surface-purple text-brand-purple"
                            }`}
                          >
                            {candidate.initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-foreground truncate">
                              {candidate.name}
                            </h3>
                            <p className="text-[10.5px] font-medium text-brand-blue truncate">
                              {candidate.job}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                            candidate.score >= 90
                              ? "bg-surface-green text-brand-green"
                              : candidate.score >= 70
                                ? "bg-surface-purple text-brand-purple"
                                : "bg-surface-peach text-brand-orange"
                          }`}
                        >
                          <Sparkles className="size-2.5" />
                          {candidate.score}%
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate text-[11px]">
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{candidate.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPin className="size-3 shrink-0" />
                          <span>{candidate.location || "Remote"}</span>
                        </div>
                      </div>

                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              +{candidate.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-2.5">
                      <span className="rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-2 py-0.5 text-[9.5px] font-bold">
                        {candidate.currentStage || candidate.status || "APPLIED"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6.5 text-[11px] font-semibold text-brand-blue hover:bg-surface-blue gap-1"
                        onClick={() =>
                          setSelectedCandidate({
                            id: candidate.id,
                            name: candidate.name,
                            email: candidate.email,
                            job: candidate.job,
                            score: candidate.score,
                            status: candidate.status,
                            currentStage: candidate.currentStage,
                            initials: candidate.initials,
                            skills: candidate.skills,
                            resumeId: candidate.resumeId,
                          })
                        }
                      >
                        <Eye className="size-3" />
                        Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {candidatesList.length === 0 && (
              <div className="dashboard-card p-12 text-center text-xs text-muted-foreground">
                No candidates matched your search and filter criteria.
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
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
          </>
        )}

        {/* Bulk Move Stage Modal */}
        <Dialog open={bulkStageModalOpen} onOpenChange={setBulkStageModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Move Selected Candidates</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Transition {selectedCandidateIds.length} selected candidate applications to a new
                recruitment stage.
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
              <DialogTitle className="text-base font-bold">Add Shared Recruiter Note</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Append an internal note to {selectedCandidateIds.length} selected applications.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2 text-xs">
              <Textarea
                value={bulkNoteText}
                onChange={(e) => setBulkNoteText(e.target.value)}
                placeholder="Log internal batch note (e.g., Shortlisted during Q4 hiring review)..."
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
                {bulkActionMutation.isPending ? "Saving..." : "Add Note to All"}
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

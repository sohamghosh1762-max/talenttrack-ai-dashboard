"use client";

import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileSearch,
  Filter,
  GripVertical,
  Loader2,
  Mail,
  MoreHorizontal,
  MoveRight,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  UserMinus,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CandidateDetailModal, type CandidateModalData } from "@/components/dashboard/CandidateDetailModal";
import { useRecruiterApplications, useUpdateApplicationStage } from "@/hooks/api/useApplications";
import type { IApplication } from "@/server/types/application-types";
import { toast } from "sonner";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Hiring Pipeline — TalentTrack AI" },
      { name: "description", content: "Track and manage candidates through your hiring pipeline stages." },
    ],
  }),
  component: PipelinePage,
});

interface PipelineStageDef {
  key: string;
  label: string;
  description: string;
  icon: any;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  toneClass: string;
  isTerminal?: boolean;
}

const PIPELINE_STAGES: PipelineStageDef[] = [
  {
    key: "APPLIED",
    label: "Applied",
    description: "New incoming submissions",
    icon: BarChart3,
    bgClass: "bg-surface-blue/70",
    borderClass: "border-brand-blue/30",
    badgeClass: "bg-surface-blue text-brand-blue border-brand-blue/30",
    toneClass: "text-brand-blue",
  },
  {
    key: "SCREENING",
    label: "Screening",
    description: "AI review & initial vetting",
    icon: FileSearch,
    bgClass: "bg-surface-purple/70",
    borderClass: "border-brand-purple/30",
    badgeClass: "bg-surface-purple text-brand-purple border-brand-purple/30",
    toneClass: "text-brand-purple",
  },
  {
    key: "INTERVIEW",
    label: "Interview",
    description: "Technical & culture rounds",
    icon: UserRound,
    bgClass: "bg-surface-peach/70",
    borderClass: "border-brand-orange/30",
    badgeClass: "bg-surface-peach text-brand-orange border-brand-orange/30",
    toneClass: "text-brand-orange",
  },
  {
    key: "OFFERED",
    label: "Offered",
    description: "Offer extended / pending acceptance",
    icon: BriefcaseBusiness,
    bgClass: "bg-surface-green/70",
    borderClass: "border-brand-green/30",
    badgeClass: "bg-surface-green text-brand-green border-brand-green/30",
    toneClass: "text-brand-green",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    description: "Candidate not selected",
    icon: XCircle,
    bgClass: "bg-surface-pink/70",
    borderClass: "border-brand-red/30",
    badgeClass: "bg-surface-pink text-brand-red border-brand-red/30",
    toneClass: "text-brand-red",
    isTerminal: true,
  },
  {
    key: "WITHDRAWN",
    label: "Withdrawn",
    description: "Application withdrawn by candidate",
    icon: UserMinus,
    bgClass: "bg-muted/70",
    borderClass: "border-border",
    badgeClass: "bg-muted text-muted-foreground border-border",
    toneClass: "text-muted-foreground",
    isTerminal: true,
  },
];

function PipelinePage() {
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("ALL");
  const [showTerminalStages, setShowTerminalStages] = useState<boolean>(true);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModalData | null>(null);

  const {
    data: applications = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useRecruiterApplications({
    search: search.trim() || undefined,
  });

  const updateStageMutation = useUpdateApplicationStage();

  // Extract unique jobs for filter dropdown
  const availableJobs = useMemo(() => {
    const jobMap = new Map<string, string>();
    for (const app of applications) {
      if (app.jobId && (app.job?.title || app.jobTitle)) {
        jobMap.set(app.jobId, app.job?.title || app.jobTitle || "Job");
      }
    }
    return Array.from(jobMap.entries()).map(([id, title]) => ({ id, title }));
  }, [applications]);

  // Filtered application list based on job filter
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (selectedJob !== "ALL" && app.jobId !== selectedJob) {
        return false;
      }
      return true;
    });
  }, [applications, selectedJob]);

  // Group applications by stage (canonical uppercase enum)
  const applicationsByStage = useMemo(() => {
    const grouped: Record<string, IApplication[]> = {
      APPLIED: [],
      SCREENING: [],
      INTERVIEW: [],
      OFFERED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };

    for (const app of filteredApplications) {
      const rawStage = (app.currentStage || app.status || "APPLIED").toUpperCase();
      let targetStage = "APPLIED";

      if (rawStage === "SCREENING" || rawStage === "UNDER REVIEW") {
        targetStage = "SCREENING";
      } else if (rawStage === "INTERVIEW") {
        targetStage = "INTERVIEW";
      } else if (rawStage === "OFFERED" || rawStage === "SHORTLISTED") {
        targetStage = "OFFERED";
      } else if (rawStage === "REJECTED") {
        targetStage = "REJECTED";
      } else if (rawStage === "WITHDRAWN") {
        targetStage = "WITHDRAWN";
      } else {
        targetStage = "APPLIED";
      }

      if (!grouped[targetStage]) {
        grouped[targetStage] = [];
      }
      grouped[targetStage]!.push(app);
    }

    return grouped;
  }, [filteredApplications]);

  const displayedStages = useMemo(() => {
    return showTerminalStages
      ? PIPELINE_STAGES
      : PIPELINE_STAGES.filter((s) => !s.isTerminal);
  }, [showTerminalStages]);

  const handleMoveStage = async (applicationId: string, targetStage: string) => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;

    const currentCanonical = (app.currentStage || app.status || "APPLIED").toUpperCase();
    if (currentCanonical === targetStage) return;

    try {
      await updateStageMutation.mutateAsync({
        applicationId,
        stage: targetStage,
      });
      const stageName = PIPELINE_STAGES.find((s) => s.key === targetStage)?.label || targetStage;
      toast.success(`Candidate moved to ${stageName}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update pipeline stage");
    }
  };

  const getCandidateScore = (app: IApplication) => app.aiScore ?? 88;

  const getScoreStyle = (score: number) => {
    if (score >= 90) return "bg-surface-green text-brand-green border-brand-green/20";
    if (score >= 70) return "bg-surface-purple text-brand-purple border-brand-purple/20";
    return "bg-surface-peach text-brand-orange border-brand-orange/20";
  };

  const openCandidateModal = (app: IApplication) => {
    const candidateName = app.applicant?.name || app.applicantName || "Candidate";
    const candidateEmail = app.applicant?.email || app.applicantEmail || "candidate@example.com";
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
    const appliedDateStr = new Date(app.appliedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const modalData: CandidateModalData = {
      id: app.id,
      applicationId: app.id,
      name: candidateName,
      email: candidateEmail,
      phone: candidatePhone,
      job: jobTitle,
      jobTitle,
      location: candidateLocation,
      score: getCandidateScore(app),
      aiScore: getCandidateScore(app),
      status: app.status,
      currentStage: app.currentStage,
      stage: app.currentStage,
      initials: candidateInitials,
      appliedOn: appliedDateStr,
      skills: app.applicant?.skills || ["React", "TypeScript", "Node.js"],
      summary: app.notes || app.coverLetter,
      coverLetter: app.coverLetter,
      resumeId: app.resumeId || app.resume?.id,
      resumeFileName: app.resume?.originalFileName,
    };

    setSelectedCandidate(modalData);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-peach text-brand-orange shadow-2xs">
                <SlidersHorizontal className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl tracking-tight">
                Hiring Pipeline
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Live recruiter Kanban board. Drag & drop candidates across persistent pipeline stages.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant={showTerminalStages ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowTerminalStages((prev) => !prev)}
              className="h-8 text-xs gap-1 cursor-pointer"
            >
              <Filter className="size-3" />
              {showTerminalStages ? "Hide Terminal (Rejected/Withdrawn)" : "Show All Stages"}
            </Button>
            <span className="rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20">
              {filteredApplications.length} Candidates
            </span>
          </div>
        </section>

        {/* Filters and Search Bar */}
        <div className="dashboard-card p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, role, or skill..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <BriefcaseBusiness className="size-3.5" />
              Filter Job:
            </span>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              aria-label="Filter by Job Opening"
              className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue cursor-pointer"
            >
              <option value="ALL">All Jobs ({applications.length})</option>
              {availableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="dashboard-card p-16 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading live pipeline records...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/30">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Failed to load hiring pipeline</h3>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button size="sm" onClick={() => refetch()} className="text-xs bg-brand-blue">
              Retry
            </Button>
          </div>
        )}

        {/* Pipeline Kanban Stage Columns */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-6">
            {displayedStages.map((stage) => {
              const stageApps = applicationsByStage[stage.key] || [];
              const isOver = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverStage !== stage.key) {
                      setDragOverStage(stage.key);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStage(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    const appId = e.dataTransfer.getData("text/plain") || draggedAppId;
                    if (appId) {
                      handleMoveStage(appId, stage.key);
                    }
                  }}
                  className={`dashboard-card flex flex-col min-w-[240px] rounded-xl bg-card overflow-hidden transition-all duration-200 border-2 ${
                    isOver
                      ? "border-brand-blue ring-2 ring-brand-blue/30 shadow-md scale-[1.01]"
                      : "border-border/70"
                  }`}
                >
                  {/* Stage Header */}
                  <div
                    className={`flex items-center justify-between p-3 border-b border-border/60 ${stage.bgClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <stage.icon className={`size-4 ${stage.toneClass}`} />
                      <div>
                        <span className={`text-xs font-bold ${stage.toneClass}`}>
                          {stage.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold shadow-2xs border ${stage.badgeClass}`}
                    >
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Candidate Cards Column Area */}
                  <div className="p-2.5 space-y-2.5 min-h-[350px] bg-muted/15">
                    {stageApps.map((app) => {
                      const candidateName = app.applicant?.name || app.applicantName || "Candidate";
                      const candidateEmail = app.applicant?.email || app.applicantEmail || "applicant@example.com";
                      const jobTitle = app.job?.title || app.jobTitle || "Job Position";
                      const score = getCandidateScore(app);
                      const isCurrentlyDragged = draggedAppId === app.id;

                      return (
                        <div
                          key={app.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", app.id);
                            setDraggedAppId(app.id);
                          }}
                          onDragEnd={() => {
                            setDraggedAppId(null);
                            setDragOverStage(null);
                          }}
                          className={`group relative rounded-lg border border-border bg-card p-3 shadow-2xs transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-brand-blue/40 ${
                            isCurrentlyDragged ? "opacity-40 scale-95 border-dashed border-brand-blue" : ""
                          }`}
                        >
                          {/* Drag Handle & Header */}
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <GripVertical className="size-3 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground" />
                              <strong className="text-xs font-bold text-foreground truncate block">
                                {candidateName}
                              </strong>
                            </div>
                            <span
                              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0 ${getScoreStyle(
                                score,
                              )}`}
                            >
                              <Sparkles className="size-2" />
                              {score}%
                            </span>
                          </div>

                          <p className="text-[10.5px] text-muted-foreground font-medium mb-1.5 truncate">
                            {jobTitle}
                          </p>

                          {/* Candidate Skills tags if present */}
                          {app.applicant?.skills && app.applicant.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2.5">
                              {app.applicant.skills.slice(0, 2).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                                >
                                  {skill}
                                </span>
                              ))}
                              {app.applicant.skills.length > 2 && (
                                <span className="text-[9px] text-muted-foreground font-medium self-center">
                                  +{app.applicant.skills.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => openCandidateModal(app)}
                              className="flex items-center gap-1 font-semibold text-brand-blue hover:underline cursor-pointer"
                            >
                              <Eye className="size-3" />
                              Details
                            </button>

                            {/* Stage Move Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors cursor-pointer"
                                  title="Change candidate stage"
                                >
                                  <span>Move</span>
                                  <ChevronDown className="size-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">
                                  Move candidate to:
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {PIPELINE_STAGES.map((s) => (
                                  <DropdownMenuItem
                                    key={s.key}
                                    disabled={stage.key === s.key || updateStageMutation.isPending}
                                    onClick={() => handleMoveStage(app.id, s.key)}
                                    className={`flex items-center justify-between cursor-pointer ${
                                      stage.key === s.key ? "opacity-50 font-bold" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <s.icon className={`size-3.5 ${s.toneClass}`} />
                                      <span>{s.label}</span>
                                    </div>
                                    {stage.key === s.key && (
                                      <CheckCircle2 className="size-3 text-brand-green" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}

                    {stageApps.length === 0 && (
                      <div className="py-12 px-2 text-center rounded-lg border border-dashed border-border/60 bg-card/40 flex flex-col items-center justify-center gap-1">
                        <Users className="size-4 text-muted-foreground/40" />
                        <span className="text-[10.5px] text-muted-foreground italic font-medium">
                          No candidates in {stage.label}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground/60">
                          Drop candidate cards here
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          candidate={selectedCandidate}
          open={selectedCandidate !== null}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
          onStageUpdated={() => {
            refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
}

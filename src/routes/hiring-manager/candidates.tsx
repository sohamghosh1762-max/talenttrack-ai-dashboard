"use client";

import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  Users,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHiringManagerCandidates } from "@/hooks/api/useHiringManager";
import { FeedbackModal } from "@/components/hiring-manager/FeedbackModal";
import { DecisionModal } from "@/components/hiring-manager/DecisionModal";

export const Route = createFileRoute("/hiring-manager/candidates")({
  head: () => ({
    meta: [
      { title: "Candidates Review — Hiring Manager" },
      {
        name: "description",
        content: "Review and evaluate candidates assigned to your job positions.",
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    jobId?: string | undefined;
    stage?: string | undefined;
  } => {
    return {
      jobId: typeof search["jobId"] === "string" ? search["jobId"] : undefined,
      stage: typeof search["stage"] === "string" ? search["stage"] : undefined,
    };
  },
  component: HiringManagerCandidatesPage,
});

function HiringManagerCandidatesPage() {
  const searchParams = useSearch({ from: "/hiring-manager/candidates" });
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>(searchParams.stage || "ALL");
  const [selectedDecision, setSelectedDecision] = useState<string>("ALL");

  const { data, isLoading, error, refetch, isFetching } = useHiringManagerCandidates({
    jobId: searchParams.jobId,
    stage: selectedStage === "ALL" ? undefined : selectedStage,
  });

  const [feedbackCandidate, setFeedbackCandidate] = useState<{
    id: string;
    name: string;
    jobTitle: string;
  } | null>(null);

  const [decisionCandidate, setDecisionCandidate] = useState<{
    id: string;
    name: string;
    jobTitle: string;
    type: "APPROVED" | "REJECTED";
  } | null>(null);

  const candidates = data?.candidates || [];

  const filteredCandidates = candidates.filter((cand) => {
    const matchesSearch =
      !searchQuery.trim() ||
      cand.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.skills?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDecision =
      selectedDecision === "ALL" ||
      (selectedDecision === "DECIDED" && !!cand.decision) ||
      (selectedDecision === "PENDING" && !cand.decision) ||
      (selectedDecision === "APPROVED" &&
        (cand.decision?.status === "APPROVED" || (cand.decision as any) === "APPROVED")) ||
      (selectedDecision === "REJECTED" &&
        (cand.decision?.status === "REJECTED" || (cand.decision as any) === "REJECTED"));

    return matchesSearch && matchesDecision;
  });

  const stages = [
    "ALL",
    "APPLIED",
    "SCREENING",
    "SHORTLISTED",
    "INTERVIEW",
    "OFFERED",
    "HIRED",
    "REJECTED",
  ];

  return (
    <HiringManagerLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Candidate Evaluation & Review
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Review applicant resumes, ATS breakdowns, and record hiring decisions for your open
              roles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
          {/* Stage pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Stage:</span>
            {stages.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStage(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStage === st
                    ? "bg-brand-blue text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL" ? "All Stages" : st}
              </button>
            ))}
          </div>

          {/* Decision state filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">Decision:</span>
            <select
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
              className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:border-brand-blue"
            >
              <option value="ALL">All Decisions</option>
              <option value="PENDING">Pending Decision</option>
              <option value="APPROVED">Approved Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load candidates. Please try again.</span>
          </div>
        )}

        {/* Candidates Table / List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <Users className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No candidates match your criteria</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Try selecting a different pipeline stage or clearing your search keywords.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-card hover:border-brand-blue/40 transition-all shadow-xs"
              >
                {/* Left info */}
                <div className="flex items-start gap-4">
                  <div className="grid size-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm shrink-0">
                    {cand.candidateName.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to="/hiring-manager/candidates/$candidateId"
                        params={{ candidateId: cand.id }}
                        className="text-base font-bold text-foreground hover:text-brand-blue transition-colors"
                      >
                        {cand.candidateName}
                      </Link>

                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                        {cand.stage}
                      </span>

                      {(cand.decision?.status === "APPROVED" ||
                        (cand.decision as any) === "APPROVED") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <ThumbsUp className="size-3" /> Approved
                        </span>
                      )}

                      {(cand.decision?.status === "REJECTED" ||
                        (cand.decision as any) === "REJECTED") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <ThumbsDown className="size-3" /> Rejected
                        </span>
                      )}

                      {cand.hasFeedback && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <MessageSquare className="size-3" /> {cand.feedbackCount} feedback notes
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">
                      Applied for <strong className="text-foreground">{cand.jobTitle}</strong> •{" "}
                      {cand.department}
                    </p>

                    {/* Key skills */}
                    {cand.skills && cand.skills.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {cand.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-blue text-brand-blue"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right metrics and actions */}
                <div className="flex items-center gap-3 shrink-0 self-end lg:self-center flex-wrap">
                  {cand.atsScore !== undefined && (
                    <div className="text-right px-3 py-1.5 rounded-xl bg-muted/40 border border-border">
                      <div className="text-sm font-black text-foreground">{cand.atsScore}%</div>
                      <div className="text-[9.5px] text-muted-foreground">ATS Match</div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFeedbackCandidate({
                        id: cand.id,
                        name: cand.candidateName,
                        jobTitle: cand.jobTitle,
                      })
                    }
                    className="text-xs h-9 gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    <span>Feedback</span>
                  </Button>

                  {!cand.decision && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDecisionCandidate({
                            id: cand.id,
                            name: cand.candidateName,
                            jobTitle: cand.jobTitle,
                            type: "APPROVED",
                          })
                        }
                        className="text-xs h-9 gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <ThumbsUp className="size-3.5" />
                        <span>Approve</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDecisionCandidate({
                            id: cand.id,
                            name: cand.candidateName,
                            jobTitle: cand.jobTitle,
                            type: "REJECTED",
                          })
                        }
                        className="text-xs h-9 gap-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <ThumbsDown className="size-3.5" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/hiring-manager/candidates/$candidateId",
                        params: { candidateId: cand.id },
                      })
                    }
                    className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs h-9 gap-1.5 cursor-pointer"
                  >
                    <span>Full Profile</span>
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Structured Feedback Modal */}
      {feedbackCandidate && (
        <FeedbackModal
          open={!!feedbackCandidate}
          onOpenChange={(open) => !open && setFeedbackCandidate(null)}
          candidateId={feedbackCandidate.id}
          candidateName={feedbackCandidate.name}
          jobTitle={feedbackCandidate.jobTitle}
          onSuccess={() => {
            setFeedbackCandidate(null);
            refetch();
          }}
        />
      )}

      {/* Quick Decision Modal */}
      {decisionCandidate && (
        <DecisionModal
          open={!!decisionCandidate}
          onOpenChange={(open) => !open && setDecisionCandidate(null)}
          candidateId={decisionCandidate.id}
          candidateName={decisionCandidate.name}
          jobTitle={decisionCandidate.jobTitle}
          decisionType={decisionCandidate.type}
          onSuccess={() => {
            setDecisionCandidate(null);
            refetch();
          }}
        />
      )}
    </HiringManagerLayout>
  );
}

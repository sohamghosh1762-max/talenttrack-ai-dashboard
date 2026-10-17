"use client";

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
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

export const Route = createFileRoute("/hiring-manager/shortlisted")({
  head: () => ({
    meta: [
      { title: "Shortlisted Candidates — Hiring Manager" },
      {
        name: "description",
        content: "Review top shortlisted candidates for your open positions.",
      },
    ],
  }),
  component: HiringManagerShortlistedPage,
});

function HiringManagerShortlistedPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useHiringManagerCandidates({
    stage: "SHORTLISTED",
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
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cand.candidateName.toLowerCase().includes(q) ||
      cand.jobTitle.toLowerCase().includes(q) ||
      cand.department.toLowerCase().includes(q) ||
      cand.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <HiringManagerLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <CheckCircle2 className="size-6 text-emerald-500" />
              <span>Shortlisted Candidates</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              High-match applicants advanced to the Shortlist stage for your team's evaluation.
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

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load shortlisted candidates. Please try again.</span>
          </div>
        )}

        {/* Candidates List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No shortlisted candidates yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When recruiters or AI screening advance applicants to the Shortlisted stage for your
              assigned roles, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-card hover:border-emerald-500/40 transition-all shadow-xs"
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                    {cand.candidateName.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to="/hiring-manager/candidates/$candidateId"
                        params={{ candidateId: cand.id }}
                        className="text-base font-bold text-foreground hover:text-brand-blue transition-colors"
                      >
                        {cand.candidateName}
                      </Link>

                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        SHORTLISTED
                      </span>

                      {(cand.decision?.status === "APPROVED" ||
                        (cand.decision as any) === "APPROVED") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          <ThumbsUp className="size-3" /> Approved
                        </span>
                      )}

                      {(cand.decision?.status === "REJECTED" ||
                        (cand.decision as any) === "REJECTED") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <ThumbsDown className="size-3" /> Rejected
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
                    <div className="text-right px-3 py-1.5 rounded-xl bg-surface-blue border border-brand-blue/20">
                      <div className="text-sm font-black text-brand-blue">{cand.atsScore}%</div>
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
                        onClick={() =>
                          setDecisionCandidate({
                            id: cand.id,
                            name: cand.candidateName,
                            jobTitle: cand.jobTitle,
                            type: "APPROVED",
                          })
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1 cursor-pointer"
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
                        className="text-xs h-9 gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
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
                    <span>Full Review</span>
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

      {/* Decision Modal */}
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

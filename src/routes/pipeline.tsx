"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Eye, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { pipelineStagesData, recentApplicantsData, type Applicant } from "@/data/mockData";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Hiring Pipeline — TalentTrack AI" },
      { name: "description", content: "Track candidates through your hiring process." },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const [candidates, setCandidates] = useState<Applicant[]>(recentApplicantsData);
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);

  // Group mock candidates into pipeline stages
  const getCandidatesForStage = (stageName: string) => {
    switch (stageName) {
      case "Applied":
        return candidates.filter((c) => c.status === "Applied");
      case "Screening":
        return candidates.filter((c) => c.status === "Under Review");
      case "Interview":
        return candidates.filter((c) => c.status === "Interview");
      case "Offered":
        return candidates.filter((c) => c.status === "Shortlisted");
      case "Rejected":
        return candidates.filter((c) => c.status === "Rejected");
      default:
        return [];
    }
  };

  const advanceCandidate = (id: string, nextStatus: Applicant["status"]) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-peach text-brand-orange">
                <SlidersHorizontal className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Pipeline</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track candidates through your hiring process.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total 5 Pipeline Stages</span>
          </div>
        </section>

        {/* Pipeline Kanban Stage Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
          {pipelineStagesData.map((stage) => {
            const stageApplicants = getCandidatesForStage(stage.label);

            return (
              <div
                key={stage.id}
                className="dashboard-card flex flex-col min-w-[210px] rounded-xl bg-card overflow-hidden"
              >
                {/* Stage Header */}
                <div
                  className={`flex items-center justify-between p-3 border-b border-border/60 ${stage.bgClass}`}
                >
                  <div className="flex items-center gap-2">
                    <stage.icon className={`size-4 ${stage.toneClass}`} />
                    <span className={`text-xs font-bold ${stage.toneClass}`}>{stage.label}</span>
                  </div>
                  <span className="rounded-full bg-card/80 px-2 py-0.5 text-[10.5px] font-extrabold text-foreground shadow-2xs">
                    {stage.count}
                  </span>
                </div>

                {/* Candidate Stage Cards */}
                <div className="p-2.5 space-y-2.5 min-h-[300px] bg-muted/20">
                  {stageApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className="rounded-lg border border-border bg-card p-3 shadow-2xs transition-all hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <strong className="text-xs font-bold text-foreground">
                          {applicant.name}
                        </strong>
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            applicant.score >= 90
                              ? "bg-surface-green text-brand-green"
                              : "bg-surface-purple text-brand-purple"
                          }`}
                        >
                          <Sparkles className="size-2" />
                          {applicant.score}%
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground font-medium mb-2 truncate">
                        {applicant.job}
                      </p>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(applicant)}
                          className="flex items-center gap-1 font-semibold text-brand-blue hover:underline"
                        >
                          <Eye className="size-3" />
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => advanceCandidate(applicant.id, "Shortlisted")}
                          className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground font-medium"
                          title="Advance stage"
                        >
                          <span>Move</span>
                          <ArrowRight className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {stageApplicants.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-muted-foreground italic">
                      No candidate in current filter
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          candidate={selectedCandidate}
          open={selectedCandidate !== null}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
        />
      </div>
    </DashboardLayout>
  );
}

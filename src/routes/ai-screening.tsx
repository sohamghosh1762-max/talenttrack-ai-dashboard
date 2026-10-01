"use client";

import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Brain, FileCheck, Loader2, Sparkles, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CandidateDetailModal, type CandidateModalData } from "@/components/dashboard/CandidateDetailModal";
import { useRecruiterApplications } from "@/hooks/api/useApplications";
import { useAiMatch } from "@/hooks/api/useAiMatch";
import { useRecruiterDashboard } from "@/hooks/api/useRecruiterDashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-screening")({
  head: () => ({
    meta: [
      { title: "AI Resume Screening & Match Scoring — TalentTrack AI" },
      { name: "description", content: "AI-powered resume screening and candidate matching." },
    ],
  }),
  component: AIScreeningPage,
});

function AIScreeningPage() {
  const [minScore, setMinScore] = useState<number>(70);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModalData | null>(null);

  const { data: applications = [], isLoading, refetch } = useRecruiterApplications();
  const { data: dashboardData } = useRecruiterDashboard();
  const aiMatchMutation = useAiMatch();

  const candidates = useMemo(() => {
    return applications.map((app) => {
      const name = app.applicant?.name || app.applicantName || "Candidate";
      const email = app.applicant?.email || app.applicantEmail || "applicant@example.com";
      const phone = app.applicant?.phone || "+1 (555) 234-5678";
      const location = app.applicant?.location || "San Francisco, CA";
      const initials = (name || "C").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      const job = app.job?.title || app.jobTitle || "Job Position";
      const score = app.aiScore ?? 88;

      return {
        id: app.id,
        applicationId: app.id,
        name,
        email,
        phone,
        job,
        jobTitle: job,
        location,
        score,
        aiScore: score,
        status: app.status || "APPLIED",
        currentStage: app.currentStage,
        initials,
        appliedOn: new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        skills: app.applicant?.skills || ["React", "TypeScript", "Node.js"],
        resumeId: app.resumeId,
        resumeFileName: app.resume?.originalFileName,
        notes: app.notes,
        coverLetter: app.coverLetter,
      } as CandidateModalData;
    });
  }, [applications]);

  const screenedCandidates = useMemo(() => {
    return candidates.filter((c) => (c.score || 0) >= minScore);
  }, [candidates, minScore]);

  const topMatches = candidates.filter((c) => (c.score || 0) >= 90).length;
  const moderateMatches = candidates.filter((c) => (c.score || 0) >= 70 && (c.score || 0) < 90).length;

  const topSkillsData = dashboardData?.topSkills || [
    { name: "React", count: 85, maxCount: 100, colorClass: "bg-brand-blue" },
    { name: "TypeScript", count: 72, maxCount: 100, colorClass: "bg-brand-purple" },
    { name: "Node.js", count: 64, maxCount: 100, colorClass: "bg-brand-green" },
    { name: "Python", count: 50, maxCount: 100, colorClass: "bg-brand-orange" },
    { name: "MongoDB", count: 42, maxCount: 100, colorClass: "bg-brand-red" },
  ];

  const handleRunAiMatch = async (appId: string) => {
    try {
      const res = await aiMatchMutation.mutateAsync(appId);
      toast.success(`AI Match calculation complete: ${res.matchScore}% match for ${res.candidateName}`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to calculate AI candidate match score.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                <Sparkles className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">AI Screening</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              AI-powered resume screening and candidate matching decision support.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20">
              <Zap className="size-3.5" />
              Automated Match Engine Active
            </span>
          </div>
        </section>

        {/* Screening Metrics Overview */}
        <div className="grid gap-3.5 sm:grid-cols-3">
          <div className="dashboard-card p-4 bg-surface-green/40 border-brand-green/20">
            <span className="text-[11px] font-semibold text-brand-green block mb-1">
              Top Tier Matches (90%+)
            </span>
            <strong className="text-2xl font-extrabold text-foreground">
              {topMatches} Candidates
            </strong>
            <p className="text-[10.5px] text-muted-foreground mt-1">
              High semantic match with job technical requirements.
            </p>
          </div>

          <div className="dashboard-card p-4 bg-surface-purple/40 border-brand-purple/20">
            <span className="text-[11px] font-semibold text-brand-purple block mb-1">
              Moderate Matches (70-89%)
            </span>
            <strong className="text-2xl font-extrabold text-foreground">
              {moderateMatches} Candidates
            </strong>
            <p className="text-[10.5px] text-muted-foreground mt-1">
              Solid background; recommend recruiter interview evaluation.
            </p>
          </div>

          <div className="dashboard-card p-4 bg-surface-blue/40 border-brand-blue/20">
            <span className="text-[11px] font-semibold text-brand-blue block mb-1">
              Resumes Evaluated
            </span>
            <strong className="text-2xl font-extrabold text-foreground">{candidates.length} Resumes</strong>
            <p className="text-[10.5px] text-muted-foreground mt-1">
              All active candidate profiles indexed in MongoDB.
            </p>
          </div>
        </div>

        {/* Screening Criteria & Ranked Candidates */}
        <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
          {/* Ranked Candidates Table */}
          <div className="dashboard-card p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileCheck className="size-4 text-brand-blue" />
                Ranked Candidate Profiles
              </h2>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Min Score:</span>
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="h-7 rounded border border-input bg-card px-2 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value={0}>All Scores</option>
                  <option value={70}>70%+ Match</option>
                  <option value={85}>85%+ Match</option>
                  <option value={90}>90%+ Top Match</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-brand-blue" />
                <span>Screening candidate profiles...</span>
              </div>
            ) : (
              <div className="divide-y divide-border/60 mt-2">
                {screenedCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-brand-blue text-xs font-bold text-primary-foreground">
                        {candidate.initials}
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-foreground">
                          {candidate.name}
                        </strong>
                        <span className="block text-[11px] text-muted-foreground">
                          {candidate.job}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                          (candidate.score || 0) >= 90
                            ? "bg-surface-green text-brand-green"
                            : "bg-surface-purple text-brand-purple"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        {candidate.score}% Match
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={aiMatchMutation.isPending}
                        className="h-7 text-xs font-semibold text-brand-purple hover:bg-surface-purple gap-1"
                        onClick={() => candidate.applicationId && handleRunAiMatch(candidate.applicationId)}
                      >
                        {aiMatchMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                        AI Analyze
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-semibold text-brand-blue hover:bg-surface-blue"
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}

                {screenedCandidates.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No candidate match profiles found matching min score criteria.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Skill Extraction Insights */}
          <div className="dashboard-card p-4 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <Brain className="size-4 text-brand-purple" />
                Extracted Skill Heatmap
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Frequency of candidate skills extracted from resumes.
              </p>
            </div>

            <div className="space-y-2.5">
              {topSkillsData.map((skill) => (
                <div key={skill.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{skill.name}</span>
                    <span className="text-muted-foreground font-semibold">
                      {skill.count} candidates
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${skill.colorClass || "bg-brand-blue"}`}
                      style={{ width: `${(skill.count / (skill.maxCount || 100)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-brand-blue/20 bg-surface-blue/40 p-3 text-xs text-muted-foreground">
              <span className="block font-semibold text-brand-blue mb-1">
                Automated ATS Scoring Note
              </span>
              <span>
                AI recommendations provide decision support for recruiters. Final hiring decisions remain with human recruiters.
              </span>
            </div>
          </div>
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

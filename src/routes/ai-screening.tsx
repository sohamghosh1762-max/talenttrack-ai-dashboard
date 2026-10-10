"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Zap,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Layers,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { useJobs } from "@/hooks/api/useJobs";
import {
  useRankedCandidates,
  useSemanticCandidateSearch,
  useRecordHumanReviewOverride,
} from "@/hooks/api/useScreening";
import type {
  RankedCandidateItem,
  JobMatchExplanation,
  MatchedSkillItem,
  MissingSkillItem,
} from "@/server/types/screening-types";
import type { Applicant } from "@/data/mockData";

export const Route = createFileRoute("/ai-screening")({
  head: () => ({
    meta: [
      { title: "AI Resume Screening & Match Scoring — TalentTrack AI" },
      { name: "description", content: "Explainable, job-specific candidate screening and ranking." },
    ],
  }),
  component: AIScreeningPage,
});

function AIScreeningPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState<Applicant | null>(null);
  const [explanationModalCandidate, setExplanationModalCandidate] = useState<RankedCandidateItem | null>(null);

  // Load published job vacancies
  const { data: jobsResponse, isLoading: isLoadingJobs } = useJobs({ status: "PUBLISHED" });
  const publishedJobs = jobsResponse?.jobs || [];

  // Active Job ID default
  const activeJobId = selectedJobId || (publishedJobs.length > 0 && publishedJobs[0] ? publishedJobs[0].id : "");

  // Load Ranked Candidates for Selected Job
  const { data: rankedData, isLoading: isLoadingRanked } = useRankedCandidates(activeJobId, {
    minScore: minScore > 0 ? minScore : undefined,
    search: searchQuery ? searchQuery : undefined,
  });

  // Semantic candidate search query
  const [semanticQuery, setSemanticQuery] = useState<string>("");
  const { data: semanticResults, isLoading: isSearchingSemantic } = useSemanticCandidateSearch(semanticQuery);

  const humanReviewMutation = useRecordHumanReviewOverride();

  const activeJob = publishedJobs.find((j) => j.id === activeJobId);
  const candidates = rankedData?.candidates || [];

  // Helper to open candidate profile modal
  const handleReviewCandidate = (c: RankedCandidateItem) => {
    setSelectedCandidateForModal({
      id: c.candidateId,
      name: c.candidateName,
      email: c.candidateEmail,
      job: activeJob?.title || "Position",
      score: c.overallScore,
      status: (c.currentStage as any) || "Applied",
      initials: c.candidateName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      appliedOn: new Date(c.appliedAt).toLocaleDateString(),
      ...(c.candidatePhone ? { phone: c.candidatePhone } : {}),
      ...(c.candidateLocation ? { location: c.candidateLocation } : {}),
      ...(c.experienceYears !== undefined ? { experience: `${c.experienceYears} years` } : {}),
      skills: c.topMatchedSkills,
    });
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
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                AI Candidate Screening
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Explainable, job-specific applicant ranking backed by verified resume evidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20">
              <Zap className="size-3.5" />
              Explainable AI v2.5 Active
            </span>
          </div>
        </section>

        {/* Advisory Safeguard Banner */}
        <div className="rounded-xl border border-brand-blue/30 bg-surface-blue/30 px-3.5 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-brand-blue shrink-0" />
            <span>
              <strong className="text-foreground">Human-in-the-Loop Safeguard:</strong> All AI
              evaluations are advisory decision-support. Candidates are never automatically
              rejected, deprioritized, or filtered based on match scores alone.
            </span>
          </div>
        </div>

        {/* Job Selection & Filters Toolbar */}
        <div className="dashboard-card p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
              <label htmlFor="job-select" className="text-xs font-semibold text-foreground shrink-0 flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-brand-blue" />
                Target Job Vacancy:
              </label>
              <select
                id="job-select"
                value={activeJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={isLoadingJobs}
                className="h-8 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-brand-blue/30 max-w-sm"
              >
                {publishedJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} — {job.department} ({job.applicationsCount || 0} applicants)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <SlidersHorizontal className="size-3 text-muted-foreground" />
                Score Threshold:
              </span>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-blue/30"
              >
                <option value={0}>All Scores</option>
                <option value={60}>60%+ Moderate</option>
                <option value={75}>75%+ Solid Fit</option>
                <option value={85}>85%+ Top Tier</option>
              </select>
            </div>
          </div>

          {/* Quick Criteria Tags for Selected Job */}
          {activeJob && (
            <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-muted-foreground font-semibold">Evaluated Against:</span>
              <span className="rounded-md bg-surface-purple px-2 py-0.5 font-medium text-brand-purple">
                Seniority: {(activeJob as any).experienceLevel || activeJob.experienceRequired || "Mid-Senior"}
              </span>
              {activeJob.skills?.slice(0, 5).map((sk) => (
                <span key={sk} className="rounded-md bg-surface-blue px-2 py-0.5 font-medium text-brand-blue">
                  {sk}
                </span>
              ))}
              {(activeJob.skills?.length || 0) > 5 && (
                <span className="text-muted-foreground">+{activeJob.skills!.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        {/* Screening Metrics Overview */}
        <div className="grid gap-3.5 sm:grid-cols-4">
          <div className="dashboard-card p-3.5 bg-surface-green/40 border-brand-green/20">
            <span className="text-[11px] font-semibold text-brand-green block mb-1">
              Top Tier Matches (85%+)
            </span>
            <strong className="text-2xl font-extrabold text-foreground">
              {candidates.filter((c) => c.overallScore >= 85).length}
            </strong>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Strong coverage of mandatory job requirements.
            </p>
          </div>

          <div className="dashboard-card p-3.5 bg-surface-purple/40 border-brand-purple/20">
            <span className="text-[11px] font-semibold text-brand-purple block mb-1">
              Solid Matches (70–84%)
            </span>
            <strong className="text-2xl font-extrabold text-foreground">
              {candidates.filter((c) => c.overallScore >= 70 && c.overallScore < 85).length}
            </strong>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Meets core qualifications with minor gaps.
            </p>
          </div>

          <div className="dashboard-card p-3.5 bg-surface-blue/40 border-brand-blue/20">
            <span className="text-[11px] font-semibold text-brand-blue block mb-1">
              Total Evaluated
            </span>
            <strong className="text-2xl font-extrabold text-foreground">
              {rankedData?.totalCandidates || candidates.length} Applicants
            </strong>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Ranked with multi-factor weighting.
            </p>
          </div>

          <div className="dashboard-card p-3.5 bg-surface-peach/40 border-brand-orange/20">
            <span className="text-[11px] font-semibold text-brand-orange block mb-1">
              Scoring Weighting
            </span>
            <strong className="text-sm font-extrabold text-foreground block mt-1">
              Skills 50% • Exp 20%
            </strong>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Projects 15% • Edu 10% • Intent 5%
            </p>
          </div>
        </div>

        {/* Natural Language Semantic Candidate Search */}
        <div className="dashboard-card p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-brand-purple shrink-0" />
            <h2 className="text-xs font-bold text-foreground">
              Semantic Talent Search
            </h2>
            <span className="text-[10px] text-muted-foreground">
              (Search candidates using natural language, technology aliases, or career background)
            </span>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. 'React engineers with TypeScript and production Kubernetes deployment experience'..."
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              className="h-8 text-xs bg-card"
            />
            {semanticQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSemanticQuery("")}
                className="h-8 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {semanticResults && semanticResults.results.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold text-brand-purple block mb-1.5">
                {semanticResults.totalResults} matching candidate(s) for query "{semanticResults.query}":
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {semanticResults.results.map((r) => (
                  <div
                    key={r.candidateId}
                    className="p-2.5 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-xs text-foreground block">{r.name}</strong>
                      <span className="text-[11px] text-muted-foreground block">
                        {r.headline} • {r.location}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-surface-purple text-brand-purple font-medium"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-green bg-surface-green px-2 py-1 rounded-md shrink-0">
                      {r.relevanceScore}% Rel.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Ranked Candidates List */}
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileCheck className="size-4 text-brand-blue" />
              Ranked Candidate Profiles for {activeJob?.title || "Selected Role"}
            </h2>

            <span className="text-xs text-muted-foreground">
              Showing {candidates.length} ranked candidate(s)
            </span>
          </div>

          {isLoadingRanked ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Evaluating candidate resumes against job criteria...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs font-semibold text-foreground">
                No candidate applications match the selected criteria.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Try lowering the match threshold or selecting a different job vacancy.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 mt-2">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="py-3.5 hover:bg-muted/20 px-2 rounded-lg transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  {/* Left: Rank, Avatar & Info */}
                  <div className="flex items-start gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`grid size-7 place-items-center rounded-lg text-xs font-extrabold shrink-0 ${
                        candidate.rank === 1
                          ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                          : candidate.rank <= 3
                            ? "bg-surface-blue text-brand-blue border border-brand-blue/30"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      #{candidate.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-foreground">
                          {candidate.candidateName}
                        </strong>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                          {candidate.currentStage}
                        </span>
                      </div>

                      <span className="block text-[11px] text-muted-foreground">
                        {candidate.candidateHeadline} • {candidate.experienceYears ?? 3}+ yrs exp
                      </span>

                      {/* Explicit Ranking Rationale */}
                      <p className="text-[11px] text-brand-blue/90 font-medium mt-1 flex items-center gap-1">
                        <ChevronRight className="size-3 text-brand-blue shrink-0" />
                        {candidate.rankingRationale}
                      </p>

                      {/* Skill badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {candidate.topMatchedSkills.map((sk) => (
                          <span
                            key={sk}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-green bg-surface-green px-1.5 py-0.5 rounded"
                          >
                            <CheckCircle2 className="size-2.5" />
                            {sk}
                          </span>
                        ))}
                        {candidate.topMissingSkills.map((sk) => (
                          <span
                            key={sk}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded"
                          >
                            <AlertCircle className="size-2.5" />
                            Missing: {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores & Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold ${
                          candidate.overallScore >= 85
                            ? "bg-surface-green text-brand-green border border-brand-green/30"
                            : candidate.overallScore >= 70
                              ? "bg-surface-purple text-brand-purple border border-brand-purple/30"
                              : "bg-surface-peach text-brand-orange border border-brand-orange/30"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        {candidate.overallScore}% Match
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        Req. Skills: {candidate.factorScores.requiredSkills}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-semibold text-brand-purple hover:bg-surface-purple"
                        onClick={() => setExplanationModalCandidate(candidate)}
                      >
                        Explain Score
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-semibold text-brand-blue hover:bg-surface-blue"
                        onClick={() => handleReviewCandidate(candidate)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explainability Detail Modal */}
        {explanationModalCandidate && (
          <Dialog
            open={Boolean(explanationModalCandidate)}
            onOpenChange={(open) => !open && setExplanationModalCandidate(null)}
          >
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="size-4 text-brand-purple" />
                    AI Match Explanation — {explanationModalCandidate.candidateName}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Scored against position criteria for "{activeJob?.title || "Role"}"
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Score & Tier Header */}
                <div className="p-3.5 rounded-xl border border-brand-purple/20 bg-surface-purple/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Overall Match Tier
                    </span>
                    <strong className="text-base font-extrabold text-brand-purple">
                      {explanationModalCandidate.explanation.tierLabel}
                    </strong>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {explanationModalCandidate.rankingRationale}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-foreground">
                      {explanationModalCandidate.overallScore}%
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      Calculated Weighted Score
                    </span>
                  </div>
                </div>

                {/* Factor Breakdown Bars with Configured Weights */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-brand-blue" />
                    Multi-Factor Scoring Breakdown
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Required Skills (Weight: 35%)</span>
                        <strong className="font-semibold text-foreground">
                          {explanationModalCandidate.factorScores.requiredSkills}%
                        </strong>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-brand-blue rounded-full"
                          style={{
                            width: `${explanationModalCandidate.factorScores.requiredSkills}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Preferred Skills (Weight: 15%)</span>
                        <strong className="font-semibold text-foreground">
                          {explanationModalCandidate.factorScores.preferredSkills}%
                        </strong>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-brand-purple rounded-full"
                          style={{
                            width: `${explanationModalCandidate.factorScores.preferredSkills}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Experience & Seniority (Weight: 20%)</span>
                        <strong className="font-semibold text-foreground">
                          {explanationModalCandidate.factorScores.experience}%
                        </strong>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-brand-green rounded-full"
                          style={{
                            width: `${explanationModalCandidate.factorScores.experience}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Project Implementation Evidence (Weight: 15%)</span>
                        <strong className="font-semibold text-foreground">
                          {explanationModalCandidate.factorScores.projects}%
                        </strong>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-brand-orange rounded-full"
                          style={{
                            width: `${explanationModalCandidate.factorScores.projects}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Education & Credentials (Weight: 10%)</span>
                        <strong className="font-semibold text-foreground">
                          {explanationModalCandidate.factorScores.education}%
                        </strong>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{
                            width: `${explanationModalCandidate.factorScores.education}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matched Skills with Direct Citations */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-brand-green" />
                    Verified Matched Skills & Direct Evidence Citations
                  </h3>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {explanationModalCandidate.explanation.matchedSkills.map((m) => (
                      <div
                        key={m.canonicalName}
                        className="p-2 rounded-lg border border-border/70 bg-muted/20 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="font-semibold text-foreground">
                            {m.canonicalName}
                          </strong>
                          <span className="text-[10px] font-semibold text-brand-green uppercase">
                            {m.evidenceCategory}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                          "{m.evidence}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Skills */}
                {explanationModalCandidate.explanation.missingSkills.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 text-amber-500" />
                      Missing or Unverified Job Requirements
                    </h3>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {explanationModalCandidate.explanation.missingSkills.map((m) => (
                        <div
                          key={m.canonicalName}
                          className="p-2 rounded-lg border border-border/70 bg-muted/10 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {m.canonicalName}
                            </span>
                            <span className="text-[10px] text-amber-600 font-semibold">
                              {m.isRequired ? "Required" : "Preferred"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {m.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Gaps */}
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-brand-green/20 bg-surface-green/30">
                    <strong className="text-brand-green font-bold block mb-1">
                      Key Strengths
                    </strong>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
                      {explanationModalCandidate.explanation.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg border border-brand-orange/20 bg-surface-peach/30">
                    <strong className="text-brand-orange font-bold block mb-1">
                      Potential Gaps
                    </strong>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
                      {explanationModalCandidate.explanation.gaps.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Limitations & Model Versioning */}
                <div className="p-2.5 rounded-lg bg-muted/40 text-[10.5px] text-muted-foreground space-y-1 border border-border/50">
                  <span className="block font-semibold text-foreground">
                    Model Version: {explanationModalCandidate.explanation.modelVersion} •
                    Engine: {explanationModalCandidate.explanation.engineVersion}
                  </span>
                  <span>
                    Timestamp: {new Date(explanationModalCandidate.explanation.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Human Review Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExplanationModalCandidate(null)}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                    onClick={() => {
                      handleReviewCandidate(explanationModalCandidate);
                      setExplanationModalCandidate(null);
                    }}
                  >
                    Open Full Candidate Review
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          candidate={selectedCandidateForModal}
          open={selectedCandidateForModal !== null}
          onOpenChange={(open: boolean) => !open && setSelectedCandidateForModal(null)}
        />
      </div>
    </DashboardLayout>
  );
}

"use client";

import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtsScore } from "@/hooks/api/useAtsScore";

export function AtsScoreCard() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAtsScore();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="dashboard-card p-4 sm:p-5 flex flex-col justify-between border-brand-blue/20 bg-gradient-to-br from-card via-card to-blue-500/5">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-surface-blue text-brand-blue">
              <Sparkles className="size-4" />
            </span>
            <span className="text-xs font-bold text-foreground">ATS Resume Score</span>
          </div>
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        </div>

        <div className="py-5 text-center space-y-2">
          <Skeleton className="h-9 w-24 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-3 w-48 mx-auto" />
        </div>

        <div className="pt-2 border-t border-border/50">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    const errorMsg =
      error instanceof Error ? error.message : "Unable to analyze your resume right now.";
    return (
      <div className="dashboard-card p-4 sm:p-5 flex flex-col justify-between border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 pb-3 border-b border-destructive/15">
          <AlertCircle className="size-4 text-destructive" />
          <span className="text-xs font-bold text-foreground">ATS Resume Score</span>
        </div>

        <div className="py-4 text-center space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Unable to analyze your resume right now.
          </p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">{errorMsg}</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="h-8 text-xs font-semibold gap-1.5 w-full border-border/80"
        >
          <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Try Again
        </Button>
      </div>
    );
  }

  const hasResume = data?.hasResume ?? false;
  const analysis = data?.analysis ?? null;
  const parsingStatus = data?.parsingStatus;

  // 3. No Resume State (Must NOT show 0/100)
  if (!hasResume || !data?.resumeId) {
    return (
      <div className="dashboard-card p-4 sm:p-5 flex flex-col justify-between border-dashed border-border/80 bg-muted/15">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </span>
            <span className="text-xs font-bold text-foreground">ATS Resume Score</span>
          </div>
        </div>

        <div className="py-4 text-center space-y-1.5">
          <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground mx-auto mb-1">
            <FileText className="size-5" />
          </div>
          <h3 className="text-xs font-bold text-foreground">No ATS Score Yet</h3>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            Your resume has not been uploaded yet. Upload a resume when applying for jobs to
            generate your ATS analysis.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 text-xs font-semibold w-full cursor-pointer"
        >
          <Link to="/applicant/ats-score">
            <span>View ATS Analysis</span>
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  // 4. Processing / Parsing State
  if (parsingStatus === "PROCESSING" || parsingStatus === "NOT_STARTED" || !analysis) {
    return (
      <div className="dashboard-card p-4 sm:p-5 flex flex-col justify-between border-brand-blue/20 bg-surface-blue/15">
        <div className="flex items-center justify-between pb-3 border-b border-brand-blue/20">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-surface-blue text-brand-blue">
              <Sparkles className="size-4" />
            </span>
            <span className="text-xs font-bold text-foreground">ATS Resume Score</span>
          </div>
          <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-[10px] font-bold text-brand-blue">
            {parsingStatus === "PROCESSING" ? "Parsing..." : "Ready for Analysis"}
          </span>
        </div>

        <div className="py-4 text-center space-y-2">
          <Loader2 className="size-6 animate-spin text-brand-blue mx-auto" />
          <h3 className="text-xs font-bold text-foreground">Analyzing your resume...</h3>
          <p className="text-[11px] text-muted-foreground">
            Extracting candidate profile and calculating ATS readability metrics.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs font-semibold w-full cursor-pointer"
        >
          <Link to="/applicant/ats-score">View ATS Score</Link>
        </Button>
      </div>
    );
  }

  // 5. Active Analysis State
  const score = analysis.overallScore;
  const compatibilityLabel = analysis.compatibilityLabel || "Good ATS Compatibility";

  const getScoreBadgeStyles = (sc: number) => {
    if (sc >= 85) {
      return {
        badgeBg: "bg-surface-green text-brand-green border-brand-green/30",
        scoreColor: "text-brand-green",
      };
    }
    if (sc >= 70) {
      return {
        badgeBg: "bg-surface-blue text-brand-blue border-brand-blue/30",
        scoreColor: "text-brand-blue",
      };
    }
    if (sc >= 55) {
      return {
        badgeBg: "bg-surface-peach text-brand-orange border-brand-orange/30",
        scoreColor: "text-brand-orange",
      };
    }
    return {
      badgeBg: "bg-destructive/10 text-destructive border-destructive/30",
      scoreColor: "text-destructive",
    };
  };

  const badgeStyle = getScoreBadgeStyles(score);

  return (
    <div className="dashboard-card p-4 sm:p-5 flex flex-col justify-between border-brand-blue/20 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-xs hover:shadow-sm transition-all">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-surface-blue text-brand-blue">
              <Sparkles className="size-4" />
            </span>
            <h2 className="text-xs font-bold text-foreground">ATS Resume Score</h2>
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold border ${badgeStyle.badgeBg}`}
          >
            {compatibilityLabel}
          </span>
        </div>

        <div className="py-4 text-center space-y-1">
          <div className="flex items-baseline justify-center gap-1.5">
            <span
              className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${badgeStyle.scoreColor}`}
            >
              {score}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
          </div>

          <p className="text-xs font-bold text-foreground pt-1">{compatibilityLabel}</p>
          <p className="text-[11px] text-muted-foreground">Based on your resume and profile</p>
        </div>

        {/* Quick highlight bar */}
        <div className="space-y-1.5 pb-2">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                score >= 85
                  ? "bg-brand-green"
                  : score >= 70
                    ? "bg-brand-blue"
                    : score >= 55
                      ? "bg-brand-orange"
                      : "bg-destructive"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-brand-green" />
              {analysis.strengths?.[0] || "Structured extraction verified"}
            </span>
            <span className="font-semibold text-foreground/80">{score}%</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border/50">
        <Button
          asChild
          size="sm"
          className="h-8 text-xs font-semibold bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground shadow-xs w-full gap-1"
        >
          <Link to="/applicant/ats-score">
            <span>View ATS Analysis</span>
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

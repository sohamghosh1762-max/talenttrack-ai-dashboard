"use client";

import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Key,
  Layers,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtsScore, useAnalyzeAtsScore } from "@/hooks/api/useAtsScore";
import { useUploadResume, useParseResume } from "@/hooks/api/useResumes";
import { formatFileSize } from "@/lib/applicant-utils";
import type { AtsCategoryAssessment } from "@/server/types/ats-types";
import { toast } from "sonner";

export const Route = createFileRoute("/applicant/ats-score")({
  head: () => ({
    meta: [
      { title: "ATS Resume Score & Analysis — TalentTrack AI" },
      {
        name: "description",
        content:
          "Upload your resume to get instant ATS parseability analysis, deterministic category scores, keyword coverage, and actionable recommendations.",
      },
    ],
  }),
  component: ApplicantAtsScorePage,
});

const categoryIcons: Record<string, typeof FileText> = {
  completeness: FileCheck2,
  skills: Sparkles,
  experience: Briefcase,
  keywords: Key,
  education: BookOpen,
  structure: Layers,
};

type UploadPhase = "idle" | "uploading" | "parsing" | "analyzing" | "error";

export function ApplicantAtsScorePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isRefetching } = useAtsScore();
  const analyzeMutation = useAnalyzeAtsScore();
  const uploadResumeMutation = useUploadResume();
  const parseResumeMutation = useParseResume();

  // Local state for file selection and upload flow
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [customError, setCustomError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasResume = data?.hasResume ?? false;
  const analysis = data?.analysis ?? null;
  const parsingStatus = data?.parsingStatus;

  // File validation logic (PDF & DOCX, <= 10MB)
  const validateAndSetFile = (file: File) => {
    setFileError(null);
    setCustomError(null);

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const validExtensions = [".pdf", ".docx", ".doc"];
    const validMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (!validExtensions.includes(ext) && !validMimes.includes(file.type)) {
      setFileError("Unsupported file type. Please select a PDF or DOCX resume.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("File is too large. Maximum allowed size is 10 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  // Drag & drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // End-to-end Upload -> Parse -> ATS Analysis pipeline
  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setFileError(null);
    setCustomError(null);
    setUploadPhase("uploading");

    try {
      // 1. Upload to S3 + MongoDB Resume record
      const uploadedResume = await uploadResumeMutation.mutateAsync(selectedFile);

      // 2. Extract text + Structured Gemini Parsing
      setUploadPhase("parsing");
      await parseResumeMutation.mutateAsync(uploadedResume.id);

      // 3. Structured Gemini ATS Analysis & Deterministic Scoring
      setUploadPhase("analyzing");
      await analyzeMutation.mutateAsync();

      // 4. Invalidate caches and reset view
      await queryClient.invalidateQueries({ queryKey: ["applicant", "ats-score"] });
      await queryClient.invalidateQueries({ queryKey: ["applicant", "profile"] });

      setSelectedFile(null);
      setIsReplacing(false);
      setUploadPhase("idle");
      toast.success("Resume uploaded and analyzed successfully!");
    } catch (err: unknown) {
      setUploadPhase("error");
      const rawMsg = err instanceof Error ? err.message : "Failed to process resume.";
      if (rawMsg.includes("upload") || rawMsg.includes("storage") || rawMsg.includes("S3")) {
        console.error("[ATS-DEBUG] Error Stage: UPLOAD_FAILED", err);
        setCustomError("Resume upload failed. Please try again.");
      } else if (rawMsg.includes("parse") || rawMsg.includes("extract")) {
        console.error("[ATS-DEBUG] Error Stage: PARSING_FAILED", err);
        setCustomError("Your resume was uploaded, but we couldn't analyze it.");
      } else if (rawMsg.includes("validation") || rawMsg.includes("schema")) {
        console.error("[ATS-DEBUG] Error Stage: VALIDATION_FAILED", err);
        setCustomError("Resume analysis failed. You can try again.");
      } else if (rawMsg.includes("gemini") || rawMsg.includes("AI") || rawMsg.includes("rate limit")) {
        console.error("[ATS-DEBUG] Error Stage: GEMINI_FAILED", err);
        setCustomError("Resume analysis failed. You can try again.");
      } else {
        console.error("[ATS-DEBUG] Error Stage: ATS_FAILED", err);
        setCustomError("Resume analysis failed. You can try again.");
      }
    }
  };

  const handleReanalyze = async () => {
    setCustomError(null);
    setUploadPhase("idle");
    try {
      await analyzeMutation.mutateAsync();
      toast.success("ATS score re-analyzed!");
    } catch {
      // Handled by query/mutation state
    }
  };

  const isBusy =
    isLoading ||
    analyzeMutation.isPending ||
    uploadResumeMutation.isPending ||
    parseResumeMutation.isPending ||
    uploadPhase !== "idle";

  // Determine whether to show the upload card
  const showUploadSection = !hasResume || isReplacing;

  return (
    <ApplicantLayout>
      <div className="space-y-5 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb / Top Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2 cursor-pointer"
            >
              <Link to="/applicant">
                <ArrowLeft className="size-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span className="text-muted-foreground/50">/</span>
            <div className="flex items-center gap-1.5">
              <span className="grid size-6 place-items-center rounded bg-surface-blue text-brand-blue">
                <Sparkles className="size-3.5" />
              </span>
              <h1 className="text-sm sm:text-base font-bold text-foreground">
                ATS Resume Score & Analysis
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasResume && !showUploadSection && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReplacing(true)}
                  disabled={isBusy}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  Replace Resume
                </Button>

                <Button
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={isBusy}
                  className="h-8 text-xs font-semibold bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Re-analyzing ATS Score...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3.5" />
                      Re-analyze ATS Score
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* 1. Global Loading State (Initial query fetch) */}
        {isLoading && !isBusy && (
          <div className="space-y-4">
            <div className="dashboard-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="dashboard-card p-4 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Upload / Processing In-Progress States */}
        {uploadPhase !== "idle" && uploadPhase !== "error" && (
          <div className="dashboard-card p-10 text-center space-y-4 border-brand-blue/30 bg-surface-blue/10">
            <div className="grid size-14 place-items-center rounded-2xl bg-surface-blue text-brand-blue mx-auto shadow-xs">
              <Loader2 className="size-7 animate-spin" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                {uploadPhase === "uploading" && "Uploading resume..."}
                {uploadPhase === "parsing" && "Resume uploaded."}
                {uploadPhase === "analyzing" && "Generating ATS analysis..."}
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {uploadPhase === "uploading" && "Securely transferring your resume file to storage..."}
                {uploadPhase === "parsing" && "Analyzing your resume... This may take a moment."}
                {uploadPhase === "analyzing" && "Calculating deterministic scores, keyword coverage, and recommendations..."}
              </p>
            </div>

            {/* Visual step indicator */}
            <div className="flex items-center justify-center gap-2 pt-2 max-w-xs mx-auto">
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  uploadPhase === "uploading" || uploadPhase === "parsing" || uploadPhase === "analyzing"
                    ? "bg-brand-blue animate-pulse"
                    : "bg-muted"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  uploadPhase === "parsing" || uploadPhase === "analyzing"
                    ? "bg-brand-blue animate-pulse"
                    : "bg-muted"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  uploadPhase === "analyzing" ? "bg-brand-blue animate-pulse" : "bg-muted"
                }`}
              />
            </div>
          </div>
        )}

        {/* 3. Error State */}
        {(uploadPhase === "error" || (!isLoading && isError)) && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/20 bg-destructive/5">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h2 className="text-sm font-bold text-foreground">
              {customError || (error instanceof Error ? error.message : "Unable to analyze your resume right now.")}
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Please check your file and network connection, then try again.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  setUploadPhase("idle");
                  setCustomError(null);
                  if (selectedFile) {
                    handleUploadAndAnalyze();
                  } else {
                    refetch();
                  }
                }}
                className="h-8 text-xs font-semibold bg-brand-blue text-primary-foreground cursor-pointer"
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                Try Again
              </Button>
              {isReplacing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsReplacing(false);
                    setUploadPhase("idle");
                    setSelectedFile(null);
                    setCustomError(null);
                  }}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 4. Resume Upload / Drag & Drop Section (Shown when no resume exists OR when user clicked Replace Resume) */}
        {!isLoading && showUploadSection && uploadPhase === "idle" && (
          <div className="dashboard-card p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {isReplacing ? "Replace Resume" : "No Resume Available"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isReplacing
                    ? "Upload an updated resume to recalculate your ATS score and refresh your analysis."
                    : "Upload your latest resume to generate your ATS compatibility score and detailed resume analysis."}
                </p>
              </div>

              {isReplacing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplacing(false);
                    setSelectedFile(null);
                    setFileError(null);
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5 mr-1" />
                  Cancel
                </Button>
              )}
            </div>

            {/* Drag & Drop Dropzone */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 sm:p-10 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? "border-brand-blue bg-surface-blue/20 scale-[0.99]"
                    : "border-border/80 hover:border-brand-blue/60 hover:bg-muted/30 bg-muted/10"
                }`}
              >
                <div className="grid size-12 place-items-center rounded-xl bg-surface-blue text-brand-blue mb-3 shadow-xs">
                  <Upload className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Upload Resume</h3>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Drag &amp; drop your resume here or click to browse
                </p>
                <span className="text-[11px] text-muted-foreground/80 mt-1.5 font-medium">
                  PDF or DOCX • Maximum 10 MB
                </span>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="h-8 text-xs font-semibold mt-4 gap-1.5 cursor-pointer"
                >
                  Choose Resume
                </Button>
              </div>
            ) : (
              /* Selected File Preview Box */
              <div className="p-4 sm:p-5 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {selectedFile.name.endsWith(".docx") || selectedFile.name.endsWith(".doc")
                          ? "DOCX"
                          : "PDF"}{" "}
                        • {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green shrink-0">
                    <Check className="size-3" /> Ready
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileError(null);
                    }}
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    Change File
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUploadAndAnalyze}
                    className="h-8 text-xs font-semibold bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                    Upload &amp; Analyze
                  </Button>
                </div>
              </div>
            )}

            {/* Validation Error Message */}
            {fileError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              Your resume will be securely processed and analyzed for ATS compatibility.
            </p>
          </div>
        )}

        {/* 5. Processing / Parsing Incomplete State (when resume exists in DB but not completed) */}
        {!isLoading &&
          !showUploadSection &&
          uploadPhase === "idle" &&
          hasResume &&
          parsingStatus !== "COMPLETED" &&
          !analysis && (
            <div className="dashboard-card p-10 text-center space-y-3 border-brand-blue/20 bg-surface-blue/15">
              <div className="grid size-14 place-items-center rounded-2xl bg-surface-blue text-brand-blue mx-auto shadow-xs">
                <Loader2 className="size-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">Resume Analysis Pending</h2>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Your resume has been uploaded but is still being processed. The ATS score will become
                  available after resume parsing is complete.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-8 text-xs font-semibold mt-2 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
                Check Status
              </Button>
            </div>
          )}

        {/* 6. Active ATS Score & Full Analysis Report */}
        {!isLoading && !showUploadSection && uploadPhase === "idle" && hasResume && analysis && (
          <div className="space-y-5">
            {/* Current Resume Reference Card */}
            <div className="dashboard-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Current Resume
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {analysis.originalFileName || data?.fileName || "Resume.pdf"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(analysis.originalFileName || data?.fileName || "").endsWith(".docx") ||
                    (analysis.originalFileName || data?.fileName || "").endsWith(".doc")
                      ? "DOCX"
                      : "PDF"}
                    {data?.fileSize ? ` • ${formatFileSize(data.fileSize)}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReplacing(true)}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  Replace Resume
                </Button>

                <Button
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={analyzeMutation.isPending}
                  className="h-8 text-xs font-semibold bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Re-analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3.5" />
                      Re-analyze ATS Score
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Top Score Summary Banner */}
            {analysis.aiNotice && (
              <div className="p-3 rounded-lg bg-surface-blue/30 border border-brand-blue/30 text-xs text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-brand-blue shrink-0" />
                <span>{analysis.aiNotice}</span>
              </div>
            )}

            <div className="dashboard-card p-5 sm:p-6 bg-gradient-to-br from-card via-card to-blue-500/5 border-brand-blue/25 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-center">
                {/* Score Dial / Pillar */}
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border border-border/60 text-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    ATS Resume Score
                  </span>

                  <div className="flex items-baseline gap-1 my-1">
                    <span
                      className={`text-5xl font-extrabold tracking-tight ${
                        analysis.overallScore >= 85
                          ? "text-brand-green"
                          : analysis.overallScore >= 70
                            ? "text-brand-blue"
                            : analysis.overallScore >= 55
                              ? "text-brand-orange"
                              : "text-destructive"
                      }`}
                    >
                      {analysis.overallScore}
                    </span>
                    <span className="text-base font-bold text-muted-foreground">/ 100</span>
                  </div>

                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold mt-1 ${
                      analysis.overallScore >= 85
                        ? "bg-surface-green text-brand-green border border-brand-green/30"
                        : analysis.overallScore >= 70
                          ? "bg-surface-blue text-brand-blue border border-brand-blue/30"
                          : analysis.overallScore >= 55
                            ? "bg-surface-peach text-brand-orange border border-brand-orange/30"
                            : "bg-destructive/10 text-destructive border border-destructive/30"
                    }`}
                  >
                    {analysis.compatibilityLabel}
                  </span>
                </div>

                {/* Report Context & File Stamp */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-brand-blue" />
                      <span className="text-xs font-bold text-foreground">
                        {analysis.originalFileName || data?.fileName || "Uploaded Resume"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Last analyzed:{" "}
                      {new Date(analysis.analyzedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {analysis.summary}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-brand-green stroke-[3]" />
                      <span>Parser Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-brand-green stroke-[3]" />
                      <span>Keywords Analyzed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-brand-green stroke-[3]" />
                      <span>Format Standardized</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-brand-green stroke-[3]" />
                      <span>AI Reviewed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown (6 Categories) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-4 text-brand-blue" />
                    Score Breakdown
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Deterministic category metrics evaluated against standard recruitment filters.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {Object.entries(analysis.categories).map(
                  ([key, cat]: [string, AtsCategoryAssessment]) => {
                    const CatIcon = categoryIcons[key] || FileText;
                    const weightPercent = Math.round(cat.weight * 100);

                    return (
                      <div
                        key={key}
                        className="dashboard-card p-4 space-y-3 flex flex-col justify-between hover:border-brand-blue/40 transition-colors"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="grid size-7 place-items-center rounded bg-surface-blue text-brand-blue">
                                <CatIcon className="size-3.5" />
                              </span>
                              <span className="text-xs font-bold text-foreground">{cat.label}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                              {weightPercent}% Weight
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-2xl font-extrabold text-foreground">
                              {cat.score}
                              <span className="text-xs font-normal text-muted-foreground">/100</span>
                            </span>
                            <span
                              className={`text-[10.5px] font-bold ${
                                cat.score >= 85
                                  ? "text-brand-green"
                                  : cat.score >= 70
                                    ? "text-brand-blue"
                                    : cat.score >= 55
                                      ? "text-brand-orange"
                                      : "text-destructive"
                              }`}
                            >
                              {cat.score >= 85
                                ? "Excellent"
                                : cat.score >= 70
                                  ? "Strong"
                                  : cat.score >= 55
                                    ? "Average"
                                    : "Low"}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                cat.score >= 85
                                  ? "bg-brand-green"
                                  : cat.score >= 70
                                    ? "bg-brand-blue"
                                    : cat.score >= 55
                                      ? "bg-brand-orange"
                                      : "bg-destructive"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, cat.score))}%` }}
                            />
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                            {cat.feedback}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Strengths and Areas to Improve 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume Strengths Card */}
              <div className="dashboard-card p-5 space-y-3.5 border-brand-green/20 bg-surface-green/10">
                <div className="flex items-center gap-2 border-b border-brand-green/20 pb-2.5">
                  <span className="grid size-7 place-items-center rounded bg-surface-green text-brand-green">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Resume Strengths</h3>
                    <p className="text-[10.5px] text-muted-foreground">
                      High-impact elements identified by ATS analysis
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {analysis.strengths && analysis.strengths.length > 0 ? (
                    analysis.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-green/15 text-brand-green mt-0.5">
                          <Check className="size-2.5 stroke-[3]" />
                        </span>
                        <span className="leading-snug">{str}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No specific strengths recorded.</p>
                  )}
                </div>
              </div>

              {/* Areas to Improve / Potential Issues Card */}
              <div className="dashboard-card p-5 space-y-3.5 border-brand-orange/20 bg-surface-peach/10">
                <div className="flex items-center gap-2 border-brand-orange/20 pb-2.5 border-b">
                  <span className="grid size-7 place-items-center rounded bg-surface-peach text-brand-orange">
                    <Lightbulb className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Areas to Improve</h3>
                    <p className="text-[10.5px] text-muted-foreground">
                      Targeted recommendations to increase your ATS compatibility
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {analysis.improvements && analysis.improvements.length > 0 ? (
                    analysis.improvements.map((imp, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-orange/15 text-brand-orange font-bold text-[9.5px] mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{imp}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No immediate improvements needed.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Keyword Analysis & ATS Recommendations 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Keyword Analysis Card */}
              <div className="dashboard-card p-5 space-y-3.5 border-border/70">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                  <span className="grid size-7 place-items-center rounded bg-surface-blue text-brand-blue">
                    <Key className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Keyword Analysis</h3>
                    <p className="text-[10.5px] text-muted-foreground">
                      Key technical and domain keywords found in your resume
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Matched Keywords
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords?.matched && analysis.keywords.matched.length > 0 ? (
                        analysis.keywords.matched.map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface-green text-brand-green border border-brand-green/20"
                          >
                            <Check className="size-3" />
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Keywords processed</span>
                      )}
                    </div>
                  </div>

                  {analysis.keywords?.potentialMissing &&
                    analysis.keywords.potentialMissing.length > 0 && (
                      <div className="pt-2 border-t border-border/40">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                          Potential Missing Keywords
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.keywords.potentialMissing.map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border/60"
                            >
                              <Tag className="size-3" />
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* ATS Recommendations Card */}
              <div className="dashboard-card p-5 space-y-3.5 border-border/70">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                  <span className="grid size-7 place-items-center rounded bg-surface-purple text-brand-purple">
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">ATS Recommendations</h3>
                    <p className="text-[10.5px] text-muted-foreground">
                      Actionable steps to maximize recruiter search matches
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {(analysis.recommendations && analysis.recommendations.length > 0
                    ? analysis.recommendations
                    : analysis.improvements
                  ).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-surface-purple text-brand-purple font-bold text-[9.5px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
}

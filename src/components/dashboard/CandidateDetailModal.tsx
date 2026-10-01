"use client";

import { useState } from "react";
import {
  Brain,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateApplicationStage } from "@/hooks/api/useApplications";
import { toast } from "sonner";

export interface CandidateModalData {
  id?: string | undefined;
  applicationId?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  job?: string | undefined;
  jobTitle?: string | undefined;
  location?: string | undefined;
  score?: number | undefined;
  aiScore?: number | undefined;
  status?: string | undefined;
  currentStage?: string | undefined;
  stage?: string | undefined;
  initials?: string | undefined;
  appliedOn?: string | undefined;
  experience?: string | undefined;
  skills?: string[] | undefined;
  summary?: string | undefined;
  coverLetter?: string | undefined;
  notes?: string | undefined;
  resumeId?: string | undefined;
  resumeFileName?: string | undefined;
}

interface CandidateDetailModalProps {
  candidate: CandidateModalData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageUpdated?: ((stage: string) => void) | undefined;
}

const STAGES = [
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFERED", label: "Offered" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

import { useResume, useParseResume } from "@/hooks/api/useResumes";

export function CandidateDetailModal({
  candidate,
  open,
  onOpenChange,
  onStageUpdated,
}: CandidateDetailModalProps) {
  const updateStageMutation = useUpdateApplicationStage();
  const parseResumeMutation = useParseResume();
  const [selectedStage, setSelectedStage] = useState<string>("");

  const resumeQuery = useResume(candidate?.resumeId, {
    enabled: !!candidate?.resumeId && open,
  });

  if (!candidate) return null;

  const activeStage =
    selectedStage ||
    candidate.currentStage?.toUpperCase() ||
    candidate.stage?.toUpperCase() ||
    candidate.status?.toUpperCase() ||
    "APPLIED";

  const score = candidate.score ?? candidate.aiScore ?? 85;
  const scoreColor =
    score >= 90
      ? "bg-surface-green text-brand-green border-brand-green/30"
      : score >= 70
        ? "bg-surface-purple text-brand-purple border-brand-purple/30"
        : "bg-surface-peach text-brand-orange border-brand-orange/30";

  const targetAppId = candidate.id || candidate.applicationId;

  const handleStageChange = async (newStage: string) => {
    if (!targetAppId) return;
    try {
      setSelectedStage(newStage);
      await updateStageMutation.mutateAsync({
        applicationId: targetAppId,
        stage: newStage,
      });
      toast.success(`Candidate stage moved to ${newStage}`);
      if (onStageUpdated) {
        onStageUpdated(newStage);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update candidate stage");
    }
  };

  const handleParseResume = async () => {
    if (!candidate.resumeId) return;
    try {
      await parseResumeMutation.mutateAsync(candidate.resumeId);
      toast.success("Resume parsed and structured profile extracted successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to analyze resume.");
    }
  };

  const getNextStage = (current: string): string | null => {
    switch (current) {
      case "APPLIED":
        return "SCREENING";
      case "SCREENING":
        return "INTERVIEW";
      case "INTERVIEW":
        return "OFFERED";
      default:
        return null;
    }
  };

  const nextStage = getNextStage(activeStage);
  const resume = resumeQuery.data;
  const parsedProfile = resume?.parsedProfile;
  const parsingStatus = parseResumeMutation.isPending
    ? "PROCESSING"
    : resume?.parsingStatus || "NOT_STARTED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Applied {candidate.appliedOn}
            </span>
            <div
              className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${scoreColor}`}
            >
              <Sparkles className="size-3" />
              {score}% AI Match
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="grid size-12 place-items-center rounded-full bg-brand-blue text-base font-bold text-primary-foreground shadow-sm shrink-0">
              {candidate.initials || "C"}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {candidate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-brand-blue font-medium">
                {candidate.job || candidate.jobTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-muted-foreground rounded-lg bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{candidate.email}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="size-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.phone || "+1 (555) 019-2831"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.location || "San Francisco, CA"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="size-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.experience || "3-5 years exp"}</span>
            </div>
          </div>

          {/* Stage Selector Controls */}
          <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs">Pipeline Stage:</span>
              <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-[11px] font-bold text-brand-blue border border-brand-blue/20">
                {activeStage}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={updateStageMutation.isPending}
                  onClick={() => handleStageChange(s.value)}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium border transition-all cursor-pointer text-center ${
                    activeStage === s.value
                      ? "bg-brand-blue text-white border-brand-blue shadow-xs font-bold"
                      : "bg-background text-muted-foreground border-border hover:border-brand-blue/50 hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Match & Summary */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <Brain className="size-3.5 text-brand-purple" />
                AI Candidate-to-Job Match Analysis
              </h4>
            </div>
            <p className="text-muted-foreground text-[11.5px] leading-relaxed">
              {parsedProfile?.summary ||
                candidate.summary ||
                candidate.coverLetter ||
                `${candidate.name} demonstrates an alignment score of ${score}% with the job specification for ${candidate.job || "this role"}.`}
            </p>
          </div>

          {/* Recruiter Notes */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">Recruiter Notes</h4>
            <div className="rounded-lg border border-border bg-card p-2.5">
              <p className="text-[11px] text-muted-foreground italic">
                {candidate.notes || candidate.summary || "No recruiter evaluation notes added yet."}
              </p>
            </div>
          </div>

          {/* Skills */}
          {(parsedProfile?.skills?.length || candidate.skills?.length) && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5">Extracted Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {(parsedProfile?.skills || candidate.skills || []).map((skill: string) => (
                  <span
                    key={skill}
                    className="rounded-md bg-surface-blue px-2 py-0.5 text-[10px] font-medium text-brand-blue border border-brand-blue/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Structured Experience from Parsed Profile */}
          {parsedProfile?.experience && parsedProfile.experience.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5">Work History (AI Parsed)</h4>
              <div className="space-y-2">
                {parsedProfile.experience.map((exp: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1">
                    <div className="flex items-start justify-between">
                      <strong className="text-foreground text-xs">{exp.role}</strong>
                      <span className="text-[10px] text-muted-foreground">
                        {exp.startDate} – {exp.endDate || "Present"}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-blue font-medium">
                      {exp.company} {exp.location ? `• ${exp.location}` : ""}
                    </p>
                    {Array.isArray(exp.description) && exp.description.length > 0 && (
                      <ul className="list-disc pl-4 text-[10.5px] text-muted-foreground space-y-0.5">
                        {exp.description.map((bullet: string, bIdx: number) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structured Education from Parsed Profile */}
          {parsedProfile?.education && parsedProfile.education.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5">Education (AI Parsed)</h4>
              <div className="space-y-1.5">
                {parsedProfile.education.map((edu: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border/80 bg-card p-2 text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-foreground">{edu.degree}</strong>
                      <p className="text-[11px] text-muted-foreground">{edu.institution} {edu.grade ? `(${edu.grade})` : ""}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{edu.startDate} – {edu.endDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Resume & AI Analyze Button */}
          <div className="rounded-lg border border-border p-3 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue shrink-0">
                <FileText className="size-4" />
              </div>
              <div>
                <span className="block font-semibold text-xs text-foreground truncate max-w-[200px]">
                  {candidate.resumeFileName || resume?.originalFileName || `${candidate.name?.replace(/\s+/g, "_")}_Resume.pdf`}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span>Status:</span>
                  <strong className={parsingStatus === "COMPLETED" ? "text-brand-green" : parsingStatus === "FAILED" ? "text-destructive" : "text-brand-blue"}>
                    {parsingStatus}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              {candidate.resumeId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={parseResumeMutation.isPending || parsingStatus === "PROCESSING"}
                    onClick={handleParseResume}
                    className="h-7 px-2.5 text-[11px] font-semibold gap-1"
                  >
                    {parseResumeMutation.isPending || parsingStatus === "PROCESSING" ? (
                      <>
                        <Loader2 className="size-3 animate-spin text-brand-blue" />
                        Analyzing...
                      </>
                    ) : parsingStatus === "COMPLETED" ? (
                      <>
                        <Sparkles className="size-3 text-brand-purple" />
                        Re-analyze
                      </>
                    ) : parsingStatus === "FAILED" ? (
                      <>
                        <Sparkles className="size-3 text-destructive" />
                        Retry Analysis
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3 text-brand-purple" />
                        Analyze Resume
                      </>
                    )}
                  </Button>

                  <a
                    href={`/api/resumes/${candidate.resumeId}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background h-7 px-2.5 text-[11px] font-semibold text-foreground hover:bg-accent gap-1 transition-colors"
                  >
                    <Download className="size-3" />
                    Download
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-brand-green" />
            Current Stage: <strong>{activeStage}</strong>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {nextStage && (
              <Button
                size="sm"
                disabled={updateStageMutation.isPending}
                className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90 gap-1 text-xs"
                onClick={() => handleStageChange(nextStage)}
              >
                {updateStageMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserCheck className="size-3.5" />
                )}
                Advance to {nextStage}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


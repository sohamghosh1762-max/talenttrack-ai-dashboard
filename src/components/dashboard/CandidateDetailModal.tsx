"use client";

import {
  Brain,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
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
import type { Applicant } from "@/data/mockData";

export interface CandidateModalData {
  id?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  job?: string | undefined;
  location?: string | undefined;
  score?: number | undefined;
  status?: string | undefined;
  initials?: string | undefined;
  appliedOn?: string | undefined;
  experience?: string | undefined;
  skills?: string[] | undefined;
  summary?: string | undefined;
  resumeId?: string | undefined;
  resumeFileName?: string | undefined;
}

interface CandidateDetailModalProps {
  candidate: CandidateModalData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateDetailModal({ candidate, open, onOpenChange }: CandidateDetailModalProps) {
  if (!candidate) return null;

  const score = candidate.score ?? 85;
  const scoreColor =
    score >= 90
      ? "bg-surface-green text-brand-green border-brand-green/30"
      : score >= 70
        ? "bg-surface-purple text-brand-purple border-brand-purple/30"
        : "bg-surface-peach text-brand-orange border-brand-orange/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Applied {candidate.appliedOn}
            </span>
            <div
              className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${scoreColor}`}
            >
              <Sparkles className="size-3" />
              {candidate.score}% AI Match
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="grid size-12 place-items-center rounded-full bg-brand-blue text-base font-bold text-primary-foreground shadow-sm">
              {candidate.initials}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {candidate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-brand-blue font-medium">
                {candidate.job}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground rounded-lg bg-muted/40 p-3">
            <div className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{candidate.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.phone || "+1 (555) 019-2831"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.location || "San Francisco, CA"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.experience || "3-5 years exp"}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Brain className="size-3.5 text-brand-purple" />
              AI Match & Profile Summary
            </h4>
            <p className="text-muted-foreground text-[11.5px] leading-relaxed">
              {candidate.summary ||
                `${candidate.name} demonstrates a high semantic similarity score of ${candidate.score}% with the job specification for ${candidate.job}. Strong alignment across core skill proficiencies and domain experience.`}
            </p>
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5">Extracted Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
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

          {/* Attached Resume */}
          <div className="rounded-lg border border-border p-3 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                <FileText className="size-4" />
              </div>
              <div>
                <span className="block font-semibold text-xs text-foreground">
                  {candidate.resumeFileName || `${candidate.name?.replace(/\s+/g, "_")}_Resume.pdf`}
                </span>
                <span className="text-[10px] text-muted-foreground">Attached Document</span>
              </div>
            </div>
            {candidate.resumeId ? (
              <a
                href={`/api/resumes/${candidate.resumeId}/download`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background h-7 px-2.5 text-[11px] font-semibold text-foreground hover:bg-accent gap-1 transition-colors"
              >
                <Download className="size-3" />
                Download
              </a>
            ) : (
              <span className="text-[10.5px] text-muted-foreground italic">Standard Profile</span>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-brand-green" />
            Status: <strong>{candidate.status}</strong>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90 gap-1"
              onClick={() => onOpenChange(false)}
            >
              <UserCheck className="size-3.5" />
              Advance in Pipeline
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

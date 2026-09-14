"use client";

import { Briefcase, Building, Calendar, CheckCircle2, MapPin, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { JobOpening } from "@/data/mockData";

interface JobDetailModalProps {
  job: JobOpening | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailModal({ job, open, onOpenChange }: JobDetailModalProps) {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                job.status === "Active"
                  ? "bg-surface-green text-brand-green"
                  : "bg-surface-peach text-brand-orange"
              }`}
            >
              {job.status}
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3.5" />
              Posted {job.createdOn}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground mt-1">{job.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Job Opening Overview and Candidate Volume
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <span className="text-[10px] text-muted-foreground block">Department</span>
              <span className="font-semibold flex items-center gap-1 mt-0.5">
                <Building className="size-3 text-brand-blue" />
                {job.department}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Location</span>
              <span className="font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="size-3 text-brand-orange" />
                {job.location}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Applications</span>
              <span className="font-semibold flex items-center gap-1 mt-0.5">
                <Users className="size-3 text-brand-green" />
                {job.applications} Applicants
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-1">Role Description</h4>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              {job.description ||
                "Lead full-lifecycle development and architectural design for scalable cloud services and core customer experiences."}
            </p>
          </div>

          <div className="rounded-lg bg-surface-blue/50 p-3 border border-brand-blue/20">
            <div className="flex items-center gap-2 text-brand-blue font-semibold text-xs mb-1">
              <CheckCircle2 className="size-4" />
              AI Matching Ready
            </div>
            <p className="text-[11px] text-muted-foreground">
              Candidate resumes submitted to this opening will be automatically scored against
              required technical skills and experience levels.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
            onClick={() => onOpenChange(false)}
          >
            Manage Applicants ({job.applications})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

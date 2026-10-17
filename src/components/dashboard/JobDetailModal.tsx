"use client";

import { Link } from "@tanstack/react-router";
import {
  Building,
  Calendar,
  CheckCircle2,
  Edit2,
  MapPin,
  Users,
  Archive,
  DollarSign,
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
import type { IJob } from "@/server/types/job-types";
import type { JobOpening } from "@/data/mockData";

interface JobDetailModalProps {
  job: IJob | JobOpening | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (job: IJob | JobOpening) => void;
  onArchive?: (jobId: string) => void;
}

export function JobDetailModal({
  job,
  open,
  onOpenChange,
  onEdit,
  onArchive,
}: JobDetailModalProps) {
  if (!job) return null;

  const applicationsCount =
    "applicationsCount" in job ? job.applicationsCount || 0 : (job as JobOpening).applications || 0;

  const postedDate =
    "createdAt" in job && job.createdAt
      ? new Date(job.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : (job as JobOpening).createdOn || "Recently";

  const status = job.status;
  const isArchived = status === "ARCHIVED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                status === "Active" || status === "PUBLISHED"
                  ? "bg-surface-green text-brand-green"
                  : status === "ARCHIVED"
                    ? "bg-muted text-muted-foreground"
                    : "bg-surface-peach text-brand-orange"
              }`}
            >
              {status}
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3.5" />
              Posted {postedDate}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground mt-1">{job.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Job Opening Overview and Candidate Pipeline
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
                {applicationsCount} Applicants
              </span>
            </div>
          </div>

          {"salaryRange" in job &&
            job.salaryRange &&
            (job.salaryRange.min || job.salaryRange.max) && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-foreground">
                <DollarSign className="size-4 text-brand-green shrink-0" />
                <span>
                  Compensation:{" "}
                  <strong>
                    ${job.salaryRange.min?.toLocaleString()}
                    {job.salaryRange.max ? ` - $${job.salaryRange.max?.toLocaleString()}` : "+"}
                  </strong>{" "}
                  / year
                </span>
              </div>
            )}

          <div>
            <h4 className="font-semibold text-foreground mb-1">Role Description</h4>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              {job.description ||
                "Lead full-lifecycle development and architectural design for scalable cloud services and core customer experiences."}
            </p>
          </div>

          {"skills" in job && Array.isArray(job.skills) && job.skills.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5">Required Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-surface-blue px-2 py-0.5 text-[10.5px] font-medium text-brand-blue"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-surface-blue/50 p-3 border border-brand-blue/20">
            <div className="flex items-center gap-2 text-brand-blue font-semibold text-xs mb-1">
              <CheckCircle2 className="size-4" />
              AI Matching Enabled
            </div>
            <p className="text-[11px] text-muted-foreground">
              Candidate resumes submitted to this opening will be automatically scored against
              required technical skills and experience levels.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(job);
                }}
              >
                <Edit2 className="size-3" />
                Edit
              </Button>
            )}
            {onArchive && !isArchived && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => {
                  onOpenChange(false);
                  onArchive(job.id);
                }}
              >
                <Archive className="size-3" />
                Archive
              </Button>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
              <Button
                size="sm"
                className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90 text-xs"
              >
                View Full Pipeline
              </Button>
            </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

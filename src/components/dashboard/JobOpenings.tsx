"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Edit2, PauseCircle, PlayCircle, Eye, Loader2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useJobs, useUpdateJob, useArchiveJob } from "@/hooks/api/useJobs";
import type { IJob } from "@/server/types/job-types";
import { JobDetailModal } from "./JobDetailModal";
import { PostJobModal } from "./PostJobModal";
import { toast } from "sonner";

interface JobOpeningsProps {
  onOpenJobDetail?: (job: IJob) => void;
}

export function JobOpenings({ onOpenJobDetail }: JobOpeningsProps) {
  const { data: jobsResponse, isLoading, error } = useJobs({ limit: 5 });
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [jobToEdit, setJobToEdit] = useState<IJob | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const updateJobMutation = useUpdateJob();
  const archiveJobMutation = useArchiveJob();

  const jobs: IJob[] = jobsResponse?.jobs || jobsResponse?.data || [];

  const handleToggleStatus = async (job: IJob) => {
    const newStatus = job.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateJobMutation.mutateAsync({
        id: job.id,
        data: { status: newStatus },
      });
      toast.success(newStatus === "PUBLISHED" ? "Job opening published!" : "Job paused/moved to draft.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const handleArchive = async (jobId: string) => {
    try {
      await archiveJobMutation.mutateAsync(jobId);
      toast.success("Job opening archived.");
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to archive job.");
    }
  };

  const handleEdit = (job: IJob) => {
    setJobToEdit(job);
    setEditModalOpen(true);
  };

  return (
    <>
      <section className="dashboard-card min-w-0 overflow-hidden">
        <div className="flex h-11 items-center justify-between px-4 border-b border-border/60">
          <h2 className="text-[13.5px] font-bold text-foreground">Your Job Openings</h2>
          <Link to="/jobs" className="text-[11px] font-semibold text-brand-blue hover:underline">
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin text-brand-blue" />
            Loading job openings...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-destructive">
            Failed to load job openings.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] border-collapse text-left text-xs">
              <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Job Title</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5">Applications</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created On</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {jobs.map((job) => {
                  const createdDate = job.createdAt
                    ? new Date(job.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently";

                  return (
                    <tr key={job.id} className="transition-colors hover:bg-muted/30 group">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <span
                          className="cursor-pointer hover:text-brand-blue"
                          onClick={() => setSelectedJob(job)}
                        >
                          {job.title}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground font-medium">{job.department}</td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-foreground">{job.applicationsCount || 0}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            job.status === "PUBLISHED"
                              ? "bg-surface-green text-brand-green"
                              : job.status === "ARCHIVED"
                                ? "bg-muted text-muted-foreground"
                                : "bg-surface-peach text-brand-orange"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        {createdDate}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[10.5px] font-semibold text-brand-blue hover:bg-surface-blue hover:border-brand-blue/30"
                            onClick={() => {
                              setSelectedJob(job);
                              onOpenJobDetail?.(job);
                            }}
                          >
                            <Eye className="size-3 mr-1" />
                            View
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                                aria-label={`Actions for ${job.title}`}
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs"
                                onSelect={() => handleEdit(job)}
                              >
                                <Edit2 className="size-3.5 text-muted-foreground" />
                                Edit Job
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs"
                                onSelect={() => handleToggleStatus(job)}
                              >
                                {job.status === "PUBLISHED" ? (
                                  <>
                                    <PauseCircle className="size-3.5 text-brand-orange" />
                                    Move to Draft
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="size-3.5 text-brand-green" />
                                    Publish Opening
                                  </>
                                )}
                              </DropdownMenuItem>
                              {job.status !== "ARCHIVED" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                                    onSelect={() => handleArchive(job.id)}
                                  >
                                    <Archive className="size-3.5" />
                                    Archive Opening
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {jobs.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active job openings yet.
              </div>
            )}
          </div>
        )}
      </section>

      <JobDetailModal
        job={selectedJob}
        open={selectedJob !== null}
        onOpenChange={(open) => !open && setSelectedJob(null)}
        onEdit={(job) => handleEdit(job as IJob)}
        onArchive={handleArchive}
      />

      <PostJobModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setJobToEdit(null);
        }}
        jobToEdit={jobToEdit}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Edit2, Copy, PauseCircle, PlayCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { jobOpeningsData, type JobOpening } from "@/data/mockData";
import { JobDetailModal } from "./JobDetailModal";

interface JobOpeningsProps {
  onOpenJobDetail?: (job: JobOpening) => void;
}

export function JobOpenings({ onOpenJobDetail }: JobOpeningsProps) {
  const [jobs, setJobs] = useState<JobOpening[]>(jobOpeningsData);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  const handleToggleStatus = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: j.status === "Active" ? "Paused" : "Active" } : j,
      ),
    );
  };

  const handleDuplicate = (job: JobOpening) => {
    const duplicated: JobOpening = {
      ...job,
      id: `job-${Date.now()}`,
      title: `${job.title} (Copy)`,
      applications: 0,
      status: "Paused",
      createdOn: "Today",
    };
    setJobs((prev) => [duplicated, ...prev]);
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
              {jobs.map((job) => (
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
                    <span className="font-bold text-foreground">{job.applications}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        job.status === "Active"
                          ? "bg-surface-green text-brand-green"
                          : "bg-surface-peach text-brand-orange"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                    {job.createdOn}
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
                            onSelect={() => setSelectedJob(job)}
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                            Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs"
                            onSelect={() => handleDuplicate(job)}
                          >
                            <Copy className="size-3.5 text-muted-foreground" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs"
                            onSelect={() => handleToggleStatus(job.id)}
                          >
                            {job.status === "Active" ? (
                              <>
                                <PauseCircle className="size-3.5 text-brand-orange" />
                                Pause Opening
                              </>
                            ) : (
                              <>
                                <PlayCircle className="size-3.5 text-brand-green" />
                                Activate Opening
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <JobDetailModal
        job={selectedJob}
        open={selectedJob !== null}
        onOpenChange={(open) => !open && setSelectedJob(null)}
      />
    </>
  );
}

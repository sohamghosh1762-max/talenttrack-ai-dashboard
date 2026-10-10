"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Building,
  Calendar,
  Eye,
  Filter,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Users,
  Archive,
  Edit2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostJobModal } from "@/components/dashboard/PostJobModal";
import { JobDetailModal } from "@/components/dashboard/JobDetailModal";
import { useJobs, useArchiveJob, useUpdateJob } from "@/hooks/api/useJobs";
import type { IJob } from "@/server/types/job-types";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Manage Job Openings — TalentTrack AI" },
      { name: "description", content: "Manage your job openings and candidate pipelines." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterDept, setFilterDept] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [jobToEdit, setJobToEdit] = useState<IJob | null>(null);

  const {
    data: jobsResponse,
    isLoading,
    error,
  } = useJobs({
    search: search.trim() || undefined,
    department: filterDept === "All" ? undefined : filterDept,
    status: filterStatus === "All" ? undefined : (filterStatus as any),
  });

  const archiveJobMutation = useArchiveJob();
  const updateJobMutation = useUpdateJob();

  const jobs: IJob[] = jobsResponse?.jobs || jobsResponse?.data || [];

  const handleArchive = async (jobId: string) => {
    try {
      await archiveJobMutation.mutateAsync(jobId);
      toast.success("Job archived successfully.");
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to archive job.");
    }
  };

  const handleToggleStatus = async (job: IJob) => {
    const newStatus = job.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateJobMutation.mutateAsync({
        id: job.id,
        data: { status: newStatus },
      });
      toast.success(newStatus === "PUBLISHED" ? "Job published!" : "Job paused/moved to draft.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update job status.");
    }
  };

  const handleEdit = (job: IJob) => {
    setJobToEdit(job);
    setPostJobOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                <BriefcaseBusiness className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Jobs</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Manage your job openings, hiring pipelines, and active roles.
            </p>
          </div>

          <Button
            className="h-10 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
            onClick={() => {
              setJobToEdit(null);
              setPostJobOpen(true);
            }}
          >
            <Plus className="size-4 font-bold" />
            Post a New Job
          </Button>
        </section>

        {/* Filters and Search Bar */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title or location..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <Filter className="size-3.5 text-muted-foreground ml-1" />
              {["All", "PUBLISHED", "DRAFT", "ARCHIVED"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    filterStatus === status
                      ? "bg-card text-brand-blue shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "PUBLISHED"
                    ? "Published"
                    : status === "DRAFT"
                      ? "Draft"
                      : status === "ARCHIVED"
                        ? "Archived"
                        : "All"}
                </button>
              ))}
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-8.5 rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Research">Research</option>
              <option value="Design">Design</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Product">Product</option>
              <option value="Marketing">Marketing</option>
              <option value="Analytics">Analytics</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
        </div>

        {/* Job Openings Table */}
        <div className="dashboard-card overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs gap-2">
              <Loader2 className="size-6 animate-spin text-brand-blue" />
              <span>Loading job openings...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-destructive">
              Failed to load jobs: {(error as Error).message}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Applications</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Posted</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {jobs.map((job) => {
                    const formattedDate = job.createdAt
                      ? new Date(job.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently";

                    return (
                      <tr key={job.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <span
                            className="cursor-pointer hover:text-brand-blue"
                            onClick={() => setSelectedJob(job)}
                          >
                            {job.title}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building className="size-3 text-muted-foreground" />
                            {job.department}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="size-3 text-muted-foreground" />
                            {job.location}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {job.employmentType}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5 text-brand-blue" />
                            {job.applicationsCount || 0}
                          </span>
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
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" />
                            {formattedDate}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[10.5px] font-semibold text-brand-blue hover:bg-surface-blue"
                              onClick={() => setSelectedJob(job)}
                            >
                              <Eye className="size-3 mr-1" />
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  aria-label={`More options for ${job.title}`}
                                >
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleEdit(job)}>
                                  <Edit2 className="size-3.5 mr-2 text-muted-foreground" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleToggleStatus(job)}>
                                  {job.status === "PUBLISHED" ? (
                                    <>
                                      <PauseCircle className="size-3.5 mr-2 text-brand-orange" />
                                      Move to Draft
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="size-3.5 mr-2 text-brand-green" />
                                      Publish Job
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {job.status !== "ARCHIVED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={() => handleArchive(job.id)}
                                    >
                                      <Archive className="size-3.5 mr-2" />
                                      Archive Job
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
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No job openings found matching your criteria.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <PostJobModal
          open={postJobOpen}
          onOpenChange={(open) => {
            setPostJobOpen(open);
            if (!open) setJobToEdit(null);
          }}
          jobToEdit={jobToEdit}
        />
        <JobDetailModal
          job={selectedJob}
          open={selectedJob !== null}
          onOpenChange={(open) => !open && setSelectedJob(null)}
          onEdit={(job) => handleEdit(job as IJob)}
          onArchive={handleArchive}
        />
      </div>
    </DashboardLayout>
  );
}

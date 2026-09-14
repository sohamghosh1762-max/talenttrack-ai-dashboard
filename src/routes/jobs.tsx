"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Building,
  Calendar,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Users,
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
import { jobOpeningsData, type JobOpening } from "@/data/mockData";

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
  const [jobs, setJobs] = useState<JobOpening[]>(jobOpeningsData);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterDept, setFilterDept] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    const matchesDept = filterDept === "All" || job.department === filterDept;
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.location.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const handleCreateJob = (newJob: {
    title: string;
    department: string;
    location: string;
    type: string;
  }) => {
    const created: JobOpening = {
      id: `job-${Date.now()}`,
      title: newJob.title,
      department: newJob.department,
      applications: 0,
      status: "Active",
      createdOn: "Today",
      location: newJob.location,
      type: newJob.type as "Full-Time" | "Contract" | "Remote",
      experience: "2-4 years",
    };
    setJobs((prev) => [created, ...prev]);
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
              Manage your job openings and active hiring positions.
            </p>
          </div>

          <Button
            className="h-10 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
            onClick={() => setPostJobOpen(true)}
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
              {["All", "Active", "Paused"].map((status) => (
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
                  {status}
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
            </select>
          </div>
        </div>

        {/* Job Openings Table */}
        <div className="dashboard-card overflow-hidden">
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
                {filteredJobs.map((job) => (
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
                        {job.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5 text-brand-blue" />
                        {job.applications}
                      </span>
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
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        {job.createdOn}
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
                            <DropdownMenuItem onSelect={() => setSelectedJob(job)}>
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                const dup: JobOpening = {
                                  ...job,
                                  id: `job-${Date.now()}`,
                                  title: `${job.title} (Copy)`,
                                  applications: 0,
                                  createdOn: "Today",
                                };
                                setJobs((prev) => [dup, ...prev]);
                              }}
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                setJobs((prev) =>
                                  prev.map((j) =>
                                    j.id === job.id
                                      ? {
                                          ...j,
                                          status: j.status === "Active" ? "Paused" : "Active",
                                        }
                                      : j,
                                  ),
                                );
                              }}
                            >
                              {job.status === "Active" ? "Pause" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredJobs.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No job openings matched your filters.
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <PostJobModal
          open={postJobOpen}
          onOpenChange={setPostJobOpen}
          onJobCreated={handleCreateJob}
        />
        <JobDetailModal
          job={selectedJob}
          open={selectedJob !== null}
          onOpenChange={(open) => !open && setSelectedJob(null)}
        />
      </div>
    </DashboardLayout>
  );
}

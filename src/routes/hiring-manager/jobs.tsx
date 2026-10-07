"use client";

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHiringManagerJobs } from "@/hooks/api/useHiringManager";

export const Route = createFileRoute("/hiring-manager/jobs")({
  head: () => ({
    meta: [
      { title: "My Assigned Positions — Hiring Manager" },
      { name: "description", content: "View all positions and requisitions assigned to your manager profile." },
    ],
  }),
  component: HiringManagerJobsPage,
});

function HiringManagerJobsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const { data, isLoading, error, refetch, isFetching } = useHiringManagerJobs();

  const jobs = data?.jobs || [];

  const departments = Array.from(new Set(jobs.map((j) => j.department).filter(Boolean)));

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchQuery.trim() ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.skills || []).some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = departmentFilter === "ALL" || job.department === departmentFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <HiringManagerLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              My Assigned Positions
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Overview of active job postings and candidate requisitions assigned to you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setDepartmentFilter("ALL")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                departmentFilter === "ALL"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Departments ({jobs.length})
            </button>

            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  departmentFilter === dept
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load assigned positions. Please try again.</span>
          </div>
        )}

        {/* Job Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <Briefcase className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No assigned jobs found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You currently do not have any job requisitions assigned. When recruiters assign you to a position, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col justify-between p-5 rounded-2xl border border-border bg-card hover:border-brand-blue/40 transition-all shadow-xs space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {job.department}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        job.status === "PUBLISHED" || job.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground line-clamp-1">{job.title}</h3>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span>{job.employmentType || "Full-time"}</span>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      {job.skills.slice(0, 4).map((skill: string) => (
                        <span
                          key={skill}
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{job.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {job.applicationsCount || 0} candidates
                  </span>

                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/hiring-manager/candidates",
                        search: { jobId: job.id } as Record<string, string>,
                      })
                    }
                    className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs h-8 gap-1.5 cursor-pointer"
                  >
                    <Users className="size-3.5" />
                    <span>View Candidates</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </HiringManagerLayout>
  );
}

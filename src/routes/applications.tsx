"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  Eye,
  Filter,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CandidateDetailModal, type CandidateModalData } from "@/components/dashboard/CandidateDetailModal";
import { useRecruiterApplications } from "@/hooks/api/useApplications";

export const Route = createFileRoute("/applications")({
  head: () => ({
    meta: [
      { title: "Candidate Applications — TalentTrack AI" },
      { name: "description", content: "Review and manage candidate applications." },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [statusTab, setStatusTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModalData | null>(null);

  const {
    data: applications = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useRecruiterApplications({
    search: search.trim() || undefined,
  });

  const filteredApplications = applications.filter((app) => {
    if (statusTab === "All") return true;
    const statusUpper = app.status?.toUpperCase();
    const tabUpper = statusTab.toUpperCase();
    if (tabUpper === "SHORTLISTED") return statusUpper === "SHORTLISTED";
    if (tabUpper === "UNDER REVIEW") return statusUpper === "UNDER REVIEW" || statusUpper === "SCREENING";
    if (tabUpper === "INTERVIEW") return statusUpper === "INTERVIEW";
    if (tabUpper === "APPLIED") return statusUpper === "APPLIED";
    return statusUpper === tabUpper;
  });

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SHORTLISTED":
      case "OFFERED":
        return "bg-surface-green text-brand-green border-brand-green/30";
      case "UNDER REVIEW":
      case "SCREENING":
        return "bg-surface-blue text-brand-blue border-brand-blue/30";
      case "INTERVIEW":
        return "bg-surface-purple text-brand-purple border-brand-purple/30";
      case "REJECTED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getScoreStyle = (score: number) => {
    if (score >= 90) return "bg-surface-green text-brand-green border-brand-green/20";
    if (score >= 70) return "bg-surface-purple text-brand-purple border-brand-purple/20";
    return "bg-surface-peach text-brand-orange border-brand-orange/20";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-green text-brand-green">
                <Users className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Applications</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Review and manage candidate applications submitted for your active job postings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <span className="rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20">
              {filteredApplications.length} Active Applicants
            </span>
          </div>
        </section>

        {/* Filter bar */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, role, or skill..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs overflow-x-auto w-full sm:w-auto">
            <Filter className="size-3.5 text-muted-foreground ml-1 shrink-0" />
            {["All", "Shortlisted", "Under Review", "Interview", "Applied"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusTab(tab)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusTab === tab
                    ? "bg-card text-brand-blue shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="dashboard-card p-12 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-brand-blue mx-auto" />
            <p className="text-xs text-muted-foreground">Loading candidate applications...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="dashboard-card p-8 text-center space-y-3 border-destructive/30">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Failed to load applications</h3>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button size="sm" onClick={() => refetch()} className="text-xs bg-brand-blue">
              Retry
            </Button>
          </div>
        )}

        {/* Candidate Applications Table */}
        {!isLoading && !error && (
          <div className="dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-3 py-3">Job Applied For</th>
                    <th className="px-3 py-3">AI Match Score</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Applied On</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredApplications.map((app, i) => {
                    const candidateName = app.applicant?.name || app.applicantName || "Candidate";
                    const candidateEmail = app.applicant?.email || app.applicantEmail || "applicant@example.com";
                    const candidatePhone = app.applicant?.phone || "+1 (555) 234-5678";
                    const candidateLocation = app.applicant?.location || "San Francisco, CA";
                    const candidateInitials =
                      app.applicant?.initials ||
                      candidateName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                    const jobTitle = app.job?.title || app.jobTitle || "Job Position";
                    const score = app.aiScore ?? 88;
                    const appliedDateStr = new Date(app.appliedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    const modalData: CandidateModalData = {
                      id: app.id,
                      name: candidateName,
                      email: candidateEmail,
                      phone: candidatePhone,
                      job: jobTitle,
                      location: candidateLocation,
                      score,
                      status: app.status,
                      initials: candidateInitials,
                      appliedOn: appliedDateStr,
                      skills: app.applicant?.skills || ["React", "TypeScript", "Node.js"],
                      resumeId: app.resumeId || app.resume?.id,
                      resumeFileName: app.resume?.originalFileName,
                    };

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedCandidate(modalData)}
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`grid size-8 place-items-center rounded-full text-xs font-bold shrink-0 ${
                                i % 2 === 0
                                  ? "bg-surface-blue text-brand-blue"
                                  : "bg-surface-purple text-brand-purple"
                              }`}
                            >
                              {candidateInitials}
                            </span>
                            <div>
                              <strong className="block text-xs font-semibold text-foreground">
                                {candidateName}
                              </strong>
                              <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Mail className="size-2.5" />
                                  {candidateEmail}
                                </span>
                                <span className="hidden sm:flex items-center gap-0.5">
                                  <Phone className="size-2.5" />
                                  {candidatePhone}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{jobTitle}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${getScoreStyle(
                              score,
                            )}`}
                          >
                            <Sparkles className="size-2.5" />
                            {score}%
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold border ${getStatusStyle(
                              app.status,
                            )}`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" />
                            {appliedDateStr}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[10.5px] font-semibold text-brand-blue hover:bg-surface-blue"
                            onClick={() => setSelectedCandidate(modalData)}
                          >
                            <Eye className="size-3 mr-1" />
                            Profile
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredApplications.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No applications found for the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          candidate={selectedCandidate}
          open={selectedCandidate !== null}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
        />
      </div>
    </DashboardLayout>
  );
}

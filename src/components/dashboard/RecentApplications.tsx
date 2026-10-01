"use client";

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Loader2 } from "lucide-react";
import { useRecruiterApplications } from "@/hooks/api/useApplications";
import { CandidateDetailModal, type CandidateModalData } from "./CandidateDetailModal";

interface RecentApplicationsProps {
  searchQuery?: string;
  onSelectCandidate?: (candidate: any) => void;
}

export function RecentApplications({
  searchQuery = "",
  onSelectCandidate,
}: RecentApplicationsProps) {
  const { data: applications = [], isLoading } = useRecruiterApplications({
    search: searchQuery.trim() || undefined,
  });

  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModalData | null>(null);

  const displayApplications = useMemo(() => {
    return applications.slice(0, 6);
  }, [applications]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SHORTLISTED":
      case "OFFERED":
        return "bg-surface-green text-brand-green";
      case "UNDER REVIEW":
      case "SCREENING":
        return "bg-surface-blue text-brand-blue";
      case "INTERVIEW":
        return "bg-surface-purple text-brand-purple";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "bg-surface-green text-brand-green border-brand-green/20";
    if (score >= 70) return "bg-surface-purple text-brand-purple border-brand-purple/20";
    return "bg-surface-peach text-brand-orange border-brand-orange/20";
  };

  return (
    <>
      <section className="dashboard-card min-w-0 overflow-hidden">
        <div className="flex h-11 items-center justify-between px-4 border-b border-border/60">
          <h2 className="text-[13.5px] font-bold text-foreground">Recent Applications</h2>
          <Link
            to="/applications"
            className="text-[11px] font-semibold text-brand-blue hover:underline"
          >
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin text-brand-blue" />
            Loading recent applications...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-left text-xs">
              <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-3 py-2.5">Job Title</th>
                  <th className="px-3 py-2.5">Match Score</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Applied On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayApplications.map((app, i) => {
                  const candidateName = app.applicant?.name || app.applicantName || "Candidate";
                  const candidateEmail = app.applicant?.email || app.applicantEmail || "applicant@example.com";
                  const candidateInitials = (candidateName || "C").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const jobTitle = app.job?.title || app.jobTitle || "Job Position";
                  const score = app.aiScore ?? 88;
                  const dateStr = new Date(app.appliedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  const modalData: CandidateModalData = {
                    id: app.id,
                    applicationId: app.id,
                    name: candidateName,
                    email: candidateEmail,
                    phone: app.applicant?.phone || "+1 (555) 234-5678",
                    job: jobTitle,
                    location: app.applicant?.location || "San Francisco, CA",
                    score,
                    status: app.status,
                    currentStage: app.currentStage,
                    initials: candidateInitials,
                    appliedOn: dateStr,
                    skills: app.applicant?.skills || ["React", "TypeScript"],
                    resumeId: app.resumeId,
                    resumeFileName: app.resume?.originalFileName,
                  };

                  return (
                    <tr
                      key={app.id}
                      onClick={() => {
                        setSelectedCandidate(modalData);
                        onSelectCandidate?.(modalData);
                      }}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid size-7.5 place-items-center rounded-full text-[10px] font-bold shrink-0 ${
                              i % 2 === 0
                                ? "bg-surface-blue text-brand-blue"
                                : "bg-surface-purple text-brand-purple"
                            }`}
                          >
                            {candidateInitials}
                          </span>
                          <div className="min-w-0">
                            <strong className="block text-xs font-semibold text-foreground truncate">
                              {candidateName}
                            </strong>
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {candidateEmail}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-medium truncate max-w-[140px]">
                        {jobTitle}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${getScoreBadge(
                            score,
                          )}`}
                        >
                          <Sparkles className="size-2.5" />
                          {score}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(
                            app.status,
                          )}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {displayApplications.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No recent candidate applications.
              </div>
            )}
          </div>
        )}
      </section>

      <CandidateDetailModal
        candidate={selectedCandidate}
        open={selectedCandidate !== null}
        onOpenChange={(open) => !open && setSelectedCandidate(null)}
      />
    </>
  );
}

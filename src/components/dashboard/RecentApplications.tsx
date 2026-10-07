"use client";

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { recentApplicantsData, type Applicant } from "@/data/mockData";
import { CandidateDetailModal } from "./CandidateDetailModal";

interface RecentApplicationsProps {
  searchQuery?: string;
  onSelectCandidate?: (candidate: Applicant) => void;
}

export function RecentApplications({
  searchQuery = "",
  onSelectCandidate,
}: RecentApplicationsProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);

  const filteredApplicants = useMemo(() => {
    if (!searchQuery.trim()) return recentApplicantsData;
    const query = searchQuery.toLowerCase();
    return recentApplicantsData.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.job.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const getStatusBadge = (status: Applicant["status"]) => {
    switch (status) {
      case "Shortlisted":
        return "bg-surface-green text-brand-green";
      case "Under Review":
        return "bg-surface-blue text-brand-blue";
      case "Interview":
        return "bg-surface-purple text-brand-purple";
      case "Applied":
        return "bg-muted text-muted-foreground";
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
              {filteredApplicants.map((applicant, i) => (
                <tr
                  key={applicant.id}
                  onClick={() => {
                    setSelectedCandidate(applicant);
                    onSelectCandidate?.(applicant);
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
                        {applicant.initials}
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-xs font-semibold text-foreground truncate">
                          {applicant.name}
                        </strong>
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {applicant.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground font-medium truncate max-w-[140px]">
                    {applicant.job}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${getScoreBadge(
                        applicant.score,
                      )}`}
                    >
                      <Sparkles className="size-2.5" />
                      {applicant.score}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(
                        applicant.status,
                      )}`}
                    >
                      {applicant.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-[11px]">
                    {applicant.appliedOn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApplicants.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching applications found.
            </div>
          )}
        </div>
      </section>

      <CandidateDetailModal
        candidate={selectedCandidate}
        open={selectedCandidate !== null}
        onOpenChange={(open) => !open && setSelectedCandidate(null)}
      />
    </>
  );
}

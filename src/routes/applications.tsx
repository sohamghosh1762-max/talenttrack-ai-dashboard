"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Eye, Filter, Mail, Phone, Search, Sparkles, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { recentApplicantsData, type Applicant } from "@/data/mockData";

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
  const [candidates] = useState<Applicant[]>(recentApplicantsData);
  const [statusTab, setStatusTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);

  const filteredCandidates = candidates.filter((c) => {
    const matchesStatus = statusTab === "All" || c.status === statusTab;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.job.toLowerCase().includes(search.toLowerCase()) ||
      c.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status: Applicant["status"]) => {
    switch (status) {
      case "Shortlisted":
        return "bg-surface-green text-brand-green";
      case "Under Review":
        return "bg-surface-blue text-brand-blue";
      case "Interview":
        return "bg-surface-purple text-brand-purple";
      default:
        return "bg-muted text-muted-foreground";
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
              Review and manage candidate applications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20">
              {filteredCandidates.length} Active Applicants
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
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
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

        {/* Candidate Applications Table */}
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
                {filteredCandidates.map((applicant, i) => (
                  <tr
                    key={applicant.id}
                    onClick={() => setSelectedCandidate(applicant)}
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
                          {applicant.initials}
                        </span>
                        <div>
                          <strong className="block text-xs font-semibold text-foreground">
                            {applicant.name}
                          </strong>
                          <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Mail className="size-2.5" />
                              {applicant.email}
                            </span>
                            <span className="hidden sm:flex items-center gap-0.5">
                              <Phone className="size-2.5" />
                              {applicant.phone}
                            </span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">{applicant.job}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${getScoreStyle(
                          applicant.score,
                        )}`}
                      >
                        <Sparkles className="size-2.5" />
                        {applicant.score}%
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(
                          applicant.status,
                        )}`}
                      >
                        {applicant.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        {applicant.appliedOn}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[10.5px] font-semibold text-brand-blue hover:bg-surface-blue"
                        onClick={() => setSelectedCandidate(applicant)}
                      >
                        <Eye className="size-3 mr-1" />
                        Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCandidates.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No applications found for the selected filter.
              </div>
            )}
          </div>
        </div>

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

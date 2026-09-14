"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleUserRound, Eye, Mail, MapPin, Phone, Search, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { recentApplicantsData, type Applicant } from "@/data/mockData";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "Candidate Talent Pool — TalentTrack AI" },
      { name: "description", content: "Search and manage your candidate database." },
    ],
  }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const [candidates] = useState<Applicant[]>(recentApplicantsData);
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("All");
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);

  const allSkills = ["All", "React", "TypeScript", "Python", "Node.js", "Kubernetes", "Figma"];

  const filtered = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.job.toLowerCase().includes(search.toLowerCase()) ||
      c.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesSkill =
      selectedSkill === "All" ||
      c.skills?.some((s) => s.toLowerCase() === selectedSkill.toLowerCase());

    return matchesSearch && matchesSkill;
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-purple text-brand-purple">
                <CircleUserRound className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Candidates</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Search and manage your candidate database.
            </p>
          </div>
          <span className="rounded-lg bg-surface-purple px-3 py-1.5 text-xs font-semibold text-brand-purple border border-brand-purple/20">
            {filtered.length} Candidates in Talent Pool
          </span>
        </section>

        {/* Search & Skill Filter Bar */}
        <div className="dashboard-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, skill, or role..."
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Skills:</span>
            {allSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => setSelectedSkill(skill)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selectedSkill === skill
                    ? "bg-brand-blue text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((candidate, i) => (
            <div
              key={candidate.id}
              className="dashboard-card flex flex-col justify-between p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-10 place-items-center rounded-full text-xs font-bold ${
                        i % 2 === 0
                          ? "bg-surface-blue text-brand-blue"
                          : "bg-surface-purple text-brand-purple"
                      }`}
                    >
                      {candidate.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{candidate.name}</h3>
                      <p className="text-[11px] font-medium text-brand-blue">{candidate.job}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                      candidate.score >= 90
                        ? "bg-surface-green text-brand-green"
                        : "bg-surface-purple text-brand-purple"
                    }`}
                  >
                    <Sparkles className="size-2.5" />
                    {candidate.score}%
                  </span>
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate text-[11px]">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Phone className="size-3 shrink-0" />
                    <span>{candidate.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <MapPin className="size-3 shrink-0" />
                    <span>{candidate.location}</span>
                  </div>
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {candidate.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                    {candidate.skills.length > 3 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">
                        +{candidate.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="rounded bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {candidate.status}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-semibold text-brand-blue hover:bg-surface-blue"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <Eye className="size-3 mr-1" />
                  View Profile
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="dashboard-card p-12 text-center text-xs text-muted-foreground">
            No candidates matched your search criteria.
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

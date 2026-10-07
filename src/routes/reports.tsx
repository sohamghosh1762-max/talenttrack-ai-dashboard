"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ApplicationOverview } from "@/components/dashboard/ApplicationOverview";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Hiring Analytics & Reports — TalentTrack AI" },
      { name: "description", content: "View recruitment analytics and reports." },
    ],
  }),
  component: ReportsPage,
});

const reportMetrics = [
  {
    title: "Avg. Time to Hire",
    value: "21 Days",
    change: "↓ 4 days from last month",
    icon: Clock,
    bg: "bg-surface-blue",
    tone: "text-brand-blue",
  },
  {
    title: "Offer Acceptance Rate",
    value: "84.2%",
    change: "↑ 6.4% this quarter",
    icon: CheckCircle,
    bg: "bg-surface-green",
    tone: "text-brand-green",
  },
  {
    title: "Pipeline Conversion",
    value: "32.8%",
    change: "↑ 2.1% from last week",
    icon: TrendingUp,
    bg: "bg-surface-purple",
    tone: "text-brand-purple",
  },
  {
    title: "Total Candidates Sourced",
    value: "312",
    change: "Across 5 job openings",
    icon: Users,
    bg: "bg-surface-peach",
    tone: "text-brand-orange",
  },
];

const sourcesData = [
  { source: "Direct Career Site", count: 112, percent: 45 },
  { source: "LinkedIn ATS Integration", count: 78, percent: 31 },
  { source: "Internal Employee Referrals", count: 36, percent: 14 },
  { source: "AI Talent Sourcing", count: 22, percent: 10 },
];

function ReportsPage() {
  const [downloading, setDownloading] = useState(false);

  const handleExport = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
    }, 1200);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-green text-brand-green">
                <BarChart3 className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Reports</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              View recruitment analytics and reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Download className="size-3.5" />
              {downloading ? "Exporting..." : "Export CSV Report"}
            </Button>
          </div>
        </section>

        {/* High-level Metric Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {reportMetrics.map((m) => (
            <div
              key={m.title}
              className={`${m.bg} rounded-xl border border-border/50 p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground/80">{m.title}</span>
                <span className={`grid size-7 place-items-center rounded-md bg-card/60 ${m.tone}`}>
                  <m.icon className="size-4" />
                </span>
              </div>
              <strong className="block text-2xl font-extrabold text-foreground">{m.value}</strong>
              <span className="text-[10.5px] font-semibold text-brand-green mt-1 block">
                {m.change}
              </span>
            </div>
          ))}
        </div>

        {/* Charts & Source Breakdown */}
        <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
          <ApplicationOverview />

          <div className="dashboard-card p-4 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <FileSpreadsheet className="size-4 text-brand-blue" />
                Candidate Sourcing Channels
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Distribution of candidate inbound channels.
              </p>
            </div>

            <div className="space-y-3">
              {sourcesData.map((src) => (
                <div key={src.source} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="truncate">{src.source}</span>
                    <span className="text-muted-foreground font-semibold">
                      {src.count} ({src.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-blue"
                      style={{ width: `${src.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-surface-green/40 border border-brand-green/20 p-3 text-xs text-muted-foreground">
              <span className="block font-semibold text-brand-green mb-1">
                Recruitment Health Summary
              </span>
              <span>
                Talent acquisition velocity has improved by 14% month-over-month with automated AI
                resume pre-screening.
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

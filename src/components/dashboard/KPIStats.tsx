"use client";

import { BriefcaseBusiness, CalendarDays, FileText, UserCheck } from "lucide-react";
import { useRecruiterDashboard } from "@/hooks/api/useRecruiterDashboard";

interface KPIStatsProps {
  onCardClick?: (card: any) => void;
}

export function KPIStats({ onCardClick }: KPIStatsProps) {
  const { data: dashboardData } = useRecruiterDashboard();

  const activeJobs = dashboardData?.kpiStats?.activeJobs ?? 3;
  const totalApps = dashboardData?.kpiStats?.totalApplications ?? 112;
  const shortlisted = dashboardData?.kpiStats?.shortlistedCandidates ?? 42;
  const interviews = dashboardData?.kpiStats?.scheduledInterviews ?? 18;

  const cards = [
    {
      id: "active-jobs",
      title: "Active Jobs",
      value: String(activeJobs),
      change: "Currently Open",
      icon: BriefcaseBusiness,
      bgClass: "bg-surface-blue",
      iconToneClass: "text-brand-blue",
    },
    {
      id: "total-applications",
      title: "Total Applications",
      value: String(totalApps),
      change: "Submitted",
      icon: FileText,
      bgClass: "bg-surface-peach",
      iconToneClass: "text-brand-orange",
    },
    {
      id: "shortlisted-candidates",
      title: "Shortlisted Candidates",
      value: String(shortlisted),
      change: "In Review / Offer",
      icon: UserCheck,
      bgClass: "bg-surface-green",
      iconToneClass: "text-brand-green",
    },
    {
      id: "scheduled-interviews",
      title: "Scheduled Interviews",
      value: String(interviews),
      change: "Upcoming Rounds",
      icon: CalendarDays,
      bgClass: "bg-surface-purple",
      iconToneClass: "text-brand-purple",
    },
  ];

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const { id, value, title, change, icon: CardIcon, bgClass, iconToneClass } = card;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onCardClick?.(card)}
            className={`${bgClass} grid min-h-[110px] grid-cols-[54px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-border/50 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30`}
            aria-label={`${title}: ${value}, ${change}`}
          >
            <span
              className={`grid size-[52px] place-items-center rounded-xl bg-card/60 shadow-xs backdrop-blur-xs ${iconToneClass}`}
            >
              <CardIcon className="size-6.5" />
            </span>
            <div className="min-w-0">
              <strong className="block text-[25px] font-extrabold leading-tight text-foreground tracking-tight">
                {value}
              </strong>
              <span className="block text-xs font-semibold text-foreground/80 truncate">
                {title}
              </span>
              <span className="mt-1.5 inline-block text-[10.5px] font-semibold text-brand-green">
                {change}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

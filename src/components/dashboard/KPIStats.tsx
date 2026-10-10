"useClient";

import { useRecruiterAnalytics } from "@/hooks/api/useAnalytics";
import { KPICardData } from "@/data/mockData";
import { BriefcaseBusiness, Users, CircleUserRound, CalendarDays } from "lucide-react";

interface KPIStatsProps {
  onCardClick?: (card: KPICardData) => void;
  dateRange?: string;
  jobId?: string;
}

export function KPIStats({ onCardClick, dateRange = "30d", jobId }: KPIStatsProps) {
  const { data: analytics, isLoading, isError, refetch } = useRecruiterAnalytics({
    range: dateRange,
    jobId,
  });

  const kpis = analytics?.kpis;

  const cards: KPICardData[] = [
    {
      id: "kpi-active-jobs",
      value: isLoading ? "..." : String(kpis?.activeJobs ?? 0),
      title: "Active Job Openings",
      change: "Live published openings",
      icon: BriefcaseBusiness,
      bgClass: "bg-surface-blue",
      iconToneClass: "text-brand-blue",
    },
    {
      id: "kpi-total-apps",
      value: isLoading ? "..." : String(kpis?.totalApplications ?? 0),
      title: "Total Applications",
      change: kpis?.newApplications ? `${kpis.newApplications} recent` : "From candidates",
      icon: Users,
      bgClass: "bg-surface-green",
      iconToneClass: "text-brand-green",
    },
    {
      id: "kpi-shortlisted",
      value: isLoading ? "..." : String(kpis?.shortlistedCandidates ?? 0),
      title: "Screened / Shortlisted",
      change: "Qualified candidates",
      icon: CircleUserRound,
      bgClass: "bg-surface-purple",
      iconToneClass: "text-brand-purple",
    },
    {
      id: "kpi-interviews",
      value: isLoading ? "..." : String(kpis?.interviewsScheduled ?? 0),
      title: "Interviews Scheduled",
      change: "Upcoming rounds",
      icon: CalendarDays,
      bgClass: "bg-surface-peach",
      iconToneClass: "text-brand-red",
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
        <span>Failed to load live metrics from server.</span>
        <button
          onClick={() => void refetch()}
          className="text-xs font-semibold underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

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


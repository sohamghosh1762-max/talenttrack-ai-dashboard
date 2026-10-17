import {
  FileText,
  UserCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import type { RecruitmentFunnelStep, RecruitmentStageCard } from "@/data/adminTypes";
import { recruitmentOverviewCards, recruitmentFunnelSteps } from "@/data/adminData";

interface RecruitmentOverviewProps {
  cards?: RecruitmentStageCard[];
  funnel?: RecruitmentFunnelStep[];
}

const cardIcons = {
  "total-apps": FileText,
  shortlisted: UserCheck,
  interviews: Calendar,
  offers: CheckCircle2,
};

export function RecruitmentOverview({
  cards = recruitmentOverviewCards,
  funnel = recruitmentFunnelSteps,
}: RecruitmentOverviewProps) {
  const totalApps = cards.find((c) => c.id === "total-apps")?.count ?? 0;
  const totalOffers = cards.find((c) => c.id === "offers")?.count ?? 0;
  const overallConversionPct = totalApps > 0 ? ((totalOffers / totalApps) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recruitment Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Platform-wide candidate pipeline volume and stage conversion
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 self-start sm:self-auto">
          <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
          Live Platform Pipeline
        </div>
      </div>

      {/* 4 Smaller Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {cards.map((card) => {
          const Icon = cardIcons[card.id as keyof typeof cardIcons] || FileText;

          const toneStyles = {
            blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
            indigo:
              "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
            purple:
              "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50",
            emerald:
              "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
          };

          return (
            <div
              key={card.id}
              className="rounded-lg border border-slate-200/70 bg-slate-50/50 p-3.5 transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div
                  className={`flex size-7 items-center justify-center rounded-md border ${
                    toneStyles[card.tone]
                  }`}
                >
                  <Icon className="size-3.5 stroke-[1.8]" />
                </div>
              </div>

              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {card.count.toLocaleString()}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{card.status}</span>
                {card.trend && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-1">
                    {card.trend}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Horizontal Recruitment Funnel */}
      <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recruitment Funnel Velocity
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Overall Pipeline Conversion: {overallConversionPct}%
          </span>
        </div>

        {/* Funnel Steps Bar */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-2">
          {funnel.map((step, idx) => {
            const isLast = idx === funnel.length - 1;

            return (
              <div key={step.stage} className="relative flex flex-col">
                <div className="group rounded-lg border border-slate-200/80 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span className="font-medium">{step.stage}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {step.count}
                    </span>
                  </div>

                  {/* Progress bar representing share */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 my-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLast ? "bg-emerald-500" : idx === 0 ? "bg-blue-600" : "bg-blue-500/80"
                      }`}
                      style={{ width: `${Math.max(step.overallPct, 6)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-400 dark:text-slate-500">
                      {idx === 0 ? "Initial" : `Pass: ${step.conversionPct}%`}
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      {step.overallPct}% of total
                    </span>
                  </div>
                </div>

                {/* Arrow indicator between steps on desktop */}
                {!isLast && (
                  <div className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 size-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                    <ChevronRight className="size-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

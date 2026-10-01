"use client";

import { useNavigate } from "@tanstack/react-router";
import { BarChart3, FileSearch, UserRound, BriefcaseBusiness, XCircle } from "lucide-react";
import { useRecruiterDashboard } from "@/hooks/api/useRecruiterDashboard";

interface HiringPipelineProps {
  onStageSelect?: (stage: any) => void;
}

export function HiringPipeline({ onStageSelect }: HiringPipelineProps) {
  const navigate = useNavigate();
  const { data: dashboardData } = useRecruiterDashboard();

  const pipeline = dashboardData?.pipelineStats || {
    APPLIED: 24,
    SCREENING: 18,
    INTERVIEW: 12,
    OFFERED: 6,
    REJECTED: 4,
    WITHDRAWN: 1,
  };

  const stages = [
    {
      id: "APPLIED",
      label: "Applied",
      count: pipeline.APPLIED || 0,
      icon: BarChart3,
      bgClass: "bg-surface-blue",
      toneClass: "text-brand-blue",
    },
    {
      id: "SCREENING",
      label: "Screening",
      count: pipeline.SCREENING || 0,
      icon: FileSearch,
      bgClass: "bg-surface-purple",
      toneClass: "text-brand-purple",
    },
    {
      id: "INTERVIEW",
      label: "Interview",
      count: pipeline.INTERVIEW || 0,
      icon: UserRound,
      bgClass: "bg-surface-peach",
      toneClass: "text-brand-orange",
    },
    {
      id: "OFFERED",
      label: "Offered",
      count: pipeline.OFFERED || 0,
      icon: BriefcaseBusiness,
      bgClass: "bg-surface-green",
      toneClass: "text-brand-green",
    },
    {
      id: "REJECTED",
      label: "Rejected",
      count: pipeline.REJECTED || 0,
      icon: XCircle,
      bgClass: "bg-surface-pink",
      toneClass: "text-brand-red",
    },
  ];

  return (
    <section className="dashboard-card min-w-0 p-3.5">
      <div className="flex h-7 items-center justify-between pb-2">
        <h2 className="text-[13.5px] font-bold text-foreground">Hiring Pipeline</h2>
        <button
          type="button"
          onClick={() => navigate({ to: "/pipeline" })}
          className="text-[11px] font-semibold text-brand-blue hover:underline cursor-pointer"
        >
          Pipeline Board
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 pt-1">
        {stages.map((stage) => {
          const { id, label, count, icon: StageIcon, bgClass, toneClass } = stage;

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onStageSelect?.(stage);
                navigate({ to: "/pipeline" });
              }}
              className={`${bgClass} min-h-[76px] rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm border border-border/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer`}
              aria-label={`${label} stage: ${count} candidates`}
            >
              <span className={`block text-xs font-bold ${toneClass}`}>{label}</span>
              <span className="mt-2.5 flex items-center justify-between">
                <StageIcon className={`size-4 ${toneClass}`} />
                <strong className="text-[15px] font-extrabold text-foreground">{count}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

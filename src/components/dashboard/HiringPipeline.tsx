"use client";

import { useNavigate } from "@tanstack/react-router";
import { pipelineStagesData, type PipelineStage } from "@/data/mockData";
import { useRecruiterAnalytics } from "@/hooks/api/useAnalytics";

interface HiringPipelineProps {
  onStageSelect?: (stage: PipelineStage) => void;
  dateRange?: string;
  jobId?: string;
}

export function HiringPipeline({ onStageSelect, dateRange = "30d", jobId }: HiringPipelineProps) {
  const navigate = useNavigate();
  const { data: analytics, isLoading } = useRecruiterAnalytics({ range: dateRange, jobId });

  const funnel = analytics?.funnel || [];

  const stagesWithCounts: PipelineStage[] = pipelineStagesData.map((stage) => {
    let stageKey = "APPLIED";
    if (stage.id === "screened") stageKey = "SCREENING";
    else if (stage.id === "interview") stageKey = "INTERVIEW";
    else if (stage.id === "offered") stageKey = "OFFERED";
    else if (stage.id === "hired") stageKey = "HIRED";

    const funnelItem = funnel.find((f) => f.stage === stageKey);
    const countVal = funnelItem ? funnelItem.count : 0;

    return {
      ...stage,
      count: isLoading ? "..." : String(countVal),
    };
  });

  return (
    <section className="dashboard-card min-w-0 p-3.5">
      <div className="flex h-7 items-center justify-between pb-2">
        <h2 className="text-[13.5px] font-bold text-foreground">Hiring Pipeline</h2>
        <button
          type="button"
          onClick={() => navigate({ to: "/pipeline" })}
          className="text-[11px] font-semibold text-brand-blue hover:underline"
        >
          Pipeline Board
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 pt-1">
        {stagesWithCounts.map((stage) => {
          const { id, label, count, icon: StageIcon, bgClass, toneClass } = stage;

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onStageSelect?.(stage);
                navigate({ to: "/pipeline" });
              }}
              className={`${bgClass} min-h-[76px] rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm border border-border/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30`}
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

"use client";

import { kpiStatsData, type KPICardData } from "@/data/mockData";

interface KPIStatsProps {
  onCardClick?: (card: KPICardData) => void;
}

export function KPIStats({ onCardClick }: KPIStatsProps) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {kpiStatsData.map((card) => {
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

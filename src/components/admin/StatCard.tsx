import type { ComponentType } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AdminStatItem } from "@/data/adminTypes";

interface StatCardProps {
  item: AdminStatItem;
  icon: ComponentType<{ className?: string }>;
}

export function StatCard({ item, icon: Icon }: StatCardProps) {
  const isUp = item.trend === "up";
  const isDown = item.trend === "down";

  return (
    <div className="group relative rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {item.label}
        </span>
        <div className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
          <Icon className="size-4.5 stroke-[1.75]" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          {item.value}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <span
          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            isUp
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : isDown
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {isUp && <TrendingUp className="size-3 stroke-[2.2]" />}
          {isDown && <TrendingDown className="size-3 stroke-[2.2]" />}
          {!isUp && !isDown && <Minus className="size-3" />}
          {item.changePct}
        </span>
        {item.description && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {item.description}
          </span>
        )}
      </div>
    </div>
  );
}

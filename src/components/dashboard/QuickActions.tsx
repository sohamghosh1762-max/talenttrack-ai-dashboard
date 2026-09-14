"use client";

import { useNavigate } from "@tanstack/react-router";
import { quickActionsData, type QuickActionItem } from "@/data/mockData";

interface QuickActionsProps {
  onPostJobClick?: () => void;
}

export function QuickActions({ onPostJobClick }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleActionClick = (action: QuickActionItem) => {
    if (action.actionKey === "post-job") {
      if (onPostJobClick) {
        onPostJobClick();
      } else {
        navigate({ to: "/jobs" });
      }
    } else if (action.href) {
      navigate({ to: action.href });
    }
  };

  return (
    <section className="dashboard-card min-w-0 p-3.5">
      <div className="flex h-7 items-center justify-between pb-2">
        <h2 className="text-[13.5px] font-bold text-foreground">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-1">
        {quickActionsData.map((action) => {
          const { id, label, icon: ActionIcon } = action;

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleActionClick(action)}
              className="group flex flex-col items-center justify-center min-h-[76px] rounded-xl bg-panel-head p-3 text-center transition-all duration-200 hover:bg-surface-blue hover:text-brand-blue border border-border/40 hover:border-brand-blue/30 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <ActionIcon className="size-5.5 text-brand-blue transition-transform group-hover:scale-110 mb-1.5" />
              <span className="text-[11px] font-semibold text-foreground group-hover:text-brand-blue truncate max-w-full">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

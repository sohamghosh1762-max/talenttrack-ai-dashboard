import {
  Briefcase,
  UserPlus,
  FileCheck2,
  CheckCircle2,
  Building2,
  Clock,
  Inbox,
  AlertCircle,
} from "lucide-react";
import type { PlatformActivityItem } from "@/data/adminTypes";

interface ActivityFeedProps {
  activities?: PlatformActivityItem[];
  isLoading?: boolean;
  isError?: boolean;
}

const categoryIcons = {
  job: Briefcase,
  user: UserPlus,
  application: FileCheck2,
  company: Building2,
  system: CheckCircle2,
};

function SkeletonActivity() {
  return (
    <div className="flex items-start gap-3 animate-pulse">
      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-44 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export function ActivityFeed({
  activities = [],
  isLoading = false,
  isError = false,
}: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time chronological platform events
          </p>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <Clock className="size-3" />
          Live
        </span>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 py-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonActivity key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div className="py-8 text-center">
          <AlertCircle className="mx-auto size-7 text-rose-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Failed to load activity feed
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && activities.length === 0 && (
        <div className="py-10 text-center">
          <Inbox className="mx-auto size-8 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            No activity recorded
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Events will appear here as users interact with the platform.
          </p>
        </div>
      )}

      {/* Timeline List */}
      {!isLoading && !isError && activities.length > 0 && (
        <div className="relative pl-3 space-y-4">
          {/* Subtle vertical connecting line */}
          <div className="absolute left-[19px] top-2 bottom-3 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {activities.map((item) => {
            const Icon = categoryIcons[item.category] || Briefcase;

            return (
              <div key={item.id} className="relative flex items-start gap-3 group">
                {/* Timeline Node Icon */}
                <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-2xs group-hover:border-blue-400 transition-colors dark:bg-slate-800 dark:border-slate-700">
                  <Icon className="size-3.5 text-slate-600 dark:text-slate-300 stroke-[1.8]" />
                </div>

                {/* Event Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.description}
                    </p>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                      {item.timeAgo}
                    </span>
                  </div>

                  {item.actorName && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.actorName}
                      {item.badgeText ? ` • ${item.badgeText}` : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

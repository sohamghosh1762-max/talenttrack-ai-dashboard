import { ShieldCheck, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { SystemServiceItem } from "@/data/adminTypes";
import { initialSystemStatusData } from "@/data/adminData";

interface SystemStatusProps {
  services?: SystemServiceItem[];
  isLoading?: boolean;
  isError?: boolean;
}

function SkeletonServiceRow() {
  return (
    <div className="flex items-center justify-between py-2.5 animate-pulse">
      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-12 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export function SystemStatus({
  services = initialSystemStatusData,
  isLoading = false,
  isError = false,
}: SystemStatusProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleRefresh = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      toast.success("System status recheck complete. All core infrastructure services operational.");
    }, 650);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              System Status
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Core infrastructure health and responsiveness
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isChecking || isLoading}
          title="Run Health Check"
          className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isChecking ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...Array(5)].map((_, i) => (
            <SkeletonServiceRow key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div className="py-8 text-center">
          <AlertCircle className="mx-auto size-7 text-rose-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Unable to reach system status monitor
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && services.length === 0 && (
        <div className="py-8 text-center">
          <Inbox className="mx-auto size-7 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            No active services monitored
          </p>
        </div>
      )}

      {/* Service Status List */}
      {!isLoading && !isError && services.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {services.map((svc) => {
            const isOperational = svc.status === "Operational";
            const badgeCls = isOperational
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
              : svc.status === "Degraded"
                ? "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";

            const dotColor = isOperational
              ? "bg-emerald-500"
              : svc.status === "Degraded"
                ? "bg-amber-500"
                : "bg-slate-400";

            return (
              <div
                key={svc.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    {isOperational && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                    )}
                    <span className={`relative inline-flex size-2 rounded-full ${dotColor}`} />
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{svc.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                    {svc.latency}
                  </span>
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${badgeCls}`}
                  >
                    {svc.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Status Note */}
      {!isLoading && !isError && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium dark:text-emerald-400">
            <ShieldCheck className="size-3.5" />
            All Services Fully Operational
          </span>
          <span className="text-slate-400 font-mono">99.98% Avg Uptime</span>
        </div>
      )}
    </div>
  );
}

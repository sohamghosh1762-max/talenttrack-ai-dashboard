import { Calendar, RefreshCw, Filter } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import type { DashboardDateRange } from "@/hooks/use-admin-dashboard";

interface WelcomeSectionProps {
  userName?: string;
  dateRange?: DashboardDateRange;
  onDateRangeChange?: (range: DashboardDateRange) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  simulateError?: boolean;
  onToggleSimulateError?: () => void;
  simulateEmpty?: boolean;
  onToggleSimulateEmpty?: () => void;
}

const DATE_RANGE_OPTIONS: Array<{ value: DashboardDateRange; label: string }> = [
  { value: "Today", label: "Today" },
  { value: "7 Days", label: "Last 7 days" },
  { value: "30 Days", label: "Last 30 days" },
  { value: "3 Months", label: "Last 3 months" },
  { value: "12 Months", label: "Last 12 months" },
];

export function WelcomeSection({
  userName,
  dateRange = "30 Days",
  onDateRangeChange,
  isRefreshing = false,
  onRefresh,
  simulateError = false,
  onToggleSimulateError,
  simulateEmpty = false,
  onToggleSimulateEmpty,
}: WelcomeSectionProps) {
  const { user } = useAuth();
  const displayName = userName || user?.name || "Admin";

  // Dynamic greeting based on current hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Formatted date string
  const todayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <section
      aria-label="Admin overview welcome"
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/80 pb-4"
    >
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
          {greeting}, {displayName}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          Here's what's happening across TalentTrack AI platform.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <Filter className="size-3.5 text-slate-400 shrink-0" />
          <select
            id="admin-dashboard-date-range"
            aria-label="Dashboard Date Range"
            value={dateRange}
            onChange={(e) => onDateRangeChange?.(e.target.value as DashboardDateRange)}
            className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-slate-800 dark:text-slate-200"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Action Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Dashboard Data"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
        </button>

        {/* Today Date Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Calendar className="size-3.5 text-slate-400" />
          <span>{todayDate}</span>
        </div>

        {/* Platform Active Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-1.5 text-emerald-700 font-medium dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Platform Active</span>
        </div>

        {/* State Simulation Dropdown for testing Error / Empty states */}
        {(onToggleSimulateError || onToggleSimulateEmpty) && (
          <select
            aria-label="Simulate UI State"
            onChange={(e) => {
              const val = e.target.value;
              if (val === "error") {
                onToggleSimulateError?.();
              } else if (val === "empty") {
                onToggleSimulateEmpty?.();
              } else {
                if (simulateError) onToggleSimulateError?.();
                if (simulateEmpty) onToggleSimulateEmpty?.();
              }
            }}
            value={simulateError ? "error" : simulateEmpty ? "empty" : "normal"}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 cursor-pointer"
          >
            <option value="normal">State: Normal</option>
            <option value="empty">State: Empty</option>
            <option value="error">State: Error</option>
          </select>
        )}
      </div>
    </section>
  );
}

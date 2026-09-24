import {
  Users,
  UserCheck,
  UserRound,
  Briefcase,
  Building2,
  BarChart3,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Inbox,
  Settings as SettingsIcon,
} from "lucide-react";
import { WelcomeSection } from "./WelcomeSection";
import { StatCard } from "./StatCard";
import { PlatformGrowthChart } from "./PlatformGrowthChart";
import { UserDistributionChart } from "./UserDistributionChart";
import { RecruitmentOverview } from "./RecruitmentOverview";
import { UserTable } from "./UserTable";
import { ActivityFeed } from "./ActivityFeed";
import { SystemStatus } from "./SystemStatus";
import { QuickActions } from "./QuickActions";
import { AdminUsersView } from "./AdminUsersView";
import type { AdminNavItemKey } from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { useAdminDashboardData, mapDateRangeToTimeframe } from "@/hooks/use-admin-dashboard";

import { AdminActivityView } from "./AdminActivityView";
import { AdminReportsView } from "./AdminReportsView";
import { AdminSettingsView } from "./AdminSettingsView";

interface AdminDashboardViewProps {
  activeNav?: AdminNavItemKey;
  onSelectNav?: (item: AdminNavItemKey) => void;
  searchQuery?: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="h-80 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
        <div className="h-80 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
      </div>
      <div className="h-44 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
    </div>
  );
}

export function AdminDashboardView({
  activeNav = "Dashboard",
  onSelectNav,
}: AdminDashboardViewProps) {
  const {
    dateRange,
    setDateRange,
    isLoading,
    isRefreshing,
    error,
    simulateError,
    setSimulateError,
    simulateEmpty,
    setSimulateEmpty,
    handleRefresh,
    stats,
    recentUsersData,
    systemStatusData,
    recentActivityData,
  } = useAdminDashboardData();

  const chartTimeframe = mapDateRangeToTimeframe(dateRange);

  // Render sub-views depending on selected sidebar item
  if (activeNav !== "Dashboard") {
    return (
      <div className="space-y-6">
        {/* Back to Dashboard breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelectNav?.("Dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard Overview
          </button>
          <span className="text-xs font-medium text-slate-500">
            Platform Administration / {activeNav}
          </span>
        </div>

        {/* View content switch */}
        {activeNav === "Users" ? (
          <AdminUsersView />
        ) : activeNav === "Recruiters" || activeNav === "Applicants" ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 mx-auto">
              {activeNav === "Recruiters" ? (
                <UserCheck className="size-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <UserRound className="size-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {activeNav} Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Dedicated {activeNav.toLowerCase()} management will be available in a future phase.
              Use the <strong>Users</strong> section to manage all platform accounts in the
              meantime.
            </p>
          </div>
        ) : activeNav === "Companies" ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Registered Companies & Employers
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Audit corporate domains, active recruiter seats, and billing tiers across enterprise
              organizations on TalentTrack AI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <span className="text-xs text-slate-500 block">Verified Companies</span>
                <span className="text-2xl font-bold text-slate-900">142</span>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <span className="text-xs text-slate-500 block">Pending Verification</span>
                <span className="text-2xl font-bold text-amber-600">6</span>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <span className="text-xs text-slate-500 block">Avg Recruiters / Company</span>
                <span className="text-2xl font-bold text-slate-900">2.4</span>
              </div>
            </div>
          </div>
        ) : activeNav === "Jobs" ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="size-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Job Listings Audit
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Platform-wide index of active roles, screening rubric configurations, and application
              intakes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <span className="text-xs text-slate-500 block">Active Openings</span>
                <span className="text-2xl font-bold text-slate-900">{stats.activeJobs.value}</span>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <span className="text-xs text-slate-500 block">Filled This Month</span>
                <span className="text-2xl font-bold text-emerald-600">34</span>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <span className="text-xs text-slate-500 block">Flagged for Review</span>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>
            </div>
          </div>
        ) : activeNav === "Applications" ? (
          <div className="space-y-6">
            <RecruitmentOverview />
          </div>
        ) : activeNav === "Reports" ? (
          <AdminReportsView />
        ) : activeNav === "System Activity" ? (
          <AdminActivityView />
        ) : (
          <AdminSettingsView />
        )}
      </div>
    );
  }

  // Primary Default View: Dashboard Overview
  return (
    <div className="space-y-6">
      {/* Welcome & Global Controls Header */}
      <WelcomeSection
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        simulateError={simulateError}
        onToggleSimulateError={() => setSimulateError((prev) => !prev)}
        simulateEmpty={simulateEmpty}
        onToggleSimulateEmpty={() => setSimulateEmpty((prev) => !prev)}
      />

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-5 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h3 className="text-sm font-bold">Failed to load dashboard metrics</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                {error.message ||
                  "An unexpected error occurred while communicating with the administrative data service."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleRefresh}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shrink-0"
          >
            <RefreshCw className="size-3.5" />
            Retry Request
          </Button>
        </div>
      )}

      {/* EMPTY STATE */}
      {simulateEmpty && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mx-auto">
            <Inbox className="size-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Dashboard Data Available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            There is currently no platform data recorded for timeframe <strong>{dateRange}</strong>.
            Try selecting a different date range or restore normal mock data.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulateEmpty(false)}
            className="text-xs mt-2"
          >
            Restore Platform Metrics
          </Button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Platform Overview Cards */}
          <section
            aria-label="Platform overview statistics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard item={stats.totalUsers} icon={Users} />
            <StatCard item={stats.activeRecruiters} icon={UserCheck} />
            <StatCard item={stats.activeApplicants} icon={UserRound} />
            <StatCard item={stats.activeJobs} icon={Briefcase} />
          </section>

          {/* Main Analytics Section (Two Columns: Growth + Distribution) */}
          <section
            aria-label="Platform analytics charts"
            className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_1fr]"
          >
            <PlatformGrowthChart initialTimeframe={chartTimeframe} />
            <UserDistributionChart />
          </section>

          {/* Recruitment Overview (Cards + Funnel) */}
          <section aria-label="Recruitment overview and pipeline funnel">
            <RecruitmentOverview />
          </section>

          {/* Quick Actions */}
          <section aria-label="Administrative quick actions">
            <QuickActions
              onActionClick={(id) => {
                if (id === "manage-users") onSelectNav?.("Users");
                if (id === "review-companies") onSelectNav?.("Companies");
                if (id === "view-jobs") onSelectNav?.("Jobs");
                if (id === "view-reports") onSelectNav?.("Reports");
                if (id === "system-activity") onSelectNav?.("System Activity");
                if (id === "settings") onSelectNav?.("Settings");
              }}
            />
          </section>

          {/* Recent Users Table & Bottom Activity / System Health Cards */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            {/* Recent Users Table */}
            <div className="min-w-0">
              <UserTable initialUsers={recentUsersData} onViewAll={() => onSelectNav?.("Users")} />
            </div>

            {/* Recent Platform Activity & System Status */}
            <div className="space-y-6">
              <ActivityFeed
                activities={recentActivityData}
                isLoading={isLoading}
                isError={!!error}
              />
              <SystemStatus services={systemStatusData} isLoading={isLoading} isError={!!error} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

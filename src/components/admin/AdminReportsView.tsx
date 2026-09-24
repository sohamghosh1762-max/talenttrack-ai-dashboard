import { useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  RefreshCw,
  Users,
  UserCheck,
  UserRound,
  Briefcase,
  FileCheck2,
  AlertCircle,
  Inbox,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useAdminReports } from "@/hooks/use-admin-reports";
import type { TimeframeRange } from "@/data/adminTypes";
import { PlatformGrowthChart } from "./PlatformGrowthChart";
import { UserDistributionChart } from "./UserDistributionChart";
import { RecruitmentOverview } from "./RecruitmentOverview";
import { ComplianceReportModal } from "./ComplianceReportModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SkeletonReportsGrid() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-80 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
        <div className="h-80 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export function AdminReportsView() {
  const {
    timeframe,
    setTimeframe,
    isLoading,
    isRefreshing,
    error,
    simulateError,
    setSimulateError,
    simulateEmpty,
    setSimulateEmpty,
    isExporting,
    handleRefresh,
    handleExportCsv,
    handleExportJson,
    metrics,
    sourcingChannels,
  } = useAdminReports();

  const [showComplianceModal, setShowComplianceModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Platform Analytics & Compliance Reports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Executive reports on hiring throughput, candidate sourcing channels, and AI bias
                neutrality.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Date Range, Export & Demo State Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <Select value={timeframe} onValueChange={(val) => setTimeframe(val as TimeframeRange)}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="7 Days">Last 7 Days</SelectItem>
              <SelectItem value="30 Days">Last 30 Days</SelectItem>
              <SelectItem value="3 Months">Last 3 Months</SelectItem>
              <SelectItem value="12 Months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>

          {/* Export CSV Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="text-xs gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            Export CSV
          </Button>

          {/* Export JSON Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={isExporting}
            className="text-xs gap-1.5 hidden sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <FileJson className="size-3.5 text-blue-600" />
            Export JSON
          </Button>

          {/* Compliance Audit Report */}
          <Button
            size="sm"
            onClick={() => setShowComplianceModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ShieldCheck className="size-3.5" />
            Compliance Audit
          </Button>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="text-xs p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title="Refresh analytics data"
            aria-label="Refresh analytics data"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </Button>

          {/* Demo state toggles */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg dark:bg-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setSimulateError((prev) => !prev);
                setSimulateEmpty(false);
              }}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                simulateError
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Error
            </button>
            <button
              type="button"
              onClick={() => {
                setSimulateEmpty((prev) => !prev);
                setSimulateError(false);
              }}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                simulateEmpty
                  ? "bg-amber-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Empty
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Failed to load platform reports</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {error.message || "An unexpected error occurred while processing analytics data."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleRefresh}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* EMPTY STATE */}
      {simulateEmpty && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 mx-auto">
            <Inbox className="size-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Report Data Available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            There are currently no report metrics compiled for timeframe{" "}
            <strong>{timeframe}</strong>. Try selecting a different date range or restore platform
            metrics.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulateEmpty(false)}
            className="text-xs mt-2"
          >
            Restore Report Data
          </Button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading ? (
        <SkeletonReportsGrid />
      ) : (
        <>
          {/* 5 High-Level Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Users
                </span>
                <span className="flex size-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                  <Users className="size-4" />
                </span>
              </div>
              <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.totalUsers.value}
              </strong>
              <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
                {metrics.totalUsers.change} vs prior period
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Recruiters
                </span>
                <span className="flex size-7 items-center justify-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/50">
                  <UserCheck className="size-4" />
                </span>
              </div>
              <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.activeRecruiters.value}
              </strong>
              <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
                {metrics.activeRecruiters.change} verified seats
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Applicants
                </span>
                <span className="flex size-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50">
                  <UserRound className="size-4" />
                </span>
              </div>
              <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.activeApplicants.value}
              </strong>
              <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
                {metrics.activeApplicants.change} active candidates
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Jobs
                </span>
                <span className="flex size-7 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/50">
                  <Briefcase className="size-4" />
                </span>
              </div>
              <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.activeJobs.value}
              </strong>
              <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
                {metrics.activeJobs.change} open roles
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Applications
                </span>
                <span className="flex size-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                  <FileCheck2 className="size-4" />
                </span>
              </div>
              <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.applicationsProcessed.value}
              </strong>
              <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
                {metrics.applicationsProcessed.change} intake throughput
              </span>
            </div>
          </div>

          {/* Section 1: Growth Chart + Candidate Sourcing Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
            <PlatformGrowthChart initialTimeframe={timeframe} />

            {/* Sourcing Channel Breakdown */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="size-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Candidate Sourcing Channels
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Distribution of inbound candidate applications for {timeframe.toLowerCase()}.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                {sourcingChannels.map((src) => (
                  <div key={src.channel} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="truncate text-slate-800 dark:text-slate-200">
                        {src.channel}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {src.candidateCount.toLocaleString()} ({src.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${src.percentage}%`, backgroundColor: src.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                <span className="block font-semibold mb-0.5">Sourcing Velocity Metric</span>
                Average time to hire across active listings is{" "}
                <strong>{metrics.timeToHireDays} days</strong> with an offer acceptance rate of{" "}
                <strong>{metrics.offerAcceptanceRate}</strong>.
              </div>
            </div>
          </div>

          {/* Section 2: User Role Distribution + Recruitment Pipeline Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6">
            <UserDistributionChart />
            <RecruitmentOverview />
          </div>

          {/* Executive Compliance Summary Banner */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white mt-0.5 sm:mt-0">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  Platform Equal Opportunity & AI Neutrality Certified
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Algorithmic bias score: <strong>{metrics.biasAuditScore}</strong>. Fully compliant
                  with SOC2 Type II data security standards and EEOC fair-hiring guidelines.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setShowComplianceModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shrink-0"
            >
              <ShieldCheck className="size-3.5" />
              View Compliance Statement
            </Button>
          </div>
        </>
      )}

      {/* Compliance Audit Modal */}
      <ComplianceReportModal
        open={showComplianceModal}
        onOpenChange={setShowComplianceModal}
        timeframe={timeframe}
      />
    </div>
  );
}

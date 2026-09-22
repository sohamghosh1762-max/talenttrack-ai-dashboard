import { useState } from "react";
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  User,
  Briefcase,
  FileText,
  Building2,
  Settings,
  AlertCircle,
  Inbox,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useAdminActivity } from "@/hooks/use-admin-activity";
import type { AuditLogRecord, AuditCategory } from "@/data/activityData";
import { ActivityDetailDrawer } from "./ActivityDetailDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryIcons: Record<AuditCategory, typeof ShieldCheck> = {
  user: User,
  job: Briefcase,
  application: FileText,
  company: Building2,
  system: Settings,
  security: ShieldCheck,
};

function SkeletonActivityRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="p-4">
        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="p-4">
        <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="p-4">
        <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="p-4">
        <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="p-4 text-right">
        <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-700 ml-auto" />
      </td>
    </tr>
  );
}

export function AdminActivityView() {
  const {
    searchQuery,
    setSearchQuery,
    actionFilter,
    setActionFilter,
    actorFilter,
    setActorFilter,
    dateFilter,
    setDateFilter,
    targetFilter,
    setTargetFilter,
    page,
    setPage,
    totalPages,
    hasActiveFilters,
    resetFilters,
    handleRefresh,
    isLoading,
    isRefreshing,
    error,
    simulateError,
    setSimulateError,
    simulateEmpty,
    setSimulateEmpty,
    auditLogs,
    totalCount,
    summaryStats,
  } = useAdminActivity();

  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  return (
    <div className="space-y-6">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Activity className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                System Activity & Audit Logs
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time chronological record of administrative actions, user changes, and security events.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Refresh & Demo State Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </Button>

          {/* Demo state toggle helpers */}
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
              Error State
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
              Empty State
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Audit Logs
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summaryStats.totalEvents}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Recorded event entries</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Activity className="size-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Admin Actions
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summaryStats.adminActions}
            </span>
            <span className="text-[11px] text-emerald-600 block mt-0.5">Superuser audits</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <User className="size-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              System Alerts
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summaryStats.systemAlerts}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Warnings & Security</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <ShieldCheck className="size-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Sessions
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summaryStats.activeSessions}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Verified administrators</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
        </div>
      </div>

      {/* Search Bar & 4 Filters Controls */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <SlidersHorizontal className="size-4 text-blue-600" />
            <span>Search & Filter Audit Records</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2 gap-1"
            >
              <X className="size-3.5" /> Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Search action, actor, target..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Filter 1: Action */}
          <div>
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Action: All" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="All">Action: All Actions</SelectItem>
                <SelectItem value="status_change">Status Changes</SelectItem>
                <SelectItem value="role_update">Role Updates</SelectItem>
                <SelectItem value="job">Job Listings</SelectItem>
                <SelectItem value="application">Applications</SelectItem>
                <SelectItem value="system">System Policies</SelectItem>
                <SelectItem value="security">Security & Login</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 2: Actor Role */}
          <div>
            <Select
              value={actorFilter}
              onValueChange={(val) => {
                setActorFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Actor: All" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="All">Actor: All Roles</SelectItem>
                <SelectItem value="Admin">Admins</SelectItem>
                <SelectItem value="Recruiter">Recruiters</SelectItem>
                <SelectItem value="Applicant">Applicants</SelectItem>
                <SelectItem value="System">System Automated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 3: Date Range */}
          <div>
            <Select
              value={dateFilter}
              onValueChange={(val) => {
                setDateFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Date: All Time" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="All Time">Date: All Time</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="7 Days">Last 7 Days</SelectItem>
                <SelectItem value="30 Days">Last 30 Days</SelectItem>
                <SelectItem value="3 Months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 4: Target Entity */}
          <div>
            <Select
              value={targetFilter}
              onValueChange={(val) => {
                setTargetFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Target: All" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="All">Target: All Entities</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="job">Jobs</SelectItem>
                <SelectItem value="application">Applications</SelectItem>
                <SelectItem value="company">Companies</SelectItem>
                <SelectItem value="system">System Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Failed to load system activity logs</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {error.message || "An unexpected error occurred while loading audit events."}
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

      {/* Audit Log Table Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="p-4">Action / Event</th>
                <th className="p-4">Triggered By (Actor)</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Category</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <>
                  <SkeletonActivityRow />
                  <SkeletonActivityRow />
                  <SkeletonActivityRow />
                  <SkeletonActivityRow />
                  <SkeletonActivityRow />
                </>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 mx-auto">
                        <Inbox className="size-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        No Audit Logs Found
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No activity records matched your active search query or filter criteria.
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="text-xs mt-2"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const CategoryIcon = categoryIcons[log.category] || ShieldCheck;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="border-b border-slate-100/80 hover:bg-blue-50/40 dark:border-slate-800/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      {/* Action / Event */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 transition-colors">
                            <CategoryIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              {log.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {log.actorName}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {log.actorRole}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                          {log.targetName}
                        </div>
                        <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 font-mono">
                          {log.targetType}
                        </Badge>
                      </td>

                      {/* Category */}
                      <td className="p-4 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10.5px] capitalize font-medium">
                          {log.category}
                        </Badge>
                      </td>

                      {/* Timestamp */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 font-medium block">
                          {log.timeAgo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-semibold ${
                            log.status === "Success"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : log.status === "Warning"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
                          }`}
                        >
                          {log.status === "Success" ? (
                            <CheckCircle2 className="size-2.5 mr-1" />
                          ) : log.status === "Warning" ? (
                            <AlertTriangle className="size-2.5 mr-1" />
                          ) : (
                            <XCircle className="size-2.5 mr-1" />
                          )}
                          {log.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 group-hover:bg-blue-100/60 dark:group-hover:bg-blue-900/50"
                        >
                          View Details
                          <ChevronRight className="size-3.5 ml-0.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
          <span>
            Showing <strong>{auditLogs.length}</strong> of <strong>{totalCount}</strong> audit events
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="text-xs h-8"
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="text-xs h-8"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Detail Drawer */}
      <ActivityDetailDrawer
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </div>
  );
}

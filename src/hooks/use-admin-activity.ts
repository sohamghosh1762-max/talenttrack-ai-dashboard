import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  initialAuditLogs,
  getFilteredAuditLogs,
  type AuditLogRecord,
  type AuditQueryParams,
} from "@/data/activityData";

export const adminActivityKeys = {
  all: ["admin", "activity"] as const,
  list: (params: AuditQueryParams) => ["admin", "activity", "list", params] as const,
};

export function useAdminActivity() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [actorFilter, setActorFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [targetFilter, setTargetFilter] = useState("All");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [simulateError, setSimulateError] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const queryClient = useQueryClient();

  const queryParams: AuditQueryParams = useMemo(
    () => ({
      search: searchQuery,
      action: actionFilter,
      actor: actorFilter,
      dateRange: dateFilter,
      target: targetFilter,
      page,
      limit,
    }),
    [searchQuery, actionFilter, actorFilter, dateFilter, targetFilter, page, limit],
  );

  const query = useQuery<{ logs: AuditLogRecord[]; total: number }, Error>({
    queryKey: adminActivityKeys.list(queryParams),
    queryFn: async () => {
      // Simulate small async network latency for smooth UI feedback
      await new Promise((res) => setTimeout(res, 200));

      if (simulateError) {
        throw new Error("Failed to retrieve system audit logs. Database query response timeout.");
      }

      if (simulateEmpty) {
        return { logs: [], total: 0 };
      }

      const { filtered, total } = getFilteredAuditLogs(initialAuditLogs, queryParams);
      return { logs: filtered, total };
    },
    staleTime: 10_000,
  });

  const resetFilters = () => {
    setSearchQuery("");
    setActionFilter("All");
    setActorFilter("All");
    setDateFilter("All Time");
    setTargetFilter("All");
    setPage(1);
    setSimulateEmpty(false);
    setSimulateError(false);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminActivityKeys.all });
    await query.refetch();
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    actionFilter !== "All" ||
    actorFilter !== "All" ||
    dateFilter !== "All Time" ||
    targetFilter !== "All";

  // Summary statistics for KPI cards
  const summaryStats = useMemo(() => {
    const all = initialAuditLogs;
    return {
      totalEvents: all.length,
      adminActions: all.filter((item) => item.actorRole === "Admin").length,
      systemAlerts: all.filter((item) => item.category === "security" || item.status !== "Success").length,
      activeSessions: 6,
    };
  }, []);

  const logs = query.data?.logs ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Paginated slice
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return logs.slice(start, start + limit);
  }, [logs, page, limit]);

  return {
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
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error,
    simulateError,
    setSimulateError,
    simulateEmpty,
    setSimulateEmpty,
    auditLogs: paginatedLogs,
    totalCount: total,
    summaryStats,
  };
}

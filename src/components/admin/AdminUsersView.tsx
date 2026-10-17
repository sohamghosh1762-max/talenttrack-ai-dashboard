import { useState, useCallback } from "react";
import { Users, Plus } from "lucide-react";
import { UserSummaryCards } from "./UserSummaryCards";
import { UsersFilterBar, type FilterState } from "./UsersFilterBar";
import { AdminUsersTable } from "./AdminUsersTable";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { CreateUserModal } from "./CreateUserModal";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/hooks/use-admin-users";
import type { UserRole, UserStatus } from "@/server/types/user-types";
import { exportUsersToCsv, exportUsersToJson } from "@/lib/export-utils";
import { toast } from "sonner";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  role: "",
  status: "",
  emailVerified: "",
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
  dateFrom: "",
  dateTo: "",
};

export function AdminUsersView() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // When any filter changes, reset to page 1
  const handleFiltersChange = useCallback((next: FilterState) => {
    setFilters(next);
    setPage(1);
  }, []);

  const queryParams = {
    page,
    limit: filters.limit,
    search: filters.search || undefined,
    role: filters.role || undefined,
    status: filters.status || undefined,
    emailVerified: filters.emailVerified === "" ? undefined : filters.emailVerified,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };

  const { data, isLoading, isError, error, refetch } = useAdminUsers(queryParams);

  const users = data?.users;
  const pagination = data?.pagination;
  const summary = data?.summary;

  const handlePageChange = (p: number) => {
    setPage(p);
    // Scroll table into view on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportCsv = () => {
    if (!users || users.length === 0) {
      toast.error("No users available to export.");
      return;
    }
    exportUsersToCsv(users);
    toast.success(`Exported ${users.length} users to CSV.`);
  };

  const handleExportJson = () => {
    if (!users || users.length === 0) {
      toast.error("No users available to export.");
      return;
    }
    exportUsersToJson(users);
    toast.success(`Exported ${users.length} users to JSON.`);
  };

  const handleSummaryCardClick = (
    type: "role" | "status" | "emailVerified" | "clear",
    value?: UserRole | UserStatus | boolean,
  ) => {
    if (type === "clear") {
      setFilters(DEFAULT_FILTERS);
      setPage(1);
      return;
    }
    setFilters((prev) => ({
      ...prev,
      role: type === "role" ? (value as UserRole) : "",
      status: type === "status" ? (value as UserStatus) : "",
      emailVerified: type === "emailVerified" ? (value as boolean) : "",
    }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <Users className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage platform accounts, roles, bulk operations, and account status.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
        >
          <Plus className="size-3.5" />
          Add User
        </Button>
      </div>

      {/* Summary Cards */}
      <UserSummaryCards
        summary={summary}
        isLoading={isLoading && !data}
        onCardClick={handleSummaryCardClick}
      />

      {/* Search & Filters */}
      <UsersFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        totalResults={pagination?.total}
        isLoading={isLoading}
      />

      {/* Users Table + Pagination */}
      <AdminUsersTable
        users={users}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : "An unexpected error occurred."}
        onRetry={() => void refetch()}
        onViewUser={setSelectedUserId}
        page={pagination?.page ?? page}
        limit={filters.limit}
        total={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 0}
        onPageChange={handlePageChange}
      />

      {/* User Detail Drawer */}
      <UserDetailDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />

      {/* Create User Modal */}
      <CreateUserModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}

import { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  UserCheck2,
  UserX,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserStatusConfirmDialog } from "./UserStatusConfirmDialog";
import { UserBulkStatusConfirmDialog } from "./UserBulkStatusConfirmDialog";
import { useUpdateUserStatus, useBulkUpdateUserStatus } from "@/hooks/use-admin-users";
import type { SafeUser, UserStatus } from "@/server/types/user-types";

// ─── Badge helpers (using API's uppercase values) ─────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  ADMIN: {
    label: "Admin",
    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  ORG_ADMIN: {
    label: "Org Admin",
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  RECRUITER: {
    label: "Recruiter",
    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  HIRING_MANAGER: {
    label: "Hiring Manager",
    cls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
  },
  INTERVIEWER: {
    label: "Interviewer",
    cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  },
  APPLICANT: {
    label: "Applicant",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
};

const STATUS_BADGE: Record<string, { label: string; dot: string; cls: string }> = {
  ACTIVE: {
    label: "Active",
    dot: "bg-emerald-500",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    dot: "bg-yellow-500",
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  },
  SUSPENDED: {
    label: "Suspended",
    dot: "bg-amber-500",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  LOCKED: {
    label: "Locked",
    dot: "bg-red-500",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  },
  DEACTIVATED: {
    label: "Deactivated",
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
  INACTIVE: {
    label: "Inactive",
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
};

function RoleBadge({ role }: { role: SafeUser["role"] }) {
  const badge = ROLE_BADGE[role] || {
    label: role,
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const { label, cls } = badge;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: SafeUser["status"] }) {
  const badge = STATUS_BADGE[status] || {
    label: status,
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };
  const { label, dot, cls } = badge;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800">
      <td className="px-3 py-4">
        <div className="size-4 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </td>
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        </td>
      ))}
      <td className="px-4 py-4 text-right">
        <div className="ml-auto size-7 rounded-md bg-slate-200 dark:bg-slate-700" />
      </td>
    </tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <tr>
      <td colSpan={9} className="px-5 py-16 text-center">
        <Users className="mx-auto size-8 text-slate-300 dark:text-slate-700 mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No users found</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Try adjusting the search or filter criteria.
        </p>
      </td>
    </tr>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={9} className="px-5 py-16 text-center">
        <AlertCircle className="mx-auto size-8 text-rose-400 mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Failed to load users
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4 max-w-xs mx-auto">
          {message}
        </p>
        <Button size="sm" variant="outline" onClick={onRetry} className="text-xs gap-1.5">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </td>
    </tr>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminUsersTableProps {
  users: SafeUser[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  onViewUser: (id: string) => void;
  // Pagination
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminUsersTable({
  users,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onViewUser,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: AdminUsersTableProps) {
  const { mutate: updateStatus, isPending } = useUpdateUserStatus();
  const { mutate: bulkUpdateStatus, isPending: isBulkPending } = useBulkUpdateUserStatus();

  // Selected user IDs for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Single user confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    targetStatus: UserStatus | null;
  }>({ open: false, userId: "", userName: "", targetStatus: null });

  // Bulk confirmation modal state
  const [bulkConfirmState, setBulkConfirmState] = useState<{
    open: boolean;
    targetStatus: UserStatus | null;
  }>({ open: false, targetStatus: null });

  const currentVisibleIds = users ? users.map((u) => u.id) : [];
  const isAllSelected =
    currentVisibleIds.length > 0 && currentVisibleIds.every((id) => selectedUserIds.includes(id));
  const isSomeSelected =
    currentVisibleIds.some((id) => selectedUserIds.includes(id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !currentVisibleIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...currentVisibleIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const openConfirm = (user: SafeUser, targetStatus: UserStatus) => {
    setConfirmState({
      open: true,
      userId: user.id,
      userName: user.name,
      targetStatus,
    });
  };

  const closeConfirm = () => {
    setConfirmState((s) => ({ ...s, open: false }));
  };

  const handleConfirmStatusChange = () => {
    if (!confirmState.targetStatus) return;
    updateStatus(
      { id: confirmState.userId, status: confirmState.targetStatus },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          closeConfirm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update status.");
          closeConfirm();
        },
      },
    );
  };

  const handleConfirmBulkStatusChange = () => {
    if (!bulkConfirmState.targetStatus || selectedUserIds.length === 0) return;

    bulkUpdateStatus(
      { userIds: selectedUserIds, status: bulkConfirmState.targetStatus },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setBulkConfirmState({ open: false, targetStatus: null });
          setSelectedUserIds([]);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to perform bulk update.");
          setBulkConfirmState({ open: false, targetStatus: null });
        },
      },
    );
  };

  const fromResult = total === 0 ? 0 : (page - 1) * limit + 1;
  const toResult = Math.min(page * limit, total);

  const SKELETON_COUNT = limit < 10 ? limit : 8;

  return (
    <>
      <div className="relative rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
        {/* Floating Bulk Action Bar */}
        {selectedUserIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/90 px-5 py-3 dark:border-blue-900/40 dark:bg-blue-950/70 transition-all">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-md bg-blue-600 text-[11px] font-bold text-white">
                {selectedUserIds.length}
              </span>
              <span className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkConfirmState({ open: true, targetStatus: "ACTIVE" })}
                disabled={isBulkPending}
                className="h-7 text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <UserCheck2 className="size-3.5 mr-1" />
                Activate ({selectedUserIds.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkConfirmState({ open: true, targetStatus: "SUSPENDED" })}
                disabled={isBulkPending}
                className="h-7 text-xs font-semibold border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              >
                <UserX className="size-3.5 mr-1" />
                Suspend ({selectedUserIds.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkConfirmState({ open: true, targetStatus: "INACTIVE" })}
                disabled={isBulkPending}
                className="h-7 text-xs font-semibold border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
              >
                <PowerOff className="size-3.5 mr-1" />
                Deactivate ({selectedUserIds.length})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedUserIds([])}
                className="h-7 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-3.5 w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={isLoading || !users || users.length === 0}
                    className="flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={isAllSelected ? "Deselect all" : "Select all on page"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="size-4 text-blue-600 dark:text-blue-400" />
                    ) : isSomeSelected ? (
                      <MinusSquare className="size-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-5 py-3.5">
                  User
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Email
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Role
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Verified
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Registered
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Skeleton loading */}
              {isLoading && [...Array(SKELETON_COUNT)].map((_, i) => <SkeletonRow key={i} />)}

              {/* Error */}
              {!isLoading && isError && <ErrorState message={errorMessage} onRetry={onRetry} />}

              {/* Empty */}
              {!isLoading && !isError && (!users || users.length === 0) && <EmptyState />}

              {/* Data rows */}
              {!isLoading &&
                !isError &&
                users?.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const initials = user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const avatarBg =
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                      : user.role === "RECRUITER"
                        ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";

                  const subtitle =
                    user.role === "RECRUITER"
                      ? user.recruiterProfile?.companyName
                      : user.role === "APPLICANT"
                        ? user.applicantProfile?.headline?.split("|")[0]?.trim()
                        : user.adminProfile?.platformRole;

                  let registeredDisplay = "—";
                  try {
                    registeredDisplay = format(parseISO(user.createdAt), "MMM d, yyyy");
                  } catch {
                    // keep "—"
                  }

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(user.id)}
                          className="flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                      </td>

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${avatarBg}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900 dark:text-slate-100 max-w-[140px]">
                              {user.name}
                            </span>
                            {subtitle && (
                              <span className="block truncate text-[10.5px] text-slate-400 dark:text-slate-500 max-w-[140px]">
                                {subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[180px] block">{user.email}</span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Email verified */}
                      <td className="px-4 py-3.5">
                        {user.emailVerified ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Registered */}
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {registeredDisplay}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              aria-label={`Actions for ${user.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuLabel className="text-[10.5px] font-semibold uppercase text-slate-400">
                              Actions
                            </DropdownMenuLabel>

                            {/* View */}
                            <DropdownMenuItem
                              onClick={() => onViewUser(user.id)}
                              className="cursor-pointer gap-2"
                            >
                              <Eye className="size-3.5 text-slate-500" />
                              View Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Activate */}
                            {user.status !== "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() => openConfirm(user, "ACTIVE")}
                                className="cursor-pointer gap-2 text-emerald-600 focus:text-emerald-600 dark:text-emerald-400"
                              >
                                <UserCheck2 className="size-3.5" />
                                Activate
                              </DropdownMenuItem>
                            )}

                            {/* Suspend */}
                            {user.status !== "SUSPENDED" && (
                              <DropdownMenuItem
                                onClick={() => openConfirm(user, "SUSPENDED")}
                                className="cursor-pointer gap-2 text-amber-600 focus:text-amber-600 dark:text-amber-400"
                              >
                                <UserX className="size-3.5" />
                                Suspend
                              </DropdownMenuItem>
                            )}

                            {/* Deactivate */}
                            {user.status !== "INACTIVE" && (
                              <DropdownMenuItem
                                onClick={() => openConfirm(user, "INACTIVE")}
                                className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400"
                              >
                                <PowerOff className="size-3.5" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isError && (
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {total === 0
                ? "No results"
                : `Showing ${fromResult}–${toResult} of ${total.toLocaleString()} users`}
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                disabled={page <= 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              {/* Page number chips */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1;
                // Sliding window near current page for many pages
                if (totalPages > 5) {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  p = start + i;
                }
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    disabled={isLoading}
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      p === page
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                disabled={page >= totalPages || isLoading}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Single Confirmation Dialog */}
      <UserStatusConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => !open && closeConfirm()}
        userName={confirmState.userName}
        targetStatus={confirmState.targetStatus}
        isLoading={isPending}
        onConfirm={handleConfirmStatusChange}
      />

      {/* Bulk Confirmation Dialog */}
      <UserBulkStatusConfirmDialog
        open={bulkConfirmState.open}
        onOpenChange={(open) => !open && setBulkConfirmState({ open: false, targetStatus: null })}
        selectedCount={selectedUserIds.length}
        targetStatus={bulkConfirmState.targetStatus}
        isLoading={isBulkPending}
        onConfirm={handleConfirmBulkStatusChange}
      />
    </>
  );
}

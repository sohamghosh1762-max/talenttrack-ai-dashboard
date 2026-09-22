import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, Download, Calendar, ArrowUpDown } from "lucide-react";
import type { UserRole, UserStatus } from "@/server/types/user-types";

export interface FilterState {
  search: string;
  role: UserRole | "";
  status: UserStatus | "";
  emailVerified: boolean | "";
  limit: number;
  sortBy: "createdAt" | "name" | "email" | "role" | "status";
  sortOrder: "asc" | "desc";
  dateFrom: string;
  dateTo: string;
}

interface UsersFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  totalResults?: number | undefined;
  isLoading?: boolean | undefined;
}

const ROLE_OPTIONS: Array<{ value: UserRole | ""; label: string }> = [
  { value: "", label: "All Roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "RECRUITER", label: "Recruiter" },
  { value: "APPLICANT", label: "Applicant" },
];

const STATUS_OPTIONS: Array<{ value: UserStatus | ""; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "INACTIVE", label: "Inactive" },
];

const EMAIL_OPTIONS: Array<{ value: boolean | ""; label: string }> = [
  { value: "", label: "Any Verification" },
  { value: true, label: "Verified" },
  { value: false, label: "Unverified" },
];

const SORT_OPTIONS: Array<{ value: FilterState["sortBy"]; label: string }> = [
  { value: "createdAt", label: "Joined Date" },
  { value: "name", label: "Full Name" },
  { value: "email", label: "Email Address" },
  { value: "role", label: "Role" },
  { value: "status", label: "Account Status" },
];

const LIMIT_OPTIONS = [10, 20, 50];

const DEBOUNCE_MS = 350;

export function UsersFilterBar({
  filters,
  onChange,
  onExportCsv,
  onExportJson,
  totalResults,
  isLoading,
}: UsersFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external search changes (e.g. reset)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, DEBOUNCE_MS);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ ...filters, search: "" });
  };

  const hasActiveFilters =
    filters.role !== "" ||
    filters.status !== "" ||
    filters.emailVerified !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    localSearch !== "";

  const handleReset = () => {
    setLocalSearch("");
    onChange({
      search: "",
      role: "",
      status: "",
      emailVerified: "",
      limit: filters.limit,
      sortBy: "createdAt",
      sortOrder: "desc",
      dateFrom: "",
      dateTo: "",
    });
  };

  const selectClass =
    "h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer";

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 space-y-3">
      {/* Top row: search & primary filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="admin-users-search"
            type="text"
            placeholder="Search by name or email…"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5 text-slate-400 shrink-0" />
          <select
            id="admin-users-role-filter"
            value={filters.role}
            onChange={(e) => onChange({ ...filters, role: e.target.value as UserRole | "" })}
            className={selectClass}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <select
          id="admin-users-status-filter"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as UserStatus | "" })}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Email verified filter */}
        <select
          id="admin-users-email-filter"
          value={String(filters.emailVerified)}
          onChange={(e) => {
            const raw = e.target.value;
            const val: boolean | "" = raw === "true" ? true : raw === "false" ? false : "";
            onChange({ ...filters, emailVerified: val });
          }}
          className={selectClass}
        >
          {EMAIL_OPTIONS.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Sort controls */}
        <div className="flex items-center gap-1">
          <ArrowUpDown className="size-3.5 text-slate-400 shrink-0" />
          <select
            id="admin-users-sort-by"
            value={filters.sortBy}
            onChange={(e) =>
              onChange({ ...filters, sortBy: e.target.value as FilterState["sortBy"] })
            }
            className={selectClass}
            aria-label="Sort field"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              onChange({ ...filters, sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" })
            }
            title={`Sort ${filters.sortOrder === "asc" ? "Ascending" : "Descending"}`}
            className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {filters.sortOrder === "asc" ? "ASC ↑" : "DESC ↓"}
          </button>
        </div>

        {/* Date From & Date To */}
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-slate-400 shrink-0" />
          <input
            id="admin-users-date-from"
            type="date"
            title="Joined From"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className={selectClass}
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            id="admin-users-date-to"
            type="date"
            title="Joined To"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className={selectClass}
          />
        </div>

        {/* Page size */}
        <select
          id="admin-users-limit"
          value={filters.limit}
          onChange={(e) => onChange({ ...filters, limit: Number(e.target.value) })}
          className={selectClass}
          aria-label="Results per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="size-3.5" />
            <span>Export</span>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 z-20">
              <button
                type="button"
                onClick={() => {
                  setShowExportMenu(false);
                  onExportCsv?.();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 font-medium"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExportMenu(false);
                  onExportJson?.();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 font-medium"
              >
                Export JSON
              </button>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Active filters:</span>
          {filters.role && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-medium">
              Role: {filters.role}
              <button type="button" onClick={() => onChange({ ...filters, role: "" })}>
                <X className="size-3 hover:text-blue-900 dark:hover:text-blue-100" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-medium">
              Status: {filters.status}
              <button type="button" onClick={() => onChange({ ...filters, status: "" })}>
                <X className="size-3 hover:text-amber-900 dark:hover:text-amber-100" />
              </button>
            </span>
          )}
          {filters.emailVerified !== "" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-medium">
              Verified: {filters.emailVerified ? "Yes" : "No"}
              <button type="button" onClick={() => onChange({ ...filters, emailVerified: "" })}>
                <X className="size-3 hover:text-emerald-900 dark:hover:text-emerald-100" />
              </button>
            </span>
          )}
          {filters.dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[11px] font-medium">
              From: {filters.dateFrom}
              <button type="button" onClick={() => onChange({ ...filters, dateFrom: "" })}>
                <X className="size-3 hover:text-purple-900 dark:hover:text-purple-100" />
              </button>
            </span>
          )}
          {filters.dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[11px] font-medium">
              To: {filters.dateTo}
              <button type="button" onClick={() => onChange({ ...filters, dateTo: "" })}>
                <X className="size-3 hover:text-purple-900 dark:hover:text-purple-100" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results count */}
      {totalResults != null && !isLoading && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {totalResults === 0
            ? "No users match the current filters."
            : `${totalResults.toLocaleString()} user${totalResults !== 1 ? "s" : ""} found`}
        </p>
      )}
    </div>
  );
}

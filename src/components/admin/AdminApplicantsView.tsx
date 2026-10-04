import { useState, useCallback } from "react";
import { UserRound } from "lucide-react";
import { ApplicantSummaryCards } from "./ApplicantSummaryCards";
import { ApplicantsFilterBar, type ApplicantFilterState } from "./ApplicantsFilterBar";
import { AdminApplicantsTable } from "./AdminApplicantsTable";
import { useAdminApplicants } from "@/hooks/use-admin-applicants";
import type { UserStatus } from "@/server/types/user-types";
import { toast } from "sonner";

const DEFAULT_FILTERS: ApplicantFilterState = {
  search: "",
  status: "",
  emailVerified: "",
  skills: "",
  location: "",
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
  dateFrom: "",
  dateTo: "",
};

export function AdminApplicantsView() {
  const [filters, setFilters] = useState<ApplicantFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // When any filter changes, reset to page 1
  const handleFiltersChange = useCallback((next: ApplicantFilterState) => {
    setFilters(next);
    setPage(1);
  }, []);

  const queryParams = {
    page,
    limit: filters.limit,
    search: filters.search || undefined,
    status: filters.status || undefined,
    emailVerified: filters.emailVerified === "" ? undefined : filters.emailVerified,
    skills: filters.skills || undefined,
    location: filters.location || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminApplicants(queryParams);

  const applicants = data?.applicants;
  const pagination = data?.pagination;
  const summary = data?.summary;

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Applicant list updated.");
    } catch {
      toast.error("Failed to refresh applicant list.");
    }
  };

  const handleSummaryCardClick = (
    type: "status" | "emailVerified" | "clear",
    value?: UserStatus | boolean,
  ) => {
    if (type === "clear") {
      setFilters(DEFAULT_FILTERS);
      setPage(1);
      return;
    }
    setFilters((prev) => ({
      ...prev,
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
              <UserRound className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Applicant Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review registered candidates, profile credentials, ATS scores, and application activity.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <ApplicantSummaryCards
        summary={summary}
        isLoading={isLoading && !data}
        onCardClick={handleSummaryCardClick}
      />

      {/* Search & Server-Side Filters */}
      <ApplicantsFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        onRefresh={handleRefresh}
        totalResults={pagination?.total}
        isLoading={isLoading || isFetching}
      />

      {/* Applicants Table + Pagination */}
      <AdminApplicantsTable
        applicants={applicants}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : "An unexpected error occurred."}
        onRetry={() => void refetch()}
        page={pagination?.page ?? page}
        limit={filters.limit}
        total={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 0}
        onPageChange={handlePageChange}
        onClearFilters={() => handleFiltersChange(DEFAULT_FILTERS)}
      />
    </div>
  );
}

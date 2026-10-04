import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  UserRound,
  FileText,
  MapPin,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { AdminApplicantItem, UserStatus } from "@/server/types/user-types";

// ─── Badge Styles ─────────────────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: UserStatus }) {
  const badge = STATUS_BADGE[status] || {
    label: status,
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
    >
      <span className={`size-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
      {badge.label}
    </span>
  );
}

function AtsScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
        <FileText className="size-3 text-slate-400" />
        No ATS Score
      </span>
    );
  }

  let colorCls = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  if (score < 60) {
    colorCls = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  } else if (score < 80) {
    colorCls = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${colorCls}`}
    >
      <Sparkles className="size-3" />
      ATS {score}%
    </span>
  );
}

function formatDate(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "MMM d, yyyy");
  } catch {
    return isoString;
  }
}

function getInitials(name: string): string {
  if (!name) return "A";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() || "A";
  return (parts[0]?.charAt(0) + (parts[parts.length - 1]?.charAt(0) || "")).toUpperCase();
}

// ─── Table Props ──────────────────────────────────────────────────────────────

interface AdminApplicantsTableProps {
  applicants: AdminApplicantItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onViewApplicant?: (applicantId: string) => void;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
}

export function AdminApplicantsTable({
  applicants,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onViewApplicant,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onClearFilters,
}: AdminApplicantsTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (applicantId: string) => {
    if (onViewApplicant) {
      onViewApplicant(applicantId);
    } else {
      void navigate({
        to: "/admin/applicants/$applicantId",
        params: { applicantId },
      });
    }
  };

  // ─── Error State ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 mx-auto mb-3">
          <AlertCircle className="size-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Failed to load applicant records
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {errorMessage || "An unexpected error occurred while communicating with the Admin API."}
        </p>
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="mt-4 bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Retry Request
          </Button>
        )}
      </div>
    );
  }

  // ─── Loading Skeleton ───────────────────────────────────────────────────────
  if (isLoading && (!applicants || applicants.length === 0)) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2.5 w-48 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700 hidden md:block" />
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 hidden lg:block" />
              <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────────────
  if (!applicants || applicants.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 space-y-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mx-auto">
          <UserRound className="size-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Applicants Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          No candidate applicant records matched the specified search and filter criteria.
        </p>
        {onClearFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-xs mt-2"
          >
            Clear Filters & View All
          </Button>
        )}
      </div>
    );
  }

  // ─── Range Calculation ──────────────────────────────────────────────────────
  const startRange = (page - 1) * limit + 1;
  const endRange = Math.min(page * limit, total);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <th scope="col" className="py-3.5 pl-4 pr-3">
                Candidate Applicant
              </th>
              <th scope="col" className="px-3 py-3.5">
                Headline & Location
              </th>
              <th scope="col" className="px-3 py-3.5 hidden sm:table-cell">
                Key Skills
              </th>
              <th scope="col" className="px-3 py-3.5">
                Resume & ATS
              </th>
              <th scope="col" className="px-3 py-3.5 text-center hidden md:table-cell">
                Apps
              </th>
              <th scope="col" className="px-3 py-3.5">
                Status
              </th>
              <th scope="col" className="px-3 py-3.5 hidden lg:table-cell">
                Joined Date
              </th>
              <th scope="col" className="py-3.5 pl-3 pr-4 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {applicants.map((applicant) => {
              const initials = getInitials(applicant.name);
              const skills = applicant.skills || [];

              return (
                <tr
                  key={applicant.id}
                  onClick={() => handleRowClick(applicant.id)}
                  className="group hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
                >
                  {/* Candidate Column: Avatar + Name + Email */}
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {applicant.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <Mail className="size-3 shrink-0 text-slate-400" />
                          <span className="truncate">{applicant.email}</span>
                          {applicant.emailVerified ? (
                            <span title="Email Verified">
                              <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
                            </span>
                          ) : (
                            <span title="Email Unverified">
                              <ShieldAlert className="size-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Headline & Location Column */}
                  <td className="px-3 py-3">
                    <div className="space-y-1 max-w-[200px] lg:max-w-[240px]">
                      <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {applicant.headline || "Applicant"}
                      </div>
                      {applicant.location && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <MapPin className="size-3 shrink-0 text-slate-400" />
                          <span className="truncate">{applicant.location}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Skills Column */}
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[180px] lg:max-w-[220px]">
                      {skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="inline-block rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200/60">
                          +{skills.length - 3}
                        </span>
                      )}
                      {skills.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">No skills listed</span>
                      )}
                    </div>
                  </td>

                  {/* Resume & ATS Column */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="space-y-1">
                      <AtsScoreBadge score={applicant.resume?.atsScore} />
                      {applicant.resume?.fileName && (
                        <div
                          className="text-[10px] text-slate-400 truncate max-w-[120px]"
                          title={applicant.resume.fileName}
                        >
                          {applicant.resume.fileName}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Applications Count Column */}
                  <td className="px-3 py-3 text-center hidden md:table-cell whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <Briefcase className="size-3 text-slate-400" />
                      {applicant.applicationsCount}
                    </span>
                  </td>

                  {/* Status Column */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <StatusBadge status={applicant.status} />
                  </td>

                  {/* Joined Date Column */}
                  <td className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400 hidden lg:table-cell whitespace-nowrap">
                    {formatDate(applicant.createdAt)}
                  </td>

                  {/* Action Column */}
                  <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                    <Link
                      to="/admin/applicants/$applicantId"
                      params={{ applicantId: applicant.id }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewApplicant) {
                          e.preventDefault();
                          onViewApplicant(applicant.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs h-7 px-2.5 rounded-md font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{startRange}</span> to{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{endRange}</span> of{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{total}</span> applicants
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-7 px-2 text-xs border-slate-200 dark:border-slate-700"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <div key={p} className="flex items-center">
                    {showEllipsis && <span className="px-1.5 text-slate-400">…</span>}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(p)}
                      className={`size-7 p-0 text-xs ${
                        p === page
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {p}
                    </Button>
                  </div>
                );
              })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-7 px-2 text-xs border-slate-200 dark:border-slate-700"
              aria-label="Next page"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

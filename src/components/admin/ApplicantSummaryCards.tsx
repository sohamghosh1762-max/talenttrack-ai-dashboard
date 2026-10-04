import { UserRound, UserCheck, UserX, CheckCircle, FileText, ShieldCheck } from "lucide-react";
import type { AdminApplicantSummaryStats, UserStatus } from "@/server/types/user-types";

interface ApplicantSummaryCardsProps {
  summary: AdminApplicantSummaryStats | undefined;
  isLoading: boolean;
  onCardClick?: (
    type: "status" | "emailVerified" | "clear",
    value?: UserStatus | boolean,
  ) => void;
}

const APPLICANT_CARD_DEFS = [
  {
    key: "totalApplicants" as const,
    label: "Total Applicants",
    Icon: UserRound,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    valueColor: "text-slate-900 dark:text-slate-100",
    filterType: "clear" as const,
    filterValue: undefined,
  },
  {
    key: "active" as const,
    label: "Active Accounts",
    Icon: UserCheck,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    valueColor: "text-emerald-600 dark:text-emerald-400",
    filterType: "status" as const,
    filterValue: "ACTIVE" as UserStatus,
  },
  {
    key: "suspended" as const,
    label: "Suspended",
    Icon: UserX,
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/50",
    valueColor: "text-rose-600 dark:text-rose-400",
    filterType: "status" as const,
    filterValue: "SUSPENDED" as UserStatus,
  },
  {
    key: "verified" as const,
    label: "Verified Email",
    Icon: ShieldCheck,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-50 dark:bg-purple-950/50",
    valueColor: "text-purple-600 dark:text-purple-400",
    filterType: "emailVerified" as const,
    filterValue: true,
  },
  {
    key: "unverified" as const,
    label: "Unverified",
    Icon: CheckCircle,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    valueColor: "text-amber-600 dark:text-amber-400",
    filterType: "emailVerified" as const,
    filterValue: false,
  },
  {
    key: "withResume" as const,
    label: "With Resume",
    Icon: FileText,
    iconColor: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-50 dark:bg-sky-950/50",
    valueColor: "text-sky-600 dark:text-sky-400",
    filterType: "clear" as const,
    filterValue: undefined,
  },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mt-2.5 h-6 w-12 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export function ApplicantSummaryCards({
  summary,
  isLoading,
  onCardClick,
}: ApplicantSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {APPLICANT_CARD_DEFS.map((c) => (
          <SkeletonCard key={c.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {APPLICANT_CARD_DEFS.map(
        ({ key, label, Icon, iconColor, iconBg, valueColor, filterType, filterValue }) => (
          <div
            key={key}
            onClick={() => onCardClick?.(filterType, filterValue)}
            className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-blue-700 cursor-pointer transition-all"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {label}
              </span>
              <div className={`flex size-8 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className={`size-4 ${iconColor}`} />
              </div>
            </div>
            <p className={`mt-2 text-xl font-bold tabular-nums ${valueColor}`}>
              {summary?.[key] ?? "—"}
            </p>
          </div>
        ),
      )}
    </div>
  );
}

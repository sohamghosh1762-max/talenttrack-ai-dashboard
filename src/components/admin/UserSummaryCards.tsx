import { Users, Shield, UserCheck, UserRound, UserX, CheckCircle, Clock } from "lucide-react";
import type { UserSummaryStats, UserRole, UserStatus } from "@/server/types/user-types";

interface UserSummaryCardsProps {
  summary: UserSummaryStats | undefined;
  isLoading: boolean;
  onCardClick?: (
    type: "role" | "status" | "emailVerified" | "clear",
    value?: UserRole | UserStatus | boolean,
  ) => void;
}

const CARD_DEFS = [
  {
    key: "totalUsers" as const,
    label: "Total Users",
    Icon: Users,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    valueColor: "text-slate-900 dark:text-slate-100",
    filterType: "clear" as const,
    filterValue: undefined,
  },
  {
    key: "admins" as const,
    label: "Admins",
    Icon: Shield,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-50 dark:bg-purple-950/50",
    valueColor: "text-slate-900 dark:text-slate-100",
    filterType: "role" as const,
    filterValue: "ADMIN" as UserRole,
  },
  {
    key: "recruiters" as const,
    label: "Recruiters",
    Icon: UserCheck,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
    valueColor: "text-slate-900 dark:text-slate-100",
    filterType: "role" as const,
    filterValue: "RECRUITER" as UserRole,
  },
  {
    key: "applicants" as const,
    label: "Applicants",
    Icon: UserRound,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    valueColor: "text-slate-900 dark:text-slate-100",
    filterType: "role" as const,
    filterValue: "APPLICANT" as UserRole,
  },
  {
    key: "active" as const,
    label: "Active Users",
    Icon: CheckCircle,
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

export function UserSummaryCards({ summary, isLoading, onCardClick }: UserSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CARD_DEFS.map((c) => (
          <SkeletonCard key={c.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARD_DEFS.map(
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

import type { AdminUserRole, AdminUserStatus, ServiceHealthStatus } from "@/data/adminTypes";

interface StatusBadgeProps {
  status?: AdminUserStatus | ServiceHealthStatus | string;
  role?: AdminUserRole | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, role, size = "sm" }: StatusBadgeProps) {
  if (role) {
    const roleStyles: Record<string, string> = {
      // Capitalized (legacy mock data)
      Recruiter:
        "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
      Applicant:
        "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      Admin:
        "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
      // Uppercase (API values)
      RECRUITER:
        "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
      APPLICANT:
        "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      ADMIN:
        "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    };

    const roleLabels: Record<string, string> = {
      RECRUITER: "Recruiter",
      APPLICANT: "Applicant",
      ADMIN: "Admin",
    };

    const style = roleStyles[role] || "bg-slate-100 text-slate-700 border-slate-200";
    const label = roleLabels[role] ?? role;

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        } ${style}`}
      >
        {label}
      </span>
    );
  }

  if (status) {
    const statusMap: Record<string, { label: string; dot: string; container: string }> = {
      // Capitalized (legacy mock data)
      Active: {
        label: "Active",
        dot: "bg-emerald-500",
        container:
          "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      },
      Operational: {
        label: "Operational",
        dot: "bg-emerald-500",
        container:
          "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      },
      Pending: {
        label: "Pending",
        dot: "bg-amber-500",
        container:
          "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      },
      Degraded: {
        label: "Degraded",
        dot: "bg-amber-500",
        container:
          "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      },
      Suspended: {
        label: "Suspended",
        dot: "bg-rose-500",
        container:
          "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      },
      // Uppercase (API values)
      ACTIVE: {
        label: "Active",
        dot: "bg-emerald-500",
        container:
          "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      },
      SUSPENDED: {
        label: "Suspended",
        dot: "bg-amber-500",
        container:
          "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      },
      INACTIVE: {
        label: "Inactive",
        dot: "bg-slate-400",
        container:
          "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      },
    };

    const config = statusMap[status] || {
      label: status,
      dot: "bg-slate-400",
      container: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        } ${config.container}`}
      >
        <span className={`size-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  return null;
}

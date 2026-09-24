import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  UserCheck,
  UserRound,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  Building2,
  MapPin,
  Phone,
  FileText,
  Layers,
  Activity,
  UserCheck2,
  UserX,
  PowerOff,
  BarChart3,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { SafeUser, UserStatus } from "@/server/types/user-types";
import { useAdminUser, useAdminUserActivity, useUpdateUserStatus } from "@/hooks/use-admin-users";
import { UserStatusConfirmDialog } from "./UserStatusConfirmDialog";

interface UserDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function RoleBadge({ role }: { role: SafeUser["role"] }) {
  const map: Record<SafeUser["role"], { label: string; cls: string; Icon: typeof Shield }> = {
    ADMIN: {
      label: "Admin",
      cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      Icon: Shield,
    },
    RECRUITER: {
      label: "Recruiter",
      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      Icon: UserCheck,
    },
    APPLICANT: {
      label: "Applicant",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      Icon: UserRound,
    },
  };
  const { label, cls, Icon } = map[role];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: SafeUser["status"] }) {
  const map: Record<SafeUser["status"], { label: string; dot: string; cls: string }> = {
    ACTIVE: {
      label: "Active",
      dot: "bg-emerald-500",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    },
    SUSPENDED: {
      label: "Suspended",
      dot: "bg-amber-500",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    },
    INACTIVE: {
      label: "Inactive",
      dot: "bg-slate-400",
      cls: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    },
  };
  const { label, dot, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      <span className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
        <Icon className="size-3.5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 text-xs font-medium text-slate-800 dark:text-slate-200 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
      {children}
    </h3>
  );
}

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-1">
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="size-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="size-7 rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityLogSection({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useAdminUserActivity(userId);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
        Loading activity log history…
      </div>
    );
  }

  if (isError || !data?.activity || data.activity.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No recent activity recorded for this user.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
        {data.activity.map((item) => (
          <div key={item.id} className="relative group">
            <div className="absolute -left-[31px] top-1 size-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {item.action}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {formatDate(item.timestamp)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                Initiated by: {item.performedBy} ({item.performedByRole})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountMetricsSection({ user }: { user: SafeUser }) {
  const memberDays = Math.max(
    1,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <p className="text-[10.5px] font-semibold uppercase text-slate-400">Account Age</p>
        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
          {memberDays} day{memberDays !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <p className="text-[10.5px] font-semibold uppercase text-slate-400">Security Tier</p>
        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
          {user.emailVerified ? "Verified" : "Unverified"}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <p className="text-[10.5px] font-semibold uppercase text-slate-400">Current Status</p>
        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{user.status}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <p className="text-[10.5px] font-semibold uppercase text-slate-400">Platform Role</p>
        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{user.role}</p>
      </div>
    </div>
  );
}

function UserDetailContent({ user }: { user: SafeUser }) {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "metrics">("overview");
  const [confirmStatus, setConfirmStatus] = useState<UserStatus | null>(null);

  const { mutate: updateStatus, isPending } = useUpdateUserStatus();

  const handleConfirmStatus = () => {
    if (!confirmStatus) return;
    updateStatus(
      { id: user.id, status: confirmStatus },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setConfirmStatus(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update status.");
          setConfirmStatus(null);
        },
      },
    );
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarColor =
    user.role === "ADMIN"
      ? "bg-purple-600"
      : user.role === "RECRUITER"
        ? "bg-blue-600"
        : "bg-emerald-600";

  return (
    <div className="space-y-3">
      {/* User Avatar + Name Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-sm ${avatarColor}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {user.name}
          </h2>
          <p className="text-xs text-slate-500 font-mono dark:text-slate-400 truncate">
            {user.email}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <RoleBadge role={user.role} />
            <StatusDot status={user.status} />
          </div>
        </div>
      </div>

      {/* Quick Status Management Actions */}
      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
        <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-1">Actions:</span>
        {user.status !== "ACTIVE" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmStatus("ACTIVE")}
            className="h-7 text-[11px] font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <UserCheck2 className="size-3 mr-1" /> Activate
          </Button>
        )}
        {user.status !== "SUSPENDED" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmStatus("SUSPENDED")}
            className="h-7 text-[11px] font-semibold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <UserX className="size-3 mr-1" /> Suspend
          </Button>
        )}
        {user.status !== "INACTIVE" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmStatus("INACTIVE")}
            className="h-7 text-[11px] font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <PowerOff className="size-3 mr-1" /> Deactivate
          </Button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <Layers className="size-3.5" /> Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "activity"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <Activity className="size-3.5" /> Activity Log
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "metrics"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <BarChart3 className="size-3.5" /> Metrics
        </button>
      </div>

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Core Account Info */}
          <SectionTitle>Account Information</SectionTitle>
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden px-1">
            <InfoRow
              icon={Mail}
              label="Email Address"
              value={<span className="font-mono">{user.email}</span>}
            />
            <InfoRow
              icon={user.emailVerified ? CheckCircle2 : XCircle}
              label="Email Verified"
              value={
                user.emailVerified ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Verified
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Not verified
                  </span>
                )
              }
            />
            <InfoRow icon={Calendar} label="Registered" value={formatDate(user.createdAt)} />
            <InfoRow icon={Clock} label="Last Updated" value={formatDate(user.updatedAt)} />
            {user.lastActive && (
              <InfoRow icon={Clock} label="Last Active" value={formatDate(user.lastActive)} />
            )}
          </div>

          {/* Recruiter Profile */}
          {user.role === "RECRUITER" && user.recruiterProfile && (
            <>
              <SectionTitle>Recruiter Profile</SectionTitle>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden px-1">
                <InfoRow
                  icon={Building2}
                  label="Company"
                  value={user.recruiterProfile.companyName}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Job Title"
                  value={user.recruiterProfile.jobTitle}
                />
                {user.recruiterProfile.department && (
                  <InfoRow
                    icon={Layers}
                    label="Department"
                    value={user.recruiterProfile.department}
                  />
                )}
              </div>
            </>
          )}

          {/* Applicant Profile */}
          {user.role === "APPLICANT" && user.applicantProfile && (
            <>
              <SectionTitle>Applicant Profile</SectionTitle>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden px-1">
                {user.applicantProfile.headline && (
                  <InfoRow
                    icon={Briefcase}
                    label="Headline"
                    value={user.applicantProfile.headline}
                  />
                )}
                {user.applicantProfile.location && (
                  <InfoRow icon={MapPin} label="Location" value={user.applicantProfile.location} />
                )}
                {user.applicantProfile.phone && (
                  <InfoRow icon={Phone} label="Phone" value={user.applicantProfile.phone} />
                )}
                {user.applicantProfile.experienceYears && (
                  <InfoRow
                    icon={Clock}
                    label="Experience"
                    value={user.applicantProfile.experienceYears}
                  />
                )}
                {user.applicantProfile.resumeFileName && (
                  <InfoRow
                    icon={FileText}
                    label="Resume"
                    value={user.applicantProfile.resumeFileName}
                  />
                )}
                {user.applicantProfile.skills && user.applicantProfile.skills.length > 0 && (
                  <InfoRow
                    icon={Layers}
                    label="Skills"
                    value={
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {user.applicantProfile.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}
              </div>
            </>
          )}

          {/* Admin Profile */}
          {user.role === "ADMIN" && user.adminProfile && (
            <>
              <SectionTitle>Admin Profile</SectionTitle>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden px-1">
                {user.adminProfile.platformRole && (
                  <InfoRow
                    icon={Shield}
                    label="Platform Role"
                    value={user.adminProfile.platformRole}
                  />
                )}
                {user.adminProfile.lastLogin && (
                  <InfoRow
                    icon={Clock}
                    label="Last Login"
                    value={formatDateShort(user.adminProfile.lastLogin)}
                  />
                )}
                {user.adminProfile.permissions && (
                  <InfoRow
                    icon={Layers}
                    label="Permissions"
                    value={
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {user.adminProfile.permissions.map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Activity Log Tab Content */}
      {activeTab === "activity" && <ActivityLogSection userId={user.id} />}

      {/* Metrics Tab Content */}
      {activeTab === "metrics" && <AccountMetricsSection user={user} />}

      {/* Footer note */}
      <p className="mt-4 text-[10.5px] text-slate-400 dark:text-slate-600 text-center">
        ID: <span className="font-mono">{user.id}</span>
      </p>

      {/* Confirmation modal */}
      <UserStatusConfirmDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => !open && setConfirmStatus(null)}
        userName={user.name}
        targetStatus={confirmStatus}
        isLoading={isPending}
        onConfirm={handleConfirmStatus}
      />
    </div>
  );
}

export function UserDetailDrawer({ userId, onClose }: UserDetailDrawerProps) {
  const { data, isLoading, isError, error } = useAdminUser(userId);

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-sm font-bold">User Details</SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Complete administrative profile — no sensitive credentials shown.
          </SheetDescription>
        </SheetHeader>

        {isLoading && <DrawerSkeleton />}

        {isError && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <XCircle className="size-8 text-rose-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Failed to load user
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}

        {!isLoading && !isError && data?.user && <UserDetailContent user={data.user} />}
      </SheetContent>
    </Sheet>
  );
}

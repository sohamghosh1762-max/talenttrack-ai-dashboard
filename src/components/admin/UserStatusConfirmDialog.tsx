import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserStatus } from "@/server/types/user-types";

interface UserStatusConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  targetStatus: UserStatus | null;
  isLoading?: boolean;
  onConfirm: () => void;
}

const STATUS_CONFIG: Record<
  UserStatus,
  {
    title: string;
    description: (name: string) => string;
    actionLabel: string;
    actionClass: string;
  }
> = {
  SUSPENDED: {
    title: "Suspend Account",
    description: (name) =>
      `This will immediately suspend ${name}'s account. They will not be able to log in until the account is reactivated.`,
    actionLabel: "Suspend Account",
    actionClass: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white",
  },
  LOCKED: {
    title: "Lock Account",
    description: (name) =>
      `This will temporarily lock ${name}'s account. They will not be able to authenticate.`,
    actionLabel: "Lock Account",
    actionClass: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
  },
  DEACTIVATED: {
    title: "Deactivate Account",
    description: (name) =>
      `This will deactivate ${name}'s account and revoke access. This action can be reversed by an administrator.`,
    actionLabel: "Deactivate Account",
    actionClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white",
  },
  INACTIVE: {
    title: "Deactivate Account",
    description: (name) =>
      `This will permanently deactivate ${name}'s account. The account will be set to INACTIVE and access will be revoked. This action can be reversed by an administrator.`,
    actionLabel: "Deactivate Account",
    actionClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white",
  },
  PENDING_VERIFICATION: {
    title: "Set Pending Verification",
    description: (name) => `This will mark ${name}'s account as pending email verification.`,
    actionLabel: "Set Pending",
    actionClass: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white",
  },
  ACTIVE: {
    title: "Activate Account",
    description: (name) =>
      `This will reactivate ${name}'s account and restore their platform access.`,
    actionLabel: "Activate Account",
    actionClass: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white",
  },
};

export function UserStatusConfirmDialog({
  open,
  onOpenChange,
  userName,
  targetStatus,
  isLoading = false,
  onConfirm,
}: UserStatusConfirmDialogProps) {
  if (!targetStatus) return null;

  const config = STATUS_CONFIG[targetStatus];
  if (!config) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {config.description(userName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isLoading} className="text-xs font-medium">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`text-xs font-semibold ${config.actionClass}`}
          >
            {isLoading ? "Processing…" : config.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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

interface UserBulkStatusConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  targetStatus: UserStatus | null;
  isLoading?: boolean;
  onConfirm: () => void;
}

const BULK_STATUS_CONFIG: Record<
  UserStatus,
  {
    title: string;
    description: (count: number) => string;
    actionLabel: string;
    actionClass: string;
  }
> = {
  SUSPENDED: {
    title: "Bulk Suspend Accounts",
    description: (count) =>
      `Are you sure you want to suspend ${count} selected user accounts? Suspended users will not be able to log in until reactivated.`,
    actionLabel: "Suspend Accounts",
    actionClass: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white",
  },
  INACTIVE: {
    title: "Bulk Deactivate Accounts",
    description: (count) =>
      `Are you sure you want to deactivate ${count} selected user accounts? Their status will be updated to INACTIVE and access will be revoked.`,
    actionLabel: "Deactivate Accounts",
    actionClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white",
  },
  ACTIVE: {
    title: "Bulk Activate Accounts",
    description: (count) =>
      `Are you sure you want to reactivate ${count} selected user accounts and restore their platform access?`,
    actionLabel: "Activate Accounts",
    actionClass: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white",
  },
};

export function UserBulkStatusConfirmDialog({
  open,
  onOpenChange,
  selectedCount,
  targetStatus,
  isLoading = false,
  onConfirm,
}: UserBulkStatusConfirmDialogProps) {
  if (!targetStatus) return null;

  const config = BULK_STATUS_CONFIG[targetStatus];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
            {config.title} ({selectedCount} Selected)
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {config.description(selectedCount)}
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
            {isLoading ? "Updating…" : `${config.actionLabel} (${selectedCount})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

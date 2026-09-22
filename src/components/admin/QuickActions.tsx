import { Users, Building2, Briefcase, BarChart3, Activity, Settings, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onActionClick?: (actionId: string) => void;
}

const actionsList = [
  {
    id: "manage-users",
    label: "Manage Users",
    description: "Browse, filter, and modify system accounts",
    icon: Users,
  },
  {
    id: "review-companies",
    label: "Review Companies",
    description: "Approve enterprise accounts and verified domains",
    icon: Building2,
  },
  {
    id: "view-jobs",
    label: "View Jobs",
    description: "Audit all active and archived job listings",
    icon: Briefcase,
  },
  {
    id: "view-reports",
    label: "View Reports",
    description: "Export platform compliance and performance metrics",
    icon: BarChart3,
  },
  {
    id: "system-activity",
    label: "System Activity",
    description: "Audit real-time administrative logs and platform activity",
    icon: Activity,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Configure platform tolerances, security policies, and 2FA",
    icon: Settings,
  },
];

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<{
    id: string;
    title: string;
    desc: string;
  } | null>(null);

  const handleClick = (action: (typeof actionsList)[0]) => {
    if (onActionClick) {
      onActionClick(action.id);
    } else {
      setActiveModal({
        id: action.id,
        title: action.label,
        desc: action.description,
      });
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Quick Actions</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Frequently accessed administrative controls
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {actionsList.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleClick(action)}
                className="group flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 text-left transition-all hover:bg-white hover:border-blue-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-700 group-hover:text-blue-600 group-hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-colors">
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.label}
                  </span>
                </div>
                <ChevronRight className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{activeModal?.title}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {activeModal?.desc}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-xs text-slate-600 dark:text-slate-300 space-y-3">
            <p>
              This administrative module is ready to connect with the corresponding backend data
              endpoints for {activeModal?.title.toLowerCase()}.
            </p>
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="font-semibold block mb-0.5">Platform Controller Access</span>
              Full superuser permissions granted. Data audits, export schedules, and user management
              can be executed directly.
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveModal(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

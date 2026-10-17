"use client";

import { useState } from "react";
import { UserPlus, Loader2, Building2, Shield, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAssignMember, useAdminOrganizations } from "@/hooks/use-admin-organizations";
import { useAdminUsers } from "@/hooks/use-admin-users";
import type { UserRole } from "@/server/types/user-types";
import type { IOrganization } from "@/server/types/organization-types";

interface AssignMemberModalProps {
  organization: IOrganization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignMemberModal({
  organization,
  open,
  onOpenChange,
  onSuccess,
}: AssignMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("RECRUITER");

  const { data: usersData, isLoading: isLoadingUsers } = useAdminUsers({ limit: 100 });
  const users = usersData?.users || [];

  const assignMemberMutation = useAssignMember();

  const departments = organization?.departments || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Organization is required");
      return;
    }
    if (!selectedUserId) {
      toast.error("Please select a user to assign");
      return;
    }

    try {
      await assignMemberMutation.mutateAsync({
        organizationId: organization.id,
        data: {
          userId: selectedUserId,
          role: selectedRole,
          departmentId: selectedDeptId || undefined,
        },
      });

      toast.success("User assigned to organization successfully");
      setSelectedUserId("");
      setSelectedDeptId("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
              <UserPlus className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Assign Member to {organization?.name || "Organization"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grant access to this organization workspace with designated role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Select User */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select User <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">-- Choose a user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) — current: {u.role}
                </option>
              ))}
            </select>
          </div>

          {/* Target Role */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assigned Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="RECRUITER">Recruiter</option>
              <option value="HIRING_MANAGER">Hiring Manager</option>
              <option value="ORG_ADMIN">Organization Admin</option>
              <option value="INTERVIEWER">Interviewer</option>
            </select>
          </div>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">None / All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={assignMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={assignMemberMutation.isPending}
            >
              {assignMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

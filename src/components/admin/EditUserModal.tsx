"use client";

import { useState, useEffect } from "react";
import { UserCog, Loader2, Building2, Shield, Mail, User } from "lucide-react";
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
import { useUpdateAdminUser } from "@/hooks/use-admin-users";
import { useAdminOrganizations } from "@/hooks/use-admin-organizations";
import type { SafeUser, UserRole, UserStatus } from "@/server/types/user-types";
import type { IDepartment } from "@/server/types/organization-types";

interface EditUserModalProps {
  user: SafeUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditUserModal({ user, open, onOpenChange, onSuccess }: EditUserModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("RECRUITER");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState(true);

  const { data: orgData } = useAdminOrganizations();
  const organizations = orgData?.organizations || [];

  const selectedOrg = organizations.find((o) => o.id === organizationId);
  const departments: IDepartment[] = selectedOrg?.departments || [];

  const updateUserMutation = useUpdateAdminUser();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setStatus(user.status);
      setOrganizationId(user.organizationId || "");
      setDepartmentId(user.departmentId || "");
      setEmailVerified(user.emailVerified);
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("User name is required");
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: {
          name: name.trim(),
          role,
          status,
          organizationId: organizationId || undefined,
          departmentId: departmentId || undefined,
          emailVerified,
        },
      });

      toast.success(`User updated successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
              <UserCog className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit User Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update account details, role permissions, and tenant organization.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Readonly Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                disabled
                value={user.email}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-slate-100 pl-8 pr-3 text-xs font-mono text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Role and Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="RECRUITER">Recruiter</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="ORG_ADMIN">Organization Admin</option>
                <option value="ADMIN">System Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="INTERVIEWER">Interviewer</option>
                <option value="APPLICANT">Applicant</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="ACTIVE">Active</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Organization & Department assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Organization
              </label>
              <select
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(e.target.value);
                  setDepartmentId("");
                }}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="">None / Unassigned</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!organizationId || departments.length === 0}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="">None / All</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email Verified Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="editEmailVerified"
              type="checkbox"
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
              className="size-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="editEmailVerified"
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              Account email is verified
            </label>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

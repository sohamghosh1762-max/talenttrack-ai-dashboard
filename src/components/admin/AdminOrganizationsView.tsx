"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Users,
  FolderTree,
  UserPlus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useAdminOrganizations,
  useUpdateOrganization,
  useDeleteOrganization,
} from "@/hooks/use-admin-organizations";
import { CreateOrganizationModal } from "./CreateOrganizationModal";
import { EditOrganizationModal } from "./EditOrganizationModal";
import { DepartmentManagementDrawer } from "./DepartmentManagementDrawer";
import { AssignMemberModal } from "./AssignMemberModal";
import type { IOrganization } from "@/server/types/organization-types";

export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: "Enterprise" | "Growth" | "Starter";
  status: "Active" | "Pending Verification" | "Suspended";
  membersCount: number;
  jobsCount: number;
  applicationsCount: number;
  createdAt: string;
}

export function AdminOrganizationsView() {
  const { data, isLoading, isError, error, refetch } = useAdminOrganizations();
  const orgs: IOrganization[] = data?.organizations || [];

  const updateMutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("All");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<IOrganization | null>(null);
  const [deptOrgId, setDeptOrgId] = useState<string | null>(null);
  const [assignOrg, setAssignOrg] = useState<IOrganization | null>(null);

  // Status toggle confirmation
  const [statusTargetOrg, setStatusTargetOrg] = useState<IOrganization | null>(null);
  // Delete confirmation
  const [deleteTargetOrg, setDeleteTargetOrg] = useState<IOrganization | null>(null);

  const filteredOrgs = orgs.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.domain.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "All" || org.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleToggleStatus = async () => {
    if (!statusTargetOrg) return;
    const newStatus = statusTargetOrg.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateMutation.mutateAsync({
        id: statusTargetOrg.id,
        data: {
          status: newStatus,
        },
      });
      toast.success(
        `Organization ${statusTargetOrg.name} is now ${newStatus === "ACTIVE" ? "Active" : "Suspended"}`,
      );
      setStatusTargetOrg(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update organization status");
    }
  };

  const handleDeleteOrg = async () => {
    if (!deleteTargetOrg) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetOrg.id);
      toast.success(`Organization ${deleteTargetOrg.name} deleted successfully`);
      setDeleteTargetOrg(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete organization");
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Tenants</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isLoading ? "—" : orgs.length}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Active Enterprise</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {isLoading
              ? "—"
              : orgs.filter((o) => o.plan === "Enterprise" && o.status === "ACTIVE").length}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Recruiter Seats</span>
          <span className="text-2xl font-bold text-emerald-600">
            {isLoading ? "—" : orgs.reduce((acc, curr) => acc + (curr.membersCount || 0), 0)}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs text-slate-500 block">Pending Verification</span>
          <span className="text-2xl font-bold text-amber-600">
            {isLoading ? "—" : orgs.filter((o) => o.status === "PENDING_VERIFICATION").length}
          </span>
        </div>
      </div>

      {/* Filter, Search, and Action Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant organization by name or domain..."
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-1 text-xs dark:border-slate-800 dark:bg-slate-900">
            <Filter className="size-3.5 text-slate-400 ml-1" />
            {["All", "Enterprise", "Growth", "Starter"].map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setPlanFilter(plan)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  planFilter === plan
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                {plan}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            <Plus className="size-3.5" />
            Add Organization
          </Button>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-3 py-3">Plan / Tier</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Departments</th>
                <th className="px-3 py-3">Members</th>
                <th className="px-3 py-3">Active Jobs</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-blue-600" />
                    <p className="mt-2 text-xs text-slate-400">Loading tenant organizations...</p>
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <AlertCircle className="mx-auto size-6 text-rose-500 mb-1" />
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {error instanceof Error ? error.message : "Failed to load organizations"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refetch()}
                      className="mt-2 text-xs gap-1"
                    >
                      <RefreshCw className="size-3" /> Retry
                    </Button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && filteredOrgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No organizations found matching your search.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                filteredOrgs.map((org) => {
                  let formattedCreated = "—";
                  try {
                    formattedCreated = format(parseISO(org.createdAt), "MMM d, yyyy");
                  } catch {
                    formattedCreated = org.createdAt;
                  }

                  const deptCount = org.departments?.length || 0;

                  return (
                    <tr
                      key={org.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold shrink-0">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <strong className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {org.name}
                            </strong>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {org.domain}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            org.plan === "Enterprise"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                              : org.plan === "Growth"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {org.plan}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            org.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : org.status === "PENDING_VERIFICATION"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          }`}
                        >
                          {org.status === "ACTIVE"
                            ? "Active"
                            : org.status === "PENDING_VERIFICATION"
                              ? "Pending Verification"
                              : "Suspended"}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        <button
                          type="button"
                          onClick={() => setDeptOrgId(org.id)}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          <FolderTree className="size-3 text-slate-400" />
                          {deptCount} dept{deptCount !== 1 ? "s" : ""}
                        </button>
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Users className="size-3 text-slate-400" />
                          {org.membersCount || 0}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {org.jobsCount || 0}
                      </td>

                      <td className="px-3 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {formattedCreated}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem
                              onClick={() => setEditingOrg(org)}
                              className="cursor-pointer gap-2"
                            >
                              <Edit2 className="size-3.5 text-slate-500" />
                              Edit Organization
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setDeptOrgId(org.id)}
                              className="cursor-pointer gap-2"
                            >
                              <FolderTree className="size-3.5 text-slate-500" />
                              Manage Departments
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setAssignOrg(org)}
                              className="cursor-pointer gap-2"
                            >
                              <UserPlus className="size-3.5 text-slate-500" />
                              Assign Member
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setStatusTargetOrg(org)}
                              className="cursor-pointer gap-2 text-amber-600 focus:text-amber-600 dark:text-amber-400"
                            >
                              {org.status === "ACTIVE"
                                ? "Suspend Organization"
                                : "Activate Organization"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setDeleteTargetOrg(org)}
                              className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="size-3.5" />
                              Delete Organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <CreateOrganizationModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => void refetch()}
      />

      <EditOrganizationModal
        organization={editingOrg}
        open={!!editingOrg}
        onOpenChange={(open) => !open && setEditingOrg(null)}
        onSuccess={() => void refetch()}
      />

      <DepartmentManagementDrawer organizationId={deptOrgId} onClose={() => setDeptOrgId(null)} />

      <AssignMemberModal
        organization={assignOrg}
        open={!!assignOrg}
        onOpenChange={(open) => !open && setAssignOrg(null)}
        onSuccess={() => void refetch()}
      />

      {/* Status Confirmation Alert Dialog */}
      <AlertDialog
        open={!!statusTargetOrg}
        onOpenChange={(open) => !open && setStatusTargetOrg(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {statusTargetOrg?.status === "ACTIVE"
                ? "Suspend Organization"
                : "Activate Organization"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {statusTargetOrg?.status === "ACTIVE"
                ? `Suspending ${statusTargetOrg?.name} will restrict access for all affiliated organization members.`
                : `Activating ${statusTargetOrg?.name} will restore operational access for all affiliated members.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={updateMutation.isPending}
              className={
                statusTargetOrg?.status === "ACTIVE"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {updateMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteTargetOrg}
        onOpenChange={(open) => !open && setDeleteTargetOrg(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Delete Tenant Organization
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete {deleteTargetOrg?.name}? This action cannot be undone.
              All tenant-scoped data and department mappings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrg}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

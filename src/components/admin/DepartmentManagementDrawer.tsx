"use client";

import { useState } from "react";
import { Building2, FolderTree, Plus, Trash2, Edit2, Users, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useAdminOrganization,
} from "@/hooks/use-admin-organizations";
import type { IDepartment, IOrganization } from "@/server/types/organization-types";

interface DepartmentManagementDrawerProps {
  organizationId: string | null;
  onClose: () => void;
}

export function DepartmentManagementDrawer({
  organizationId,
  onClose,
}: DepartmentManagementDrawerProps) {
  const { data, isLoading, refetch } = useAdminOrganization(organizationId);
  const org = data?.organization;
  const departments: IDepartment[] = data?.departments || [];

  const createDeptMutation = useCreateDepartment();
  const updateDeptMutation = useUpdateDepartment();
  const deleteDeptMutation = useDeleteDepartment();

  const [isAdding, setIsAdding] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      toast.error("Department name and code are required");
      return;
    }

    try {
      await createDeptMutation.mutateAsync({
        organizationId,
        data: {
          name: newDeptName.trim(),
          code: newDeptCode.trim().toUpperCase(),
          description: newDeptDesc.trim() || undefined,
        },
      });
      toast.success(`Department "${newDeptName}" created`);
      setNewDeptName("");
      setNewDeptCode("");
      setNewDeptDesc("");
      setIsAdding(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create department");
    }
  };

  const startEdit = (dept: IDepartment) => {
    setEditingDeptId(dept.id);
    setEditName(dept.name);
    setEditCode(dept.code);
    setEditDesc(dept.description || "");
  };

  const handleUpdateDepartment = async (deptId: string) => {
    if (!organizationId) return;
    if (!editName.trim() || !editCode.trim()) {
      toast.error("Department name and code are required");
      return;
    }

    try {
      await updateDeptMutation.mutateAsync({
        organizationId,
        departmentId: deptId,
        data: {
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          description: editDesc.trim() || undefined,
        },
      });
      toast.success("Department updated successfully");
      setEditingDeptId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update department");
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!organizationId) return;
    if (!window.confirm(`Are you sure you want to delete department "${deptName}"?`)) return;

    try {
      await deleteDeptMutation.mutateAsync({
        organizationId,
        departmentId: deptId,
      });
      toast.success(`Department "${deptName}" deleted`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete department");
    }
  };

  return (
    <Sheet open={!!organizationId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
              <FolderTree className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold">
                {org?.name ? `${org.name} Departments` : "Departments"}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Manage organization functional units and member assignments.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header action: Add department button */}
            {!isAdding && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="w-full text-xs gap-1.5 border-dashed"
              >
                <Plus className="size-3.5" />
                Add New Department
              </Button>
            )}

            {/* Create Department Form */}
            {isAdding && (
              <form
                onSubmit={handleCreateDepartment}
                className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    New Department
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ENG"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs font-mono uppercase outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                    className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={createDeptMutation.isPending}
                  >
                    {createDeptMutation.isPending ? "Adding..." : "Add Department"}
                  </Button>
                </div>
              </form>
            )}

            {/* Department List */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Departments ({departments.length})
              </h4>

              {departments.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
                  No departments created yet for this organization.
                </div>
              )}

              {departments.map((dept: IDepartment) => {
                const isEditing = editingDeptId === dept.id;

                if (isEditing) {
                  return (
                    <div
                      key={dept.id}
                      className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 space-y-2 dark:border-blue-800 dark:bg-blue-950/20"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 rounded border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-950"
                        />
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="h-7 rounded border border-slate-200 bg-white px-2 text-xs font-mono uppercase outline-none dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-950"
                      />
                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px]"
                          onClick={() => setEditingDeptId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 text-[11px] bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => handleUpdateDepartment(dept.id)}
                          disabled={updateDeptMutation.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-3 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {dept.name}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {dept.code}
                        </span>
                      </div>
                      {dept.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {dept.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 mt-1">
                        <Users className="size-3" />
                        <span>{dept.memberCount || 0} members</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => startEdit(dept)}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Edit Department"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title="Delete Department"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Building2, Loader2, Globe } from "lucide-react";
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
import { useUpdateOrganization } from "@/hooks/use-admin-organizations";
import type {
  IOrganization,
  OrganizationPlan,
  OrganizationStatus,
} from "@/server/types/organization-types";

interface EditOrganizationModalProps {
  organization: IOrganization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditOrganizationModal({
  organization,
  open,
  onOpenChange,
  onSuccess,
}: EditOrganizationModalProps) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<OrganizationPlan>("Enterprise");
  const [status, setStatus] = useState<OrganizationStatus>("ACTIVE");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  const updateMutation = useUpdateOrganization();

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setDomain(organization.domain);
      setPlan(organization.plan);
      setStatus(organization.status);
      setDescription(organization.description || "");
      setWebsite(organization.website || "");
    }
  }, [organization]);

  if (!organization) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    if (!domain.trim()) {
      toast.error("Organization domain is required");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: organization.id,
        data: {
          name: name.trim(),
          domain: domain.trim().toLowerCase(),
          plan,
          status,
          description: description.trim() || undefined,
          website: website.trim() || undefined,
        },
      });

      toast.success(`Organization ${name} updated successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update organization";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
              <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Organization
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update organization details, subscription tier, and status.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Org Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* Org Domain */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Primary Domain <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs font-mono outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Plan & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subscription Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as OrganizationPlan)}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="Enterprise">Enterprise</option>
                <option value="Growth">Growth</option>
                <option value="Starter">Starter</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrganizationStatus)}
                className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="ACTIVE">Active</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-blue-600 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
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

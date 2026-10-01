"use client";

import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { useAuth } from "@/auth/AuthProvider";

export const Route = createFileRoute("/hiring-manager/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Hiring Manager" },
      { name: "description", content: "Manage your hiring manager profile information." },
    ],
  }),
  component: HiringManagerProfilePage,
});

function HiringManagerProfilePage() {
  const { user } = useAuth();

  return (
    <HiringManagerLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <User className="size-6 text-brand-blue" />
            <span>Hiring Manager Profile</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Account settings and organizational alignment within TalentTrack AI.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue font-black text-2xl">
              {user?.name ? user.name.charAt(0).toUpperCase() : "M"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{user?.name || "Hiring Manager"}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{user?.email}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3.5" /> HIRING_MANAGER
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Department / Team
              </span>
              <p className="text-sm font-bold text-foreground">
                {user?.recruiterProfile?.department || user?.recruiterProfile?.companyName || "Engineering"}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Organization / Company
              </span>
              <p className="text-sm font-bold text-foreground">
                {user?.recruiterProfile?.companyName || "Acme Corporation"}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Role & Permissions
              </span>
              <p className="text-sm font-bold text-foreground">
                First-Class Decision Maker (RBAC Scoped)
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Status
              </span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-4" /> Active & Verified
              </p>
            </div>
          </div>
        </div>
      </div>
    </HiringManagerLayout>
  );
}

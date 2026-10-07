"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { USER_ROLES } from "@/auth/route-access";

interface DashboardLayoutProps {
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function DashboardLayout({ children, searchQuery, onSearchChange }: DashboardLayoutProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <ProtectedRoute
      allowedRoles={[
        USER_ROLES.RECRUITER,
        USER_ROLES.HIRING_MANAGER,
        USER_ROLES.ORG_ADMIN,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
      ]}
    >
      <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[255px_minmax(0,1fr)]">
        {/* Desktop Fixed Left Sidebar */}
        <div className="fixed inset-y-0 left-0 z-30 hidden w-[255px] lg:block">
          <Sidebar onUpgradeClick={() => setUpgradeOpen(true)} />
        </div>

        {/* Main View Area */}
        <div className="min-w-0 lg:col-start-2 flex flex-col min-h-screen">
          <Header
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onUpgradeClick={() => setUpgradeOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6 space-y-4">{children}</main>
        </div>

        {/* Pro Tier Upgrade Modal */}
        <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      </div>
    </ProtectedRoute>
  );
}

"use client";

import { type ReactNode } from "react";
import { HiringManagerSidebar } from "./HiringManagerSidebar";
import { HiringManagerHeader } from "./HiringManagerHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { USER_ROLES } from "@/auth/route-access";

interface HiringManagerLayoutProps {
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function HiringManagerLayout({
  children,
  searchQuery,
  onSearchChange,
}: HiringManagerLayoutProps) {
  return (
    <ProtectedRoute
      allowedRoles={[USER_ROLES.HIRING_MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}
    >
      <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[255px_minmax(0,1fr)]">
        {/* Desktop Fixed Left Sidebar */}
        <div className="fixed inset-y-0 left-0 z-30 hidden w-[255px] lg:block">
          <HiringManagerSidebar />
        </div>

        {/* Main View Area */}
        <div className="min-w-0 lg:col-start-2 flex flex-col min-h-screen">
          <HiringManagerHeader searchQuery={searchQuery} onSearchChange={onSearchChange} />
          <main className="flex-1 p-4 md:p-6 space-y-4">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { AdminSidebar, type AdminNavItemKey } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminDashboardView } from "./AdminDashboardView";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function AdminLayout({ initialNav = "Dashboard" }: { initialNav?: AdminNavItemKey }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState<AdminNavItemKey>(
    location.pathname === "/admin/users"
      ? "Users"
      : location.pathname === "/admin/activity"
      ? "System Activity"
      : location.pathname === "/admin/reports"
      ? "Reports"
      : location.pathname === "/admin/settings"
      ? "Settings"
      : initialNav,
  );

  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectNav = (nav: AdminNavItemKey) => {
    setActiveNav(nav);
    if (nav === "Users" && location.pathname !== "/admin/users") {
      void navigate({ to: "/admin/users" });
    } else if (nav === "System Activity" && location.pathname !== "/admin/activity") {
      void navigate({ to: "/admin/activity" });
    } else if (nav === "Reports" && location.pathname !== "/admin/reports") {
      void navigate({ to: "/admin/reports" });
    } else if (nav === "Settings" && location.pathname !== "/admin/settings") {
      void navigate({ to: "/admin/settings" });
    } else if (nav === "Dashboard" && location.pathname !== "/admin") {
      void navigate({ to: "/admin" });
    }
  };

  useEffect(() => {
    if (location.pathname === "/admin/users") {
      setActiveNav("Users");
    } else if (location.pathname === "/admin/activity") {
      setActiveNav("System Activity");
    } else if (location.pathname === "/admin/reports") {
      setActiveNav("Reports");
    } else if (location.pathname === "/admin/settings") {
      setActiveNav("Settings");
    } else if (location.pathname === "/admin") {
      setActiveNav(initialNav);
    }
  }, [location.pathname, initialNav]);

  const pageSubtitles: Record<AdminNavItemKey, string> = {
    Dashboard: "Monitor and manage the TalentTrack AI platform.",
    Users: "Platform user accounts, roles, and status administration.",
    Recruiters: "Audit verified recruiter permissions and employer affiliations.",
    Applicants: "Review registered candidates and application activity.",
    Companies: "Manage enterprise accounts, departments, and corporate domains.",
    Jobs: "Oversee all active, draft, and closed job listings.",
    Applications: "Track platform-wide application pipeline throughput.",
    Reports: "Generate compliance, diversity, and operational metric summaries.",
    "System Activity": "Chronological audit log of all administrative and platform actions.",
    Settings: "Configure platform tolerances, notification preferences, and policies.",
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex min-h-screen w-full bg-slate-50/70 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {/* Fixed Left Sidebar for Desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
          <AdminSidebar activeItem={activeNav} onSelectNavItem={handleSelectNav} />
        </div>

        {/* Main Content Area (Offset by 256px / w-64 on desktop) */}
        <div className="flex flex-1 flex-col lg:pl-64">
          {/* Top Header */}
          <AdminHeader
            title={activeNav}
            subtitle={pageSubtitles[activeNav]}
            activeNav={activeNav}
            onSelectNav={handleSelectNav}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Dashboard Content Canvas */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <AdminDashboardView
              activeNav={activeNav}
              onSelectNav={handleSelectNav}
              searchQuery={searchQuery}
            />
          </main>

          {/* Minimal Footer */}
          <footer className="border-t border-slate-200/70 bg-white/60 px-6 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <span>TalentTrack AI • Platform Administration Console</span>

              <span className="text-[11px] text-slate-400 font-mono">
                Version 2.4.0 • Enterprise Edition
              </span>
            </div>
          </footer>
        </div>
      </div>
    </ProtectedRoute>
  );
}

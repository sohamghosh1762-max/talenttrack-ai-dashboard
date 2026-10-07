"use client";

import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Activity,
  Settings,
  ChevronDown,
  LogOut,
  Shield,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AdminNavItemKey =
  | "Dashboard"
  | "Users"
  | "Organizations"
  | "Audit Logs"
  | "Reports"
  | "Settings"
  | "System Activity"
  | "Companies"
  | "Recruiters"
  | "Applicants"
  | "Jobs"
  | "Applications";

interface NavGroup {
  title: string;
  items: {
    key: AdminNavItemKey;
    label: string;
    icon: typeof LayoutDashboard;
    route: string;
  }[];
}

export const adminNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [{ key: "Dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/admin" }],
  },
  {
    title: "PLATFORM",
    items: [
      { key: "Users", label: "Users", icon: Users, route: "/admin/users" },
      {
        key: "Organizations",
        label: "Organizations",
        icon: Building2,
        route: "/admin/organizations",
      },
    ],
  },
  {
    title: "MONITORING",
    items: [
      {
        key: "Audit Logs",
        label: "Audit Logs",
        icon: Activity,
        route: "/admin/activity",
      },
      { key: "Reports", label: "Reports", icon: BarChart3, route: "/admin/reports" },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ key: "Settings", label: "Settings", icon: Settings, route: "/admin/settings" }],
  },
];

interface AdminSidebarProps {
  activeItem?: AdminNavItemKey;
  onSelectNavItem?: (item: AdminNavItemKey) => void;
  onNavClick?: () => void;
}

export function AdminSidebar({
  activeItem = "Dashboard",
  onSelectNavItem,
  onNavClick,
}: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    void navigate({
      to: "/login",
      search: { redirect: "/admin", role: "admin", intent: "admin" } as Record<string, string>,
    });
  };

  const isItemActive = (key: AdminNavItemKey) => {
    if (activeItem === key) return true;
    if (key === "Audit Logs" && activeItem === "System Activity") return true;
    if (key === "Organizations" && activeItem === "Companies") return true;
    return false;
  };

  return (
    <aside
      className="flex h-full w-64 flex-col justify-between border-r border-slate-200/80 bg-white text-slate-700 select-none dark:border-slate-800 dark:bg-slate-900/95 overflow-y-auto"
      aria-label="Admin Sidebar navigation"
    >
      {/* Top Brand Logo Section */}
      <div>
        <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                  TalentTrack
                </span>
                <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">AI</span>
              </div>
              <span className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                Admin Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="p-3 space-y-4" aria-label="Admin primary navigation">
          {adminNavGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ key, label, icon: NavIcon }) => {
                  const isActive = isItemActive(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelectNavItem?.(key);
                        onNavClick?.();
                      }}
                      className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 cursor-pointer ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <NavIcon
                        className={`size-4 transition-colors ${
                          isActive
                            ? "text-blue-600 dark:text-blue-400 stroke-[2.2]"
                            : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 stroke-[1.8]"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{label}</span>
                      {isActive && (
                        <span className="ml-auto size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Admin Profile Section at Bottom */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 cursor-pointer"
              aria-label="Admin user menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {user?.name || "Admin"}
                  </div>
                  <div className="truncate text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                    Platform Administrator
                  </div>
                </div>
              </div>
              <ChevronDown className="size-4 text-slate-400 shrink-0 ml-1" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="w-56 text-xs mb-1">
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {user?.email || "admin@talenttrack.ai"}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                  <Shield className="size-3" />
                  Full Platform Superuser
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onSelectNavItem?.("Settings")}
              className="cursor-pointer gap-2"
            >
              <Settings className="size-3.5" />
              Platform Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSelectNavItem?.("Audit Logs")}
              className="cursor-pointer gap-2"
            >
              <Activity className="size-3.5" />
              Audit Logs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400"
            >
              <LogOut className="size-3.5" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

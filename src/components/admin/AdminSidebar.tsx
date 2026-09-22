import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserRound,
  Building2,
  Briefcase,
  FileText,
  BarChart3,
  Activity,
  Settings,
  ChevronDown,
  LogOut,
  Shield,
  User,
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
  | "Recruiters"
  | "Applicants"
  | "Companies"
  | "Jobs"
  | "Applications"
  | "Reports"
  | "System Activity"
  | "Settings";

interface AdminSidebarProps {
  activeItem?: AdminNavItemKey;
  onSelectNavItem?: (item: AdminNavItemKey) => void;
  onNavClick?: () => void;
}

export const adminNavItems: {
  key: AdminNavItemKey;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { key: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "Users", label: "Users", icon: Users },
  { key: "Recruiters", label: "Recruiters", icon: UserCheck },
  { key: "Applicants", label: "Applicants", icon: UserRound },
  { key: "Companies", label: "Companies", icon: Building2 },
  { key: "Jobs", label: "Jobs", icon: Briefcase },
  { key: "Applications", label: "Applications", icon: FileText },
  { key: "Reports", label: "Reports", icon: BarChart3 },
  { key: "System Activity", label: "System Activity", icon: Activity },
  { key: "Settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({
  activeItem = "Dashboard",
  onSelectNavItem,
  onNavClick,
}: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <aside
      className="flex h-full w-64 flex-col justify-between border-r border-slate-200/80 bg-white text-slate-700 select-none dark:border-slate-800 dark:bg-slate-900/95"
      aria-label="Admin Sidebar navigation"
    >
      {/* Top Brand Logo Section */}
      <div>
        <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            {/* Clean Text-Based Logo without AI Robot/Brain icons */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                  TalentTrack
                </span>
                <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">AI</span>
              </div>
              <span className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                Platform Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1" aria-label="Admin primary navigation">
          {adminNavItems.map(({ key, label, icon: NavIcon }) => {
            const isActive = activeItem === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectNavItem?.(key);
                  onNavClick?.();
                }}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <NavIcon
                  className={`size-4 transition-colors ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 stroke-[2.2]"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 stroke-[1.8]"
                  }`}
                />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile Section at Bottom */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
              aria-label="Admin user menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Admin Avatar */}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {user?.name || "Admin"}
                  </div>
                  <div className="truncate text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                    Administrator
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
              onClick={() => onSelectNavItem?.("System Activity")}
              className="cursor-pointer gap-2"
            >
              <Activity className="size-3.5" />
              Audit Log
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

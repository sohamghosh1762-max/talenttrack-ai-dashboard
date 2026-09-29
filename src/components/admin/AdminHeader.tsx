import { useState } from "react";
import { Search, Bell, Menu, Shield, Check, LogOut, Settings } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar, type AdminNavItemKey } from "./AdminSidebar";

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  activeNav?: AdminNavItemKey;
  onSelectNav?: (item: AdminNavItemKey) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

const mockNotifications = [
  {
    id: "n-1",
    title: "High API Volume Detected",
    desc: "AI screening service handled 420 requests in the last 15 minutes.",
    time: "5m ago",
    unread: true,
  },
  {
    id: "n-2",
    title: "New Recruiter Verification",
    desc: "Enterprise Hire Inc. submitted corporate registration documents.",
    time: "20m ago",
    unread: true,
  },
  {
    id: "n-3",
    title: "Database Backup Completed",
    desc: "Daily automated backup succeeded without anomalies.",
    time: "2h ago",
    unread: false,
  },
];

export function AdminHeader({
  title = "Dashboard",
  subtitle = "Monitor and manage the TalentTrack AI platform.",
  activeNav = "Dashboard",
  onSelectNav,
  searchQuery = "",
  onSearchChange,
}: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleLogout = async () => {
    await logout();
    void navigate({
      to: "/login",
      search: { redirect: "/admin", role: "admin", intent: "admin" } as Record<string, string>,
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
      {/* Left: Mobile Trigger & Titles */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Sheet Trigger */}
        <div className="lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open mobile navigation menu"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0 border-r border-slate-200 dark:border-slate-800"
            >
              <AdminSidebar
                activeItem={activeNav}
                onSelectNavItem={(item) => {
                  onSelectNav?.(item);
                  setMobileMenuOpen(false);
                }}
                onNavClick={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">
            {title}
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Right: Search, Notifications, Admin Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Field */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search platform..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 w-52 lg:w-64 rounded-lg border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              aria-label="Platform notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9.5px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 text-xs">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Platform Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-medium text-blue-600 hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                >
                  <Check className="size-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 transition-colors ${
                    n.unread
                      ? "bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {n.desc}
                  </p>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin Avatar & Label */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-200/80 p-1 pr-2 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
              aria-label="Admin user account"
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="hidden text-xs font-semibold text-slate-800 sm:inline dark:text-slate-200">
                {user?.name || "Admin"}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 text-xs">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {user?.email || "admin@talenttrack.ai"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onSelectNav?.("Settings")}
              className="cursor-pointer gap-2"
            >
              <Settings className="size-3.5" />
              Settings
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
    </header>
  );
}

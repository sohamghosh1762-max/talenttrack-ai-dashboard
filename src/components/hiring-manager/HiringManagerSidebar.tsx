"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Home,
  LogOut,
  Mail,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: typeof Home;
  }[];
}

const hiringManagerNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/hiring-manager", icon: Home }],
  },
  {
    title: "HIRING",
    items: [
      { label: "My Positions", href: "/hiring-manager/jobs", icon: Briefcase },
      { label: "Candidates", href: "/hiring-manager/candidates", icon: Users },
      { label: "Shortlisted", href: "/hiring-manager/shortlisted", icon: CheckCircle2 },
      { label: "Interviews", href: "/hiring-manager/interviews", icon: CalendarDays },
    ],
  },
  {
    title: "ANALYTICS",
    items: [{ label: "Hiring Analytics", href: "/hiring-manager/analytics", icon: BarChart3 }],
  },
  {
    title: "COMMUNICATION",
    items: [{ label: "Messages", href: "/hiring-manager/messages", icon: Mail }],
  },
  {
    title: "PROFILE",
    items: [{ label: "My Profile", href: "/hiring-manager/profile", icon: User }],
  },
];

interface HiringManagerSidebarProps {
  onNavClick?: () => void;
}

export function HiringManagerSidebar({ onNavClick }: HiringManagerSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <aside
      className="sidebar-gradient flex h-full w-[255px] flex-col px-4 py-5 text-sidebar-foreground select-none overflow-y-auto"
      aria-label="Hiring Manager Navigation"
    >
      {/* Brand */}
      <Link
        to="/hiring-manager"
        className="flex items-center gap-3 px-1 transition-opacity hover:opacity-90"
      >
        <div className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-soft/50 text-sidebar-primary-foreground">
          <Users className="size-6 text-brand-blue" />
          <Sparkles className="absolute -right-0.5 -top-0.5 size-3.5 text-brand-blue animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[17px] font-bold tracking-tight text-sidebar-primary-foreground">
            TalentTrack AI
          </div>
          <div className="truncate text-[9.5px] font-medium text-sidebar-foreground/70">
            Hiring Manager Portal
          </div>
        </div>
      </Link>

      {/* Grouped Navigation Links */}
      <nav className="mt-6 space-y-5" aria-label="Hiring Manager Main navigation">
        {hiringManagerNavGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider text-sidebar-foreground/60 uppercase">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: NavIcon }) => {
                const isActive =
                  currentPath === href ||
                  (href === "/hiring-manager" &&
                    (currentPath === "/hiring-manager" || currentPath === "/hiring-manager/"));

                return (
                  <Link
                    key={label}
                    to={href}
                    onClick={onNavClick}
                    className={`grid h-10 w-full grid-cols-[20px_minmax(0,1fr)] items-center gap-2.5 rounded-lg px-3 text-left text-xs font-medium transition-all ${
                      isActive
                        ? "bg-brand-blue text-primary-foreground shadow-xs font-semibold"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-soft/80 hover:text-sidebar-primary-foreground"
                    }`}
                  >
                    <NavIcon
                      className={`size-4 ${isActive ? "text-white" : "text-sidebar-foreground/75"}`}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Card & Logout at bottom */}
      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-sidebar-border/30 bg-sidebar-soft/65 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-primary-foreground shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "M"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-sidebar-primary-foreground">
                {user?.name || "Hiring Manager"}
              </span>
              <span className="block truncate text-[10px] text-sidebar-foreground/70">
                {user?.recruiterProfile?.companyName || user?.recruiterProfile?.department || "Decision Maker"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-sidebar-border/40 bg-sidebar-deep/60 py-1.5 text-[11px] font-semibold text-sidebar-foreground/90 transition-colors hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

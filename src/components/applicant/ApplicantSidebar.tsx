"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
  Bookmark,
  BriefcaseBusiness,
  FileCheck,
  Home,
  LogOut,
  Mail,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

const applicantNavItems = [
  { label: "Dashboard", href: "/applicant", icon: Home },
  { label: "Browse Jobs", href: "/applicant/jobs", icon: BriefcaseBusiness },
  { label: "My Applications", href: "/applicant/applications", icon: FileCheck },
  { label: "Saved Jobs", href: "/applicant/saved-jobs", icon: Bookmark },
  { label: "Profile", href: "/applicant/profile", icon: User },
  { label: "Messages", href: "/applicant/messages", icon: Mail },
  { label: "Settings", href: "/applicant/settings", icon: Settings },
];

interface ApplicantSidebarProps {
  onNavClick?: () => void;
}

export function ApplicantSidebar({ onNavClick }: ApplicantSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <aside
      className="sidebar-gradient flex h-full w-[255px] flex-col px-4 py-5 text-sidebar-foreground select-none"
      aria-label="Applicant Navigation"
    >
      {/* Brand */}
      <Link
        to="/applicant"
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
            Candidate Portal
          </div>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="mt-8 space-y-1.5" aria-label="Applicant Main navigation">
        {applicantNavItems.map(({ label, href, icon: NavIcon }) => {
          const isActive = currentPath === href;

          return (
            <Link
              key={label}
              to={href}
              onClick={onNavClick}
              className={`grid h-11 w-full grid-cols-[22px_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-brand-blue text-primary-foreground shadow-sm font-semibold"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-soft/80 hover:text-sidebar-primary-foreground"
              }`}
            >
              <NavIcon
                className={`size-[18px] ${isActive ? "text-white" : "text-sidebar-foreground/75"}`}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Card & Logout at bottom */}
      <div className="mt-auto rounded-xl border border-sidebar-border/30 bg-sidebar-soft/65 p-3.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-full bg-brand-green text-xs font-bold text-primary-foreground shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-sidebar-primary-foreground">
              {user?.name || "Applicant"}
            </span>
            <span className="block truncate text-[10px] text-sidebar-foreground/70">Candidate</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-sidebar-border/40 bg-sidebar-deep/60 py-1.5 text-[11px] font-semibold text-sidebar-foreground/90 transition-colors hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30"
        >
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

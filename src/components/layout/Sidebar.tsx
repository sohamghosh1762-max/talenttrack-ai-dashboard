"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  Crown,
  Home,
  Mail,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: typeof Home;
    badge?: string;
  }[];
}

export const recruiterNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: Home }],
  },
  {
    title: "RECRUITMENT",
    items: [
      { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
      { label: "Candidates", href: "/candidates", icon: CircleUserRound },
      { label: "Applications", href: "/applications", icon: Users },
      { label: "Pipeline", href: "/pipeline", icon: SlidersHorizontal },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { label: "AI Screening", href: "/ai-screening", icon: Sparkles },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Interviews", href: "/interviews", icon: CalendarDays },
      { label: "Messages", href: "/messages", icon: Mail, badge: "2" },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

interface SidebarProps {
  onNavClick?: () => void;
  onUpgradeClick?: () => void;
}

export function SidebarBrand() {
  return (
    <Link
      to="/dashboard"
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
          Smarter Hiring. Brighter Teams.
        </div>
      </div>
    </Link>
  );
}

export function Sidebar({ onNavClick, onUpgradeClick }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside
      className="sidebar-gradient flex h-full w-[255px] flex-col px-4 py-5 text-sidebar-foreground select-none overflow-y-auto"
      aria-label="Sidebar navigation"
    >
      <SidebarBrand />

      <nav className="mt-6 space-y-4" aria-label="Recruiter main navigation">
        {recruiterNavGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider text-sidebar-foreground/60 uppercase">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: NavIcon, badge }) => {
                const isActive =
                  currentPath === href ||
                  (href !== "/dashboard" && currentPath.startsWith(href)) ||
                  (href === "/dashboard" && (currentPath === "/" || currentPath === "/dashboard"));

                return (
                  <Link
                    key={label}
                    to={href}
                    onClick={onNavClick}
                    className={`grid h-10 w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-3 text-left text-xs font-medium transition-all ${
                      isActive
                        ? "bg-brand-blue text-primary-foreground shadow-xs font-semibold"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-soft/80 hover:text-sidebar-primary-foreground"
                    }`}
                  >
                    <NavIcon
                      className={`size-4 ${isActive ? "text-white" : "text-sidebar-foreground/75"}`}
                    />
                    <span className="truncate">{label}</span>
                    {badge && (
                      <span className="grid size-4 place-items-center rounded-full bg-brand-red text-[9px] font-bold text-primary-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-sidebar-border/30 bg-sidebar-soft/65 p-3.5 text-center shadow-sm backdrop-blur-sm">
          <div className="mb-1.5 flex items-center gap-2 text-left">
            <Crown className="size-4 text-brand-orange shrink-0" />
            <span className="text-xs font-semibold text-sidebar-primary-foreground">
              Upgrade to Pro
            </span>
          </div>
          <p className="px-1 text-left text-[10px] leading-3.5 text-sidebar-foreground/75">
            Advanced semantic AI candidate ranking and automated scoring.
          </p>
          <Button
            size="sm"
            className="mt-2.5 h-7.5 w-full bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-[11px] font-semibold transition-transform active:scale-[0.98]"
            onClick={onUpgradeClick}
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </aside>
  );
}

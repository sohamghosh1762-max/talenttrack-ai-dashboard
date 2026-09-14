"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { Crown, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navItems } from "@/data/mockData";

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
      className="sidebar-gradient flex h-full w-[255px] flex-col px-4 py-5 text-sidebar-foreground select-none"
      aria-label="Sidebar navigation"
    >
      <SidebarBrand />

      <nav className="mt-8 space-y-1.5" aria-label="Main navigation">
        {navItems.map(({ label, href, icon: NavIcon, badge }) => {
          const isActive =
            currentPath === href ||
            (href === "/dashboard" && (currentPath === "/" || currentPath === "/dashboard"));

          return (
            <Link
              key={label}
              to={href}
              onClick={onNavClick}
              className={`grid h-11 w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-brand-blue text-primary-foreground shadow-sm font-semibold"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-soft/80 hover:text-sidebar-primary-foreground"
              }`}
            >
              <NavIcon
                className={`size-[18px] ${isActive ? "text-white" : "text-sidebar-foreground/75"}`}
              />
              <span className="truncate">{label}</span>
              {badge && (
                <span className="grid size-[19px] place-items-center rounded-full bg-brand-red text-[10px] font-bold text-primary-foreground">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-sidebar-border/30 bg-sidebar-soft/65 p-4 text-center shadow-sm backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 text-left">
          <Crown className="size-4.5 text-brand-orange shrink-0" />
          <span className="text-xs font-semibold text-sidebar-primary-foreground">
            Upgrade to Pro
          </span>
        </div>
        <p className="px-1 text-left text-[10.5px] leading-4 text-sidebar-foreground/75">
          Get advanced AI insights and team collaboration features.
        </p>
        <Button
          size="sm"
          className="mt-3 h-8 w-full bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-[11px] font-semibold transition-transform active:scale-[0.98]"
          onClick={onUpgradeClick}
        >
          Upgrade Now
        </Button>
      </div>
    </aside>
  );
}

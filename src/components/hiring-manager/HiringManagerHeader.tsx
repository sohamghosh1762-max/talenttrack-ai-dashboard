"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HiringManagerSidebar } from "./HiringManagerSidebar";
import { useAuth } from "@/auth/AuthProvider";
import { useHiringManagerDashboard } from "@/hooks/api/useHiringManager";

interface HiringManagerHeaderProps {
  searchQuery?: string | undefined;
  onSearchChange?: ((val: string) => void) | undefined;
}

export function HiringManagerHeader({ searchQuery = "", onSearchChange }: HiringManagerHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: dashboardData } = useHiringManagerDashboard();

  const notifications = (dashboardData?.recentCandidates || []).slice(0, 5).map((cand) => ({
    id: `notif-${cand.id}`,
    title: `Candidate for ${cand.jobTitle}`,
    description: `${cand.candidateName} (${cand.stage}) is waiting for review.`,
    timeAgo: new Date(cand.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    unread: !readIds.includes(`notif-${cand.id}`),
  }));

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setReadIds(notifications.map((n) => n.id));
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "M";

  return (
    <header
      className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-md md:px-7"
      role="banner"
    >
      <div className="flex flex-1 items-center gap-3 max-w-[640px]">
        {/* Mobile Toggle */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden text-foreground hover:bg-muted"
              aria-label="Open hiring manager menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[255px] border-0 p-0 [&>button]:text-sidebar-primary-foreground"
          >
            <HiringManagerSidebar onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search candidates, skills, or positions..."
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-10 rounded-full hover:bg-muted"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <Bell className="size-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 grid size-2 place-items-center rounded-full bg-brand-blue" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0 text-xs font-bold">
                Hiring Notifications
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-medium text-brand-blue hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="space-y-1">
              {notifications.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No new candidate notifications.
                </div>
              )}
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex flex-col items-start gap-1 p-2.5 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{notif.title}</span>
                    {notif.unread && (
                      <span className="size-2 rounded-full bg-brand-blue shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                    {notif.description}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground/80 mt-0.5">
                    <Clock className="size-3" />
                    {notif.timeAgo}
                  </span>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar */}
        <div className="grid size-9.5 place-items-center rounded-full bg-blue-600 text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-background">
          {initial}
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="hidden h-auto items-center gap-2.5 px-1 py-1 text-left sm:flex hover:bg-muted/60 cursor-pointer"
            >
              <div>
                <span className="block text-xs font-bold text-foreground">
                  {user?.name || "Hiring Manager"}
                </span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  {user?.recruiterProfile?.companyName || user?.recruiterProfile?.department || "Decision Maker"}
                </span>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-xl">
            <div className="px-3 py-2">
              <div className="text-xs font-bold">{user?.name || "Hiring Manager"}</div>
              <div className="text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/hiring-manager/profile" })}
              className="cursor-pointer gap-2"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

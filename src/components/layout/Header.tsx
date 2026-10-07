"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  User,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/auth/AuthProvider";
import {
  notificationsData,
  recruiterProfile,
  recentApplicantsData,
  jobOpeningsData,
} from "@/data/mockData";

interface HeaderProps {
  searchQuery?: string | undefined;
  onSearchChange?: ((val: string) => void) | undefined;
  onUpgradeClick?: (() => void) | undefined;
}

export function Header({ searchQuery = "", onSearchChange, onUpgradeClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [notifications, setNotifications] = useState(notificationsData);
  const [activeModal, setActiveModal] = useState<{ title: string; text: string } | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();

  const displayName = user?.name || recruiterProfile.name;
  const userNormRole = user?.role ? user.role.toUpperCase() : "";
  const displayRole =
    user?.recruiterProfile?.jobTitle ||
    (userNormRole === "RECRUITER"
      ? "Recruiter"
      : userNormRole === "ADMIN"
        ? "Admin"
        : recruiterProfile.role);

  const displayEmail = user?.email || recruiterProfile.email;
  const displayDept =
    user?.recruiterProfile?.department ||
    user?.recruiterProfile?.companyName ||
    recruiterProfile.department;
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    onSearchChange?.(val);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const matchingJobs = internalQuery.trim()
    ? jobOpeningsData.filter(
        (j) =>
          j.title.toLowerCase().includes(internalQuery.toLowerCase()) ||
          j.department.toLowerCase().includes(internalQuery.toLowerCase()),
      )
    : [];

  const matchingCandidates = internalQuery.trim()
    ? recentApplicantsData.filter(
        (c) =>
          c.name.toLowerCase().includes(internalQuery.toLowerCase()) ||
          c.job.toLowerCase().includes(internalQuery.toLowerCase()) ||
          c.skills?.some((s) => s.toLowerCase().includes(internalQuery.toLowerCase())),
      )
    : [];

  return (
    <>
      <header
        className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-md md:px-7"
        role="banner"
      >
        {/* Left: Mobile Toggle & Global Search */}
        <div className="flex flex-1 items-center gap-3 max-w-[720px]">
          {/* Mobile Drawer Trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="lg:hidden text-foreground hover:bg-muted"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[255px] border-0 p-0 [&>button]:text-sidebar-primary-foreground"
            >
              <Sidebar
                onNavClick={() => setMobileOpen(false)}
                onUpgradeClick={() => {
                  setMobileOpen(false);
                  onUpgradeClick?.();
                }}
              />
            </SheetContent>
          </Sheet>

          {/* Search input with live autocomplete dropdown */}
          <div className="relative w-full">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={internalQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Search candidates, jobs, skills..."
                aria-label="Search candidates, jobs, skills"
                className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-9 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              {internalQuery && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Results Dropdown */}
            {searchFocused && internalQuery.trim().length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 w-full rounded-xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in-50 duration-150">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Search Results for "{internalQuery}"
                </div>

                {matchingJobs.length === 0 && matchingCandidates.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No matching candidates or jobs found.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {matchingJobs.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-brand-blue uppercase mb-1">
                          Jobs ({matchingJobs.length})
                        </div>
                        {matchingJobs.map((j) => (
                          <Link
                            key={j.id}
                            to="/jobs"
                            className="flex items-center justify-between rounded-md p-2 text-xs hover:bg-muted transition-colors"
                          >
                            <span className="font-semibold">{j.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {j.department} • {j.applications} apps
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {matchingCandidates.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-brand-green uppercase mb-1">
                          Candidates ({matchingCandidates.length})
                        </div>
                        {matchingCandidates.map((c) => (
                          <Link
                            key={c.id}
                            to="/candidates"
                            className="flex items-center justify-between rounded-md p-2 text-xs hover:bg-muted transition-colors"
                          >
                            <div>
                              <span className="font-semibold">{c.name}</span>
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                {c.job}
                              </span>
                            </div>
                            <span className="rounded bg-surface-green px-1.5 py-0.5 text-[9px] font-bold text-brand-green">
                              {c.score}% Match
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Notifications & Recruiter Avatar */}
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
                  <span className="absolute right-2 top-1.5 grid size-4 place-items-center rounded-full bg-brand-red text-[8px] font-bold text-primary-foreground animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0 text-xs font-bold">
                  Notifications
                </DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-medium text-brand-blue hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="space-y-1">
                {notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onSelect={() => setActiveModal({ title: notif.title, text: notif.description })}
                    className="flex flex-col items-start gap-1 p-2.5 cursor-pointer rounded-lg hover:bg-muted/70"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{notif.title}</span>
                      {notif.unread && <span className="size-2 rounded-full bg-brand-blue" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-2">
                      {notif.description}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground/80 mt-0.5">
                      <Clock className="size-3" />
                      {notif.timeAgo}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Recruiter Avatar Badge */}
          <div
            className="grid size-9.5 place-items-center rounded-full bg-brand-blue text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-background"
            aria-hidden="true"
          >
            {initial}
          </div>

          {/* Recruiter Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden h-auto items-center gap-2.5 px-1 py-1 text-left sm:flex hover:bg-muted/60"
                aria-label="User profile menu"
              >
                <div>
                  <span className="block text-xs font-bold text-foreground">{displayName}</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl">
              <div className="px-3 py-2">
                <div className="text-xs font-bold">{displayName}</div>
                <div className="text-[10px] text-muted-foreground">{displayEmail}</div>
                <div className="mt-1 text-[9px] font-medium text-brand-blue">{displayDept}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate({ to: "/settings" })}
                className="cursor-pointer gap-2"
              >
                <User className="size-4 text-muted-foreground" />
                <span>Profile Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => navigate({ to: "/settings" })}
                className="cursor-pointer gap-2"
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onUpgradeClick?.()}
                className="cursor-pointer gap-2 text-brand-orange font-medium"
              >
                <Sparkles className="size-4 text-brand-orange" />
                <span>TalentTrack Pro</span>
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

      {/* Info/Notification Action Dialog */}
      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-brand-blue" />
              {activeModal?.title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/90">
              {activeModal?.text}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-3">
            <Button
              className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
              onClick={() => setActiveModal(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

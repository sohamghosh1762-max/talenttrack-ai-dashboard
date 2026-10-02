"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  User as UserIcon,
  XCircle,
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
import { ApplicantSidebar } from "./ApplicantSidebar";
import { useAuth } from "@/auth/AuthProvider";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/useNotifications";
import { formatApplicationDate } from "@/lib/applicant-utils";
import type { INotification, NotificationType } from "@/server/types/notification-types";

interface ApplicantHeaderProps {
  searchQuery?: string | undefined;
  onSearchChange?: ((val: string) => void) | undefined;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "APPLICATION_SHORTLISTED":
      return <Sparkles className="size-4 text-brand-purple shrink-0" />;
    case "APPLICATION_SUBMITTED":
      return <Briefcase className="size-4 text-brand-blue shrink-0" />;
    case "APPLICATION_STATUS_CHANGED":
      return <CheckCircle2 className="size-4 text-brand-teal shrink-0" />;
    case "APPLICATION_REJECTED":
      return <XCircle className="size-4 text-destructive shrink-0" />;
    case "INTERVIEW_SCHEDULED":
    case "INTERVIEW_RESCHEDULED":
      return <Calendar className="size-4 text-brand-amber shrink-0" />;
    case "INTERVIEW_CANCELLED":
      return <Clock className="size-4 text-muted-foreground shrink-0" />;
    case "NEW_MESSAGE":
      return <MessageSquare className="size-4 text-brand-blue shrink-0" />;
    case "ATS_ANALYSIS_READY":
    case "RESUME_PARSED":
      return <Sparkles className="size-4 text-brand-teal shrink-0" />;
    default:
      return <Bell className="size-4 text-brand-blue shrink-0" />;
  }
}

export function ApplicantHeader({ searchQuery = "", onSearchChange }: ApplicantHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    data: notificationData,
    isLoading: isNotificationsLoading,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useNotifications({ limit: 15 });

  const { data: unreadData } = useUnreadNotificationsCount();

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = notificationData?.notifications || [];
  const unreadCount = unreadData?.count ?? notificationData?.unreadCount ?? 0;

  const handleNotificationClick = (notif: INotification) => {
    // 1. Mark notification as read if not already read
    if (!notif.readAt) {
      markReadMutation.mutate(notif.id);
    }

    // 2. Navigate to appropriate route
    if (
      notif.interviewId ||
      notif.type === "INTERVIEW_SCHEDULED" ||
      notif.type === "INTERVIEW_RESCHEDULED" ||
      notif.type === "INTERVIEW_CANCELLED"
    ) {
      navigate({ to: "/applicant/interviews" });
    } else if (notif.conversationId || notif.type === "NEW_MESSAGE") {
      navigate({ to: "/applicant/messages" });
    } else if (
      notif.applicationId ||
      notif.type === "APPLICATION_SUBMITTED" ||
      notif.type === "APPLICATION_STATUS_CHANGED" ||
      notif.type === "APPLICATION_SHORTLISTED" ||
      notif.type === "APPLICATION_REJECTED"
    ) {
      navigate({ to: "/applicant/applications" });
    } else if (notif.type === "ATS_ANALYSIS_READY" || notif.type === "RESUME_PARSED") {
      navigate({ to: "/applicant/profile" });
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0 && !markAllReadMutation.isPending) {
      markAllReadMutation.mutate();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "A";

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
              aria-label="Open candidate menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[255px] border-0 p-0 [&>button]:text-sidebar-primary-foreground"
          >
            <ApplicantSidebar onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search open roles, skills, or companies..."
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Persistent MongoDB Notifications Dropdown */}
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
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-brand-blue text-[9px] font-bold text-primary-foreground animate-in zoom-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-84 max-w-[92vw] p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <DropdownMenuLabel className="p-0 text-xs font-bold">
                  Notifications
                </DropdownMenuLabel>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1 text-[10px] font-medium text-brand-blue hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Check className="size-3" />
                  Mark all as read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />

            {/* Notification List Content */}
            <div className="max-h-[380px] overflow-y-auto space-y-1 pr-0.5">
              {/* Loading State */}
              {isNotificationsLoading && (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2.5 p-2 rounded-lg bg-muted/40 animate-pulse">
                      <div className="size-7 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 rounded bg-muted" />
                        <div className="h-2.5 w-full rounded bg-muted" />
                        <div className="h-2 w-1/4 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {!isNotificationsLoading && isNotificationsError && (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-destructive font-medium">Unable to load notifications.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchNotifications()}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!isNotificationsLoading && !isNotificationsError && notifications.length === 0 && (
                <div className="p-6 text-center space-y-1.5">
                  <div className="mx-auto grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground">
                    <Bell className="size-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Updates about your applications, interviews, and messages will appear here.
                  </p>
                </div>
              )}

              {/* Real Notifications */}
              {!isNotificationsLoading &&
                !isNotificationsError &&
                notifications.map((notif) => {
                  const isUnread = !notif.readAt;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group relative flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isUnread
                          ? "bg-brand-blue/5 hover:bg-brand-blue/10 border-l-2 border-brand-blue"
                          : "hover:bg-muted/70 opacity-85 hover:opacity-100"
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="mt-0.5 grid size-7 place-items-center rounded-full bg-card shadow-xs shrink-0 ring-1 ring-border/50">
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs truncate ${
                              isUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
                            }`}
                          >
                            {notif.title}
                          </span>
                          {isUnread && (
                            <span className="size-2 rounded-full bg-brand-blue shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 pt-0.5">
                          <Clock className="size-2.5" />
                          <span>{formatApplicationDate(notif.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar */}
        <div className="grid size-9.5 place-items-center rounded-full bg-brand-green text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-background">
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
                  {user?.name || "Applicant"}
                </span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  Candidate
                </span>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-xl">
            <div className="px-3 py-2">
              <div className="text-xs font-bold">{user?.name || "Applicant"}</div>
              <div className="text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/applicant/profile" })}
              className="cursor-pointer gap-2"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              <span>My Profile & Resume</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/applicant/interviews" })}
              className="cursor-pointer gap-2"
            >
              <Sparkles className="size-4 text-muted-foreground" />
              <span>Interviews</span>
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

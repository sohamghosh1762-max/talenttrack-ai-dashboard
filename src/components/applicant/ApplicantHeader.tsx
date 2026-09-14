"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ApplicantSidebar } from "./ApplicantSidebar";
import { useAuth } from "@/auth/AuthProvider";

interface ApplicantHeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function ApplicantHeader({ searchQuery = "", onSearchChange }: ApplicantHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="size-5 text-muted-foreground" />
          <span className="absolute right-2 top-2 grid size-2 place-items-center rounded-full bg-brand-blue" />
        </Button>

        {/* Avatar */}
        <div className="grid size-9.5 place-items-center rounded-full bg-brand-green text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-background">
          {initial}
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="hidden h-auto items-center gap-2.5 px-1 py-1 text-left sm:flex hover:bg-muted/60"
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
              <div className="text-xs font-bold">{user?.name}</div>
              <div className="text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/applicant/profile" })}
              className="cursor-pointer gap-2"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/applicant/settings" })}
              className="cursor-pointer gap-2"
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>Account Settings</span>
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

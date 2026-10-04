import { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  RotateCcw,
  RefreshCw,
  Filter,
  MapPin,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserStatus } from "@/server/types/user-types";

export interface ApplicantFilterState {
  search: string;
  status: UserStatus | "";
  emailVerified: boolean | "";
  skills: string;
  location: string;
  limit: number;
  sortBy: "createdAt" | "name" | "email" | "status" | "headline" | "lastActive";
  sortOrder: "asc" | "desc";
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

interface ApplicantsFilterBarProps {
  filters: ApplicantFilterState;
  onChange: (next: ApplicantFilterState) => void;
  onRefresh?: () => void;
  totalResults?: number | undefined;
  isLoading?: boolean;
}

export function ApplicantsFilterBar({
  filters,
  onChange,
  onRefresh,
  totalResults,
  isLoading,
}: ApplicantsFilterBarProps) {
  // Local state for debounced search, skills, and location inputs
  const [searchInput, setSearchInput] = useState(filters.search);
  const [skillsInput, setSkillsInput] = useState(filters.skills);
  const [locationInput, setLocationInput] = useState(filters.location);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external filter changes to local state
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    setSkillsInput(filters.skills);
  }, [filters.skills]);

  useEffect(() => {
    setLocationInput(filters.location);
  }, [filters.location]);

  // Debounced search trigger (350ms)
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChange({ ...filters, search: val });
    }, 350);
  };

  const handleSkillsChange = (val: string) => {
    setSkillsInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChange({ ...filters, skills: val });
    }, 350);
  };

  const handleLocationChange = (val: string) => {
    setLocationInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChange({ ...filters, location: val });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    onChange({ ...filters, search: "" });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSkillsInput("");
    setLocationInput("");
    onChange({
      search: "",
      status: "",
      emailVerified: "",
      skills: "",
      location: "",
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
      dateFrom: "",
      dateTo: "",
    });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.status) ||
    filters.emailVerified !== "" ||
    Boolean(filters.skills) ||
    Boolean(filters.location) ||
    filters.sortBy !== "createdAt" ||
    filters.sortOrder !== "desc" ||
    filters.limit !== 20;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90">
      {/* Top row: Search input + Refresh & Reset buttons */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input with live debounce */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search applicants by name, email, headline, skills, or summary..."
            className="pl-9 pr-8 text-xs h-9 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            aria-label="Search applicants"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Right side controls: Refresh & Reset */}
        <div className="flex items-center gap-2 justify-end">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs h-8 text-slate-600 dark:text-slate-400 hover:text-rose-600 gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Reset Filters
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs h-8 gap-1.5 border-slate-200 dark:border-slate-700"
              title="Refresh applicants list"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Status, Email Verification, Skill, Location, Sort By, Sort Order, Limit */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Status filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Account Status
          </label>
          <Select
            value={filters.status || "ALL"}
            onValueChange={(val) =>
              onChange({
                ...filters,
                status: val === "ALL" ? "" : (val as UserStatus),
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
              <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email verification filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Email Verified
          </label>
          <Select
            value={
              filters.emailVerified === true
                ? "true"
                : filters.emailVerified === false
                  ? "false"
                  : "ALL"
            }
            onValueChange={(val) =>
              onChange({
                ...filters,
                emailVerified: val === "true" ? true : val === "false" ? false : "",
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="All Verification" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="true">Verified Only</SelectItem>
              <SelectItem value="false">Unverified Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skill keyword filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Code2 className="size-3 text-slate-400" />
            Skill Filter
          </label>
          <div className="relative">
            <Input
              value={skillsInput}
              onChange={(e) => handleSkillsChange(e.target.value)}
              placeholder="e.g. React, Python"
              className="h-8 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 pr-6"
            />
            {skillsInput && (
              <button
                type="button"
                onClick={() => {
                  setSkillsInput("");
                  onChange({ ...filters, skills: "" });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Location keyword filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <MapPin className="size-3 text-slate-400" />
            Location
          </label>
          <div className="relative">
            <Input
              value={locationInput}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="e.g. San Francisco, Remote"
              className="h-8 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 pr-6"
            />
            {locationInput && (
              <button
                type="button"
                onClick={() => {
                  setLocationInput("");
                  onChange({ ...filters, location: "" });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Sort By filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Sort By
          </label>
          <Select
            value={filters.sortBy}
            onValueChange={(val) =>
              onChange({
                ...filters,
                sortBy: val as ApplicantFilterState["sortBy"],
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="createdAt">Joined Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="headline">Headline</SelectItem>
              <SelectItem value="lastActive">Last Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order & Page Size */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Order / Limit
          </label>
          <div className="flex items-center gap-1.5">
            <Select
              value={filters.sortOrder}
              onValueChange={(val) =>
                onChange({
                  ...filters,
                  sortOrder: val as "asc" | "desc",
                })
              }
            >
              <SelectTrigger className="h-8 text-xs flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(filters.limit)}
              onValueChange={(val) =>
                onChange({
                  ...filters,
                  limit: Number(val),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs w-18 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="10">10 / p</SelectItem>
                <SelectItem value="20">20 / p</SelectItem>
                <SelectItem value="50">50 / p</SelectItem>
                <SelectItem value="100">100 / p</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results counter indicator */}
      {totalResults !== undefined && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Found <strong>{totalResults}</strong> candidate applicant{totalResults === 1 ? "" : "s"}
            {hasActiveFilters ? " matching current filters" : " registered in system"}
          </span>
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium animate-pulse">
              <Filter className="size-3" />
              Applying server filters...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

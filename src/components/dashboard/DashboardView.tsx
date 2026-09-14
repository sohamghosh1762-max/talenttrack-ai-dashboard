"use client";

import { useState } from "react";
import { Hand, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPIStats } from "@/components/dashboard/KPIStats";
import { ApplicationOverview } from "@/components/dashboard/ApplicationOverview";
import { TopSkills } from "@/components/dashboard/TopSkills";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { JobOpenings } from "@/components/dashboard/JobOpenings";
import { RecentApplications } from "@/components/dashboard/RecentApplications";
import { HiringPipeline } from "@/components/dashboard/HiringPipeline";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PostJobModal } from "@/components/dashboard/PostJobModal";
import { recruiterProfile } from "@/data/mockData";

interface DashboardViewProps {
  searchQuery?: string;
}

export function DashboardView({ searchQuery = "" }: DashboardViewProps) {
  const [postJobOpen, setPostJobOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* 1. Welcome Section */}
      <section
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Recruiter Welcome and Date"
      >
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold leading-tight text-foreground sm:text-[26px]">
            <span className="truncate">Welcome back, {recruiterProfile.name.split(" ")[0]}!</span>
            <Hand className="size-6 shrink-0 rotate-[-18deg] text-brand-orange animate-bounce" />
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Here's what's happening with your hiring process today.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-medium text-muted-foreground md:inline-block">
            Monday, 15 Sep 2025
          </span>
          <Button
            className="h-10 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm transition-transform active:scale-[0.98]"
            onClick={() => setPostJobOpen(true)}
          >
            <Plus className="size-4 font-bold" />
            <span>Post a New Job</span>
          </Button>
        </div>
      </section>

      {/* 2. KPI Cards Row */}
      <KPIStats />

      {/* 3. Analytics Row */}
      <div className="grid gap-3.5 xl:grid-cols-[1.56fr_1.12fr_.98fr]">
        <ApplicationOverview />
        <TopSkills />
        <AIInsights />
      </div>

      {/* 4. Job & Application Tables */}
      <div className="grid gap-3.5 xl:grid-cols-[1.08fr_.92fr]">
        <JobOpenings />
        <RecentApplications searchQuery={searchQuery} />
      </div>

      {/* 5. Hiring Pipeline & Quick Actions */}
      <div className="grid gap-3.5 xl:grid-cols-[1.36fr_1fr]">
        <HiringPipeline />
        <QuickActions onPostJobClick={() => setPostJobOpen(true)} />
      </div>

      {/* Post a New Job Modal Dialog */}
      <PostJobModal open={postJobOpen} onOpenChange={setPostJobOpen} />
    </div>
  );
}

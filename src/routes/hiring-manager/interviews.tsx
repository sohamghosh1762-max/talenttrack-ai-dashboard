"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  User,
  Users,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHiringManagerInterviews } from "@/hooks/api/useHiringManager";

export const Route = createFileRoute("/hiring-manager/interviews")({
  head: () => ({
    meta: [
      { title: "Interviews — Hiring Manager" },
      { name: "description", content: "Review scheduled candidate interviews and feedback for your assigned roles." },
    ],
  }),
  component: HiringManagerInterviewsPage,
});

function HiringManagerInterviewsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, error, refetch, isFetching } = useHiringManagerInterviews();

  const interviews = data?.interviews || [];

  const filteredInterviews = interviews.filter((iv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      iv.candidateName.toLowerCase().includes(q) ||
      iv.jobTitle.toLowerCase().includes(q) ||
      iv.interviewerName.toLowerCase().includes(q) ||
      iv.department.toLowerCase().includes(q)
    );
  });

  return (
    <HiringManagerLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <CalendarDays className="size-6 text-brand-blue" />
              <span>Interviews & Evaluation Schedule</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Candidate interviews scheduled across your assigned open positions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load interviews schedule. Please try again.</span>
          </div>
        )}

        {/* Interviews List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <Calendar className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No interviews currently scheduled</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When candidates for your assigned roles are invited to technical rounds or hiring manager syncs, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInterviews.map((iv) => (
              <div
                key={iv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-card hover:border-brand-blue/30 transition-all shadow-xs"
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-11 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">
                    <Calendar className="size-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">{iv.candidateName}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                        {iv.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {iv.interviewType} for <strong className="text-foreground">{iv.jobTitle}</strong> ({iv.department})
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        Interviewer: {iv.interviewerName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {new Date(iv.interviewDate).toLocaleString()}
                      </span>
                    </div>

                    {iv.feedback && (
                      <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg mt-2 border border-border/60">
                        <strong className="text-muted-foreground block text-[10px] uppercase font-bold">
                          Interviewer Feedback:
                        </strong>
                        {iv.feedback}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </HiringManagerLayout>
  );
}

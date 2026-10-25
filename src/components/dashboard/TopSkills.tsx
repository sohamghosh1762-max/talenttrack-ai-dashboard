"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecruiterAnalytics } from "@/hooks/api/useAnalytics";

export function TopSkills() {
  const { data: analytics, isLoading } = useRecruiterAnalytics();
  const [selectedSkill, setSelectedSkill] = useState<{
    name: string;
    count: number;
    maxCount: number;
  } | null>(null);

  const skills = analytics?.topSkills || [];
  const maxCount = Math.max(...skills.map((s) => s.count), 1);

  const colorClasses = [
    "bg-brand-blue",
    "bg-brand-green",
    "bg-brand-purple",
    "bg-brand-orange",
    "bg-brand-red",
    "bg-brand-blue",
  ];

  return (
    <>
      <section className="dashboard-card flex flex-col h-[286px] min-w-0 overflow-hidden p-3.5">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[13.5px] font-bold text-foreground">Top Skills in Applications</h2>
          <Link
            to="/ai-screening"
            className="text-[11px] font-semibold text-brand-blue hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading skills analysis...
            </div>
          ) : skills.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No applicant skills aggregated yet.
            </div>
          ) : (
            skills.map((skill, index) => {
              const skillMax = skill.maxCount || maxCount;
              const percentage = Math.min(100, Math.round((skill.count / skillMax) * 100));
              const colorClass = skill.colorClass || colorClasses[index % colorClasses.length];

              return (
                <button
                  key={skill.name}
                  type="button"
                  onClick={() => setSelectedSkill(skill)}
                  className="grid w-full grid-cols-[100px_minmax(60px,1fr)_32px] items-center gap-2 text-left text-xs transition-colors hover:bg-muted/40 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                >
                  <span className="font-medium text-foreground truncate">{skill.name}</span>
                  <span className="h-3.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </span>
                  <span className="text-right text-[11px] font-semibold text-muted-foreground">
                    {skill.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Skill Detail Dialog */}
      <Dialog
        open={selectedSkill !== null}
        onOpenChange={(open) => !open && setSelectedSkill(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Code2 className="size-5 text-brand-blue" />
              <DialogTitle className="text-base font-bold">
                {selectedSkill?.name} Skill Breakdown
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              <strong>{selectedSkill?.count}</strong> candidates have{" "}
              <strong>{selectedSkill?.name}</strong> highlighted as a core competency across active
              job applications.
            </p>
            <div className="rounded-lg bg-surface-blue p-3 border border-brand-blue/20">
              <span className="block font-semibold text-brand-blue text-[11px] mb-1">
                AI Keyword Analysis
              </span>
              <span className="text-muted-foreground text-[10.5px]">
                Identified automatically by ATS resume parsing across candidate resumes in MongoDB.
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-brand-blue text-primary-foreground"
              onClick={() => setSelectedSkill(null)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

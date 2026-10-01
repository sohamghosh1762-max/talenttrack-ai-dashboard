"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecruiterDashboard } from "@/hooks/api/useRecruiterDashboard";

export function TopSkills() {
  const { data: dashboardData } = useRecruiterDashboard();
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; count: number } | null>(null);

  const topSkills = dashboardData?.topSkills || [
    { name: "React", count: 85, maxCount: 100, colorClass: "bg-brand-blue" },
    { name: "TypeScript", count: 72, maxCount: 100, colorClass: "bg-brand-purple" },
    { name: "Node.js", count: 64, maxCount: 100, colorClass: "bg-brand-green" },
    { name: "Python", count: 50, maxCount: 100, colorClass: "bg-brand-orange" },
    { name: "MongoDB", count: 42, maxCount: 100, colorClass: "bg-brand-red" },
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
          {topSkills.map((skill) => {
            const percentage = Math.min(100, Math.round((skill.count / (skill.maxCount || 100)) * 100));

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
                    className={`block h-full rounded-full transition-all duration-500 ${skill.colorClass || "bg-brand-blue"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </span>
                <span className="text-right text-[11px] font-semibold text-muted-foreground">
                  {skill.count}
                </span>
              </button>
            );
          })}
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
              <strong>{selectedSkill?.count}</strong> candidate profiles highlight{" "}
              <strong>{selectedSkill?.name}</strong> as a core competency.
            </p>
            <div className="rounded-lg bg-surface-blue p-3 border border-brand-blue/20">
              <span className="block font-semibold text-brand-blue text-[11px] mb-1">
                AI Keyword Analysis
              </span>
              <span className="text-muted-foreground text-[10.5px]">
                Analyzed directly from database job descriptions and candidate resumes.
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

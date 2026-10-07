"use client";

import { useState } from "react";
import { Bot, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { aiInsightsData, type AIInsightItem } from "@/data/mockData";

export function AIInsights() {
  const [selectedInsight, setSelectedInsight] = useState<AIInsightItem | null>(null);

  return (
    <>
      <section className="dashboard-card flex flex-col h-[286px] min-w-0 overflow-hidden">
        <div className="m-2 rounded-lg bg-panel-head px-3 py-2 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-2 text-foreground">
            <span className="grid size-6 place-items-center rounded-md bg-brand-blue text-primary-foreground">
              <Bot className="size-4" />
            </span>
            AI Insights
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-blue">
            <Sparkles className="size-3" />
            Live Suggestions
          </span>
        </div>

        <div className="flex-1 divide-y divide-border/60 px-3 overflow-y-auto">
          {aiInsightsData.map((item) => {
            const { id, icon: InsightIcon, description, toneClass, bgClass } = item;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedInsight(item)}
                className="group grid w-full grid-cols-[34px_minmax(0,1fr)] items-start gap-3 py-3 text-left transition-colors hover:bg-muted/40 rounded-lg px-1.5 focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
              >
                <span
                  className={`grid size-8 place-items-center rounded-lg shadow-2xs shrink-0 ${bgClass} ${toneClass}`}
                >
                  <InsightIcon className="size-4.5" />
                </span>
                <span className="text-[11.5px] leading-relaxed text-foreground/90 font-medium group-hover:text-foreground">
                  {description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Insight Details Dialog */}
      <Dialog
        open={selectedInsight !== null}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedInsight && (
                <span
                  className={`grid size-8 place-items-center rounded-lg ${selectedInsight.bgClass} ${selectedInsight.toneClass}`}
                >
                  <selectedInsight.icon className="size-4.5" />
                </span>
              )}
              <DialogTitle className="text-base font-bold">{selectedInsight?.title}</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-foreground/90 leading-relaxed">
              {selectedInsight?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="block font-semibold text-foreground mb-1">
              Recruiter Action Recommendation
            </span>
            <span>
              Review shortlisted profiles in the Candidate Pipeline to advance qualifying applicants
              to the Technical Screening round.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedInsight(null)}>
              Dismiss
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90 gap-1.5"
            >
              <Link to="/candidates" onClick={() => setSelectedInsight(null)}>
                View Candidates
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

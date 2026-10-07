"use client";

import { Crown, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proFeatures = [
  "Unlimited AI Resume Parsing & Match Scoring",
  "Automated Candidate Pipeline Workflows",
  "Multi-channel Job Board Syndication",
  "Real-time Recruiter Team Collaboration",
  "Custom Hiring Analytics & Export Reports",
  "Dedicated Priority Support & API Access",
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-brand-orange">
            <Crown className="size-6 text-brand-orange" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Upgrade to TalentTrack Pro
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Empower your recruitment team with advanced AI screening, intelligent candidate ranking,
            and enterprise hiring pipelines.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-xl border border-border/80 bg-muted/40 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-2xl font-extrabold text-foreground">$79</span>
              <span className="text-xs text-muted-foreground"> / seat / month</span>
            </div>
            <span className="rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
              Annual Billing
            </span>
          </div>

          <div className="space-y-2">
            {proFeatures.map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-xs text-foreground/90">
                <div className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-green/20 text-brand-green">
                  <Check className="size-3" />
                </div>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button
            className="gap-2 bg-brand-blue font-semibold text-primary-foreground hover:bg-brand-blue/90"
            onClick={() => onOpenChange(false)}
          >
            <Sparkles className="size-4" />
            Start 14-Day Free Pro Trial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

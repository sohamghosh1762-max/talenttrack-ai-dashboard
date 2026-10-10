"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSubmitHiringManagerDecision } from "@/hooks/api/useHiringManager";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface DecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  decisionType: "APPROVED" | "REJECTED";
  onSuccess?: () => void;
}

export function DecisionModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobTitle,
  decisionType,
  onSuccess,
}: DecisionModalProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const submitDecisionMutation = useSubmitHiringManagerDecision();

  const isApprove = decisionType === "APPROVED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await submitDecisionMutation.mutateAsync({
        candidateId,
        decision: {
          decision: decisionType,
          notes: notes.trim() || undefined,
        },
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || `Failed to record ${decisionType.toLowerCase()} decision.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <XCircle className="size-5 text-rose-500" />
            )}
            <span>{isApprove ? "Approve Candidate for Next Step" : "Reject Candidate"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm your official hiring manager decision for{" "}
            <strong className="text-foreground">{candidateName}</strong> applying to{" "}
            <strong className="text-foreground">{jobTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label
              htmlFor="decisionNotes"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Decision Notes & Next Step Recommendation (optional)
            </label>
            <textarea
              id="decisionNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isApprove
                  ? "Recommend proceeding with formal technical interview or offer discussion..."
                  : "Skills didn't align closely enough with senior system criteria..."
              }
              className="w-full rounded-lg border border-input bg-card p-2.5 text-xs text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>

          <div
            className={`p-3 rounded-lg text-xs ${
              isApprove
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20"
            }`}
          >
            {isApprove
              ? "Approving this candidate marks them as approved by the Hiring Manager and advances them in the recruiter collaboration pipeline."
              : "Rejecting this candidate records your feedback and flags them as rejected by the Hiring Manager."}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitDecisionMutation.isPending}
              className={`text-xs font-semibold text-white ${
                isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {submitDecisionMutation.isPending
                ? "Saving..."
                : isApprove
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

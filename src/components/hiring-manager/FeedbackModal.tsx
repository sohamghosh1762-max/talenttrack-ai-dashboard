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
import { useSubmitHiringManagerFeedback } from "@/hooks/api/useHiringManager";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
  HelpCircle,
} from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  onSuccess?: () => void;
}

export function FeedbackModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobTitle,
  onSuccess,
}: FeedbackModalProps) {
  const [overallFeedback, setOverallFeedback] = useState("");
  const [technicalSkillsRating, setTechnicalSkillsRating] = useState<number>(4);
  const [communicationRating, setCommunicationRating] = useState<number>(4);
  const [experienceRelevanceRating, setExperienceRelevanceRating] = useState<number>(4);
  const [roleFitRating, setRoleFitRating] = useState<number>(4);
  const [strengthsText, setStrengthsText] = useState("");
  const [concernsText, setConcernsText] = useState("");
  const [recommendation, setRecommendation] = useState<"RECOMMEND" | "MAYBE" | "DO_NOT_RECOMMEND">(
    "RECOMMEND",
  );
  const [error, setError] = useState("");

  const submitFeedbackMutation = useSubmitHiringManagerFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!overallFeedback.trim()) {
      setError("Please provide overall feedback notes for the candidate.");
      return;
    }

    const strengths = strengthsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const concerns = concernsText
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      await submitFeedbackMutation.mutateAsync({
        candidateId,
        feedback: {
          overallFeedback: overallFeedback.trim(),
          technicalSkillsRating,
          communicationRating,
          experienceRelevanceRating,
          roleFitRating,
          strengths: strengths.length > 0 ? strengths : undefined,
          concerns: concerns.length > 0 ? concerns : undefined,
          recommendation,
        },
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Failed to submit hiring manager feedback.");
    }
  };

  const renderRatingStars = (value: number, onChange: (v: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
          >
            <Star
              className={`size-4 ${star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
            />
          </button>
        ))}
        <span className="text-xs font-semibold text-muted-foreground ml-1.5">{value}/5</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="size-5 text-brand-blue" />
            <span>Provide Candidate Feedback</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Structured evaluation for <strong className="text-foreground">{candidateName}</strong>{" "}
            applying for <strong className="text-foreground">{jobTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Ratings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Technical Skills
              </label>
              {renderRatingStars(technicalSkillsRating, setTechnicalSkillsRating)}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Communication
              </label>
              {renderRatingStars(communicationRating, setCommunicationRating)}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Experience Relevance
              </label>
              {renderRatingStars(experienceRelevanceRating, setExperienceRelevanceRating)}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Role & Culture Fit
              </label>
              {renderRatingStars(roleFitRating, setRoleFitRating)}
            </div>
          </div>

          {/* Recommendation Options */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Hiring Recommendation <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRecommendation("RECOMMEND")}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recommendation === "RECOMMEND"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <ThumbsUp className="size-3.5" />
                <span>Recommend</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("MAYBE")}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recommendation === "MAYBE"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <HelpCircle className="size-3.5" />
                <span>Maybe</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("DO_NOT_RECOMMEND")}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recommendation === "DO_NOT_RECOMMEND"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <ThumbsDown className="size-3.5" />
                <span>Do Not Recommend</span>
              </button>
            </div>
          </div>

          {/* Overall Feedback Notes */}
          <div>
            <label
              htmlFor="overallFeedback"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Overall Assessment & Notes <span className="text-destructive">*</span>
            </label>
            <textarea
              id="overallFeedback"
              rows={3}
              required
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Candidate demonstrated strong architecture insights and clear alignment with our product goals..."
              className="w-full rounded-lg border border-input bg-card p-2.5 text-xs text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>

          {/* Strengths and Concerns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="strengths"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Key Strengths (one per line)
              </label>
              <textarea
                id="strengths"
                rows={2}
                value={strengthsText}
                onChange={(e) => setStrengthsText(e.target.value)}
                placeholder="Deep TypeScript experience&#10;Systems design leadership"
                className="w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label
                htmlFor="concerns"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Areas of Concern (one per line)
              </label>
              <textarea
                id="concerns"
                rows={2}
                value={concernsText}
                onChange={(e) => setConcernsText(e.target.value)}
                placeholder="Limited cloud migration background&#10;Notice period duration"
                className="w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground outline-none focus:border-brand-blue"
              />
            </div>
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
              disabled={submitFeedbackMutation.isPending}
              className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold"
            >
              {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Evaluation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

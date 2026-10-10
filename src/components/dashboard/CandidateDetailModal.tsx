import { useState } from "react";
import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useUpdateApplicationStage,
  useApplication,
  useAddApplicationNote,
  useAddApplicationFeedback,
} from "@/hooks/api/useApplications";
import { toast } from "sonner";

export interface CandidateModalData {
  id?: string | undefined;
  applicationId?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  job?: string | undefined;
  jobTitle?: string | undefined;
  location?: string | undefined;
  score?: number | undefined;
  aiScore?: number | undefined;
  status?: string | undefined;
  currentStage?: string | undefined;
  stage?: string | undefined;
  initials?: string | undefined;
  appliedOn?: string | undefined;
  experience?: string | undefined;
  skills?: string[] | undefined;
  summary?: string | undefined;
  coverLetter?: string | undefined;
  notes?: string | undefined;
  resumeId?: string | undefined;
  resumeFileName?: string | undefined;
}

interface CandidateDetailModalProps {
  candidate: CandidateModalData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageUpdated?: ((stage: string) => void) | undefined;
}

const STAGES = [
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFERED", label: "Offered" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

import { useResume, useParseResume } from "@/hooks/api/useResumes";

export function CandidateDetailModal({
  candidate,
  open,
  onOpenChange,
  onStageUpdated,
}: CandidateDetailModalProps) {
  const updateStageMutation = useUpdateApplicationStage();
  const parseResumeMutation = useParseResume();
  const [selectedStage, setSelectedStage] = useState<string>("");

  const targetAppId = candidate?.id || candidate?.applicationId;

  const appQuery = useApplication(targetAppId, {
    enabled: Boolean(targetAppId) && open,
  });
  const addNoteMutation = useAddApplicationNote();
  const addFeedbackMutation = useAddApplicationFeedback();

  const [noteText, setNoteText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackRec, setFeedbackRec] = useState<"STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO">("YES");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [feedbackStrengths, setFeedbackStrengths] = useState("");
  const [feedbackConcerns, setFeedbackConcerns] = useState("");

  const resumeQuery = useResume(candidate?.resumeId, {
    enabled: !!candidate?.resumeId && open,
  });

  if (!candidate) return null;

  const applicationData = appQuery.data;
  const notesList = applicationData?.notesList || [];
  const feedbackList = applicationData?.recruiterFeedback || [];
  const stageHistoryList = applicationData?.stageHistory || [];

  const activeStage =
    selectedStage ||
    applicationData?.currentStage?.toUpperCase() ||
    candidate.currentStage?.toUpperCase() ||
    candidate.stage?.toUpperCase() ||
    candidate.status?.toUpperCase() ||
    "APPLIED";

  const score = applicationData?.aiScore ?? candidate.score ?? candidate.aiScore ?? 85;
  const scoreColor =
    score >= 90
      ? "bg-surface-green text-brand-green border-brand-green/30"
      : score >= 70
        ? "bg-surface-purple text-brand-purple border-brand-purple/30"
        : "bg-surface-peach text-brand-orange border-brand-orange/30";

  const handleStageChange = async (newStage: string) => {
    if (!targetAppId) return;
    try {
      setSelectedStage(newStage);
      await updateStageMutation.mutateAsync({
        applicationId: targetAppId,
        stage: newStage,
      });
      toast.success(`Candidate stage moved to ${newStage}`);
      if (onStageUpdated) {
        onStageUpdated(newStage);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update candidate stage");
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAppId || !noteText.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        applicationId: targetAppId,
        text: noteText.trim(),
        isInternal: true,
      });
      setNoteText("");
      toast.success("Internal note added successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save note");
    }
  };

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAppId || !feedbackNotes.trim()) return;
    try {
      const strengthsArr = feedbackStrengths.split(",").map((s) => s.trim()).filter(Boolean);
      const concernsArr = feedbackConcerns.split(",").map((s) => s.trim()).filter(Boolean);
      await addFeedbackMutation.mutateAsync({
        applicationId: targetAppId,
        stage: activeStage,
        rating: feedbackRating,
        overallRecommendation: feedbackRec,
        notes: feedbackNotes.trim(),
        ...(strengthsArr.length ? { strengths: strengthsArr } : {}),
        ...(concernsArr.length ? { concerns: concernsArr } : {}),
      });
      setFeedbackNotes("");
      setFeedbackStrengths("");
      setFeedbackConcerns("");
      toast.success("Structured feedback recorded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record feedback");
    }
  };

  const handleParseResume = async () => {
    if (!candidate.resumeId) return;
    try {
      await parseResumeMutation.mutateAsync(candidate.resumeId);
      toast.success("Resume parsed and structured profile extracted successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to analyze resume.");
    }
  };

  const getNextStage = (current: string): string | null => {
    switch (current) {
      case "APPLIED":
        return "SCREENING";
      case "SCREENING":
        return "INTERVIEW";
      case "INTERVIEW":
        return "OFFERED";
      default:
        return null;
    }
  };

  const nextStage = getNextStage(activeStage);
  const resume = resumeQuery.data;
  const parsedProfile = resume?.parsedProfile;
  const parsingStatus = parseResumeMutation.isPending
    ? "PROCESSING"
    : resume?.parsingStatus || "NOT_STARTED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Applied {candidate.appliedOn}
            </span>
            <div
              className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${scoreColor}`}
            >
              <Sparkles className="size-3" />
              {score}% AI Match
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="grid size-12 place-items-center rounded-full bg-brand-blue text-base font-bold text-primary-foreground shadow-sm shrink-0">
              {candidate.initials || "C"}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {candidate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-brand-blue font-medium">
                {candidate.job || candidate.jobTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="overview" className="text-xs">Profile</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes ({notesList.length})</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs">Feedback ({feedbackList.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History ({stageHistoryList.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-3.5 py-2 text-xs">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-muted-foreground rounded-lg bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <span>{candidate.phone || "+1 (555) 019-2831"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span>{candidate.location || "San Francisco, CA"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                <span>{candidate.experience || "3-5 years exp"}</span>
              </div>
            </div>

            {/* Stage Selector Controls */}
            <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">Pipeline Stage:</span>
                <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-[11px] font-bold text-brand-blue border border-brand-blue/20">
                  {activeStage}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {STAGES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={updateStageMutation.isPending}
                    onClick={() => handleStageChange(s.value)}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-medium border transition-all cursor-pointer text-center ${
                      activeStage === s.value
                        ? "bg-brand-blue text-white border-brand-blue shadow-xs font-bold"
                        : "bg-background text-muted-foreground border-border hover:border-brand-blue/50 hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Match & Summary */}
            <div>
              <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Brain className="size-3.5 text-brand-purple" />
                AI Match & Profile Summary
              </h4>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                {parsedProfile?.summary ||
                  candidate.summary ||
                  candidate.coverLetter ||
                  `${candidate.name} demonstrates a high semantic similarity score of ${score}% with the job specification for ${candidate.job || "this role"}. Strong alignment across core skill proficiencies and domain experience.`}
              </p>
            </div>

            {/* Skills */}
            {(parsedProfile?.skills?.length || candidate.skills?.length) && (
              <div>
                <h4 className="font-semibold text-foreground mb-1.5">Extracted Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(parsedProfile?.skills || candidate.skills || []).map((skill: string) => (
                    <span
                      key={skill}
                      className="rounded-md bg-surface-blue px-2 py-0.5 text-[10px] font-medium text-brand-blue border border-brand-blue/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Experience from Parsed Profile */}
            {parsedProfile?.experience && parsedProfile.experience.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-1.5">Work History (AI Parsed)</h4>
                <div className="space-y-2">
                  {parsedProfile.experience.map((exp: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <strong className="text-foreground text-xs">{exp.role}</strong>
                        <span className="text-[10px] text-muted-foreground">
                          {exp.startDate} – {exp.endDate || "Present"}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-blue font-medium">
                        {exp.company} {exp.location ? `• ${exp.location}` : ""}
                      </p>
                      {Array.isArray(exp.description) && exp.description.length > 0 && (
                        <ul className="list-disc pl-4 text-[10.5px] text-muted-foreground space-y-0.5">
                          {exp.description.map((bullet: string, bIdx: number) => (
                            <li key={bIdx}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Education from Parsed Profile */}
            {parsedProfile?.education && parsedProfile.education.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-1.5">Education (AI Parsed)</h4>
                <div className="space-y-1.5">
                  {parsedProfile.education.map((edu: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/80 bg-card p-2 text-xs flex justify-between items-center"
                    >
                      <div>
                        <strong className="text-foreground">{edu.degree}</strong>
                        <p className="text-[11px] text-muted-foreground">
                          {edu.institution} {edu.grade ? `(${edu.grade})` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {edu.startDate} – {edu.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attached Resume & AI Analyze Button */}
            <div className="rounded-lg border border-border p-3 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-surface-blue text-brand-blue shrink-0">
                  <FileText className="size-4" />
                </div>
                <div>
                  <span className="block font-semibold text-xs text-foreground truncate max-w-[200px]">
                    {candidate.resumeFileName ||
                      resume?.originalFileName ||
                      `${candidate.name?.replace(/\s+/g, "_")}_Resume.pdf`}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span>Status:</span>
                    <strong
                      className={
                        parsingStatus === "COMPLETED"
                          ? "text-brand-green"
                          : parsingStatus === "FAILED"
                            ? "text-destructive"
                            : "text-brand-blue"
                      }
                    >
                      {parsingStatus}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                {candidate.resumeId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={parseResumeMutation.isPending || parsingStatus === "PROCESSING"}
                      onClick={handleParseResume}
                      className="h-7 px-2.5 text-[11px] font-semibold gap-1"
                    >
                      {parseResumeMutation.isPending || parsingStatus === "PROCESSING" ? (
                        <>
                          <Loader2 className="size-3 animate-spin text-brand-blue" />
                          Analyzing...
                        </>
                      ) : parsingStatus === "COMPLETED" ? (
                        <>
                          <Sparkles className="size-3 text-brand-purple" />
                          Re-analyze
                        </>
                      ) : parsingStatus === "FAILED" ? (
                        <>
                          <Sparkles className="size-3 text-destructive" />
                          Retry Analysis
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3 text-brand-purple" />
                          Analyze Resume
                        </>
                      )}
                    </Button>

                    <a
                      href={`/api/resumes/${candidate.resumeId}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background h-7 px-2.5 text-[11px] font-semibold text-foreground hover:bg-accent gap-1 transition-colors"
                    >
                      <Download className="size-3" />
                      Download
                    </a>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: INTERNAL NOTES */}
          <TabsContent value="notes" className="space-y-3.5 py-2 text-xs">
            <form onSubmit={handleCreateNote} className="space-y-2 border border-border/80 rounded-lg p-3 bg-card">
              <label className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-brand-blue" />
                Add Internal Recruiter Note
              </label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log confidential candidate notes, screening impressions, salary expectations..."
                rows={3}
                className="text-xs"
                maxLength={2000}
              />
              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-muted-foreground">{noteText.length}/2000 characters</span>
                <Button
                  size="sm"
                  type="submit"
                  disabled={addNoteMutation.isPending || !noteText.trim()}
                  className="bg-brand-blue text-primary-foreground text-xs h-7 px-3"
                >
                  {addNoteMutation.isPending ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground text-xs">Notes History ({notesList.length})</h4>
              {notesList.length === 0 ? (
                <p className="text-muted-foreground text-xs py-4 text-center border border-dashed rounded-lg">
                  No internal notes recorded yet for this candidate application.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {notesList.map((n: any, idx: number) => (
                    <div key={n.id || idx} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <strong className="text-foreground">{n.authorName || "Recruiter"}</strong>
                        <span className="text-muted-foreground">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Recently"}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: RECRUITER FEEDBACK */}
          <TabsContent value="feedback" className="space-y-3.5 py-2 text-xs">
            <form onSubmit={handleCreateFeedback} className="space-y-2.5 border border-border/80 rounded-lg p-3 bg-card">
              <h4 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <Star className="size-3.5 text-amber-500 fill-amber-500" />
                Submit Evaluation & Recommendation
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Overall Recommendation</label>
                  <select
                    value={feedbackRec}
                    onChange={(e) => setFeedbackRec(e.target.value as any)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  >
                    <option value="STRONG_YES">Strong Yes (Exceptional)</option>
                    <option value="YES">Yes (Hire Recommendation)</option>
                    <option value="NEUTRAL">Neutral (Borderline)</option>
                    <option value="NO">No (Do Not Advance)</option>
                    <option value="STRONG_NO">Strong No (Reject)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Competency Rating (1-5)</label>
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`size-4 cursor-pointer transition-colors ${
                            star <= feedbackRating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-foreground ml-1.5">{feedbackRating}/5</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Strengths (comma-separated)</label>
                  <input
                    type="text"
                    value={feedbackStrengths}
                    onChange={(e) => setFeedbackStrengths(e.target.value)}
                    placeholder="System design, TypeScript..."
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Areas for Improvement</label>
                  <input
                    type="text"
                    value={feedbackConcerns}
                    onChange={(e) => setFeedbackConcerns(e.target.value)}
                    placeholder="Notice period, GraphQL..."
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Detailed Evaluation Notes</label>
                <Textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Summarize candidate technical performance, domain depth, communication, and team fit..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  type="submit"
                  disabled={addFeedbackMutation.isPending || !feedbackNotes.trim()}
                  className="bg-brand-blue text-primary-foreground text-xs h-7 px-3"
                >
                  {addFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground text-xs">Evaluations ({feedbackList.length})</h4>
              {feedbackList.length === 0 ? (
                <p className="text-muted-foreground text-xs py-4 text-center border border-dashed rounded-lg">
                  No interview feedback or evaluations recorded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {feedbackList.map((f: any, idx: number) => (
                    <div key={f.id || idx} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <strong className="text-foreground">{f.authorName || "Reviewer"}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.overallRecommendation.includes("YES")
                            ? "bg-surface-green text-brand-green"
                            : f.overallRecommendation === "NEUTRAL"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-surface-peach text-brand-orange"
                        }`}>
                          {f.overallRecommendation} • {f.rating}/5 ★
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{f.notes}</p>
                      {(f.strengths?.length > 0 || f.concerns?.length > 0) && (
                        <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                          {f.strengths?.map((s: string, sI: number) => (
                            <span key={sI} className="text-brand-green bg-surface-green px-1.5 py-0.5 rounded font-medium">
                              + {s}
                            </span>
                          ))}
                          {f.concerns?.map((c: string, cI: number) => (
                            <span key={cI} className="text-brand-orange bg-surface-peach px-1.5 py-0.5 rounded font-medium">
                              - {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: AUDIT TRAIL */}
          <TabsContent value="history" className="space-y-3 py-2 text-xs">
            <h4 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
              <History className="size-3.5 text-brand-blue" />
              Application Stage Transition Log
            </h4>
            {stageHistoryList.length === 0 ? (
              <p className="text-muted-foreground text-xs py-4 text-center border border-dashed rounded-lg">
                No stage transitions recorded yet. Application is currently in {activeStage}.
              </p>
            ) : (
              <div className="relative border-l-2 border-border/80 ml-3 pl-4 space-y-3 py-1">
                {stageHistoryList.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="relative space-y-0.5">
                    <span className="absolute -left-[23px] top-1 size-3 rounded-full bg-brand-blue border-2 border-background" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs">
                        {item.fromStage ? `${item.fromStage} → ` : ""}{item.toStage}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.changedAt ? new Date(item.changedAt).toLocaleString() : "Recently"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Updated by <strong className="text-foreground">{item.changedByName || "Recruiter"}</strong>
                      {item.reason ? ` — "${item.reason}"` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-brand-green" />
            Current Stage: <strong>{activeStage}</strong>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {nextStage && (
              <Button
                size="sm"
                disabled={updateStageMutation.isPending}
                className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90 gap-1 text-xs"
                onClick={() => handleStageChange(nextStage)}
              >
                {updateStageMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserCheck className="size-3.5" />
                )}
                Advance to {nextStage}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

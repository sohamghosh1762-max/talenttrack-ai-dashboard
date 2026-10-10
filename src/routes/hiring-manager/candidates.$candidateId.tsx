"use client";

import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  XCircle,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHiringManagerCandidate } from "@/hooks/api/useHiringManager";
import { FeedbackModal } from "@/components/hiring-manager/FeedbackModal";
import { DecisionModal } from "@/components/hiring-manager/DecisionModal";

export const Route = createFileRoute("/hiring-manager/candidates/$candidateId")({
  head: () => ({
    meta: [
      { title: "Candidate Evaluation — Hiring Manager" },
      {
        name: "description",
        content: "Review candidate profile, resume ATS score, and submit feedback.",
      },
    ],
  }),
  component: HiringManagerCandidateDetailPage,
});

function HiringManagerCandidateDetailPage() {
  const { candidateId } = useParams({ from: "/hiring-manager/candidates/$candidateId" });
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, isFetching } = useHiringManagerCandidate(candidateId);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    type: "APPROVED" | "REJECTED";
  }>({ open: false, type: "APPROVED" });

  if (isLoading) {
    return (
      <HiringManagerLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </HiringManagerLayout>
    );
  }

  if (error || !data) {
    return (
      <HiringManagerLayout>
        <div className="space-y-4">
          <Link
            to="/hiring-manager/candidates"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Candidates</span>
          </Link>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-2">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h2 className="text-base font-bold text-destructive">
              Candidate Not Found or Access Denied
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              This candidate may not belong to one of your assigned job openings, or does not exist.
            </p>
          </div>
        </div>
      </HiringManagerLayout>
    );
  }

  const { candidate, application, job, parsedProfile, atsAnalysis, interviews = [] } = data;
  const feedbackList = application.hiringManagerFeedback || [];

  return (
    <HiringManagerLayout>
      <div className="space-y-6">
        {/* Top Breadcrumb & Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            to="/hiring-manager/candidates"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Candidates</span>
          </Link>

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

            <Button
              size="sm"
              onClick={() => setFeedbackOpen(true)}
              className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs h-9 gap-1.5 cursor-pointer"
            >
              <MessageSquare className="size-3.5" />
              <span>Provide Feedback</span>
            </Button>

            {!application.hiringDecision && (
              <>
                <Button
                  size="sm"
                  onClick={() => setDecisionModal({ open: true, type: "APPROVED" })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 cursor-pointer"
                >
                  <ThumbsUp className="size-3.5" />
                  <span>Approve Candidate</span>
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDecisionModal({ open: true, type: "REJECTED" })}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  <ThumbsDown className="size-3.5" />
                  <span>Reject</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Candidate Profile Hero Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue font-black text-xl shrink-0">
                {candidate.name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-black text-foreground">{candidate.name}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                    Stage: {application.stage}
                  </span>

                  {(application.hiringDecision?.status === "APPROVED" ||
                    (application.hiringDecision as any) === "APPROVED") && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Manager Approved
                    </span>
                  )}

                  {(application.hiringDecision?.status === "REJECTED" ||
                    (application.hiringDecision as any) === "REJECTED") && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <XCircle className="size-3.5" /> Manager Rejected
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground font-medium">
                  Applying for <strong className="text-foreground">{job.title}</strong> •{" "}
                  {job.department}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                  {candidate.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {candidate.email}
                    </span>
                  )}
                  {candidate.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5 text-muted-foreground" />
                      {candidate.phone}
                    </span>
                  )}
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {candidate.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Applied {new Date(application.appliedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* ATS Score Dial */}
            {atsAnalysis?.overallScore !== undefined && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-blue border border-brand-blue/20 shrink-0">
                <div className="grid size-12 place-items-center rounded-xl bg-brand-blue text-primary-foreground font-black text-lg">
                  {atsAnalysis.overallScore}%
                </div>
                <div>
                  <div className="text-xs font-bold text-brand-blue">ATS Match Score</div>
                  <div className="text-[11px] text-muted-foreground">Deterministic + Gemini AI</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Layout: Left ATS & Parsed Resume Profile, Right Feedback & Decision */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* ATS Breakdown & Semantic Insights */}
            {atsAnalysis && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4.5 text-brand-blue" />
                  <span>ATS Score Breakdown & AI Insights</span>
                </h2>

                {atsAnalysis.scoreBreakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Skills Match
                      </div>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {atsAnalysis.scoreBreakdown.skillsMatch || 0}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                      <div className="text-xs font-semibold text-muted-foreground">Experience</div>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {atsAnalysis.scoreBreakdown.experienceMatch || 0}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                      <div className="text-xs font-semibold text-muted-foreground">Education</div>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {atsAnalysis.scoreBreakdown.educationMatch || 0}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Completeness
                      </div>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {atsAnalysis.scoreBreakdown.formattingAndCompleteness || 0}%
                      </div>
                    </div>
                  </div>
                )}

                {atsAnalysis.semanticInsights && (
                  <div className="p-4 rounded-xl bg-surface-blue/50 border border-brand-blue/20 text-xs text-foreground space-y-1">
                    <span className="font-bold text-brand-blue block">
                      Gemini AI Semantic Evaluation:
                    </span>
                    <p className="leading-relaxed">{atsAnalysis.semanticInsights}</p>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {atsAnalysis.strengths && atsAnalysis.strengths.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        <span>Identified Strengths</span>
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        {atsAnalysis.strengths.map((st, idx) => (
                          <li key={idx}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {atsAnalysis.weaknesses && atsAnalysis.weaknesses.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <HelpCircle className="size-3.5" />
                        <span>Gaps / Areas to Explore</span>
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        {atsAnalysis.weaknesses.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parsed Resume Profile (Skills, Work History, Education, Projects) */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="size-4.5 text-brand-blue" />
                <span>Parsed Resume & Candidate Profile</span>
              </h2>

              {/* Skills */}
              {(candidate.skills?.length > 0 ||
                (parsedProfile?.skills && parsedProfile.skills.length > 0)) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Core Technical Skills
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(parsedProfile?.skills || candidate.skills).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-blue text-brand-blue"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Work History */}
              {parsedProfile?.workHistory && parsedProfile.workHistory.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Work Experience
                  </h3>
                  <div className="space-y-3">
                    {parsedProfile.workHistory.map((work, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-foreground">{work.title}</h4>
                          <span className="text-[11px] text-muted-foreground">{work.duration}</span>
                        </div>
                        <div className="text-xs font-medium text-brand-blue">{work.company}</div>
                        {work.description && (
                          <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                            {work.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsedProfile?.education && parsedProfile.education.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Education & Credentials
                  </h3>
                  <div className="space-y-2">
                    {parsedProfile.education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-foreground">{edu.degree}</div>
                          <div className="text-xs text-muted-foreground">{edu.institution}</div>
                        </div>
                        {edu.year && (
                          <span className="text-xs text-muted-foreground">{edu.year}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {parsedProfile?.projects && parsedProfile.projects.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Notable Projects
                  </h3>
                  <div className="space-y-2">
                    {parsedProfile.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border bg-muted/20 space-y-1"
                      >
                        <div className="text-xs font-bold text-foreground">{proj.name}</div>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Hiring Manager Feedback & Decisions */}
          <div className="space-y-6">
            {/* Feedback History */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="size-4.5 text-brand-blue" />
                  <span>Manager Evaluations</span>
                </h2>

                <Button
                  size="sm"
                  onClick={() => setFeedbackOpen(true)}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs h-8 gap-1 cursor-pointer"
                >
                  <span>Add Notes</span>
                </Button>
              </div>

              {feedbackList.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2">
                  <MessageSquare className="size-6 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No feedback has been recorded for this candidate yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackList.map((fb, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {fb.hiringManagerName || (fb as any).managerName || "Hiring Manager"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            fb.recommendation === "RECOMMEND"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : fb.recommendation === "MAYBE"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          Recommendation: {fb.recommendation}
                        </span>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed">
                        {fb.overallFeedback}
                      </p>

                      {/* Ratings */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                        {fb.technicalSkillsRating && <div>Tech: {fb.technicalSkillsRating}/5</div>}
                        {fb.communicationRating && <div>Comm: {fb.communicationRating}/5</div>}
                        {(fb.experienceRating || (fb as any).experienceRelevanceRating) && (
                          <div>
                            Exp: {fb.experienceRating || (fb as any).experienceRelevanceRating}/5
                          </div>
                        )}
                        {fb.roleFitRating && <div>Fit: {fb.roleFitRating}/5</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interview Feedback Section */}
            {interviews.length > 0 && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="size-4.5 text-brand-blue" />
                  <span>Interview Records</span>
                </h2>
                <div className="space-y-2.5">
                  {interviews.map((iv) => (
                    <div
                      key={iv.id}
                      className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{iv.title}</span>
                        <span className="text-[10px] font-semibold text-brand-blue">
                          {iv.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Interviewer: {iv.interviewer} • {new Date(iv.date).toLocaleDateString()}
                      </div>
                      {iv.feedback && <p className="text-xs text-foreground pt-1">{iv.feedback}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Structured Feedback Modal */}
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        candidateId={candidate.id}
        candidateName={candidate.name}
        jobTitle={job.title}
        onSuccess={() => refetch()}
      />

      {/* Decision Modal */}
      <DecisionModal
        open={decisionModal.open}
        onOpenChange={(open) => setDecisionModal((prev) => ({ ...prev, open }))}
        candidateId={candidate.id}
        candidateName={candidate.name}
        jobTitle={job.title}
        decisionType={decisionModal.type}
        onSuccess={() => refetch()}
      />
    </HiringManagerLayout>
  );
}

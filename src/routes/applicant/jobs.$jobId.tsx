import { useState, useRef } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Sparkles,
  AlertCircle,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/auth/AuthProvider";
import { useJob, useApplicantJobMatch } from "@/hooks/api/useJobs";
import { useApplicantProfile } from "@/hooks/api/useApplicantProfile";
import { useUploadResume } from "@/hooks/api/useResumes";
import { useMyApplications, useCreateApplication } from "@/hooks/api/useApplications";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { toast } from "sonner";

export const Route = createFileRoute("/applicant/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details — TalentTrack AI" },
      {
        name: "description",
        content: "View full job description, requirements, and submit application.",
      },
    ],
  }),
  component: ApplicantJobDetailsPage,
});

function ApplicantJobDetailsPage() {
  const { jobId } = useParams({ from: "/applicant/jobs/$jobId" });
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedJobs();

  const { data: job, isLoading, error } = useJob(jobId);
  const { data: matchData, isLoading: matchLoading } = useApplicantJobMatch(jobId, {
    enabled: !!jobId && !!user,
  });
  const { data: applicantProfileData } = useApplicantProfile({ enabled: !!user });
  const { data: myApps } = useMyApplications();
  const uploadResumeMutation = useUploadResume();
  const createApplicationMutation = useCreateApplication();

  const saved = isSaved(jobId);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic applicant skills from authenticated user profile or resume
  const applicantSkills: string[] =
    user?.applicantProfile?.skills ||
    applicantProfileData?.skills ||
    (applicantProfileData?.applicantProfile?.skills as string[]) ||
    [];

  // Determine if applicant has applied from authoritative MongoDB query
  const hasApplied = myApps?.some((a) => a.jobId === jobId) || false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setSubmitError(null);
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx" && ext !== ".doc") {
      setFileError("Only PDF and DOCX documents are accepted.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("File exceeds the maximum size limit of 10 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleApply = async () => {
    setFileError(null);
    setSubmitError(null);

    try {
      let resumeId = (user?.applicantProfile as Record<string, any>)?.[
        "resumeId"
      ] as string | undefined;

      // 1. Upload custom resume if selected
      if (selectedFile) {
        const uploadedResume = await uploadResumeMutation.mutateAsync(selectedFile);
        resumeId = uploadedResume.id;
        toast.success("Resume uploaded successfully.");
      }

      // 2. Submit Application to MongoDB
      await createApplicationMutation.mutateAsync({
        jobId,
        resumeId,
        coverLetter: coverLetter.trim() || undefined,
      });

      toast.success("Application submitted successfully!");
      setApplyModalOpen(false);
      setSelectedFile(null);
      setCoverLetter("");
    } catch (err: any) {
      const msg = err.message || "Failed to submit application. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <ApplicantLayout>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-xs gap-2">
          <Loader2 className="size-8 animate-spin text-brand-blue" />
          <span>Loading job details...</span>
        </div>
      </ApplicantLayout>
    );
  }

  if (error || !job) {
    return (
      <ApplicantLayout>
        <div className="dashboard-card p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Job Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {error ? (error as Error).message : "This job opening is either unavailable or has been archived."}
          </p>
          <Link to="/applicant/jobs">
            <Button size="sm" className="bg-brand-blue text-primary-foreground text-xs">
              Back to Browse Jobs
            </Button>
          </Link>
        </div>
      </ApplicantLayout>
    );
  }

  const isPublished = job.status === "PUBLISHED";
  const isArchived = job.status === "ARCHIVED";

  const formattedDeadline = job.deadline
    ? new Date(job.deadline.includes("T") ? job.deadline : `${job.deadline}T00:00:00`).toLocaleDateString(
        "en-US",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    : null;

  const isPastDeadline = job.deadline
    ? new Date(job.deadline.includes("T") ? job.deadline : `${job.deadline}T23:59:59.999Z`).getTime() <
      Date.now()
    : false;

  const formattedPostedDate = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const companyDisplayName = job.company || job.companyName || "Organization";

  return (
    <ApplicantLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Back Link */}
        <Link
          to="/applicant/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to Browse Jobs
        </Link>

        {/* Job Header Card */}
        <div className="dashboard-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-surface-blue px-2.5 py-0.5 text-xs font-bold text-brand-blue">
                  {job.department}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10.5px] font-bold ${
                    isPublished
                      ? "bg-surface-green text-brand-green"
                      : isArchived
                        ? "bg-muted text-muted-foreground"
                        : "bg-surface-peach text-brand-orange"
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground mt-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Building className="size-3.5 text-muted-foreground" />
                  {companyDisplayName}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3.5 text-muted-foreground" />
                  {job.employmentType} {job.experienceRequired ? `• ${job.experienceRequired}` : ""}
                </span>
                {job.salaryRange && (job.salaryRange.min || job.salaryRange.max) && (
                  <span className="flex items-center gap-1 text-brand-green font-semibold">
                    <DollarSign className="size-3.5" />
                    ${job.salaryRange.min?.toLocaleString()}
                    {job.salaryRange.max ? ` - $${job.salaryRange.max?.toLocaleString()}` : "+"} / year
                  </span>
                )}
                {formattedDeadline && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    Deadline: {formattedDeadline}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSave(jobId)}
                className={`text-xs gap-1.5 ${saved ? "border-brand-blue text-brand-blue bg-surface-blue" : ""}`}
              >
                <Bookmark className={`size-3.5 ${saved ? "fill-current" : ""}`} />
                {saved ? "Saved" : "Save Role"}
              </Button>

              {hasApplied ? (
                <Link to="/applicant/applications">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-brand-green/40 bg-surface-green text-brand-green hover:bg-surface-green/80 text-xs font-semibold px-3.5 gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="size-3.5" />
                    View Application
                  </Button>
                </Link>
              ) : isPublished && !isPastDeadline ? (
                <Button
                  size="sm"
                  onClick={() => setApplyModalOpen(true)}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold px-4 shadow-sm"
                >
                  Apply for Position
                </Button>
              ) : isPastDeadline ? (
                <Button size="sm" disabled variant="secondary" className="text-xs">
                  Deadline Passed
                </Button>
              ) : (
                <Button size="sm" disabled variant="secondary" className="text-xs">
                  {isArchived ? "Position Closed / Archived" : "Not Accepting Applications"}
                </Button>
              )}
            </div>
          </div>

          {/* Dynamic AI Semantic Match Box */}
          {matchLoading ? (
            <div className="rounded-xl border border-brand-blue/20 bg-surface-blue/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-brand-blue" />
                <span className="text-xs font-bold text-foreground">Calculating qualification match...</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Evaluating your profile skills and experience against position requirements.
              </p>
            </div>
          ) : !user ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand-blue" />
                  <strong className="text-xs font-bold text-foreground">
                    AI Semantic Qualification Match
                  </strong>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">Sign In Required</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                Sign in to your candidate account to see your personalized AI match score for this position.
              </p>
              <div className="pt-1">
                <Link to="/login">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5 text-brand-blue border-brand-blue/30 hover:bg-surface-blue">
                    Sign In to View Match
                  </Button>
                </Link>
              </div>
            </div>
          ) : !matchData?.isAvailable || matchData.matchScore === null ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand-blue" />
                  <strong className="text-xs font-bold text-foreground">
                    AI Semantic Qualification Match
                  </strong>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Analysis Pending</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                {matchData?.summary || "Upload your resume to see how well your profile matches this position."}
              </p>
              <div className="pt-1 flex items-center gap-2">
                <Link to="/applicant/profile">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5 text-brand-blue border-brand-blue/30 hover:bg-surface-blue">
                    <Upload className="size-3.5" />
                    Upload Resume
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-brand-blue/20 bg-surface-blue/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand-blue" />
                  <strong className="text-xs font-bold text-foreground">
                    AI Semantic Qualification Match: {matchData.matchScore}%
                  </strong>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    matchData.matchScore >= 80
                      ? "text-brand-green"
                      : matchData.matchScore >= 60
                        ? "text-brand-blue"
                        : "text-brand-orange"
                  }`}
                >
                  {matchData.matchScore >= 80
                    ? "High Fit"
                    : matchData.matchScore >= 60
                      ? "Moderate Fit"
                      : "Potential Match"}
                </span>
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                {matchData.summary}
              </p>
              {matchData.matchedSkills && matchData.matchedSkills.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground text-[10.5px]">Matched Skills:</span>
                  {matchData.matchedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1 rounded bg-surface-green px-1.5 py-0.5 text-[10.5px] font-medium text-brand-green border border-brand-green/20"
                    >
                      <Check className="size-2.5" />
                      {sk}
                    </span>
                  ))}
                  {matchData.missingSkills && matchData.missingSkills.length > 0 && (
                    <>
                      <span className="ml-1 font-semibold text-foreground text-[10.5px]">Missing:</span>
                      {matchData.missingSkills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                        >
                          {sk}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detailed Job Information */}
          <div className="space-y-6 pt-2">
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-foreground">About the Opportunity</h2>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </section>

            {job.skills && job.skills.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-foreground">Required Skills & Proficiencies</h2>
                <div className="flex flex-wrap gap-2 pt-1">
                  {job.skills.map((skill) => {
                    const isMatch =
                      applicantSkills.some((s) => s.toLowerCase() === skill.toLowerCase()) ||
                      (matchData?.matchedSkills || []).some(
                        (s) => s.toLowerCase() === skill.toLowerCase(),
                      );
                    return (
                      <span
                        key={skill}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                          isMatch
                            ? "bg-surface-green text-brand-green border border-brand-green/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isMatch && <Check className="size-3" />}
                        {skill}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            {formattedPostedDate && (
              <div className="border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                Posted on {formattedPostedDate}
              </div>
            )}
          </div>
        </div>

        {/* Application Modal */}
        <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Apply for {job.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Confirm your candidate information and attach your latest resume.
              </DialogDescription>
            </DialogHeader>

            {hasApplied ? (
              <div className="py-6 text-center space-y-2">
                <div className="grid size-12 place-items-center rounded-full bg-surface-green text-brand-green mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Application Sent!</h3>
                <p className="text-xs text-muted-foreground">
                  Your application and resume have been securely received.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 py-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <div className="font-semibold text-foreground">{user?.name}</div>
                  <div className="text-muted-foreground">{user?.email}</div>
                  <div className="text-[11px] text-brand-blue font-medium">
                    {user?.applicantProfile?.headline || "Software Professional"}
                  </div>
                </div>

                {/* Resume Upload Box */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Resume Document (PDF or DOCX, max 10MB)
                  </label>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-between rounded-lg border border-brand-blue/40 bg-surface-blue/30 p-3">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="size-4 text-brand-blue shrink-0" />
                        <div className="truncate">
                          <span className="block font-semibold text-foreground truncate text-xs">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove file"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:border-brand-blue/60 transition-colors bg-muted/10 space-y-1.5"
                    >
                      <Upload className="size-5 text-brand-blue mx-auto" />
                      <div className="font-semibold text-xs text-foreground">
                        Click or drag to attach custom resume
                      </div>
                      <div className="text-[10.5px] text-muted-foreground">
                        Or leave unselected to use your default profile resume
                      </div>
                    </div>
                  )}

                  {fileError && (
                    <div className="text-[11px] text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>

                {/* Cover Letter (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Cover Letter / Note to Hiring Team (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Highlight your relevant experience and reasons for applying..."
                    className="w-full rounded-md border border-input bg-card p-2.5 text-xs outline-none focus:border-brand-blue"
                  />
                </div>

                {submitError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <DialogFooter className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadResumeMutation.isPending || createApplicationMutation.isPending}
                    onClick={() => setApplyModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={uploadResumeMutation.isPending || createApplicationMutation.isPending}
                    className="bg-brand-blue text-primary-foreground hover:bg-brand-blue/90"
                    onClick={handleApply}
                  >
                    {uploadResumeMutation.isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Uploading Resume...
                      </>
                    ) : createApplicationMutation.isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Submitting Application...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ApplicantLayout>
  );
}

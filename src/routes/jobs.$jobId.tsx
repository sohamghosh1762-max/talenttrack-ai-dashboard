"use client";

import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Building,
  Calendar,
  ChevronRight,
  Eye,
  FileSearch,
  Loader2,
  MapPin,
  Sparkles,
  Users,
  SlidersHorizontal,
  BarChart3,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { recentApplicantsData, type Applicant } from "@/data/mockData";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { useJob } from "@/hooks/api/useJobs";
import { useRecruiterApplications } from "@/hooks/api/useApplications";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details & Pipeline — TalentTrack AI" },
      {
        name: "description",
        content: "Manage job applicants, hiring pipeline, AI screening results, and analytics.",
      },
    ],
  }),
  component: RecruiterJobDetailPage,
});

type JobTab = "applicants" | "pipeline" | "ai-screening" | "analytics" | "details";

function RecruiterJobDetailPage() {
  const { jobId } = useParams({ from: "/jobs/$jobId" });
  const [activeTab, setActiveTab] = useState<JobTab>("applicants");
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);

  const { data: job, isLoading, error } = useJob(jobId);
  const { data: jobApplicationsData } = useRecruiterApplications({ jobId });

  const jobApplicants: Applicant[] =
    jobApplicationsData && jobApplicationsData.length > 0
      ? jobApplicationsData.map((app) => ({
          id: app.id,
          name: app.applicantName || app.applicant?.name || "Applicant",
          email: app.applicantEmail || app.applicant?.email || "applicant@example.com",
          job: app.jobTitle || job?.title || "Job Opening",
          score: app.aiScore || 85,
          status: (app.status as any) || "Applied",
          initials: app.applicant?.initials || (app.applicantName?.[0] ?? "A"),
          appliedOn: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Recent",
          ...(app.applicant?.phone ? { phone: app.applicant.phone } : {}),
          ...(app.applicant?.location ? { location: app.applicant.location } : {}),
          skills: app.applicant?.skills || [],
        }))
      : recentApplicantsData;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-xs gap-2">
          <Loader2 className="size-8 animate-spin text-brand-blue" />
          <span>Loading job details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout>
        <div className="dashboard-card p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Job Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {error
              ? (error as Error).message
              : "The requested job opening does not exist or has been removed."}
          </p>
          <Link to="/jobs">
            <Button size="sm" className="bg-brand-blue text-primary-foreground text-xs">
              Back to Job Openings
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const formattedDate = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/jobs" className="text-brand-blue hover:underline font-semibold">
            Jobs
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-foreground truncate">{job.title}</span>
        </div>

        {/* Job Header Card */}
        <div className="dashboard-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-surface-blue px-2.5 py-0.5 text-xs font-bold text-brand-blue">
                  {job.department}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    job.status === "PUBLISHED"
                      ? "bg-surface-green text-brand-green"
                      : job.status === "ARCHIVED"
                        ? "bg-muted text-muted-foreground"
                        : "bg-surface-peach text-brand-orange"
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl mt-1.5">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" />
                  {job.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <BriefcaseBusiness className="size-3 text-muted-foreground" />
                  {job.employmentType}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" />
                  Posted on {formattedDate}
                </span>
                {job.salaryRange && (job.salaryRange.min || job.salaryRange.max) && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-brand-green font-semibold">
                      <DollarSign className="size-3" />${job.salaryRange.min?.toLocaleString()}
                      {job.salaryRange.max ? ` - $${job.salaryRange.max?.toLocaleString()}` : "+"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-center">
                <span className="text-[10.5px] font-semibold text-muted-foreground block">
                  Total Applicants
                </span>
                <span className="text-xl font-extrabold text-brand-blue">
                  {job.applicationsCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            {[
              {
                key: "applicants",
                label: "Applicants",
                icon: Users,
                count: `${job.applicationsCount || 0}`,
              },
              { key: "pipeline", label: "Pipeline Funnel", icon: SlidersHorizontal },
              { key: "ai-screening", label: "AI Screening", icon: Sparkles },
              { key: "analytics", label: "Analytics", icon: BarChart3 },
              { key: "details", label: "Job Description", icon: FileSearch },
            ].map(({ key, label, icon: TabIcon, count }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as JobTab)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "bg-brand-blue text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <TabIcon className="size-3.5" />
                  <span>{label}</span>
                  {count && (
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9.5px] ${
                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "applicants" && (
          <div className="dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="bg-panel-head text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-3 py-3">AI Semantic Score</th>
                    <th className="px-3 py-3">Stage</th>
                    <th className="px-3 py-3">Applied Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {jobApplicants.map((applicant) => (
                    <tr key={applicant.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-full bg-surface-blue text-xs font-bold text-brand-blue">
                            {applicant.initials}
                          </div>
                          <div>
                            <strong className="block text-xs font-semibold text-foreground">
                              {applicant.name}
                            </strong>
                            <span className="text-[11px] text-muted-foreground">
                              {applicant.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                            applicant.score >= 90
                              ? "bg-surface-green text-brand-green"
                              : "bg-surface-purple text-brand-purple"
                          }`}
                        >
                          <Sparkles className="size-2.5" />
                          {applicant.score}%
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10.5px] font-medium text-foreground">
                          {applicant.status}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-muted-foreground text-[11px]">
                        {applicant.appliedOn}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold text-brand-blue hover:bg-surface-blue gap-1"
                          onClick={() => setSelectedCandidate(applicant)}
                        >
                          <Eye className="size-3" />
                          Review Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="dashboard-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Job Hiring Pipeline Funnel</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                {
                  stage: "Applied",
                  count: job.applicationsCount || 0,
                  color: "bg-blue-500 text-blue-600",
                },
                {
                  stage: "Screening",
                  count: Math.floor((job.applicationsCount || 0) * 0.4),
                  color: "bg-purple-500 text-purple-600",
                },
                {
                  stage: "Interview",
                  count: Math.floor((job.applicationsCount || 0) * 0.15),
                  color: "bg-amber-500 text-amber-600",
                },
                {
                  stage: "Offer",
                  count: Math.floor((job.applicationsCount || 0) * 0.05),
                  color: "bg-emerald-500 text-emerald-600",
                },
                {
                  stage: "Hired",
                  count: Math.floor((job.applicationsCount || 0) * 0.02),
                  color: "bg-teal-500 text-teal-600",
                },
              ].map(({ stage, count }) => (
                <div
                  key={stage}
                  className="rounded-xl border border-border p-4 bg-card text-center space-y-1"
                >
                  <span className="text-xs font-semibold text-muted-foreground block">{stage}</span>
                  <span className="text-2xl font-extrabold text-foreground block">{count}</span>
                  <span className="text-[10px] text-muted-foreground">candidates</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ai-screening" && (
          <div className="dashboard-card p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sparkles className="size-4 text-brand-blue" />
              <h2 className="text-sm font-bold text-foreground">AI Semantic Rubric & Ranking</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidate resumes are embedded via semantic vectors and evaluated against the required
              skill graph for {job.title}.
            </p>
            <div className="rounded-lg bg-surface-green/40 border border-brand-green/20 p-3 text-xs text-brand-green">
              Top Candidates are automatically ranked by skill alignment across{" "}
              {job.skills?.join(", ") || "required criteria"}.
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="dashboard-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
              Recruitment Velocity & Metrics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3.5 bg-muted/20">
                <span className="text-xs text-muted-foreground block">Time to First Screen</span>
                <span className="text-xl font-bold text-foreground">1.8 days</span>
              </div>
              <div className="rounded-lg border border-border p-3.5 bg-muted/20">
                <span className="text-xs text-muted-foreground block">
                  Interview Conversion Rate
                </span>
                <span className="text-xl font-bold text-brand-green">33.3%</span>
              </div>
              <div className="rounded-lg border border-border p-3.5 bg-muted/20">
                <span className="text-xs text-muted-foreground block">AI Accuracy Rating</span>
                <span className="text-xl font-bold text-brand-blue">96.4%</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "details" && (
          <div className="dashboard-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
              Job Description & Responsibilities
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
            {job.skills && job.skills.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-bold text-foreground mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-surface-blue px-2.5 py-1 text-xs font-semibold text-brand-blue"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          candidate={selectedCandidate}
          open={selectedCandidate !== null}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
        />
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  UserRound,
  RefreshCw,
  Building,
  CheckCircle2,
  Layers,
  Search,
  Video,
  PhoneCall,
  MessageSquare,
  Bell,
  BellRing,
  Sliders,
  EyeOff,
  CheckCircle,
  XCircle,
  Info,
  Lock,
  UserCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminApplicant } from "@/hooks/use-admin-applicants";
import type { UserStatus } from "@/server/types/user-types";

// ─── Status Badge Mappings ───────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; dot: string; cls: string }> = {
  ACTIVE: {
    label: "Active",
    dot: "bg-emerald-500",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    dot: "bg-yellow-500",
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  },
  SUSPENDED: {
    label: "Suspended",
    dot: "bg-amber-500",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  LOCKED: {
    label: "Locked",
    dot: "bg-red-500",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  },
  DEACTIVATED: {
    label: "Deactivated",
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
  INACTIVE: {
    label: "Inactive",
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
};

function StatusBadge({ status }: { status: UserStatus }) {
  const badge = STATUS_BADGE[status] || {
    label: status,
    dot: "bg-slate-400",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "MMM d, yyyy");
  } catch {
    return isoString;
  }
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "MMM d, yyyy h:mm a");
  } catch {
    return isoString;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type DetailTab =
  | "overview"
  | "resume"
  | "applications"
  | "interviews"
  | "messaging"
  | "notifications"
  | "preferences"
  | "account";

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminApplicantDetailView({ applicantId }: { applicantId: string }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [copiedId, setCopiedId] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminApplicant(applicantId);

  const handleCopyId = () => {
    if (!applicantId) return;
    navigator.clipboard.writeText(applicantId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ─── Loading Skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Top Back Link Skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>

        {/* Profile Header Skeleton */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3 flex-1">
              <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="h-10 w-80 bg-slate-200 dark:bg-slate-800 rounded-lg" />

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ─── 404 Not Found State ───────────────────────────────────────────────────
  const is404 =
    (error && "status" in (error as any) && (error as any).status === 404) ||
    (!isLoading && !data?.applicant);

  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Applicant Not Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
          No applicant record matches ID{" "}
          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {applicantId}
          </span>
          . The record may have been deleted or the ID is invalid.
        </p>
        <Link
          to="/admin/applicants"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Applicants List
        </Link>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-800 dark:text-red-200">
          Failed to load applicant details
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-4">
          {error instanceof Error ? error.message : "An unexpected server error occurred."}
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="gap-2 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
          <Link
            to="/admin/applicants"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Applicants
          </Link>
        </div>
      </div>
    );
  }

  const applicant = data!.applicant;
  const resumes = data!.resumes || (applicant.resume ? [applicant.resume] : []);
  const applications = data!.applications || [];
  const interviews = data!.interviews || [];
  const conversations = data!.conversations || [];
  const notifications = data!.notifications || [];
  const preferences = data!.preferences;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/admin/applicants"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applicants
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar Initials */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-sm flex-shrink-0">
              {getInitials(applicant.name || "A")}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {applicant.name}
                </h1>
                <StatusBadge status={applicant.status} />
                {applicant.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Email
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    Unverified Email
                  </span>
                )}
              </div>

              {applicant.headline && (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {applicant.headline}
                </p>
              )}

              {/* Quick Contact & Metadata Pills */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {applicant.email}
                </span>

                {applicant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {applicant.phone}
                  </span>
                )}

                {applicant.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {applicant.location}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined {formatDate(applicant.createdAt)}
                </span>

                {applicant.lastActive && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Last Active {formatDate(applicant.lastActive)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex md:flex-col items-center md:items-end gap-3 self-stretch md:self-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Applications
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {applicant.applicationsCount || 0}
              </p>
            </div>

            {applicant.resume?.atsScore != null && (
              <div className="text-left md:text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  ATS Score
                </span>
                <div className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-lg">{applicant.resume.atsScore}</span>
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <UserRound className="w-4 h-4" />
          Profile Overview
        </button>

        <button
          onClick={() => setActiveTab("resume")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "resume"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Resumes & ATS
          {resumes.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {resumes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("applications")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "applications"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Applications
          {applications.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {applications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("interviews")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "interviews"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Video className="w-4 h-4" />
          Interviews
          {interviews.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {interviews.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("messaging")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "messaging"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Messaging
          {conversations.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {conversations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "notifications"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
          {notifications.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {notifications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "preferences"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Preferences
        </button>

        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "account"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Account & Security
        </button>
      </div>

      {/* Tab 1: Profile Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio / Summary */}
            {applicant.summary && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-indigo-600" />
                  Professional Summary
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {applicant.summary}
                </p>
              </div>
            )}

            {/* Experience Section */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Work Experience
              </h2>

              {applicant.experiences && applicant.experiences.length > 0 ? (
                <div className="space-y-6">
                  {applicant.experiences.map((exp: any, idx: number) => (
                    <div
                      key={idx}
                      className="border-l-2 border-indigo-200 dark:border-indigo-900/60 pl-4 py-1 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {exp.position || exp.title || "Position"}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {exp.startDate || "—"} - {exp.current ? "Present" : exp.endDate || "—"}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <span>{exp.company || "Company"}</span>
                        {exp.location && (
                          <span className="text-slate-400 font-normal flex items-center gap-0.5">
                            • <MapPin className="w-3 h-3" /> {exp.location}
                          </span>
                        )}
                      </div>

                      {exp.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed mt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No experience entries recorded in applicant profile.
                </p>
              )}
            </div>

            {/* Education Section */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Education
              </h2>

              {applicant.education && applicant.education.length > 0 ? (
                <div className="space-y-4">
                  {applicant.education.map((edu: any, idx: number) => (
                    <div
                      key={idx}
                      className="border-l-2 border-emerald-200 dark:border-emerald-900/60 pl-4 py-1 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {edu.degree || "Degree"}{" "}
                          {edu.fieldOfStudy || edu.field
                            ? `in ${edu.fieldOfStudy || edu.field}`
                            : ""}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {edu.startDate || "—"} - {edu.endDate || "—"}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {edu.institution || edu.school || "Institution"}
                      </p>

                      {edu.gpa && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          GPA: <span className="font-semibold">{edu.gpa}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No education entries recorded in applicant profile.
                </p>
              )}
            </div>

            {/* Projects Section */}
            {applicant.projects && applicant.projects.length > 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  Projects & Portfolio
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  {applicant.projects.map((proj: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {proj.title || proj.name || `Project ${idx + 1}`}
                        </h3>
                        {(proj.url || proj.link) && (
                          <a
                            href={proj.url || proj.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 text-xs"
                          >
                            View Link <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {proj.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {proj.description}
                        </p>
                      )}

                      {(proj.technologies || proj.skills) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(Array.isArray(proj.technologies)
                            ? proj.technologies
                            : Array.isArray(proj.skills)
                              ? proj.skills
                              : String(proj.technologies || "").split(",")
                          ).map((t: string, tidx: number) => (
                            <span
                              key={tidx}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            >
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applications Preview Section */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Job Applications ({applications.length})
                </h2>
                {applications.length > 0 && (
                  <button
                    onClick={() => setActiveTab("applications")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View all ({applications.length}) →
                  </button>
                )}
              </div>

              {applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.slice(0, 3).map((app: any, idx: number) => {
                    const job = app.job;
                    return (
                      <div
                        key={app.id || idx}
                        className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {job?.title || app.jobTitle || "Job Listing"}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              {job?.company || "TalentTrack Enterprise"}
                            </span>
                            {job?.location && (
                              <span className="flex items-center gap-1">
                                • <MapPin className="w-3 h-3 text-slate-400" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {app.aiScore != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <Sparkles className="w-3 h-3" />
                              {app.aiScore}% Match
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                            {app.status || "APPLIED"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No applications found for this applicant.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Skills Cloud */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Skills & Competencies
              </h2>

              {applicant.skills && applicant.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {applicant.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  No skills specified.
                </p>
              )}
            </div>

            {/* Certifications */}
            {applicant.certifications && applicant.certifications.length > 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Certifications
                </h2>

                <div className="space-y-3">
                  {applicant.certifications.map((cert: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
                    >
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {cert.name || cert.title}
                      </h3>
                      {cert.issuer && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Issued by {cert.issuer}
                        </p>
                      )}
                      {cert.issueDate && (
                        <p className="text-[10px] text-slate-400">Date: {cert.issueDate}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Quick Specs */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Applicant Metadata
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Applicant ID</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span>{applicant.id.slice(0, 10)}...</span>
                    <button
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-slate-600"
                      title="Copy full ID"
                    >
                      {copiedId ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Account Status</span>
                  <StatusBadge status={applicant.status} />
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Email Verified</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {applicant.emailVerified ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Created Date</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {formatDate(applicant.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Last Profile Update</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {formatDate(applicant.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Resumes & ATS */}
      {activeTab === "resume" && (
        <div className="space-y-6">
          {resumes.length > 0 ? (
            <div className="space-y-6">
              {resumes.map((res: any, idx: number) => {
                const parsed = res.parsedProfile || {};
                return (
                  <div
                    key={res.id || idx}
                    className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5"
                  >
                    {/* Resume Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {res.originalFileName || res.fileName || `Resume #${idx + 1}`}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>Uploaded {formatDateTime(res.uploadedAt)}</span>
                            {res.fileSize && <span>• {formatFileSize(res.fileSize)}</span>}
                            {res.mimeType && <span>• {res.mimeType}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status / ATS Pill */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            res.parsingStatus === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : res.parsingStatus === "FAILED"
                                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300"
                                : "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300"
                          }`}
                        >
                          Parsing: {res.parsingStatus || "COMPLETED"}
                        </span>

                        {res.atsScore != null && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            ATS Score: {res.atsScore}/100
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extracted Profile Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Extracted Candidate Profile
                        </span>
                        <div className="space-y-1">
                          <p className="text-slate-900 dark:text-slate-100 font-medium">
                            {parsed.headline || applicant.headline || "Headline not extracted"}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {parsed.summary || applicant.summary || "Summary not extracted"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Extracted Skills ({parsed.skills?.length || applicant.skills?.length || 0}
                          )
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(parsed.skills || applicant.skills || []).map(
                            (s: string, sidx: number) => (
                              <span
                                key={sidx}
                                className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-[11px]"
                              >
                                {s}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No Resumes Uploaded
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                This applicant has not uploaded any resume documents yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Applications & Resolved Jobs */}
      {activeTab === "applications" && (
        <div className="space-y-6">
          {applications.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    Applied Positions & Hiring Progress
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time applications submitted by candidate across company job openings.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                  Total: {applications.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {applications.map((app: any, idx: number) => {
                  const job = app.job;
                  const hasJob = !!job;

                  return (
                    <div
                      key={app.id || idx}
                      className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                    >
                      {/* Application Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {job?.title || app.jobTitle || "Job Listing"}
                            </h3>

                            {/* Job Status / Type */}
                            {hasJob ? (
                              <>
                                {job.type && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {job.type}
                                  </span>
                                )}
                                {job.status && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      job.status === "PUBLISHED"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                  >
                                    Job: {job.status}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Job Opening Archived/Deleted
                              </span>
                            )}
                          </div>

                          {/* Company & Department info */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {job?.company || app.companyName || "TalentTrack Enterprise"}
                            </span>

                            {job?.department && (
                              <span className="flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                {job.department}
                              </span>
                            )}

                            {job?.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status & Stage Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                            Status: {app.status || "APPLIED"}
                          </span>

                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300">
                            Stage: {app.currentStage || "APPLIED"}
                          </span>
                        </div>
                      </div>

                      {/* Application Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                            Application ID
                          </span>
                          <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
                            {app.id}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                            Applied Date
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {formatDateTime(app.appliedAt || app.createdAt)}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                            ATS / AI Match Score
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {app.aiScore != null || app.atsScore != null ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                {app.aiScore ?? app.atsScore}/100
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Not available</span>
                            )}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                            Attached Resume
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium truncate flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">
                              {app.resume?.originalFileName || "Default Candidate Resume"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Optional Cover Letter */}
                      {app.coverLetter && (
                        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                            Candidate Cover Letter / Note:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "{app.coverLetter}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No Applications Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                This applicant has not applied to any job listings on the platform.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Interviews */}
      {activeTab === "interviews" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Verified Interview Schedule
              </p>
              <p className="mt-0.5">
                Displays real interview records from the platform database. Stage indicators without
                scheduled records are excluded.
              </p>
            </div>
          </div>

          {interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((interview: any) => {
                const statusStyles: Record<string, string> = {
                  SCHEDULED:
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                  COMPLETED:
                    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                  RESCHEDULED:
                    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                  CANCELLED:
                    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
                  NO_SHOW:
                    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
                };
                const badgeClass =
                  statusStyles[interview.status] || "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div
                    key={interview.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {interview.title || "Scheduled Interview"}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
                          >
                            {interview.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {interview.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          Interview ID: {interview.id}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 font-medium">Scheduled For</span>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatDateTime(interview.scheduledAt)}
                        </p>
                        {interview.timezone && (
                          <span className="text-[11px] text-slate-500">({interview.timezone})</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                          Job Position
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {interview.job?.title || "Role Reference"}
                        </p>
                        <p className="text-slate-500 text-[11px] truncate">
                          {interview.job?.company || "TalentTrack AI"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                          Duration
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          {interview.durationMinutes
                            ? `${interview.durationMinutes} Minutes`
                            : "30 Minutes"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                          Application ID
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate">
                          {interview.applicationId || "N/A"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                          Meeting Details
                        </span>
                        {interview.meetingUrl ? (
                          <a
                            href={interview.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                          >
                            Join URL
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-slate-500">{interview.location || "Online"}</p>
                        )}
                      </div>
                    </div>

                    {/* Interviewers list if present */}
                    {interview.interviewers && interview.interviewers.length > 0 && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Assigned Interviewers & Hiring Team:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {interview.interviewers.map((intv: any) => (
                            <span
                              key={intv.id || intv.email}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              <UserCheck className="w-3 h-3 text-indigo-500" />
                              {intv.name} ({intv.role})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instructions / Notes */}
                    {interview.instructions && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Candidate Instructions:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {interview.instructions}
                        </p>
                      </div>
                    )}

                    {interview.notes && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Interviewer / Recruiter Notes:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {interview.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Video className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No Interviews Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No interviews found for this applicant.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Messaging & Conversations */}
      {activeTab === "messaging" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20 flex items-start gap-3 text-xs text-indigo-800 dark:text-indigo-300">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Confidentiality & Privacy Policy</p>
              <p className="mt-0.5 text-indigo-700/80 dark:text-indigo-300/80">
                Direct message bodies are hidden by default to protect candidate-recruiter privacy.
                Only conversation metadata, participant info, unread counters, and timestamps are
                displayed.
              </p>
            </div>
          </div>

          {conversations.length > 0 ? (
            <div className="space-y-4">
              {conversations.map((conv: any) => (
                <div
                  key={conv.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Conversation Thread
                          </h3>
                          {conv.unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                              {conv.unreadCount} unread
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {conv.id}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-xs">
                      <span className="text-slate-400 font-medium">Last Active</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDateTime(conv.lastMessageAt || conv.updatedAt || conv.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                        Participant
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {conv.participant?.name || "Team Member"}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {conv.participant?.email || "Direct messaging participant"}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                        Associated Job
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium truncate">
                        {conv.job?.title || "Direct Candidate Inquiry"}
                      </p>
                      <p className="text-slate-500 text-[11px] truncate">
                        {conv.job?.company || "TalentTrack AI"}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                        Application Ref
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate">
                        {conv.applicationId || "N/A"}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Created {formatDate(conv.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2 text-slate-500">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Message content is encrypted and private to participants.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No Conversations Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No conversations found for this applicant.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Notifications */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
            <EyeOff className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Read-Only Audit View
              </p>
              <p className="mt-0.5">
                Viewing notifications from the Admin console does not mark them as read for the
                applicant. True read/unread states are preserved.
              </p>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notif: any) => {
                const isRead = !!notif.readAt;

                return (
                  <div
                    key={notif.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isRead
                            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {notif.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {notif.type}
                          </span>
                          {isRead ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Read ({formatDate(notif.readAt)})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                              Unread
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                          {notif.jobId && <span>Job ID: {notif.jobId}</span>}
                          {notif.applicationId && <span>App ID: {notif.applicationId}</span>}
                          {notif.interviewId && <span>Interview ID: {notif.interviewId}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-400 flex-shrink-0">
                      <span>{formatDateTime(notif.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No Notifications Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No notifications found for this applicant.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Applicant Preferences */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Candidate Managed Preferences
              </p>
              <p className="mt-0.5">
                These settings represent candidate communication and alert preferences configured in
                the Applicant Portal. This view is strictly read-only for administrators.
              </p>
            </div>
          </div>

          {preferences ? (
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Notification & Communication Preferences
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Application Status Updates
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Receive notifications and email updates when application review stages change.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      preferences.applicationStatusUpdates
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {preferences.applicationStatusUpdates ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Interview Reminders
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Receive automated reminders before scheduled screening calls and technical
                      rounds.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      preferences.interviewReminders
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {preferences.interviewReminders ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Job Recommendation Alerts
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Receive curated recommendations tailored to applicant resume ATS score and
                      skills.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      preferences.jobRecommendationAlerts
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {preferences.jobRecommendationAlerts ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Direct Message Notifications
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Receive real-time alerts when recruiters or hiring managers send new messages.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      preferences.messageNotifications
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {preferences.messageNotifications ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Email Notifications
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Receive digests, activity summaries, and platform news via verified email
                      address.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      preferences.emailNotifications
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {preferences.emailNotifications ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                <span>Created {formatDate(preferences.createdAt)}</span>
                <span>Last Updated {formatDate(preferences.updatedAt)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Sliders className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No Preferences Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No preferences configured.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Account & Security */}
      {activeTab === "account" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Identity & Access Control
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">User ObjectId</span>
                <span className="font-mono text-xs text-slate-900 dark:text-slate-100">
                  {applicant.id}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">System Role</span>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  {applicant.role}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Account Status</span>
                <StatusBadge status={applicant.status} />
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Email Verification Status</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {applicant.emailVerified
                    ? `Verified (${formatDateTime(applicant.emailVerifiedAt)})`
                    : "Not Verified"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Audit Timestamps
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Account Created</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {formatDateTime(applicant.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Last Profile Update</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {formatDateTime(applicant.updatedAt)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Last Activity Recorded</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {formatDateTime(applicant.lastActive)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

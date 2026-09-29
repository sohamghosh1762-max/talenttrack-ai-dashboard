"use client";

import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { recentApplicantsData, type Applicant } from "@/data/mockData";

export const Route = createFileRoute("/candidates/$candidateId")({
  head: () => ({
    meta: [
      { title: "Candidate Profile Details — TalentTrack AI" },
      {
        name: "description",
        content:
          "Comprehensive candidate profile, resume extraction, AI match breakdown, and recruiter notes.",
      },
    ],
  }),
  component: RecruiterCandidateDetailPage,
});

type CandidateTab =
  "overview" | "resume" | "applications" | "ai-match" | "interviews" | "notes" | "activity";

function RecruiterCandidateDetailPage() {
  const { candidateId } = useParams({ from: "/candidates/$candidateId" });
  const [activeTab, setActiveTab] = useState<CandidateTab>("overview");

  const candidate: Applicant = recentApplicantsData.find((c) => c.id === candidateId) || {
    id: candidateId,
    name: "Aarav Mehta",
    email: "aarav@gmail.com",
    job: "Frontend Developer",
    score: 92,
    status: "Shortlisted",
    initials: "AM",
    appliedOn: "Sep 14, 2025",
    phone: "+1 (555) 234-5678",
    location: "San Jose, CA",
    experience: "4 years",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
    summary:
      "Senior Frontend Engineer specializing in responsive web applications and state management architectures.",
  };

  const [notes, setNotes] = useState([
    {
      id: "note-1",
      author: "Rahul Mehta (Recruiter)",
      date: "Sep 15, 2025 at 2:30 PM",
      text: "Candidate has strong communication skills and answered all architecture questions confidently. Recommended for final executive round.",
    },
  ]);
  const [newNote, setNewNote] = useState("");

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([
      ...notes,
      {
        id: `note-${Date.now()}`,
        author: "You (Recruiter)",
        date: "Just now",
        text: newNote.trim(),
      },
    ]);
    setNewNote("");
  };

  const tabs: { key: CandidateTab; label: string; icon: typeof User }[] = [
    { key: "overview", label: "Overview & Bio", icon: User },
    { key: "resume", label: "Resume & Skills", icon: FileText },
    { key: "applications", label: "Applications", icon: FileCheck },
    { key: "ai-match", label: "AI Match Score", icon: Sparkles },
    { key: "interviews", label: "Interviews", icon: Calendar },
    { key: "notes", label: "Recruiter Notes", icon: MessageSquare },
    { key: "activity", label: "Activity Log", icon: Activity },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/candidates" className="text-brand-blue hover:underline font-semibold">
            Candidates
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-foreground truncate">{candidate.name}</span>
        </div>

        {/* Candidate Profile Header Card */}
        <div className="dashboard-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-surface-blue text-lg font-bold text-brand-blue ring-2 ring-brand-blue/20">
                {candidate.initials}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                    {candidate.name}
                  </h1>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10.5px] font-bold text-foreground">
                    {candidate.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-brand-blue mt-0.5">{candidate.job}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1">
                    <Mail className="size-3 text-muted-foreground" />
                    {candidate.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 text-muted-foreground" />
                    {candidate.phone}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-muted-foreground" />
                    {candidate.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="rounded-xl border border-brand-green/30 bg-surface-green p-3 text-center">
                <div className="flex items-center gap-1 text-[11px] font-bold text-brand-green">
                  <Sparkles className="size-3.5" />
                  Semantic Match
                </div>
                <span className="text-2xl font-black text-brand-green">{candidate.score}%</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            {tabs.map(({ key, label, icon: TabIcon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "bg-brand-blue text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <TabIcon className="size-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Canvas */}
        <div className="dashboard-card p-5 sm:p-6">
          {/* 1. Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
                Candidate Summary & Qualifications
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{candidate.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border border-border p-3.5 bg-muted/20 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Total Experience
                  </span>
                  <div className="text-sm font-bold text-foreground">{candidate.experience}</div>
                </div>
                <div className="rounded-lg border border-border p-3.5 bg-muted/20 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Location Preference
                  </span>
                  <div className="text-sm font-bold text-foreground">
                    {candidate.location} (Hybrid / Remote)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Resume & Skills */}
          {activeTab === "resume" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground">
                  Extracted Resume & Competencies
                </h2>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                  <Download className="size-3.5" />
                  Download PDF Resume
                </Button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground">Key Technical Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills?.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-surface-blue px-2.5 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border p-4 bg-muted/20 text-xs text-muted-foreground text-center">
                Attached Resume: <strong>{candidate.name.replace(" ", "_")}_Resume.pdf</strong>{" "}
                (Parsed & Verified via NLP)
              </div>
            </div>
          )}

          {/* 3. Applications */}
          {activeTab === "applications" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
                Application History
              </h2>
              <div className="rounded-lg border border-border p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">{candidate.job}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    Applied on {candidate.appliedOn}
                  </span>
                </div>
                <span className="rounded bg-surface-green px-2 py-0.5 text-[10.5px] font-bold text-brand-green">
                  {candidate.status}
                </span>
              </div>
            </div>
          )}

          {/* 4. AI Match */}
          {activeTab === "ai-match" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Sparkles className="size-4 text-brand-green" />
                <h2 className="text-sm font-bold text-foreground">Semantic AI Scoring Analysis</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {candidate.name} scored <strong>{candidate.score}%</strong> match alignment for{" "}
                <strong>{candidate.job}</strong> based on semantic similarity of past project
                responsibilities, technical skill depth, and experience duration.
              </p>
            </div>
          )}

          {/* 5. Interviews */}
          {activeTab === "interviews" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground">Candidate Interview Schedule</h2>
                <Link to="/interviews">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                    <Plus className="size-3.5" />
                    Schedule Interview
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg border border-border p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Technical Architecture Round
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Oct 2, 2025 at 3:00 PM EST
                  </span>
                </div>
                <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green">
                  Scheduled
                </span>
              </div>
            </div>
          )}

          {/* 6. Recruiter Notes */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
                Internal Recruiter Evaluation Notes
              </h2>

              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-border p-3.5 bg-muted/20 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <strong className="text-foreground font-semibold">{note.author}</strong>
                      <span className="text-muted-foreground">{note.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddNote} className="space-y-2 pt-2">
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add evaluation notes about this candidate..."
                  className="w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:border-brand-blue"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-brand-blue text-primary-foreground text-xs gap-1.5"
                >
                  <Send className="size-3.5" />
                  Add Note
                </Button>
              </form>
            </div>
          )}

          {/* 7. Activity */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
                Candidate Timeline & Activity Log
              </h2>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-surface-green text-brand-green text-[10px] font-bold mt-0.5">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">
                      Advanced to Interview Stage
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Sep 15, 2025 by Rahul Mehta
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-surface-blue text-brand-blue text-[10px] font-bold mt-0.5">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">
                      AI Screening Score Calculated (92%)
                    </span>
                    <span className="block text-[11px] text-muted-foreground">Sep 14, 2025</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold mt-0.5">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Application Submitted</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {candidate.appliedOn}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, FileText, Save, Sparkles, Upload, User } from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";

export const Route = createFileRoute("/applicant/profile")({
  head: () => ({
    meta: [
      { title: "Candidate Profile — TalentTrack AI" },
      { name: "description", content: "Manage your professional headline, location, and skills." },
    ],
  }),
  component: ApplicantProfilePage,
});

function ApplicantProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "Aarav Mehta");
  const [email, setEmail] = useState(user?.email || "aarav.mehta@example.com");
  const [headline, setHeadline] = useState(
    user?.applicantProfile?.headline || "Senior Frontend Engineer | React & TypeScript",
  );
  const [location, setLocation] = useState(user?.applicantProfile?.location || "San Jose, CA");
  const [skills, setSkills] = useState(
    user?.applicantProfile?.skills?.join(", ") || "React, TypeScript, Next.js, Tailwind CSS, Redux",
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <ApplicantLayout>
      <div className="space-y-4 max-w-3xl">
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-green text-brand-green">
                <User className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                My Profile & Resume
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Manage your candidate information for AI match scoring.
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5"
          >
            {isSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            {isSaved ? "Profile Saved" : "Save Profile"}
          </Button>
        </section>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="dashboard-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="h-9.5 w-full rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Core Technical Skills (Comma-separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Resume Upload Placeholder Card */}
          <div className="dashboard-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
              <FileText className="size-4 text-brand-blue" />
              Attached Resume
            </h2>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-surface-blue text-brand-blue">
                  <FileText className="size-5" />
                </div>
                <div>
                  <strong className="block text-xs text-foreground">
                    {user?.applicantProfile?.resumeFileName || "Aarav_Mehta_Resume_2025.pdf"}
                  </strong>
                  <span className="text-[10px] text-muted-foreground">
                    Uploaded on Sep 10, 2025 • PDF (1.2 MB)
                  </span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Upload className="size-3.5" />
                Update Resume
              </Button>
            </div>

            <div className="rounded-lg bg-surface-blue/50 p-3 border border-brand-blue/20 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-brand-blue shrink-0" />
              <span>
                Your resume will be automatically parsed for skill extraction and matched with
                relevant recruiter job openings.
              </span>
            </div>
          </div>
        </form>
      </div>
    </ApplicantLayout>
  );
}

"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Lock, Save, Settings, Shield } from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/applicant/settings")({
  head: () => ({
    meta: [
      { title: "Candidate Account Settings — TalentTrack AI" },
      {
        name: "description",
        content: "Manage your candidate account and notification preferences.",
      },
    ],
  }),
  component: ApplicantSettingsPage,
});

function ApplicantSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
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
              <span className="grid size-8 place-items-center rounded-lg bg-surface-purple text-brand-purple">
                <Settings className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                Account Settings
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Manage your candidate notifications and privacy preferences.
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5"
          >
            {isSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            {isSaved ? "Saved Changes" : "Save Preferences"}
          </Button>
        </section>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="dashboard-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
              <Bell className="size-4 text-brand-blue" />
              Notification Settings
            </h2>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                <div>
                  <strong className="block text-xs font-bold text-foreground">
                    Job Application Status Updates
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Receive instant notifications when recruiters advance your stage.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="size-4 text-brand-blue rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                <div>
                  <strong className="block text-xs font-bold text-foreground">
                    Interview Reminders
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Get email alerts 1 hour before scheduled interviews.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={interviewReminders}
                  onChange={(e) => setInterviewReminders(e.target.checked)}
                  className="size-4 text-brand-blue rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                <div>
                  <strong className="block text-xs font-bold text-foreground">
                    AI Recommended Job Alerts (90%+)
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Get notified when new jobs match your skill profile.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={matchAlerts}
                  onChange={(e) => setMatchAlerts(e.target.checked)}
                  className="size-4 text-brand-blue rounded"
                />
              </label>
            </div>
          </div>

          <div className="dashboard-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
              <Shield className="size-4 text-brand-green" />
              Privacy & Data Control
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your resume is only shared with companies you explicitly apply to. You can delete your
              candidate profile or update uploaded documents at any time.
            </p>
          </div>
        </form>
      </div>
    </ApplicantLayout>
  );
}

"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Globe, Lock, Save, Settings, ShieldCheck, User } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { recruiterProfile } from "@/data/mockData";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Recruiter Account Settings — TalentTrack AI" },
      {
        name: "description",
        content: "Manage your recruiter account and application preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [name, setName] = useState(recruiterProfile.name);
  const [email, setEmail] = useState(recruiterProfile.email);
  const [role, setRole] = useState(recruiterProfile.role);
  const [dept, setDept] = useState(recruiterProfile.department);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-purple text-brand-purple">
                <Settings className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Settings</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Manage your recruiter account and application preferences.
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5"
          >
            {isSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            {isSaved ? "Saved Changes" : "Save Settings"}
          </Button>
        </section>

        {/* Profile Settings Card */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="dashboard-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <User className="size-4 text-brand-blue" />
              <h2 className="text-sm font-bold text-foreground">Recruiter Profile</h2>
            </div>

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
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Hiring Team / Department
                </label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="dashboard-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Bell className="size-4 text-brand-orange" />
              <h2 className="text-sm font-bold text-foreground">Notification Preferences</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                <div>
                  <strong className="block text-xs font-bold text-foreground">
                    Email Digest of New Applications
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Receive daily morning summary of qualified applicants.
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
                    AI Match Score Alerts (90%+)
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Instant alerts when a high-potential profile matches job criteria.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={aiAlerts}
                  onChange={(e) => setAiAlerts(e.target.checked)}
                  className="size-4 text-brand-blue rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                <div>
                  <strong className="block text-xs font-bold text-foreground">
                    Interview Schedule Reminders
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Calendar notification 15 minutes prior to scheduled interviews.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={interviewReminders}
                  onChange={(e) => setInterviewReminders(e.target.checked)}
                  className="size-4 text-brand-blue rounded"
                />
              </label>
            </div>
          </div>

          {/* ATS Security & Compliance */}
          <div className="dashboard-card p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <ShieldCheck className="size-4 text-brand-green" />
              <h2 className="text-sm font-bold text-foreground">ATS Security & Data Governance</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidate resumes and evaluation metrics in TalentTrack AI comply with standard data
              retention policies. Full RBAC and SAML/SSO integration will be configurable in Phase
              2.
            </p>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

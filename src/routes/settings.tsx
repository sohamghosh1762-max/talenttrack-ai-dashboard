"use client";

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Lock, Save, Settings, ShieldCheck, User, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { recruiterProfile } from "@/data/mockData";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import {
  useRecruiterSettings,
  useUpdateRecruiterSettings,
  useChangePassword,
} from "@/hooks/api/useRecruiterSettings";

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
  const { refreshUser } = useAuth();
  const { data: serverSettings, isLoading } = useRecruiterSettings();
  const updateSettings = useUpdateRecruiterSettings();
  const changePassword = useChangePassword();

  const [name, setName] = useState(recruiterProfile.name);
  const [email, setEmail] = useState(recruiterProfile.email);
  const [role, setRole] = useState(recruiterProfile.role);
  const [dept, setDept] = useState(recruiterProfile.department);
  const [companyName, setCompanyName] = useState((recruiterProfile as any).companyName || "TalentTrack AI");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (serverSettings) {
      setName(serverSettings.name || recruiterProfile.name);
      setEmail(serverSettings.email || recruiterProfile.email);
      setRole(serverSettings.role || recruiterProfile.role);
      setDept(serverSettings.department || recruiterProfile.department);
      setCompanyName(serverSettings.companyName || "TalentTrack AI");
      if (serverSettings.notificationPreferences) {
        setEmailAlerts(serverSettings.notificationPreferences.emailAlerts ?? true);
        setAiAlerts(serverSettings.notificationPreferences.aiAlerts ?? true);
        setInterviewReminders(serverSettings.notificationPreferences.interviewReminders ?? true);
      }
    }
  }, [serverSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        name,
        email,
        role,
        department: dept,
        companyName,
        notificationPreferences: {
          emailAlerts,
          aiAlerts,
          interviewReminders,
        },
      });
      await refreshUser();
      toast.success("Settings saved successfully!");
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
      console.error("Failed to save settings:", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: "error", text: "Please enter both current and new password." });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "Failed to change password." });
    }
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
            disabled={updateSettings.isPending || isLoading}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5"
          >
            {updateSettings.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isSaved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {updateSettings.isPending ? "Saving..." : isSaved ? "Saved Changes" : "Save Settings"}
          </Button>
        </section>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Profile Settings Card */}
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
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
          </form>
        )}

        {/* Change Password Card */}
        <form onSubmit={handleChangePassword} className="dashboard-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Lock className="size-4 text-brand-purple" />
            <h2 className="text-sm font-bold text-foreground">Change Password</h2>
          </div>

          {passwordMsg && (
            <div
              className={`p-2.5 rounded-md text-xs ${
                passwordMsg.type === "success"
                  ? "bg-surface-green text-brand-green border border-brand-green/30"
                  : "bg-surface-peach text-brand-orange border border-brand-orange/30"
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="outline"
            disabled={changePassword.isPending}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {changePassword.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Update Password
          </Button>
        </form>

        {/* ATS Security & Compliance */}
        <div className="dashboard-card p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <ShieldCheck className="size-4 text-brand-green" />
            <h2 className="text-sm font-bold text-foreground">ATS Security & Data Governance</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Candidate resumes and evaluation metrics in TalentTrack AI comply with standard data
            retention policies. Full RBAC and SAML/SSO integration are configured for your recruiter account.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}


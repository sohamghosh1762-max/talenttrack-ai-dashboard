"use client";

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Check,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Calendar,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useApplicantSettings, useUpdateApplicantSettings } from "@/hooks/api/useApplicantSettings";

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
  const { data: settings, isLoading, isError, refetch } = useApplicantSettings();

  const updateSettingsMutation = useUpdateApplicantSettings();

  const [applicationStatusUpdates, setApplicationStatusUpdates] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [jobRecommendationAlerts, setJobRecommendationAlerts] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state when persistent server data arrives
  useEffect(() => {
    if (settings) {
      setApplicationStatusUpdates(settings.applicationStatusUpdates ?? true);
      setInterviewReminders(settings.interviewReminders ?? true);
      setJobRecommendationAlerts(settings.jobRecommendationAlerts ?? true);
      setMessageNotifications(settings.messageNotifications ?? true);
      setEmailNotifications(settings.emailNotifications ?? true);
    }
  }, [settings]);

  const isDirty =
    settings !== undefined &&
    (applicationStatusUpdates !== settings.applicationStatusUpdates ||
      interviewReminders !== settings.interviewReminders ||
      jobRecommendationAlerts !== settings.jobRecommendationAlerts ||
      messageNotifications !== settings.messageNotifications ||
      emailNotifications !== settings.emailNotifications);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    updateSettingsMutation.mutate(
      {
        applicationStatusUpdates,
        interviewReminders,
        jobRecommendationAlerts,
        messageNotifications,
        emailNotifications,
      },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err: any) => {
          setSaveError(err?.message || "Your preferences could not be saved. Please retry.");
        },
      },
    );
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
              Manage your persistent candidate notifications and privacy preferences.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-semibold text-brand-green flex items-center gap-1 animate-in fade-in">
                <Check className="size-3.5" />
                Preferences saved
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={isLoading || updateSettingsMutation.isPending || !isDirty}
              className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              {updateSettingsMutation.isPending
                ? "Saving..."
                : saveSuccess
                  ? "Saved Preferences"
                  : isDirty
                    ? "Save Preferences"
                    : "Saved"}
            </Button>
          </div>
        </section>

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <div className="dashboard-card p-5 space-y-4 animate-pulse">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-2 rounded-lg bg-muted/40"
                  >
                    <div className="space-y-1.5">
                      <div className="h-3 w-40 bg-muted rounded" />
                      <div className="h-2.5 w-64 bg-muted rounded" />
                    </div>
                    <div className="size-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="dashboard-card p-6 text-center space-y-3 border-destructive/30">
            <p className="text-xs text-destructive font-semibold">
              Unable to load your preferences.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Please check your connection and retry.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Real Persistent Settings Form */}
        {!isLoading && !isError && (
          <form onSubmit={handleSave} className="space-y-4">
            {saveError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                {saveError}
              </div>
            )}

            <div className="dashboard-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Bell className="size-4 text-brand-blue" />
                  Notification Preferences
                </h2>
                {settings?.updatedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Last updated: {new Date(settings.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {/* Application Status Updates */}
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-border/40">
                  <div className="space-y-0.5 pr-4">
                    <strong className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-brand-purple" />
                      Job Application Status Updates
                    </strong>
                    <span className="text-[11px] text-muted-foreground leading-snug block">
                      Receive instant in-app alerts when recruiters advance or change your
                      application stage.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={applicationStatusUpdates}
                    onChange={(e) => setApplicationStatusUpdates(e.target.checked)}
                    className="size-4.5 accent-brand-blue rounded cursor-pointer"
                  />
                </label>

                {/* Interview Reminders */}
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-border/40">
                  <div className="space-y-0.5 pr-4">
                    <strong className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-brand-amber" />
                      Interview Alerts & Updates
                    </strong>
                    <span className="text-[11px] text-muted-foreground leading-snug block">
                      Receive notifications when interviews are scheduled, rescheduled, or
                      cancelled.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={interviewReminders}
                    onChange={(e) => setInterviewReminders(e.target.checked)}
                    className="size-4.5 accent-brand-blue rounded cursor-pointer"
                  />
                </label>

                {/* AI Recommended Job Alerts */}
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-border/40">
                  <div className="space-y-0.5 pr-4">
                    <strong className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-brand-teal" />
                      AI Recommended Job Alerts (90%+)
                    </strong>
                    <span className="text-[11px] text-muted-foreground leading-snug block">
                      Get notified when new jobs match your parsed skill profile and experience.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={jobRecommendationAlerts}
                    onChange={(e) => setJobRecommendationAlerts(e.target.checked)}
                    className="size-4.5 accent-brand-blue rounded cursor-pointer"
                  />
                </label>

                {/* Direct Message Notifications */}
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-border/40">
                  <div className="space-y-0.5 pr-4">
                    <strong className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-brand-blue" />
                      Direct Message Notifications
                    </strong>
                    <span className="text-[11px] text-muted-foreground leading-snug block">
                      Get in-app notifications when hiring managers and recruiters message you.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={messageNotifications}
                    onChange={(e) => setMessageNotifications(e.target.checked)}
                    className="size-4.5 accent-brand-blue rounded cursor-pointer"
                  />
                </label>

                {/* Email Notifications */}
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-border/40">
                  <div className="space-y-0.5 pr-4">
                    <strong className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5 text-brand-teal" />
                      Email Digests & Critical Alerts
                    </strong>
                    <span className="text-[11px] text-muted-foreground leading-snug block">
                      Receive email notifications for critical interview schedules and formal offer
                      letters.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="size-4.5 accent-brand-blue rounded cursor-pointer"
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
                Your resume and personal details are only shared with organizations you explicitly
                apply to. You can update your candidate profile, manage uploaded documents, or
                adjust communication preferences at any time.
              </p>
            </div>
          </form>
        )}
      </div>
    </ApplicantLayout>
  );
}

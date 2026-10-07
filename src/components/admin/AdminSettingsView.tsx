import { useEffect, useState } from "react";
import {
  Building,
  KeyRound,
  Bell,
  UploadCloud,
  Sparkles,
  Shield,
  Sliders,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Server,
  Cpu,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminSettingsService } from "@/data/adminSettingsData";
import type {
  AdminSettings,
  AdminSettingsValidationErrors,
  SettingsCategoryKey,
  NotificationSettings,
  FileUploadSettings,
  AiConfigSettings,
  SecuritySettings,
  PlatformPreferencesSettings,
} from "@/data/adminSettingsTypes";

interface CategoryTab {
  key: SettingsCategoryKey;
  label: string;
  description: string;
  icon: typeof Building;
}

const CATEGORY_TABS: CategoryTab[] = [
  {
    key: "general",
    label: "General",
    description: "Platform branding, legal identity, timezones, and maintenance.",
    icon: Building,
  },
  {
    key: "authentication",
    label: "Authentication",
    description: "2FA requirements, password strength, session timeout & SSO.",
    icon: KeyRound,
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "System dispatch emails, admin alerts, and SMTP gateway.",
    icon: Bell,
  },
  {
    key: "fileUpload",
    label: "File Upload",
    description: "Resume storage limits, file extensions, scanning & retention.",
    icon: UploadCloud,
  },
  {
    key: "aiConfig",
    label: "AI Configuration",
    description: "Scoring models, match thresholds, bias reduction & API keys.",
    icon: Sparkles,
  },
  {
    key: "security",
    label: "Security",
    description: "CORS domains, IP whitelists, rate limiting, and CSP policies.",
    icon: Shield,
  },
  {
    key: "platformPreferences",
    label: "Platform Preferences",
    description: "Default UI theme, refresh rates, table layouts & export formats.",
    icon: Sliders,
  },
];

export function AdminSettingsView() {
  const [settings, setSettings] = useState<AdminSettings>(() => adminSettingsService.getSettings());
  const [savedSettings, setSavedSettings] = useState<AdminSettings>(() =>
    adminSettingsService.getSettings(),
  );
  const [activeTab, setActiveTab] = useState<SettingsCategoryKey>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [errors, setErrors] = useState<AdminSettingsValidationErrors>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    setTestFeedback(null);
  }, [activeTab]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSuccessBanner(null);
    setTestFeedback(null);

    const result = await adminSettingsService.saveSettings(settings);
    setIsSaving(false);

    if (result.success) {
      setSavedSettings(result.settings);
      setErrors({});
      setSuccessBanner("Admin settings updated and applied successfully across the platform.");
      toast.success("Settings saved successfully!");
      setTimeout(() => setSuccessBanner(null), 4000);
    } else {
      setErrors(result.errors);
      toast.error("Failed to save settings. Please resolve validation errors.");
    }
  };

  const handleResetCategory = async (category: SettingsCategoryKey) => {
    const resetValues = await adminSettingsService.resetSettings(category);
    setSettings(resetValues);
    setSavedSettings(resetValues);
    setErrors((prev) => ({ ...prev, [category]: undefined }));
    toast.info(`Reset "${category}" settings to factory defaults.`);
  };

  const handleDiscardChanges = () => {
    setSettings(savedSettings);
    setErrors({});
    toast.info("Discarded all unsaved edits.");
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setTestFeedback(null);
    const res = await adminSettingsService.testSmtpConnection();
    setIsTestingSmtp(false);
    if (res.success) {
      setTestFeedback({ type: "success", message: res.message });
      toast.success("SMTP Connection verified!");
    } else {
      setTestFeedback({ type: "error", message: res.message });
      toast.error("SMTP Connection failed!");
    }
  };

  const handleTestAiKey = async () => {
    setIsTestingAi(true);
    setTestFeedback(null);
    const res = await adminSettingsService.testAiApiKey();
    setIsTestingAi(false);
    if (res.success) {
      setTestFeedback({ type: "success", message: res.message });
      toast.success("AI API Key verified!");
    } else {
      setTestFeedback({ type: "error", message: res.message });
      toast.error("AI API Key validation failed!");
    }
  };

  const currentTabInfo = CATEGORY_TABS.find((t) => t.key === activeTab)!;
  const ActiveIcon = currentTabInfo.icon;

  const genErrors = errors.general;
  const authErrors = errors.authentication;
  const notifErrors = errors.notifications;
  const fileErrors = errors.fileUpload;
  const aiErrors = errors.aiConfig;
  const secErrors = errors.security;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Sliders className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Platform Administration Settings
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure platform governance, authentication tolerances, AI models, security
                policies, and defaults.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save / Discard Action Bar */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
              <AlertTriangle className="size-3.5 shrink-0" />
              Unsaved Edits
            </span>
          )}

          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="size-3.5 text-slate-500" />
              Discard Edits
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 px-4 shadow-sm"
          >
            {isSaving ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Security Credentials Notice Box */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Lock className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Enterprise Security & Credential Protection:
          </span>{" "}
          API keys, passwords, and tokens are stored using zero-trust encrypted vault references.
          Plaintext secret credentials are never exposed in UI responses.
        </div>
      </div>

      {/* Main Container Layout: Left Nav Tabs + Right Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
        {/* Navigation Sidebar / Tabs */}
        <nav
          className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none"
          aria-label="Settings section tabs"
        >
          {CATEGORY_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            const hasSectionError = !!errors[tab.key];

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all text-left whitespace-nowrap lg:whitespace-normal shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-sm dark:bg-blue-600"
                    : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800"
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TabIcon
                    className={`size-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{tab.label}</span>
                </div>

                {hasSectionError && (
                  <span
                    className="size-2 rounded-full bg-rose-500 shrink-0"
                    title="Validation errors in this section"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Form Panel Content */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <ActiveIcon className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {currentTabInfo.label} Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentTabInfo.description}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleResetCategory(activeTab)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 gap-1"
              title="Reset this section to defaults"
            >
              <RotateCcw className="size-3" />
              Reset Section
            </Button>
          </div>

          {/* Test Feedback Notification (if any) */}
          {testFeedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
                testFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {testFeedback.type === "success" ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{testFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestFeedback(null)}
                className="font-bold text-xs"
              >
                ×
              </button>
            </div>
          )}

          {/* SECTION 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Platform Display Name *
                  </label>
                  <input
                    type="text"
                    value={settings.general.platformName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, platformName: e.target.value },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      genErrors?.platformName
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {genErrors?.platformName && (
                    <p className="text-[11px] text-rose-600 mt-1">{genErrors.platformName}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Support Contact Email *
                  </label>
                  <input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, supportEmail: e.target.value },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      genErrors?.supportEmail
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {genErrors?.supportEmail && (
                    <p className="text-[11px] text-rose-600 mt-1">{genErrors.supportEmail}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Legal Enterprise Organization Name *
                  </label>
                  <input
                    type="text"
                    value={settings.general.orgName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, orgName: e.target.value },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  {genErrors?.orgName && (
                    <p className="text-[11px] text-rose-600 mt-1">{genErrors.orgName}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default System Timezone
                  </label>
                  <select
                    value={settings.general.defaultTimezone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, defaultTimezone: e.target.value },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="UTC (GMT+00:00)">UTC (GMT+00:00)</option>
                    <option value="America/New_York (EST)">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/London (GMT)">Europe/London (GMT/BST)</option>
                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                    <option value="Asia/Tokyo (JST)">Asia/Tokyo (JST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary System Language / Locale
                  </label>
                  <select
                    value={settings.general.systemLanguage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, systemLanguage: e.target.value },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="en-US">English (United States) - en-US</option>
                    <option value="en-GB">English (United Kingdom) - en-GB</option>
                    <option value="es-ES">Spanish (Español) - es-ES</option>
                    <option value="fr-FR">French (Français) - fr-FR</option>
                    <option value="de-DE">German (Deutsch) - de-DE</option>
                  </select>
                </div>
              </div>

              {/* Maintenance Mode Box */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="font-bold text-amber-950 dark:text-amber-200 block">
                        Platform Maintenance Mode
                      </span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-400">
                        When enabled, non-admin users will see a maintenance notice banner.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.general.maintenanceMode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, maintenanceMode: e.target.checked },
                      })
                    }
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {settings.general.maintenanceMode && (
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-300 mb-1">
                      Maintenance Notice Message to Users
                    </label>
                    <textarea
                      rows={2}
                      value={settings.general.maintenanceNotice}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          general: { ...settings.general, maintenanceNotice: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-amber-300 bg-white p-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: AUTHENTICATION */}
          {activeTab === "authentication" && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Require 2FA for Administrators
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Mandatory TOTP authenticator verification on login
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.authentication.require2FAAdmin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        authentication: {
                          ...settings.authentication,
                          require2FAAdmin: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Require 2FA for Recruiters
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Enforce 2FA security for recruiter accounts
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.authentication.require2FARecruiter}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        authentication: {
                          ...settings.authentication,
                          require2FARecruiter: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Session Timeout (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={1440}
                    value={settings.authentication.sessionTimeoutMins}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        authentication: {
                          ...settings.authentication,
                          sessionTimeoutMins: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      authErrors?.sessionTimeoutMins
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {authErrors?.sessionTimeoutMins && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      {authErrors.sessionTimeoutMins}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Password Length *
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={32}
                    value={settings.authentication.passwordMinLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        authentication: {
                          ...settings.authentication,
                          passwordMinLength: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      authErrors?.passwordMinLength
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {authErrors?.passwordMinLength && (
                    <p className="text-[11px] text-rose-600 mt-1">{authErrors.passwordMinLength}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Failed Logins (Lockout) *
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={10}
                    value={settings.authentication.maxFailedLogins}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        authentication: {
                          ...settings.authentication,
                          maxFailedLogins: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      authErrors?.maxFailedLogins
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {authErrors?.maxFailedLogins && (
                    <p className="text-[11px] text-rose-600 mt-1">{authErrors.maxFailedLogins}</p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-slate-900 dark:text-slate-100">
                    Require Special Character & Numbers in Passwords
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Passwords must contain at least 1 number and 1 special symbol (@, #, $, etc.)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.authentication.requireSpecialCharAndNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      authentication: {
                        ...settings.authentication,
                        requireSpecialCharAndNumber: e.target.checked,
                      },
                    })
                  }
                  className="size-4 rounded text-blue-600 cursor-pointer"
                />
              </div>

              {/* SSO / SAML Settings Box */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-950 dark:text-blue-200 block">
                      Single Sign-On (SSO / SAML 2.0 Integration)
                    </span>
                    <span className="text-[11px] text-blue-800 dark:text-blue-300">
                      Enable Enterprise Federated Identity Login
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.authentication.enableSSO}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        authentication: {
                          ...settings.authentication,
                          enableSSO: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                {settings.authentication.enableSSO && (
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      Primary Identity Provider (IdP)
                    </label>
                    <select
                      value={settings.authentication.ssoProvider}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          authentication: {
                            ...settings.authentication,
                            ssoProvider: e.target.value,
                          },
                        })
                      }
                      className="h-9.5 w-full rounded-md border border-blue-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-900 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="Okta / Google Workspace">Okta / Google Workspace</option>
                      <option value="Microsoft Azure Active Directory (Entra ID)">
                        Microsoft Azure Active Directory (Entra ID)
                      </option>
                      <option value="OneLogin">OneLogin</option>
                      <option value="Custom SAML 2.0 Provider">Custom SAML 2.0 Provider</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Dispatch Sender Email *
                  </label>
                  <input
                    type="email"
                    value={settings.notifications.notificationSenderEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notificationSenderEmail: e.target.value,
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      notifErrors?.notificationSenderEmail
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {notifErrors?.notificationSenderEmail && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      {notifErrors.notificationSenderEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Digest Frequency
                  </label>
                  <select
                    value={settings.notifications.adminDigestFrequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          adminDigestFrequency: e.target
                            .value as NotificationSettings["adminDigestFrequency"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="Instant (Real-time)">Instant (Real-time)</option>
                    <option value="Daily Summary (08:00 UTC)">Daily Summary (08:00 UTC)</option>
                    <option value="Weekly Digest (Mondays)">Weekly Digest (Mondays)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Send System Alert Emails for Critical Events
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Instant notifications for service disruptions and database degradation
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.enableCriticalAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          enableCriticalAlerts: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Notify Admin on New Recruiter Registration
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Alert admins when employer accounts are awaiting domain verification
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.notifyOnRecruiterReg}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notifyOnRecruiterReg: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Notify Admin on High Risk Security Flags
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Instant alert on failed login bursts or unauthorized API access attempts
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.notifyOnSecurityAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notifyOnSecurityAlerts: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* SMTP Gateway Configuration Card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Outbound SMTP Gateway Settings
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    className="text-xs gap-1.5 h-8"
                  >
                    {isTestingSmtp ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <Server className="size-3 text-blue-600" />
                    )}
                    {isTestingSmtp ? "Testing..." : "Test Email Connection"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Host & Port *
                    </label>
                    <input
                      type="text"
                      value={settings.notifications.smtpServerHost}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            smtpServerHost: e.target.value,
                          },
                        })
                      }
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    {notifErrors?.smtpServerHost && (
                      <p className="text-[11px] text-rose-600 mt-1">{notifErrors.smtpServerHost}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={settings.notifications.smtpUser}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            smtpUser: e.target.value,
                          },
                        })
                      }
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Password / Secret Key
                    </label>
                    <input
                      type="password"
                      readOnly
                      value={settings.notifications.smtpPasswordMasked}
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-xs outline-none text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 font-mono"
                      title="SMTP Secret is masked for security"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: FILE UPLOAD */}
          {activeTab === "fileUpload" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Candidate Resume Size (MB) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.fileUpload.maxResumeSizeMB}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fileUpload: {
                          ...settings.fileUpload,
                          maxResumeSizeMB: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      fileErrors?.maxResumeSizeMB
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {fileErrors?.maxResumeSizeMB && (
                    <p className="text-[11px] text-rose-600 mt-1">{fileErrors.maxResumeSizeMB}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Company Logo Size (MB) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.fileUpload.maxLogoSizeMB}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fileUpload: {
                          ...settings.fileUpload,
                          maxLogoSizeMB: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      fileErrors?.maxLogoSizeMB
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {fileErrors?.maxLogoSizeMB && (
                    <p className="text-[11px] text-rose-600 mt-1">{fileErrors.maxLogoSizeMB}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Retention Policy (Days) *
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={3650}
                    value={settings.fileUpload.retentionDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fileUpload: {
                          ...settings.fileUpload,
                          retentionDays: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      fileErrors?.retentionDays
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {fileErrors?.retentionDays && (
                    <p className="text-[11px] text-rose-600 mt-1">{fileErrors.retentionDays}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Allowed Resume File Extensions
                </label>
                <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40">
                  {[".pdf", ".docx", ".rtf", ".txt", ".doc"].map((ext) => {
                    const isChecked = settings.fileUpload.allowedResumeExtensions.includes(ext);

                    return (
                      <label key={ext} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let updated = [...settings.fileUpload.allowedResumeExtensions];
                            if (e.target.checked) {
                              updated.push(ext);
                            } else {
                              updated = updated.filter((x) => x !== ext);
                            }
                            setSettings({
                              ...settings,
                              fileUpload: {
                                ...settings.fileUpload,
                                allowedResumeExtensions: updated,
                              },
                            });
                          }}
                          className="size-4 rounded text-blue-600 cursor-pointer"
                        />
                        <span className="font-mono text-slate-800 dark:text-slate-200">{ext}</span>
                      </label>
                    );
                  })}
                </div>
                {fileErrors?.allowedResumeExtensions && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fileErrors.allowedResumeExtensions}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cloud Storage Provider Backend
                  </label>
                  <select
                    value={settings.fileUpload.storageProvider}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fileUpload: {
                          ...settings.fileUpload,
                          storageProvider: e.target.value as FileUploadSettings["storageProvider"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="Amazon S3 Enterprise">Amazon S3 Enterprise</option>
                    <option value="Google Cloud Storage">Google Cloud Storage</option>
                    <option value="Cloudflare R2">Cloudflare R2</option>
                    <option value="Local Encrypted Storage">Local Encrypted Storage</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between self-end">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Automated Virus & Malware Scanning
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Scan all uploaded files prior to ingestion
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.fileUpload.resumeVirusScanning}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fileUpload: {
                          ...settings.fileUpload,
                          resumeVirusScanning: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: AI CONFIGURATION */}
          {activeTab === "aiConfig" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    AI Resume Matching Model Engine
                  </label>
                  <select
                    value={settings.aiConfig.matchingModel}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiConfig: {
                          ...settings.aiConfig,
                          matchingModel: e.target.value as AiConfigSettings["matchingModel"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 font-semibold"
                  >
                    <option value="TalentTrack-v3-Turbo (Default)">
                      TalentTrack-v3-Turbo (Default - Low Latency)
                    </option>
                    <option value="TalentTrack-v3-Pro">
                      TalentTrack-v3-Pro (High Accuracy Embedding)
                    </option>
                    <option value="GPT-4o-Mini (Azure)">GPT-4o-Mini (Azure Hosted)</option>
                    <option value="Claude-3.5-Sonnet (Bedrock)">
                      Claude-3.5-Sonnet (AWS Bedrock)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    AI Candidate Shortlist Threshold (%): {settings.aiConfig.matchThresholdPct}%
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={settings.aiConfig.matchThresholdPct}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiConfig: {
                          ...settings.aiConfig,
                          matchThresholdPct: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg dark:bg-slate-800"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>50% (Permissive)</span>
                    <span className="font-bold text-blue-600">
                      {settings.aiConfig.matchThresholdPct}%
                    </span>
                    <span>95% (Strict)</span>
                  </div>
                  {aiErrors?.matchThresholdPct && (
                    <p className="text-[11px] text-rose-600 mt-1">{aiErrors.matchThresholdPct}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Auto-Summarize Resumes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Generate executive 3-bullet candidate summaries automatically
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiConfig.autoSummarizeResumes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiConfig: {
                          ...settings.aiConfig,
                          autoSummarizeResumes: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Bias Reduction & Anonymized Screening
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Strip PII (name, photo, location) before AI score evaluation
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiConfig.biasReductionAnonymization}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiConfig: {
                          ...settings.aiConfig,
                          biasReductionAnonymization: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* AI Key Verification Card */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-950 dark:bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-purple-950 dark:text-purple-200">
                      AI Model Provider API Key
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestAiKey}
                    disabled={isTestingAi}
                    className="text-xs gap-1.5 h-8 border-purple-200 hover:bg-purple-100 dark:border-purple-800 dark:hover:bg-purple-900/40"
                  >
                    {isTestingAi ? (
                      <RefreshCw className="size-3 animate-spin text-purple-600" />
                    ) : (
                      <Sparkles className="size-3 text-purple-600" />
                    )}
                    {isTestingAi ? "Verifying..." : "Verify AI Key"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                      Masked API Secret Key Reference
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={settings.aiConfig.apiKeyMasked}
                      className="h-9 w-full rounded-md border border-purple-200 bg-white px-3 text-xs outline-none font-mono text-purple-900 dark:border-purple-900 dark:bg-slate-950 dark:text-purple-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                      Confidence Rating Tolerance
                    </label>
                    <select
                      value={settings.aiConfig.confidenceRating}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            confidenceRating: e.target
                              .value as AiConfigSettings["confidenceRating"],
                          },
                        })
                      }
                      className="h-9 w-full rounded-md border border-purple-200 bg-white px-3 text-xs outline-none dark:border-purple-900 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="Strict (High Precision)">Strict (High Precision)</option>
                      <option value="Balanced (Recommended)">Balanced (Recommended)</option>
                      <option value="Permissive (High Recall)">Permissive (High Recall)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CORS Allowed Origins (Comma-Separated URLs) *
                </label>
                <textarea
                  rows={2}
                  value={settings.security.corsAllowedOrigins}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, corsAllowedOrigins: e.target.value },
                    })
                  }
                  className={`w-full rounded-md border bg-white p-2.5 text-xs outline-none font-mono focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                    secErrors?.corsAllowedOrigins
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                />
                {secErrors?.corsAllowedOrigins && (
                  <p className="text-[11px] text-rose-600 mt-1">{secErrors.corsAllowedOrigins}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Portal IP Whitelist CIDR Blocks
                  </label>
                  <input
                    type="text"
                    value={settings.security.adminIpWhitelist}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, adminIpWhitelist: e.target.value },
                      })
                    }
                    placeholder="e.g. 192.168.1.0/24 (leave blank for open access)"
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none font-mono focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Audit Log Retention Period (Days) *
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={730}
                    value={settings.security.auditLogRetentionDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          auditLogRetentionDays: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      secErrors?.auditLogRetentionDays
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {secErrors?.auditLogRetentionDays && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      {secErrors.auditLogRetentionDays}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    API Gateway Rate Limit (Req/Min/IP) *
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={1000}
                    value={settings.security.apiRateLimitPerMin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          apiRateLimitPerMin: Number(e.target.value),
                        },
                      })
                    }
                    className={`h-9.5 w-full rounded-md border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 ${
                      secErrors?.apiRateLimitPerMin
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  />
                  {secErrors?.apiRateLimitPerMin && (
                    <p className="text-[11px] text-rose-600 mt-1">{secErrors.apiRateLimitPerMin}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Content Security Policy (CSP) Mode
                  </label>
                  <select
                    value={settings.security.cspPolicy}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          cspPolicy: e.target.value as SecuritySettings["cspPolicy"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="Strict (Block Inline Scripts)">
                      Strict (Block Inline Scripts & Unsafe Ev)
                    </option>
                    <option value="Standard (Recommended)">Standard (Recommended)</option>
                    <option value="Report Only">Report Only</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-slate-900 dark:text-slate-100">
                    Enforce TLS 1.3 / HSTS Strict Transport Security
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Reject non-HTTPS plain text socket connections across all API endpoints
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.security.enforceTlsHsts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, enforceTlsHsts: e.target.checked },
                    })
                  }
                  className="size-4 rounded text-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* SECTION 7: PLATFORM PREFERENCES */}
          {activeTab === "platformPreferences" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default UI Appearance Theme Mode
                  </label>
                  <select
                    value={settings.platformPreferences.defaultThemeMode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformPreferences: {
                          ...settings.platformPreferences,
                          defaultThemeMode: e.target
                            .value as PlatformPreferencesSettings["defaultThemeMode"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="System Preference">System Preference</option>
                    <option value="Light Mode">Light Mode</option>
                    <option value="Dark Mode">Dark Mode</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dashboard Auto-Refresh Frequency
                  </label>
                  <select
                    value={settings.platformPreferences.dashboardRefreshInterval}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformPreferences: {
                          ...settings.platformPreferences,
                          dashboardRefreshInterval: e.target
                            .value as PlatformPreferencesSettings["dashboardRefreshInterval"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="30 Seconds">30 Seconds</option>
                    <option value="1 Minute">1 Minute</option>
                    <option value="5 Minutes">5 Minutes</option>
                    <option value="Manual Refresh Only">Manual Refresh Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Audit Export Format
                  </label>
                  <select
                    value={settings.platformPreferences.exportFormatDefault}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformPreferences: {
                          ...settings.platformPreferences,
                          exportFormatDefault: e.target
                            .value as PlatformPreferencesSettings["exportFormatDefault"],
                        },
                      })
                    }
                    className="h-9.5 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="CSV (.csv)">CSV (.csv)</option>
                    <option value="JSON (.json)">JSON (.json)</option>
                    <option value="Excel (.xlsx)">Excel (.xlsx)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Compact Table View by Default
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Reduce padding on user and job data tables for higher data density
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.platformPreferences.compactTableView}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformPreferences: {
                          ...settings.platformPreferences,
                          compactTableView: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Display Anonymized Demo Data
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Include mock activity and metrics in administration charts
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.platformPreferences.displayAnonymizedData}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformPreferences: {
                          ...settings.platformPreferences,
                          displayAnonymizedData: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Show System Service Health Banner
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Display real-time uptime status indicator in top admin header
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.platformPreferences.showSystemHealthBanner}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformPreferences: {
                          ...settings.platformPreferences,
                          showSystemHealthBanner: e.target.checked,
                        },
                      })
                    }
                    className="size-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

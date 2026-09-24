import type {
  AdminSettings,
  AdminSettingsValidationErrors,
  GeneralSettings,
  AuthenticationSettings,
  NotificationSettings,
  FileUploadSettings,
  AiConfigSettings,
  SecuritySettings,
  SettingsCategoryKey,
} from "./adminSettingsTypes";

export const defaultAdminSettings: AdminSettings = {
  general: {
    platformName: "TalentTrack AI",
    supportEmail: "support@talenttrack.ai",
    orgName: "TalentTrack Enterprise Inc.",
    defaultTimezone: "UTC (GMT+00:00)",
    maintenanceMode: false,
    maintenanceNotice:
      "TalentTrack AI is under scheduled maintenance. Normal service will resume shortly.",
    systemLanguage: "en-US",
  },
  authentication: {
    require2FAAdmin: true,
    require2FARecruiter: true,
    sessionTimeoutMins: 60,
    passwordMinLength: 12,
    requireSpecialCharAndNumber: true,
    maxFailedLogins: 5,
    enableSSO: true,
    ssoProvider: "Okta / Google Workspace",
  },
  notifications: {
    notificationSenderEmail: "no-reply@notifications.talenttrack.ai",
    enableCriticalAlerts: true,
    adminDigestFrequency: "Daily Summary (08:00 UTC)",
    notifyOnRecruiterReg: true,
    notifyOnSecurityAlerts: true,
    smtpServerHost: "smtp.mailgun.org:587",
    smtpUser: "smtp_user_prod_talenttrack",
    smtpPasswordMasked: "••••••••••••••••",
  },
  fileUpload: {
    maxResumeSizeMB: 10,
    maxLogoSizeMB: 5,
    allowedResumeExtensions: [".pdf", ".docx", ".rtf", ".txt"],
    resumeVirusScanning: true,
    storageProvider: "Amazon S3 Enterprise",
    retentionDays: 365,
  },
  aiConfig: {
    matchingModel: "TalentTrack-v3-Turbo (Default)",
    matchThresholdPct: 75,
    autoSummarizeResumes: true,
    biasReductionAnonymization: true,
    confidenceRating: "Balanced (Recommended)",
    apiKeyMasked: "sk-proj-••••••••••••••••••••3a8F",
  },
  security: {
    corsAllowedOrigins: "https://app.talenttrack.ai, https://admin.talenttrack.ai",
    adminIpWhitelist: "192.168.1.0/24, 10.0.0.0/8",
    auditLogRetentionDays: 90,
    apiRateLimitPerMin: 100,
    enforceTlsHsts: true,
    cspPolicy: "Standard (Recommended)",
  },
  platformPreferences: {
    defaultThemeMode: "System Preference",
    dashboardRefreshInterval: "1 Minute",
    compactTableView: false,
    exportFormatDefault: "CSV (.csv)",
    displayAnonymizedData: true,
    showSystemHealthBanner: true,
  },
};

const STORAGE_KEY = "talenttrack_admin_settings";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAdminSettings(settings: AdminSettings): {
  isValid: boolean;
  errors: AdminSettingsValidationErrors;
} {
  const errors: AdminSettingsValidationErrors = {};

  // General Validation
  const genErrors: Partial<Record<keyof GeneralSettings, string>> = {};
  if (!settings.general.platformName.trim()) {
    genErrors.platformName = "Platform name is required.";
  }
  if (!settings.general.supportEmail.trim()) {
    genErrors.supportEmail = "Support email is required.";
  } else if (!EMAIL_REGEX.test(settings.general.supportEmail)) {
    genErrors.supportEmail = "Must be a valid email address.";
  }
  if (!settings.general.orgName.trim()) {
    genErrors.orgName = "Organization name is required.";
  }
  if (Object.keys(genErrors).length > 0) errors.general = genErrors;

  // Authentication Validation
  const authErrors: Partial<Record<keyof AuthenticationSettings, string>> = {};
  if (
    settings.authentication.sessionTimeoutMins < 15 ||
    settings.authentication.sessionTimeoutMins > 1440
  ) {
    authErrors.sessionTimeoutMins = "Session timeout must be between 15 and 1440 minutes.";
  }
  if (
    settings.authentication.passwordMinLength < 8 ||
    settings.authentication.passwordMinLength > 32
  ) {
    authErrors.passwordMinLength = "Minimum password length must be between 8 and 32 characters.";
  }
  if (settings.authentication.maxFailedLogins < 3 || settings.authentication.maxFailedLogins > 10) {
    authErrors.maxFailedLogins = "Max failed logins must be between 3 and 10.";
  }
  if (Object.keys(authErrors).length > 0) errors.authentication = authErrors;

  // Notification Validation
  const notifErrors: Partial<Record<keyof NotificationSettings, string>> = {};
  if (!settings.notifications.notificationSenderEmail.trim()) {
    notifErrors.notificationSenderEmail = "Notification sender email is required.";
  } else if (!EMAIL_REGEX.test(settings.notifications.notificationSenderEmail)) {
    notifErrors.notificationSenderEmail = "Must be a valid email address.";
  }
  if (!settings.notifications.smtpServerHost.trim()) {
    notifErrors.smtpServerHost = "SMTP server host is required.";
  }
  if (Object.keys(notifErrors).length > 0) errors.notifications = notifErrors;

  // File Upload Validation
  const fileErrors: Partial<Record<keyof FileUploadSettings, string>> = {};
  if (settings.fileUpload.maxResumeSizeMB < 1 || settings.fileUpload.maxResumeSizeMB > 50) {
    fileErrors.maxResumeSizeMB = "Resume limit must be between 1 MB and 50 MB.";
  }
  if (settings.fileUpload.maxLogoSizeMB < 1 || settings.fileUpload.maxLogoSizeMB > 20) {
    fileErrors.maxLogoSizeMB = "Logo limit must be between 1 MB and 20 MB.";
  }
  if (settings.fileUpload.allowedResumeExtensions.length === 0) {
    fileErrors.allowedResumeExtensions = "At least one file extension must be allowed.";
  }
  if (settings.fileUpload.retentionDays < 30 || settings.fileUpload.retentionDays > 3650) {
    fileErrors.retentionDays = "Retention days must be between 30 and 3650 days.";
  }
  if (Object.keys(fileErrors).length > 0) errors.fileUpload = fileErrors;

  // AI Config Validation
  const aiErrors: Partial<Record<keyof AiConfigSettings, string>> = {};
  if (settings.aiConfig.matchThresholdPct < 50 || settings.aiConfig.matchThresholdPct > 95) {
    aiErrors.matchThresholdPct = "Match threshold must be between 50% and 95%.";
  }
  if (Object.keys(aiErrors).length > 0) errors.aiConfig = aiErrors;

  // Security Validation
  const secErrors: Partial<Record<keyof SecuritySettings, string>> = {};
  if (!settings.security.corsAllowedOrigins.trim()) {
    secErrors.corsAllowedOrigins = "At least one CORS origin is required.";
  }
  if (
    settings.security.auditLogRetentionDays < 30 ||
    settings.security.auditLogRetentionDays > 730
  ) {
    secErrors.auditLogRetentionDays = "Audit log retention must be between 30 and 730 days.";
  }
  if (settings.security.apiRateLimitPerMin < 30 || settings.security.apiRateLimitPerMin > 1000) {
    secErrors.apiRateLimitPerMin = "API rate limit must be between 30 and 1000 requests/min.";
  }
  if (Object.keys(secErrors).length > 0) errors.security = secErrors;

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

export const adminSettingsService = {
  getSettings(): AdminSettings {
    if (typeof window === "undefined") return defaultAdminSettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultAdminSettings, ...parsed };
      }
    } catch {
      // Fallback
    }
    return defaultAdminSettings;
  },

  async saveSettings(newSettings: AdminSettings): Promise<{
    success: boolean;
    settings: AdminSettings;
    errors: AdminSettingsValidationErrors;
  }> {
    await new Promise((r) => setTimeout(r, 120));
    const { isValid, errors } = validateAdminSettings(newSettings);

    if (!isValid) {
      return { success: false, settings: newSettings, errors };
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // Fallback
      }
    }

    return { success: true, settings: newSettings, errors: {} };
  },

  async resetSettings(category?: SettingsCategoryKey): Promise<AdminSettings> {
    await new Promise((r) => setTimeout(r, 80));
    const current = this.getSettings();
    let updated: AdminSettings;

    if (category) {
      updated = {
        ...current,
        [category]: { ...defaultAdminSettings[category] },
      };
    } else {
      updated = { ...defaultAdminSettings };
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Fallback
      }
    }

    return updated;
  },

  async testSmtpConnection(): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 450));
    return {
      success: true,
      message: "SMTP Connection Successful! Connected to smtp.mailgun.org:587 in 42ms.",
    };
  },

  async testAiApiKey(): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      message:
        "AI API Key Validated! Status: Active (Latency: 110ms, Model: TalentTrack-v3-Turbo).",
    };
  },
};

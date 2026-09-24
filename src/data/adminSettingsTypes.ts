export interface GeneralSettings {
  platformName: string;
  supportEmail: string;
  orgName: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceNotice: string;
  systemLanguage: string;
}

export interface AuthenticationSettings {
  require2FAAdmin: boolean;
  require2FARecruiter: boolean;
  sessionTimeoutMins: number;
  passwordMinLength: number;
  requireSpecialCharAndNumber: boolean;
  maxFailedLogins: number;
  enableSSO: boolean;
  ssoProvider: string;
}

export interface NotificationSettings {
  notificationSenderEmail: string;
  enableCriticalAlerts: boolean;
  adminDigestFrequency:
    "Instant (Real-time)" | "Daily Summary (08:00 UTC)" | "Weekly Digest (Mondays)";
  notifyOnRecruiterReg: boolean;
  notifyOnSecurityAlerts: boolean;
  smtpServerHost: string;
  smtpUser: string;
  smtpPasswordMasked: string;
}

export interface FileUploadSettings {
  maxResumeSizeMB: number;
  maxLogoSizeMB: number;
  allowedResumeExtensions: string[];
  resumeVirusScanning: boolean;
  storageProvider:
    "Amazon S3 Enterprise" | "Google Cloud Storage" | "Cloudflare R2" | "Local Encrypted Storage";
  retentionDays: number;
}

export interface AiConfigSettings {
  matchingModel:
    | "TalentTrack-v3-Turbo (Default)"
    | "TalentTrack-v3-Pro"
    | "GPT-4o-Mini (Azure)"
    | "Claude-3.5-Sonnet (Bedrock)";
  matchThresholdPct: number;
  autoSummarizeResumes: boolean;
  biasReductionAnonymization: boolean;
  confidenceRating:
    "Strict (High Precision)" | "Balanced (Recommended)" | "Permissive (High Recall)";
  apiKeyMasked: string;
}

export interface SecuritySettings {
  corsAllowedOrigins: string;
  adminIpWhitelist: string;
  auditLogRetentionDays: number;
  apiRateLimitPerMin: number;
  enforceTlsHsts: boolean;
  cspPolicy: "Strict (Block Inline Scripts)" | "Standard (Recommended)" | "Report Only";
}

export interface PlatformPreferencesSettings {
  defaultThemeMode: "System Preference" | "Light Mode" | "Dark Mode";
  dashboardRefreshInterval: "30 Seconds" | "1 Minute" | "5 Minutes" | "Manual Refresh Only";
  compactTableView: boolean;
  exportFormatDefault: "CSV (.csv)" | "JSON (.json)" | "Excel (.xlsx)";
  displayAnonymizedData: boolean;
  showSystemHealthBanner: boolean;
}

export interface AdminSettings {
  general: GeneralSettings;
  authentication: AuthenticationSettings;
  notifications: NotificationSettings;
  fileUpload: FileUploadSettings;
  aiConfig: AiConfigSettings;
  security: SecuritySettings;
  platformPreferences: PlatformPreferencesSettings;
}

export type SettingsCategoryKey = keyof AdminSettings;

export interface AdminSettingsValidationErrors {
  general?: Partial<Record<keyof GeneralSettings, string>>;
  authentication?: Partial<Record<keyof AuthenticationSettings, string>>;
  notifications?: Partial<Record<keyof NotificationSettings, string>>;
  fileUpload?: Partial<Record<keyof FileUploadSettings, string>>;
  aiConfig?: Partial<Record<keyof AiConfigSettings, string>>;
  security?: Partial<Record<keyof SecuritySettings, string>>;
  platformPreferences?: Partial<Record<keyof PlatformPreferencesSettings, string>>;
}

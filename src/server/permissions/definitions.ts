/**
 * Standard Platform Permission Identifiers
 */
export const PERMISSIONS = {
  // User Management
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_MANAGE_STATUS: "users.manage_status",

  // Job Postings
  JOBS_READ: "jobs.read",
  JOBS_CREATE: "jobs.create",
  JOBS_UPDATE: "jobs.update",
  JOBS_DELETE: "jobs.delete",
  JOBS_PUBLISH: "jobs.publish",

  // Candidate Directory
  CANDIDATES_READ: "candidates.read",
  CANDIDATES_CREATE: "candidates.create",
  CANDIDATES_UPDATE: "candidates.update",
  CANDIDATES_DELETE: "candidates.delete",

  // Applications & Pipeline
  APPLICATIONS_READ: "applications.read",
  APPLICATIONS_CREATE: "applications.create",
  APPLICATIONS_UPDATE: "applications.update",
  APPLICATIONS_DELETE: "applications.delete",

  // Resumes & Documents
  RESUMES_READ: "resumes.read",
  RESUMES_UPLOAD: "resumes.upload",
  RESUMES_DELETE: "resumes.delete",

  // AI Screening & Matching
  SCREENING_READ: "screening.read",
  SCREENING_EVALUATE: "screening.evaluate",

  // Interviews & Calendars
  INTERVIEWS_READ: "interviews.read",
  INTERVIEWS_CREATE: "interviews.create",
  INTERVIEWS_UPDATE: "interviews.update",
  INTERVIEWS_DELETE: "interviews.delete",

  // Messaging & Communications
  MESSAGES_READ: "messages.read",
  MESSAGES_SEND: "messages.send",

  // Analytics & Reports
  REPORTS_READ: "reports.read",
  REPORTS_EXPORT: "reports.export",

  // Settings & System Configuration
  SETTINGS_READ: "settings.read",
  SETTINGS_MANAGE: "settings.manage",

  // Administrative Control
  ADMIN_ACCESS: "admin.access",
  ADMIN_AUDIT_LOGS: "admin.audit_logs",
  ADMIN_SYSTEM_CONFIG: "admin.system_config",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

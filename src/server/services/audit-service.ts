import type { UserStatus } from "../types/user-types.ts";

export type AuditAction =
  | "USER_STATUS_CHANGED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_ROLE_CHANGED"
  | "ORGANIZATION_CREATED"
  | "ORGANIZATION_UPDATED"
  | "ORGANIZATION_STATUS_CHANGED"
  | "ORGANIZATION_DELETED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "DEPARTMENT_DELETED"
  | "MEMBER_ASSIGNED_TO_ORG"
  | "ROLE_PERMISSIONS_UPDATED"
  | "SECURITY_ACCESS_DENIED";

export type AuditCategory = "user" | "organization" | "security" | "system" | "role";

export interface AuditEntry {
  id: string;
  action: AuditAction | string;
  category: AuditCategory;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  targetId: string;
  targetType: "USER" | "ORGANIZATION" | "DEPARTMENT" | "ROLE" | "SYSTEM";
  targetName?: string | undefined;
  organizationId?: string | undefined;
  organizationName?: string | undefined;
  details: string;
  status: "Success" | "Warning" | "Failure";
  timestamp: string;
  ipAddress?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface StatusChangeAuditEntry {
  id: string;
  action: "USER_STATUS_CHANGED";
  adminId: string;
  targetUserId: string;
  previousStatus: UserStatus;
  newStatus: UserStatus;
  timestamp: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface AuditLogQueryParams {
  search?: string | undefined;
  category?: string | undefined;
  action?: string | undefined;
  actorId?: string | undefined;
  organizationId?: string | undefined;
  status?: string | undefined;
  dateRange?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedAuditLogsResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalEvents: number;
    securityEvents: number;
    userEvents: number;
    orgEvents: number;
  };
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "apikey",
  "authorization",
  "credential",
  "privatekey",
]);

/**
 * Strips any sensitive credentials or secret keys from audit metadata
 */
export function sanitizeAuditMetadata(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_]/g, ""))) {
      sanitized[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = sanitizeAuditMetadata(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

const DEFAULT_AUDIT_LOGS: AuditEntry[] = [
  {
    id: "audit-001",
    action: "USER_STATUS_CHANGED",
    category: "user",
    actorId: "65f1a2b3c4d5e6f7a8b9c001",
    actorName: "Platform Administrator",
    actorEmail: "admin@talenttrack.ai",
    actorRole: "ADMIN",
    targetId: "65f1a2b3c4d5e6f7a8b9c008",
    targetType: "USER",
    targetName: "Aarav Mehta",
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
    details: "Reactivated user account for Aarav Mehta",
    status: "Success",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    ipAddress: "192.168.1.100",
    metadata: { previousStatus: "INACTIVE", newStatus: "ACTIVE" },
  },
  {
    id: "audit-002",
    action: "ORGANIZATION_CREATED",
    category: "organization",
    actorId: "65f1a2b3c4d5e6f7a8b9c001",
    actorName: "Platform Administrator",
    actorEmail: "admin@talenttrack.ai",
    actorRole: "ADMIN",
    targetId: "org-3",
    targetType: "ORGANIZATION",
    targetName: "Nexus AI Labs",
    organizationId: "org-3",
    organizationName: "Nexus AI Labs",
    details: "Provisioned new organization tenant Nexus AI Labs",
    status: "Success",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    ipAddress: "192.168.1.100",
    metadata: { plan: "Growth", domain: "nexusai.tech" },
  },
  {
    id: "audit-003",
    action: "DEPARTMENT_CREATED",
    category: "organization",
    actorId: "65f1a2b3c4d5e6f7a8b9c002",
    actorName: "Elena Rostova",
    actorEmail: "elena.admin@talenttrack.ai",
    actorRole: "ADMIN",
    targetId: "dept-1",
    targetType: "DEPARTMENT",
    targetName: "Core Engineering",
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
    details: "Created department Core Engineering in TalentTrack Technologies",
    status: "Success",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    ipAddress: "192.168.1.102",
    metadata: { code: "ENG" },
  },
  {
    id: "audit-004",
    action: "SECURITY_ACCESS_DENIED",
    category: "security",
    actorId: "65f1a2b3c4d5e6f7a8b9c010",
    actorName: "David Miller",
    actorEmail: "recruiter@talenttrack.ai",
    actorRole: "RECRUITER",
    targetId: "org-2",
    targetType: "ORGANIZATION",
    targetName: "CloudScale Systems",
    organizationId: "org-1",
    organizationName: "TalentTrack Technologies Inc.",
    details: "Blocked cross-tenant access attempt to CloudScale Systems",
    status: "Warning",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    ipAddress: "10.0.4.15",
    metadata: {
      requestedResource: "/api/admin/organizations/org-2",
      reason: "Tenant boundary violation",
    },
  },
];

class AuditService {
  private auditLogs: AuditEntry[] = [...DEFAULT_AUDIT_LOGS];

  /**
   * Universal method to record any sensitive action
   */
  public recordEvent(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const log: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: entry.action,
      category: entry.category,
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      targetId: entry.targetId,
      targetType: entry.targetType,
      targetName: entry.targetName,
      organizationId: entry.organizationId,
      organizationName: entry.organizationName,
      details: entry.details,
      status: entry.status || "Success",
      timestamp: new Date().toISOString(),
      ipAddress: entry.ipAddress || "127.0.0.1",
      metadata: sanitizeAuditMetadata(entry.metadata),
    };

    this.auditLogs.unshift(log);
    return log;
  }

  /**
   * Backwards-compatible user status change logger
   */
  public recordStatusChange(entry: {
    adminId: string;
    targetUserId: string;
    previousStatus: UserStatus;
    newStatus: UserStatus;
    metadata?: Record<string, unknown> | undefined;
  }): StatusChangeAuditEntry {
    const logEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: "USER_STATUS_CHANGED",
      category: "user",
      actorId: entry.adminId,
      actorName: (entry.metadata?.["adminEmail"] as string) || "Administrator",
      actorEmail: (entry.metadata?.["adminEmail"] as string) || "admin@talenttrack.ai",
      actorRole: "ADMIN",
      targetId: entry.targetUserId,
      targetType: "USER",
      targetName: (entry.metadata?.["targetEmail"] as string) || entry.targetUserId,
      details: `Changed user status from ${entry.previousStatus} to ${entry.newStatus}`,
      status: "Success",
      timestamp: new Date().toISOString(),
      metadata: sanitizeAuditMetadata({
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        ...entry.metadata,
      }),
    };

    this.auditLogs.unshift(logEntry);

    return {
      id: logEntry.id,
      action: "USER_STATUS_CHANGED",
      adminId: entry.adminId,
      targetUserId: entry.targetUserId,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      timestamp: logEntry.timestamp,
      metadata: logEntry.metadata,
    };
  }

  /**
   * Retrieve audit logs for a specific user ID
   */
  public getLogsForUser(userId: string): StatusChangeAuditEntry[] {
    return this.auditLogs
      .filter((log) => log.targetId === userId && log.action === "USER_STATUS_CHANGED")
      .map((l) => ({
        id: l.id,
        action: "USER_STATUS_CHANGED" as const,
        adminId: l.actorId,
        targetUserId: l.targetId,
        previousStatus: (l.metadata?.["previousStatus"] as UserStatus) || "INACTIVE",
        newStatus: (l.metadata?.["newStatus"] as UserStatus) || "ACTIVE",
        timestamp: l.timestamp,
        metadata: l.metadata,
      }));
  }

  /**
   * Query filtered & paginated audit logs with tenant isolation support
   */
  public queryLogs(params: AuditLogQueryParams = {}): PaginatedAuditLogsResponse {
    let filtered = [...this.auditLogs];

    // Tenant Isolation filter: when organizationId is provided (e.g. for ORG_ADMIN)
    if (params.organizationId) {
      filtered = filtered.filter((log) => log.organizationId === params.organizationId);
    }

    if (params.search && params.search.trim() !== "") {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (log) =>
          log.details.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          log.actorEmail.toLowerCase().includes(q) ||
          (log.targetName && log.targetName.toLowerCase().includes(q)) ||
          log.action.toLowerCase().includes(q),
      );
    }

    if (params.category && params.category !== "All") {
      filtered = filtered.filter(
        (log) => log.category.toLowerCase() === params.category!.toLowerCase(),
      );
    }

    if (params.action && params.action !== "All") {
      filtered = filtered.filter(
        (log) => log.action.toLowerCase() === params.action!.toLowerCase(),
      );
    }

    if (params.actorId && params.actorId !== "All") {
      filtered = filtered.filter((log) => log.actorId === params.actorId);
    }

    if (params.status && params.status !== "All") {
      filtered = filtered.filter(
        (log) => log.status.toLowerCase() === params.status!.toLowerCase(),
      );
    }

    const total = filtered.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      logs: paginated,
      total,
      page,
      limit,
      totalPages,
      summary: {
        totalEvents: this.auditLogs.length,
        securityEvents: this.auditLogs.filter((l) => l.category === "security").length,
        userEvents: this.auditLogs.filter((l) => l.category === "user").length,
        orgEvents: this.auditLogs.filter((l) => l.category === "organization").length,
      },
    };
  }

  /**
   * Retrieve all raw logs for testing or inspection
   */
  public getLogs(): StatusChangeAuditEntry[] {
    return this.auditLogs
      .filter((l) => l.action === "USER_STATUS_CHANGED")
      .map((l) => ({
        id: l.id,
        action: "USER_STATUS_CHANGED" as const,
        adminId: l.actorId,
        targetUserId: l.targetId,
        previousStatus: (l.metadata?.["previousStatus"] as UserStatus) || "INACTIVE",
        newStatus: (l.metadata?.["newStatus"] as UserStatus) || "ACTIVE",
        timestamp: l.timestamp,
        metadata: l.metadata,
      }));
  }

  /**
   * Reset / clear logs for test isolation
   */
  public clearLogs(): void {
    this.auditLogs = [];
  }

  public resetToDefault(): void {
    this.auditLogs = [...DEFAULT_AUDIT_LOGS];
  }
}

export const auditService = new AuditService();

import type { UserStatus } from "../types/user-types.ts";

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

class AuditService {
  private auditLogs: StatusChangeAuditEntry[] = [];

  /**
   * Record a user status change event initiated by an administrator
   */
  public recordStatusChange(entry: {
    adminId: string;
    targetUserId: string;
    previousStatus: UserStatus;
    newStatus: UserStatus;
    metadata?: Record<string, unknown> | undefined;
  }): StatusChangeAuditEntry {
    const log: StatusChangeAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: "USER_STATUS_CHANGED",
      adminId: entry.adminId,
      targetUserId: entry.targetUserId,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      timestamp: new Date().toISOString(),
      metadata: entry.metadata,
    };

    this.auditLogs.unshift(log);
    return log;
  }

  /**
   * Retrieve audit logs for a specific user ID (as target)
   */
  public getLogsForUser(userId: string): StatusChangeAuditEntry[] {
    return this.auditLogs.filter((log) => log.targetUserId === userId);
  }

  /**
   * Retrieve audit logs for inspection or testing
   */
  public getLogs(): StatusChangeAuditEntry[] {
    return [...this.auditLogs];
  }

  /**
   * Clear logs (for test isolation)
   */
  public clearLogs(): void {
    this.auditLogs = [];
  }
}

export const auditService = new AuditService();

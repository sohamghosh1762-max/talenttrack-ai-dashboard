export interface RequestLogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
  organizationId?: string;
  error?: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>) {
    return JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      message,
      ...(context ? { context } : {}),
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (typeof process !== "undefined" && process.env?.["NODE_ENV"] !== "production") {
      console.debug(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(this.formatLog("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatLog("warn", message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.formatLog("error", message, context));
  }

  logRequest(entry: RequestLogEntry): void {
    const formatted = JSON.stringify({
      type: "HTTP_REQUEST",
      requestId: entry.requestId,
      timestamp: entry.timestamp,
      method: entry.method,
      route: entry.route,
      statusCode: entry.statusCode,
      durationMs: `${entry.durationMs.toFixed(2)}ms`,
      ...(entry.userId ? { userId: entry.userId } : {}),
      ...(entry.organizationId ? { organizationId: entry.organizationId } : {}),
      ...(entry.error ? { error: entry.error } : {}),
    });

    if (entry.statusCode >= 500) {
      console.error(formatted);
    } else if (entry.statusCode >= 400) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = new Logger();

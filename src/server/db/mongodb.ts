import mongoose from "mongoose";
import { env } from "../config/env.ts";

/**
 * Sanitize MongoDB Connection URI to prevent leaking credentials in logs
 */
export function sanitizeMongoUri(uri: string): string {
  if (!uri || typeof uri !== "string") return "[EMPTY_URI]";
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/i, "$1*****@");
  } catch {
    return "[REDACTED_URI]";
  }
}

/**
 * Normalize MongoDB URI by removing accidental literal < > placeholders around password and trimming whitespace
 */
export function normalizeMongoUri(uri: string): string {
  if (!uri || typeof uri !== "string") return uri;
  return uri.trim().replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)<([^>@]+)>(@)/i, "$1$2$3");
}

// Global cached connection promise to prevent race conditions during concurrent startup
let cachedConnectionPromise: Promise<typeof mongoose> | null = null;
let isShutdownHookRegistered = false;
let hasConnectionListenersAttached = false;

/**
 * Attach lifecycle event listeners to mongoose connection
 */
function attachConnectionListeners(): void {
  if (hasConnectionListenersAttached || !mongoose.connection) {
    return;
  }
  hasConnectionListenersAttached = true;

  mongoose.connection.on("connected", () => {
    const dbName = mongoose.connection.name || "talenttrack";
    console.log(`[MongoDB] Successfully connected to database: ${dbName}`);
  });

  mongoose.connection.on("error", (err) => {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[MongoDB] Connection error encountered: ${errorMsg}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Connection disconnected from database.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Connection re-established successfully.");
  });
}

/**
 * Get the current MongoDB connection status
 */
export function getDatabaseStatus(): {
  status: "connected" | "connecting" | "disconnected" | "disconnecting";
  readyState: number;
  host?: string | undefined;
  name?: string | undefined;
} {
  const readyState = mongoose.connection.readyState;
  let status: "connected" | "connecting" | "disconnected" | "disconnecting";

  switch (readyState) {
    case 1:
      status = "connected";
      break;
    case 2:
      status = "connecting";
      break;
    case 3:
      status = "disconnecting";
      break;
    default:
      status = "disconnected";
      break;
  }

  return {
    status,
    readyState,
    host: mongoose.connection.host || undefined,
    name: mongoose.connection.name || undefined,
  };
}

/**
 * Check if the database is currently connected and ready
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Ensure database is connected before executing database operations.
 * Awaits existing in-flight connection promise or initiates new connection.
 */
export async function ensureDatabaseConnected(timeoutMs: number = 10000): Promise<boolean> {
  if (isDatabaseConnected()) {
    return true;
  }
  if (mongoose.connection.readyState === 2 && cachedConnectionPromise) {
    try {
      await cachedConnectionPromise;
      return isDatabaseConnected();
    } catch {
      return false;
    }
  }
  // In test environment without explicit URI, do not force-connect to localhost if disconnected
  if (
    process.env["NODE_ENV"] === "test" &&
    !process.env["MONGODB_URI"] &&
    !process.env["DATABASE_URL"]
  ) {
    return false;
  }
  try {
    const connPromise = connectToDatabase();
    if (timeoutMs > 0) {
      await Promise.race([
        connPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database connection timeout")), timeoutMs),
        ),
      ]);
    } else {
      await connPromise;
    }
    return isDatabaseConnected();
  } catch {
    return false;
  }
}

/**
 * Active ping probe to verify MongoDB can execute database operations
 */
export async function pingDatabase(timeoutMs: number = 2000): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }
  try {
    const db = mongoose.connection.db;
    if (!db) return false;
    const admin = db.admin();
    const pingPromise = admin.ping();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("MongoDB ping probe timeout")), timeoutMs),
    );
    await Promise.race([pingPromise, timeoutPromise]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Connect to MongoDB with connection pooling, retries, and duplicate connection guards
 */
export async function connectToDatabase(
  customUri?: string,
  options: mongoose.ConnectOptions = {},
): Promise<typeof mongoose> {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // If currently connecting, await in-flight promise
  if (mongoose.connection.readyState === 2 && cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  const rawUri = normalizeMongoUri(
    customUri ||
      (typeof process !== "undefined" && process.env?.["MONGODB_URI"]) ||
      (typeof process !== "undefined" && process.env?.["DATABASE_URL"]) ||
      env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/talenttrack",
  );

  const sanitized = sanitizeMongoUri(rawUri);

  const defaultOptions: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS:
      options.serverSelectionTimeoutMS ||
      (typeof process !== "undefined" && process.env?.["MONGODB_SERVER_TIMEOUT_MS"]
        ? Number(process.env["MONGODB_SERVER_TIMEOUT_MS"])
        : 10000),
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    dbName: options.dbName || "talenttrack",
    ...options,
  };

  attachConnectionListeners();

  cachedConnectionPromise = (async () => {
    try {
      console.log(`[MongoDB] Connecting to database: ${sanitized}`);
      await mongoose.connect(rawUri, defaultOptions);
      console.log(
        `[MongoDB] Successfully connected to MongoDB database: ${mongoose.connection.name || "talenttrack"}`,
      );
      registerGracefulShutdown();
      // Hydrate repository caches from MongoDB Atlas
      import("./user-repository.ts")
        .then((m) => m.userRepository.syncFromDatabase())
        .catch(() => {});
      import("./session-repository.ts")
        .then((m) => m.sessionRepository.syncFromDatabase())
        .catch(() => {});
      import("./organization-repository.ts")
        .then((m) => m.organizationRepository.syncFromDatabase())
        .catch(() => {});
      return mongoose;
    } catch (error) {
      cachedConnectionPromise = null;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[MongoDB] Connection failed (${sanitized}):`, errorMsg);
      throw error;
    }
  })();

  return cachedConnectionPromise;
}

/**
 * Ensure registered Mongoose models have synchronized database indexes
 */
export async function ensureDatabaseIndexes(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  try {
    const models = Object.values(mongoose.models);
    await Promise.all(
      models.map(async (model) => {
        try {
          await model.syncIndexes();
        } catch (err) {
          console.warn(
            `[MongoDB] Index sync notice for model ${model.modelName}:`,
            (err as Error).message,
          );
        }
      }),
    );
    console.log(`[MongoDB] Verified indexes for ${models.length} registered models.`);
  } catch (err) {
    console.warn("[MongoDB] Index synchronization warning:", err);
  }
}

/**
 * Gracefully disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      cachedConnectionPromise = null;
      console.log("[MongoDB] Disconnected gracefully from MongoDB.");
    } catch (error) {
      console.error("[MongoDB] Error during disconnect:", error);
    }
  }
}

/**
 * Register process signal handlers for graceful shutdown
 */
function registerGracefulShutdown(): void {
  if (isShutdownHookRegistered || typeof process === "undefined") {
    return;
  }
  isShutdownHookRegistered = true;

  const handleSignal = async (signal: string) => {
    console.log(`[MongoDB] Received ${signal}. Closing MongoDB connection...`);
    await disconnectDatabase();
  };

  process.once("SIGINT", () => handleSignal("SIGINT"));
  process.once("SIGTERM", () => handleSignal("SIGTERM"));
}

export { mongoose };

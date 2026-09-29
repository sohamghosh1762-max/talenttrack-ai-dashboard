import mongoose from "mongoose";
import { env } from "../config/env.ts";

/**
 * Sanitize MongoDB Connection URI to prevent leaking credentials in logs
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/i, "$1*****@");
  } catch {
    return "[REDACTED_URI]";
  }
}

/**
 * Normalize MongoDB URI by removing accidental literal < > placeholders around password
 */
export function normalizeMongoUri(uri: string): string {
  if (!uri) return uri;
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)<([^>@]+)>(@)/i, "$1$2$3");
}

// Global cached connection promise to prevent race conditions during concurrent startup
let cachedConnectionPromise: Promise<typeof mongoose> | null = null;
let isShutdownHookRegistered = false;

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
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 2,
    ...options,
  };

  cachedConnectionPromise = (async () => {
    try {
      console.log(`[MongoDB] Connecting to database: ${sanitized}`);
      await mongoose.connect(rawUri, defaultOptions);
      console.log(`[MongoDB] Successfully connected to MongoDB database: ${mongoose.connection.name || "talenttrack"}`);
      registerGracefulShutdown();
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

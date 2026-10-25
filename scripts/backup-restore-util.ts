import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import {
  connectToDatabase,
  disconnectDatabase,
  isDatabaseConnected,
} from "../src/server/db/mongodb.ts";
import { User } from "../src/server/models/User.ts";
import { Recruiter } from "../src/server/models/Recruiter.ts";
import { Applicant } from "../src/server/models/Applicant.ts";
import { Job } from "../src/server/models/Job.ts";
import { Application } from "../src/server/models/Application.ts";
import { Interview } from "../src/server/models/Interview.ts";
import { Resume } from "../src/server/models/Resume.ts";
import { Notification } from "../src/server/models/Notification.ts";
import { Conversation } from "../src/server/models/Conversation.ts";
import { Message } from "../src/server/models/Message.ts";

export interface BackupMetadata {
  version: number;
  timestamp: string;
  databaseName: string;
  counts: Record<string, number>;
  checksum: string;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  collections: {
    users: unknown[];
    recruiters: unknown[];
    applicants: unknown[];
    jobs: unknown[];
    applications: unknown[];
    interviews: unknown[];
    resumes: unknown[];
    notifications: unknown[];
    conversations: unknown[];
    messages: unknown[];
  };
}

/**
 * Create a compressed backup archive of all TalentTrack AI collections
 */
export async function createDatabaseBackup(outputFilePath?: string): Promise<{
  archivePath: string;
  metadata: BackupMetadata;
}> {
  const isConnected = isDatabaseConnected();
  if (!isConnected) {
    await connectToDatabase();
  }

  const [
    users,
    recruiters,
    applicants,
    jobs,
    applications,
    interviews,
    resumes,
    notifications,
    conversations,
    messages,
  ] = await Promise.all([
    User.find({}).lean(),
    Recruiter.find({}).lean(),
    Applicant.find({}).lean(),
    Job.find({}).lean(),
    Application.find({}).lean(),
    Interview.find({}).lean(),
    Resume.find({}).lean(),
    Notification.find({}).lean(),
    Conversation.find({}).lean(),
    Message.find({}).lean(),
  ]);

  const collections = {
    users,
    recruiters,
    applicants,
    jobs,
    applications,
    interviews,
    resumes,
    notifications,
    conversations,
    messages,
  };

  const counts: Record<string, number> = {
    users: users.length,
    recruiters: recruiters.length,
    applicants: applicants.length,
    jobs: jobs.length,
    applications: applications.length,
    interviews: interviews.length,
    resumes: resumes.length,
    notifications: notifications.length,
    conversations: conversations.length,
    messages: messages.length,
  };

  const rawCollectionsJson = JSON.stringify(collections);
  const checksum = crypto.createHash("sha256").update(rawCollectionsJson).digest("hex");

  const metadata: BackupMetadata = {
    version: 1,
    timestamp: new Date().toISOString(),
    databaseName: "talenttrack",
    counts,
    checksum,
  };

  const payload: BackupPayload = {
    metadata,
    collections,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const compressedGzip = zlib.gzipSync(Buffer.from(jsonString, "utf-8"));

  const targetDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const finalPath =
    outputFilePath || path.join(targetDir, `talenttrack_snapshot_${timestampStr}.json.gz`);

  fs.writeFileSync(finalPath, compressedGzip);

  return { archivePath: finalPath, metadata };
}

/**
 * Verify integrity and read metadata of a backup archive
 */
export function verifyBackupArchive(archivePath: string): BackupMetadata {
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Backup archive not found at path: ${archivePath}`);
  }

  const fileBuffer = fs.readFileSync(archivePath);
  const decompressed = zlib.gunzipSync(fileBuffer).toString("utf-8");
  const payload = JSON.parse(decompressed) as BackupPayload;

  if (!payload.metadata || !payload.collections) {
    throw new Error("Invalid backup format: Missing metadata or collections payload.");
  }

  const rawCollectionsJson = JSON.stringify(payload.collections);
  const computedChecksum = crypto.createHash("sha256").update(rawCollectionsJson).digest("hex");

  if (computedChecksum !== payload.metadata.checksum) {
    throw new Error(
      `Checksum mismatch! Expected: ${payload.metadata.checksum}, Computed: ${computedChecksum}`,
    );
  }

  return payload.metadata;
}

/**
 * Restore collections from verified archive into database
 */
export async function restoreDatabaseBackup(archivePath: string): Promise<{
  restoredCounts: Record<string, number>;
}> {
  const metadata = verifyBackupArchive(archivePath);
  const fileBuffer = fs.readFileSync(archivePath);
  const decompressed = zlib.gunzipSync(fileBuffer).toString("utf-8");
  const payload = JSON.parse(decompressed) as BackupPayload;

  const isConnected = isDatabaseConnected();
  if (!isConnected) {
    await connectToDatabase();
  }

  const restoredCounts: Record<string, number> = {};

  // Restore each collection safely with bulk operations
  if (payload.collections.users?.length) {
    for (const u of payload.collections.users as any[]) {
      await User.findByIdAndUpdate(u._id, u, { upsert: true, new: true });
    }
    restoredCounts["users"] = payload.collections.users.length;
  }

  if (payload.collections.jobs?.length) {
    for (const j of payload.collections.jobs as any[]) {
      await Job.findByIdAndUpdate(j._id, j, { upsert: true, new: true });
    }
    restoredCounts["jobs"] = payload.collections.jobs.length;
  }

  if (payload.collections.applications?.length) {
    for (const a of payload.collections.applications as any[]) {
      await Application.findByIdAndUpdate(a._id, a, { upsert: true, new: true });
    }
    restoredCounts["applications"] = payload.collections.applications.length;
  }

  if (payload.collections.interviews?.length) {
    for (const iv of payload.collections.interviews as any[]) {
      await Interview.findByIdAndUpdate(iv._id, iv, { upsert: true, new: true });
    }
    restoredCounts["interviews"] = payload.collections.interviews.length;
  }

  return { restoredCounts };
}

// CLI Execution Handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2] || "backup";
  const target = process.argv[3];

  (async () => {
    try {
      if (action === "backup") {
        console.log("[Backup] Starting programmatic MongoDB snapshot...");
        const result = await createDatabaseBackup(target);
        console.log(`[Backup] Snapshot complete: ${result.archivePath}`);
        console.log("Counts:", JSON.stringify(result.metadata.counts, null, 2));
      } else if (action === "verify") {
        if (!target) throw new Error("Please specify archive path to verify.");
        const meta = verifyBackupArchive(target);
        console.log("✅ Backup Archive Verified Successfully!");
        console.log("Metadata:", JSON.stringify(meta, null, 2));
      } else if (action === "restore") {
        if (!target) throw new Error("Please specify archive path to restore.");
        console.log(`[Restore] Restoring from ${target}...`);
        const res = await restoreDatabaseBackup(target);
        console.log("✅ Restore Completed Successfully!");
        console.log("Restored:", JSON.stringify(res.restoredCounts, null, 2));
      }
    } catch (err) {
      console.error("❌ Action failed:", err);
      process.exit(1);
    } finally {
      await disconnectDatabase();
    }
  })();
}

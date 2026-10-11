import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { verifyBackupArchive, type BackupPayload } from "../../../scripts/backup-restore-util.ts";

describe("BACKEND & DATABASE RELIABILITY: Database Backup & Restoration Suite", () => {
  const scratchDir = path.resolve(process.cwd(), "scratch-test-backups");

  describe("1. Shell Backup Script Safety & Exit Code Behavior", () => {
    it("db-backup.sh exits with code 1 and actionable error when mongodump is missing", () => {
      try {
        execSync("bash scripts/db-backup.sh", {
          env: {
            ...process.env,
            PATH: "/usr/bin:/bin", // Ensure mongodump is definitely not found
            ALLOW_SIMULATION: "0",
          },
          stdio: "pipe",
        });
        assert.fail("db-backup.sh should have exited with nonzero status");
      } catch (err: any) {
        assert.strictEqual(err.status, 1, "Must exit with status 1 on missing mongodump");
        const stderr = err.stderr?.toString() || "";
        assert.ok(
          stderr.includes("mongodump") || stderr.includes("Prerequisites"),
          "Must provide actionable diagnostics",
        );
      }
    });

    it("db-backup.sh masks credentials in output and generates descriptor under ALLOW_SIMULATION=1", () => {
      const outputDir = path.join(scratchDir, "sim-backup");
      fs.mkdirSync(outputDir, { recursive: true });

      const output = execSync("bash scripts/db-backup.sh", {
        env: {
          ...process.env,
          BACKUP_DIR: outputDir,
          ALLOW_SIMULATION: "1",
          MONGODB_URI: "mongodb+srv://admin_user:UltraSecret999@cluster0.abc.mongodb.net/talenttrack",
        },
        stdio: "pipe",
      }).toString();

      assert.strictEqual(output.includes("UltraSecret999"), false, "Credentials must never leak in stdout");
      assert.ok(output.includes("*****"), "Password must be masked");
      assert.ok(output.includes("simulation mode") || output.includes("simulated"));

      // Cleanup
      fs.rmSync(outputDir, { recursive: true, force: true });
    });
  });

  describe("2. Shell Restore Script Validation & Safety", () => {
    it("db-restore.sh fails with exit code 1 when no archive path is supplied", () => {
      try {
        execSync("bash scripts/db-restore.sh", { stdio: "pipe" });
        assert.fail("Should have failed without archive argument");
      } catch (err: any) {
        assert.strictEqual(err.status, 1);
        const stdout = err.stdout?.toString() || "";
        assert.ok(stdout.includes("Usage:"));
      }
    });

    it("db-restore.sh fails with exit code 1 when specified archive file does not exist", () => {
      try {
        execSync("bash scripts/db-restore.sh /nonexistent/path/archive.gz", { stdio: "pipe" });
        assert.fail("Should have failed on nonexistent archive");
      } catch (err: any) {
        assert.strictEqual(err.status, 1);
        const stdout = err.stdout?.toString() || "";
        assert.ok(stdout.includes("does not exist"));
      }
    });

    it("db-restore.sh masks connection credentials in output", () => {
      const dummyFile = path.join(scratchDir, "dummy.gz");
      fs.mkdirSync(scratchDir, { recursive: true });
      fs.writeFileSync(dummyFile, "dummy-content");

      try {
        execSync(`bash scripts/db-restore.sh "${dummyFile}"`, {
          env: {
            ...process.env,
            PATH: "/usr/bin:/bin",
            ALLOW_SIMULATION: "0",
            MONGODB_URI: "mongodb://user:P@sswordSecret@127.0.0.1:27017",
          },
          stdio: "pipe",
        });
      } catch (err: any) {
        const stdout = err.stdout?.toString() || "";
        assert.strictEqual(stdout.includes("P@sswordSecret"), false, "Password must not be in output");
        assert.ok(stdout.includes("*****"));
      } finally {
        fs.rmSync(scratchDir, { recursive: true, force: true });
      }
    });
  });

  describe("3. Programmatic Backup & Restore Archive Integrity", () => {
    it("creates, validates, and verifies a gzip-compressed backup payload with sha256 checksum", () => {
      const testArchive = path.join(scratchDir, "test_backup.json.gz");
      fs.mkdirSync(scratchDir, { recursive: true });

      const sampleCollections = {
        users: [{ _id: "65f1a2b3c4d5e6f7a8b9c001", name: "Admin", email: "admin@talenttrack.ai" }],
        recruiters: [],
        applicants: [],
        jobs: [{ _id: "65f1a2b3c4d5e6f7a8b9c101", title: "Lead Architect" }],
        applications: [],
        interviews: [],
        resumes: [],
        notifications: [],
        conversations: [],
        messages: [],
      };

      const rawJson = JSON.stringify(sampleCollections);
      const checksum = crypto.createHash("sha256").update(rawJson).digest("hex");

      const payload: BackupPayload = {
        metadata: {
          version: 1,
          timestamp: new Date().toISOString(),
          databaseName: "talenttrack_test",
          counts: { users: 1, jobs: 1, applications: 0 },
          checksum,
        },
        collections: sampleCollections,
      };

      const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(payload)));
      fs.writeFileSync(testArchive, compressed);

      // Verify integrity
      const verifiedMeta = verifyBackupArchive(testArchive);
      assert.strictEqual(verifiedMeta.version, 1);
      assert.strictEqual(verifiedMeta.checksum, checksum);
      assert.strictEqual(verifiedMeta.counts["users"], 1);

      // Verify tampering detection
      const tamperedPayload = {
        ...payload,
        collections: { ...sampleCollections, users: [] }, // Altered data without updating checksum
      };
      const tamperedArchive = path.join(scratchDir, "tampered.json.gz");
      fs.writeFileSync(tamperedArchive, zlib.gzipSync(Buffer.from(JSON.stringify(tamperedPayload))));

      assert.throws(
        () => verifyBackupArchive(tamperedArchive),
        /Checksum mismatch/,
        "Must detect altered collection data and reject archive",
      );

      fs.rmSync(scratchDir, { recursive: true, force: true });
    });
  });
});

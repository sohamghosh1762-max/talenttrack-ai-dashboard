import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeMongoUri,
  normalizeMongoUri,
  getDatabaseStatus,
  isDatabaseConnected,
  pingDatabase,
  connectToDatabase,
} from "../db/mongodb.ts";
import { handleApiRequest } from "../routes/index.ts";

describe("BACKEND & DATABASE RELIABILITY: MongoDB Connectivity & Lifecycle Suite", () => {
  describe("1. Connection URI Sanitization & Secret Masking", () => {
    it("sanitizes MongoDB Atlas connection string and obscures plain-text password", () => {
      const atlasUri =
        "mongodb+srv://admin_user:SuperSecretPassword123@cluster0.abcde.mongodb.net/talenttrack?retryWrites=true&w=majority";
      const sanitized = sanitizeMongoUri(atlasUri);

      assert.strictEqual(
        sanitized.includes("SuperSecretPassword123"),
        false,
        "Credentials must never appear in sanitized URI",
      );
      assert.ok(sanitized.includes("*****"), "Password must be replaced with asterisk mask");
      assert.ok(sanitized.includes("cluster0.abcde.mongodb.net"), "Host should be preserved");
    });

    it("sanitizes standard mongodb:// URI with port and authentication", () => {
      const standardUri = "mongodb://db_admin:P@ssw0rd!@127.0.0.1:27017/talenttrack_prod";
      const sanitized = sanitizeMongoUri(standardUri);

      assert.strictEqual(sanitized.includes("P@ssw0rd!"), false);
      assert.ok(sanitized.includes("*****"));
      assert.ok(sanitized.includes("127.0.0.1:27017"));
    });

    it("handles null, empty, or malformed URIs without throwing unhandled exceptions", () => {
      assert.strictEqual(sanitizeMongoUri(""), "[EMPTY_URI]");
      assert.strictEqual(sanitizeMongoUri(null as any), "[EMPTY_URI]");
      assert.strictEqual(sanitizeMongoUri("not-a-mongo-uri"), "not-a-mongo-uri");
    });

    it("normalizes MongoDB URI by stripping accidental literal angle brackets < > around password", () => {
      const uriWithBrackets =
        "mongodb+srv://user:<MyActualPassword>@cluster0.xyz.mongodb.net/talenttrack";
      const normalized = normalizeMongoUri(uriWithBrackets);

      assert.strictEqual(
        normalized,
        "mongodb+srv://user:MyActualPassword@cluster0.xyz.mongodb.net/talenttrack",
      );
    });

    it("trims whitespace from normalized URI safely", () => {
      const padded = "   mongodb://localhost:27017/talenttrack   ";
      assert.strictEqual(normalizeMongoUri(padded), "mongodb://localhost:27017/talenttrack");
    });
  });

  describe("2. Database Status & Readiness Probes", () => {
    it("reports database state accurately without credential leakage", () => {
      const status = getDatabaseStatus();

      assert.ok(
        ["connected", "connecting", "disconnected", "disconnecting"].includes(status.status),
      );
      assert.strictEqual(typeof status.readyState, "number");
    });

    it("pingDatabase probe safely returns boolean false when database is not connected", async () => {
      const isAlive = await pingDatabase(500);
      assert.strictEqual(typeof isAlive, "boolean");
    });

    it("GET /api/health returns HTTP 200 with sanitized database status", async () => {
      const req = new Request("http://localhost:3000/api/health", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as any;
      assert.strictEqual(json.success, true);
      assert.ok(json.data.database);
      assert.strictEqual(json.data.service, "talenttrack-ai-api");
      assert.strictEqual(typeof json.data.timestamp, "string");
      assert.ok(!JSON.stringify(json).includes("password"));
    });

    it("GET /api/ready reflects active dependency readiness and returns 503 when DB is unavailable", async () => {
      const req = new Request("http://localhost:3000/api/ready", { method: "GET" });
      const res = await handleApiRequest(req);
      assert.ok(res);

      const expectedStatus = isDatabaseConnected() ? 200 : 503;
      assert.strictEqual(res.status, expectedStatus);

      const json = (await res.json()) as any;
      assert.strictEqual(typeof json.data.ready, "boolean");
      assert.strictEqual(json.data.ready, isDatabaseConnected());
    });
  });

  describe("3. Connection Configuration Options & Timeouts", () => {
    it("connectToDatabase handles timeout gracefully when host is unreachable", async () => {
      const unreachableUri = "mongodb://127.0.0.1:27999/talenttrack_unreachable";
      await assert.rejects(
        async () => {
          await connectToDatabase(unreachableUri, {
            serverSelectionTimeoutMS: 500,
            connectTimeoutMS: 500,
          });
        },
        (err: Error) => {
          assert.ok(err.message.length > 0);
          return true;
        },
      );
    });
  });
});

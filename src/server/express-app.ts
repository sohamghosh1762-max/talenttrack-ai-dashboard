import express, { type Request as ExpressReq, type Response as ExpressRes } from "express";
import { connectToDatabase, disconnectDatabase, getDatabaseStatus } from "./db/mongodb.ts";
import { handleApiRequest } from "./routes/index.ts";
import { resumeBackgroundWorker } from "./workers/resume-worker.ts";

/**
 * Express Application Adapter for TalentTrack AI API
 */
export function createExpressApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Liveness health check endpoint
  app.get("/api/health", async (_req: ExpressReq, res: ExpressRes) => {
    const dbStatus = getDatabaseStatus();
    res.status(200).json({
      success: true,
      data: {
        status: "healthy",
        database: dbStatus.status,
        timestamp: new Date().toISOString(),
        service: "talenttrack-ai-api",
      },
    });
  });

  // Readiness dependency probe
  app.get("/api/ready", async (_req: ExpressReq, res: ExpressRes) => {
    const dbStatus = getDatabaseStatus();
    const isReady = dbStatus.status === "connected";
    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      success: isReady,
      data: {
        ready: isReady,
        status: isReady ? "ready" : "not_ready",
        database: dbStatus.status,
        readyState: dbStatus.readyState,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Universal Web Fetch API bridge to existing handlers
  app.use("/api", async (req: ExpressReq, res: ExpressRes) => {
    try {
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(", "));
      }

      const body = ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body);

      const reqInit: RequestInit = {
        method: req.method,
        headers,
      };
      if (body) {
        reqInit.body = body;
      }

      const standardReq = new Request(fullUrl, reqInit);

      const standardRes = await handleApiRequest(standardReq);

      if (!standardRes) {
        return res.status(404).json({ success: false, message: "Route not found" });
      }

      res.status(standardRes.status);
      standardRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const jsonBody = await standardRes.json();
      return res.json(jsonBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  return app;
}

/**
 * Start Express Server with MongoDB Startup Verification & Background Workers
 */
export async function startServer(port: number = 3000) {
  console.log("Starting TalentTrack AI Express Server...");
  console.log("  [1/4] Validating environment configuration...");

  try {
    console.log("  [2/4] Connecting to MongoDB persistence layer...");
    await connectToDatabase();
    console.log("  [3/4] MongoDB connection verified successfully.");

    console.log("  [4/4] Starting background resume workers...");
    await resumeBackgroundWorker.start(2000);

    const app = createExpressApp();
    const server = app.listen(port, () => {
      console.log(`🚀 TalentTrack AI Express server listening on http://localhost:${port}`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      resumeBackgroundWorker.stop();

      server.close(async () => {
        console.log("[Server] HTTP server closed.");
        await disconnectDatabase();
        console.log("[Server] Graceful shutdown completed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    return server;
  } catch (error) {
    console.error("❌ Fatal startup error: Could not connect to MongoDB database.");
    console.error(error);
    process.exit(1);
  }
}

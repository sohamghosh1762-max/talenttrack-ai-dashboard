import { z } from "zod";

const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "your-random-session-secret-at-least-32-chars",
  "your-random-jwt-secret-key-for-tokens",
  "secret",
  "changeme",
  "password123",
  "default_secret",
]);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 3000)),
    APP_URL: z.string().url().default("http://localhost:3000"),
    API_URL: z.string().url().default("http://localhost:3000"),

    // Database (MongoDB)
    MONGODB_URI: z.string().optional().default("mongodb://127.0.0.1:27017/talenttrack"),
    DATABASE_URL: z.string().optional(),
    MONGODB_SERVER_TIMEOUT_MS: z.string().optional(),

    // Authentication & Security
    SESSION_SECRET: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default("7d"),
    ALLOW_DEMO_ACCOUNTS: z.string().optional().default("false"),

    // AI Services
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-3.6-flash"),

    // Firebase Admin
    FIREBASE_PROJECT_ID: z.string().default("talenttrack-ai-75a10"),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),

    // S3 / Storage
    AWS_REGION: z.string().default("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),

    // Email / SMTP
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 587)),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM_EMAIL: z.string().email().default("no-reply@talenttrack.ai"),
    SMTP_FROM_NAME: z.string().default("TalentTrack AI"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      // 1. MONGODB_URI validation
      const mongoUri = data.MONGODB_URI || data.DATABASE_URL;
      if (!mongoUri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MONGODB_URI"],
          message: "Production requires MONGODB_URI to be configured.",
        });
      } else if (
        mongoUri.includes("127.0.0.1") ||
        mongoUri.includes("localhost") ||
        !mongoUri.startsWith("mongodb")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MONGODB_URI"],
          message:
            "Production requires a valid remote MONGODB_URI (e.g. MongoDB Atlas); local addresses (127.0.0.1 or localhost) are strictly prohibited.",
        });
      }

      // 2. SESSION_SECRET validation
      if (!data.SESSION_SECRET || data.SESSION_SECRET.trim().length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message:
            "SESSION_SECRET is required in production and must be at least 32 characters long.",
        });
      } else if (KNOWN_PLACEHOLDER_SECRETS.has(data.SESSION_SECRET.trim().toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message:
            "SESSION_SECRET cannot use an insecure placeholder or default development value in production.",
        });
      }

      // 3. JWT_SECRET validation
      if (!data.JWT_SECRET || data.JWT_SECRET.trim().length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET is required in production and must be at least 32 characters long.",
        });
      } else if (KNOWN_PLACEHOLDER_SECRETS.has(data.JWT_SECRET.trim().toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message:
            "JWT_SECRET cannot use an insecure placeholder or default development value in production.",
        });
      }

      // 4. Prohibit demo accounts in production
      if (data.ALLOW_DEMO_ACCOUNTS === "true") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ALLOW_DEMO_ACCOUNTS"],
          message:
            "Demo accounts and development seeds are strictly prohibited in production environments.",
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Explicit validator for production environment configuration
 */
export function validateProductionEnvironment(customEnv?: Record<string, string | undefined>): {
  valid: boolean;
  errors: string[];
} {
  const envSource = customEnv || (typeof process !== "undefined" && process.env ? process.env : {});
  const result = envSchema.safeParse({ ...envSource, NODE_ENV: "production" });

  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join(".") || "CONFIG"}: ${err.message}`,
    );
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}

function loadAndValidateEnv(): EnvConfig {
  const proc = process as unknown as { loadEnvFile?: () => void };
  if (typeof process !== "undefined" && typeof proc.loadEnvFile === "function") {
    try {
      proc.loadEnvFile();
    } catch {
      // .env file might not exist in some environments, ignore
    }
  }

  const envSource = typeof process !== "undefined" && process.env ? process.env : {};
  const isProduction = envSource["NODE_ENV"] === "production";
  const result = envSchema.safeParse(envSource);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".") || "CONFIG"}: ${err.message}`)
      .join("; ");

    if (isProduction) {
      throw new Error(`[Config] Production environment validation failed: ${errorDetails}`);
    }

    console.warn(`[Config] Environment validation warning: ${errorDetails}`);
    return envSchema.parse({
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      API_URL: "http://localhost:3000",
    });
  }

  return result.data;
}

export const env = loadAndValidateEnv();

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000)),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:3000"),

  // Database (Phase 4)
  DATABASE_URL: z.string().optional(),

  // Authentication & Security (Phase 2)
  SESSION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // AI Services (Phase 7)
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // S3 / Storage (Phase 5)
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Email / SMTP (Phase 8)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 587)),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().default("no-reply@talenttrack.ai"),
  SMTP_FROM_NAME: z.string().default("TalentTrack AI"),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadAndValidateEnv(): EnvConfig {
  const envSource = typeof process !== "undefined" && process.env ? process.env : {};
  const result = envSchema.safeParse(envSource);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
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

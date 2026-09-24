# TalentTrack AI — Environment Configuration

This document specifies the environment variable architecture, validation mechanisms, and security isolation rules.

---

## 1. Overview & Principles

1. **No Committed Secrets:** Real credentials, signing keys, and secrets must never be committed to Git. `.env` and `.env.*` (except `.env.example`) are ignored in `.gitignore`.
2. **Strict Client/Server Separation:** Server-only variables (such as database connection strings, JWT signing keys, and AI provider API keys) must never be bundled into the client browser bundle.
3. **Zod Boundary Validation:** All server environment variables are parsed and validated on server startup in `src/server/config/env.ts`.

---

## 2. Configuration Variables Reference

### Application Settings

- `NODE_ENV` (`development` | `test` | `production`): Application runtime environment. Default: `development`.
- `PORT` (number): Server port. Default: `3000`.
- `APP_URL` (string): Public base URL for the web application. Default: `http://localhost:3000`.
- `API_URL` (string): Base URL for API requests. Default: `http://localhost:3000`.

### Database (Planned Phase 4)

- `DATABASE_URL` (string): MongoDB connection string.

### Authentication & Session (Planned Phase 2)

- `SESSION_SECRET` (string): Secret used for signing session cookies. Minimum 32 characters in production.
- `JWT_SECRET` (string): Secret used for signing JSON Web Tokens. Minimum 32 characters in production.
- `JWT_EXPIRES_IN` (string): Expiration duration (e.g. `7d`, `24h`).

### AI Providers (Planned Phase 7)

- `OPENAI_API_KEY` (string): OpenAI API Key for embeddings and analysis.
- `GEMINI_API_KEY` (string): Google Gemini API Key for candidate screening assistance.

### Object Storage / Resumes (Planned Phase 5)

- `AWS_REGION` (string): AWS S3 region. Default: `us-east-1`.
- `AWS_ACCESS_KEY_ID` (string): S3 IAM access key.
- `AWS_SECRET_ACCESS_KEY` (string): S3 IAM secret key.
- `AWS_S3_BUCKET` (string): S3 bucket name for resume uploads.

### Email / SMTP (Planned Phase 8)

- `SMTP_HOST` (string): SMTP server host.
- `SMTP_PORT` (number): SMTP port (e.g. `587`, `465`).
- `SMTP_USER` (string): SMTP username.
- `SMTP_PASSWORD` (string): SMTP password.
- `SMTP_FROM_EMAIL` (string): From email address. Default: `no-reply@talenttrack.ai`.
- `SMTP_FROM_NAME` (string): From display name. Default: `TalentTrack AI`.

---

## 3. Server Configuration Access

Application code should never access raw `process.env` directly in deep business logic. Always import the typed configuration object:

```typescript
import { config } from "@/server/config";

console.log(config.app.nodeEnv);
console.log(config.auth.jwtExpiresIn);
```

# TalentTrack AI — Environment Configuration Reference

This document outlines all environment variables required by **TalentTrack AI**, categorized by runtime boundary (Frontend vs. Backend) and external service integrations.

> [!CAUTION]
> **Never commit real secret credentials or `.env` files to git.** The `.env` file is excluded in `.gitignore`. Use `.env.example` as a template containing placeholder values only.

---

## 1. Frontend Configuration (Client-Visible `VITE_*`)

Variables prefixed with `VITE_` are bundled into the client application by Vite. They must **never** contain private backend secrets, database connection strings, or service account keys.

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | No | `/api` | Base URL prefix for backend REST API requests. |
| `VITE_FIREBASE_API_KEY` | Yes | `<your-firebase-api-key>` | Firebase Web API key for client-side authentication. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `<project-id>.firebaseapp.com` | Firebase Auth domain for OAuth callbacks. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | `<project-id>` | Firebase Project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | `<project-id>.firebasestorage.app` | Firebase Web storage bucket identifier. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | `1234567890` | Firebase Cloud Messaging sender ID. |
| `VITE_FIREBASE_APP_ID` | Yes | `1:1234567890:web:...` | Firebase Web Application ID. |

---

## 2. Backend Server & Core Configuration

These variables are consumed strictly on the server by `src/server/config/env.ts` and validated with Zod on startup.

| Variable Name | Required | Default / Placeholder | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | No | `development` | Server runtime environment (`development`, `production`, `test`). |
| `PORT` | No | `8080` (or `3000`) | Server HTTP port for Express / Vite dev middleware. |
| `SESSION_SECRET` | Yes | `<configured-secret-32-chars>` | High-entropy secret used for cryptographic session signing. |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`). |

---

## 3. Database & Storage Configuration

| Variable Name | Required | Default / Placeholder | Purpose |
| :--- | :---: | :--- | :--- |
| `MONGODB_URI` | Yes | `<configured-mongodb-uri>` | MongoDB connection string (e.g. `mongodb+srv://...`). |
| `AWS_REGION` | Yes | `us-east-1` | AWS S3 region hosting resume storage buckets. |
| `AWS_ACCESS_KEY_ID` | Yes | `<configured-aws-access-key>` | AWS IAM access key with S3 read/write permissions. |
| `AWS_SECRET_ACCESS_KEY` | Yes | `<configured-aws-secret-key>` | AWS IAM secret access key. |
| `AWS_S3_BUCKET_NAME` | Yes | `talenttrack-resumes` | Name of the private S3 bucket for storing resumes. |

---

## 4. AI & Gemini Integration

| Variable Name | Required | Default / Placeholder | Purpose |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | Yes | `<configured-gemini-key>` | Google Gemini API key used by `@google/genai` for structured resume parsing and ATS semantic analysis. |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Primary Gemini model identifier for AI evaluations. |

---

## 5. Firebase Admin SDK Configuration (Server)

Used by `FirebaseAdminService` to verify applicant Firebase ID tokens server-side.

| Variable Name | Required | Default / Placeholder | Purpose |
| :--- | :---: | :--- | :--- |
| `FIREBASE_PROJECT_ID` | Yes | `<configured-project-id>` | Firebase Project ID. |
| `FIREBASE_CLIENT_EMAIL` | Yes | `<configured-service-account-email>` | Firebase service account client email. |
| `FIREBASE_PRIVATE_KEY` | Yes | `<configured-private-key>` | Firebase service account RSA private key (with escaped `\n`). |

---

## 6. Template `.env.example` Reference

```bash
# Frontend Public Variables
VITE_API_BASE_URL=/api
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef

# Backend Server
NODE_ENV=development
PORT=8080
SESSION_SECRET=replace-with-a-secure-32-character-random-secret
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/talenttrack?retryWrites=true&w=majority

# AWS S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=talenttrack-resumes

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash

# Firebase Admin SDK (Server)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n<your-private-key-here>\n-----END PRIVATE KEY-----\n"

# Email Delivery & SMTP (Nodemailer Production Transport)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-smtp-api-key
SMTP_SECURE=false
SMTP_FROM_EMAIL=no-reply@talenttrack.ai
SMTP_FROM_NAME="TalentTrack AI"
REQUIRE_SMTP=false
```

---

## 7. Email Delivery & SMTP Configuration (Nodemailer)

TalentTrack AI utilizes **Nodemailer** for outbound transactional email delivery (email verification, password resets, and candidate notifications).

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `SMTP_HOST` | In Prod (with email) | `smtp.sendgrid.net` | Hostname of the outbound SMTP relay server. |
| `SMTP_PORT` | No | `587` | SMTP port: 587 (STARTTLS), 465 (implicit TLS), or 2525. |
| `SMTP_USER` | When Auth Required | `apikey` | Username or API key for SMTP authentication. |
| `SMTP_PASSWORD` | When Auth Required | `<smtp-secret-key>` | Password or API secret key for SMTP authentication. |
| `SMTP_SECURE` | No | `false` (auto-true for port 465) | Set `true` for implicit TLS (port 465), `false` for STARTTLS (port 587). |
| `SMTP_FROM_EMAIL` | No | `no-reply@talenttrack.ai` | Valid RFC 5322 sender email address. |
| `SMTP_FROM_NAME` | No | `TalentTrack AI` | Sender display name. |
| `REQUIRE_SMTP` | No | `false` | When `true`, enforces that `SMTP_HOST` is configured during production startup. |

### Environment Behavior

1. **Development & Testing:**
   - If `SMTP_HOST` is omitted, the system falls back safely to `DevConsoleEmailProvider`, which logs simulated dispatch metadata without leaking sensitive credentials or raw tokens.
   - If `SMTP_HOST` is supplied, it connects through the specified SMTP server.

2. **Production:**
   - In production (`NODE_ENV=production`), silent fallback to the console mock is **strictly prohibited**.
   - If `SMTP_HOST` is missing or the SMTP server rejects transmission, the provider safely returns a delivery failure and logs sanitized error details.
   - Tokens generated for failed delivery attempts remain in MongoDB and are **not** invalidated, enabling users to request resends.

### Provider Integration Examples

- **SendGrid:**
  - `SMTP_HOST=smtp.sendgrid.net`
  - `SMTP_PORT=587`
  - `SMTP_USER=apikey`
  - `SMTP_PASSWORD=<Your SendGrid API Key>`
  - `SMTP_SECURE=false`

- **Mailgun:**
  - `SMTP_HOST=smtp.mailgun.org`
  - `SMTP_PORT=587`
  - `SMTP_USER=postmaster@your-domain.mailgun.org`
  - `SMTP_PASSWORD=<Your Mailgun SMTP Password>`
  - `SMTP_SECURE=false`

- **Amazon SES:**
  - `SMTP_HOST=email-smtp.us-east-1.amazonaws.com`
  - `SMTP_PORT=465`
  - `SMTP_USER=<Your SES SMTP Username>`
  - `SMTP_PASSWORD=<Your SES SMTP Password>`
  - `SMTP_SECURE=true`

### Running Email Tests & Optional Live Smoke Test

1. **Automated Unit & Integration Tests (Mocked SMTP):**
   ```bash
   node --test --experimental-strip-types src/server/__tests__/smtp-email-delivery.test.ts
   ```

2. **Opt-in Live SMTP Smoke Test (Real Inbound Mailbox):**
   ```bash
   RUN_LIVE_SMTP_TEST=true TEST_EMAIL_RECIPIENT="your-test-mailbox@example.com" node --experimental-strip-types scripts/smtp-smoke-test.ts
   ```

### Troubleshooting Common SMTP Issues

- **Authentication Failed (`535 5.7.8`):** Verify `SMTP_USER` and `SMTP_PASSWORD`. For Gmail/Google Workspace, ensure you are using an App Password rather than your account password.
- **Connection Timeout (`ETIMEDOUT`):** Many cloud hosts block outbound port 25. Use port 587 or port 465.
- **TLS Handshake / Certificate Errors:** Ensure `SMTP_SECURE=true` is used only on port 465 and `false` on port 587. Insecure TLS workarounds (`rejectUnauthorized: false`) are intentionally blocked for security.
- **Rejected Recipient (`550 5.1.1`):** Verify that the destination inbox exists and that your sending domain has valid SPF/DKIM records.


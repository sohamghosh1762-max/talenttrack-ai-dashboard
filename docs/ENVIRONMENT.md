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
```

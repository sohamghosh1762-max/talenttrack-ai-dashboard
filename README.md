# TalentTrack AI

## AI-Powered Applicant Tracking System & Controlled Hybrid ATS

**TalentTrack AI** is an enterprise-grade Applicant Tracking System (ATS) designed to streamline the entire recruitment lifecycle for organizations and provide job seekers with a transparent, intelligent application experience. 

The platform features a **Controlled Hybrid ATS Scoring Engine** that combines deterministic rule-based evaluation with Google Gemini semantic intelligence, robust Role-Based Access Control (RBAC), Firebase-authenticated applicant identity, Amazon S3 document storage, and MongoDB persistence.

> **Note:** AI-generated ATS evaluations and semantic candidate insights are designed to support recruiter decision-making. Final hiring authority remains with human talent acquisition teams.

---

## Features

- **Controlled Hybrid ATS Scoring**: Combines 60% deterministic objective measurements (completeness, structure, chronology, keyword density) with 40% Google Gemini semantic intelligence (qualitative relevance, evidence citations).
- **100% Score Repeatability**: Cryptographic SHA-256 canonical resume hashing and composite analysis keys eliminate AI score drift and cache evaluations idempotently.
- **Applicant Experience**: Firebase authentication (Google Sign-In, Email/Password, Phone OTP), resume upload, instant ATS score breakdown, personalized job search, and real-time application tracking.
- **Recruiter ATS Hub**: Job posting CRUD, applicant candidate reviews, interactive Kanban pipeline, AI match screening, and candidate communication.
- **Administrator Portal**: Platform-wide user lifecycle management (activate, suspend, unlock accounts), activity audit logs, and compliance analytics.
- **Secure Document Processing**: AWS S3 private object storage, presigned download URLs, and robust PDF/DOCX text extraction with automated corrupted header recovery.
- **Enterprise Security & RBAC**: Centralized permissions matrix across 7 user roles, native Scrypt password hashing, SHA-256 session tokens, 15-minute brute-force lockout defense, and zero client trust.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (BROWSER)                                 │
│  ┌───────────────────────────────┐       ┌───────────────────────────────┐  │
│  │    React 19 Presentation      │       │     Tailwind CSS v4 & Radix   │  │
│  │ (Applicant / Recruiter/ Admin)│       │     UI Accessible Primitives  │  │
│  └───────────────┬───────────────┘       └───────────────────────────────┘  │
│                  │                                       │                  │
│                  ▼                                       ▼                  │
│  ┌───────────────────────────────┐       ┌───────────────────────────────┐  │
│  │    TanStack Router Tree &     │       │       TanStack Query v5       │  │
│  │       Role Route Guards       │       │    (Async Server Caching)     │  │
│  └───────────────┬───────────────┘       └───────────────┬───────────────┘  │
│                  │                                       │                  │
│                  └───────────────────┬───────────────────┘                  │
│                                      ▼                                      │
│                        ┌───────────────────────────┐                        │
│                        │    Frontend API Client    │                        │
│                        │    (src/lib/api/client)   │                        │
│                        └─────────────┬─────────────┘                        │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ HTTP / JSON (Bearer / Session Cookie)
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                                      ▼                                      │
│                            BACKEND SERVER ENGINE                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │      Central API Router Dispatcher (`src/server/routes/index.ts`)     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         ▼                            ▼                            ▼         │
│  ┌──────────────┐             ┌──────────────┐             ┌──────────────┐ │
│  │ Structured   │             │ Auth & RBAC  │             │ Zod Request  │ │
│  │ Logger & Req │             │ Middleware   │             │ Boundary     │ │
│  │ Timing ID    │             │ Guards       │             │ Validation   │ │
│  └──────────────┘             └──────────────┘             └──────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│                        ┌───────────────────────────┐                        │
│                        │       Service Layer       │                        │
│                        │   (src/server/services)   │                        │
│                        └─────────────┬─────────────┘                        │
│                                      │                                      │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         ▼                            ▼                            ▼         │
│  ┌──────────────┐             ┌──────────────┐             ┌──────────────┐ │
│  │ MongoDB &    │             │ AWS S3       │             │ Google       │ │
│  │ Mongoose     │             │ Object Store │             │ Gemini AI    │ │
│  │ Repositories │             │ (Resumes)    │             │ Engine       │ │
│  └──────────────┘             └──────────────┘             └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Nitro SSR, TanStack Router, TanStack Query v5, Tailwind CSS v4, Radix UI, Lucide Icons, Recharts.
- **Backend**: Node.js (`>=20.0.0`), Express 5, TypeScript.
- **Database & ODM**: MongoDB with Mongoose 9 (`mongoose`).
- **Cloud Storage**: Amazon Web Services (AWS) S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- **AI & ATS Intelligence**: Google Gemini SDK (`@google/genai`) using model `gemini-3.6-flash`.
- **Authentication**:
  - Firebase Admin SDK (`firebase-admin`) for Applicant identity verification.
  - Native Scrypt password hashing (`node:crypto`) & SHA-256 session token management for Recruiters/Admins.
- **Testing**: Native Node.js Test Runner (`node:test`, `node:assert/strict`) with 309 passing automated tests.

---

## Portals & Roles

### Applicant Portal (`/applicant`)
- **ATS Resume Score**: Real-time compatibility score (0–100), 6-category breakdown, AI evidence citations, strengths, weaknesses, and recommendations.
- **Job Search**: Search openings with filters, save favorites, and submit one-click applications.
- **Application History**: Track application statuses from submission to interview and offer.
- **Candidate Profile**: Manage skills, work experience, education, and portfolio links.

### Recruiter Portal (`/dashboard`)
- **Dashboard Overview**: Active job postings, candidate counts, and recent submissions.
- **Job Management**: Create, edit, publish, pause, and archive job openings.
- **Kanban Pipeline (`/pipeline`)**: Drag-and-drop candidates across stages (`APPLIED` → `SCREENING` → `INTERVIEW` → `OFFERED` → `REJECTED`).
- **Candidate Detail**: Review parsed profiles, match scores, and interview notes.

### Hiring Manager Portal (`/hiring-manager`)
- **Decision Dashboard**: Scoped view of assigned positions, candidates awaiting review, shortlisted counts, and pending decisions.
- **Requisition Management (`/hiring-manager/jobs`)**: Directory of job requisitions assigned directly to the manager.
- **Candidate Review (`/hiring-manager/candidates`)**: Scoped candidate directory with match scores, stage badges, and review status.
- **Candidate Inspector & Feedback**: Comprehensive candidate detail view with ATS score breakdown, structured evaluations with ratings (1-5), and binding Approve/Reject decisions.
- **Job-Scoped Analytics (`/hiring-manager/analytics`)**: Real-time pipeline metrics, average ATS scores, and decision distribution.

### Administrator Portal (`/admin`)
- **User Directory**: Search, filter, activate, suspend, or unlock user accounts.
- **Audit Logs**: Review platform-wide security and administrative actions.
- **Analytics & Reports**: Platform compliance, user distribution, and recruitment metrics.

---

## AI & Controlled Hybrid ATS

```
                  ┌─────────────────────────────────────────┐
                  │              Candidate Resume           │
                  └────────────────────┬────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
                Deterministic Engine          Gemini AI Engine
                (Objective Criteria)        (Semantic Substance)
                         │                           │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                             Controlled Fusion Engine
                        (60% Deterministic + 40% Gemini)
                                       │
                                       ▼
                             Final ATS Resume Score
```

- **Category Fusion Formula**:
  $$\text{Category Score} = \text{round}\left(0.60 \times \text{Deterministic Score} + 0.40 \times \text{Gemini Dimension Score}\right)$$
- **Auditing & Idempotency**:
  $$\text{analysisKey} = \text{SHA-256}\left(\text{resumeHash} : \text{rubricVersion} : \text{engineVersion} : \text{geminiModel} : \text{promptVersion} : \text{jobContextHash}\right)$$
- **Score Stability**: 10 repeated analyses of the exact same resume yield 100% identical numerical results across all categories.

---

## Authentication & Security

- **Applicant Authentication**: Firebase Authentication on client; server validates Firebase ID tokens via `FirebaseAdminService.verifyIdToken()` and links or provisions MongoDB records via `firebaseUid`.
- **Recruiter / Admin Authentication**: Direct server Scrypt password hashing with per-user 16-byte random salts.
- **Session Tokens**: Opaque tokens stored as SHA-256 hashes (`tokenHash`) with `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Defense in Depth**: 5-attempt brute-force lockout (15 mins), IP rate limiting, private S3 buckets with presigned URLs, and Zod schema boundary validation.

---

## Development & Testing

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- MongoDB instance & Google Gemini API Key

### Quick Start
```bash
# 1. Clone repository & install dependencies
git clone https://github.com/sohamghosh1762-max/talenttrack-ai-dashboard.git
cd talenttrack-ai-dashboard
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev
```

### Verification Commands
```bash
# Run automated test suite (285 tests across 79 suites)
npm test

# Run strict TypeScript typecheck
npm run typecheck

# Run production build
npm run build
```

---

## Documentation Index

Complete technical and architectural documentation is available in the [`docs/`](./docs) directory:

- [System Architecture](docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`)
- [API Architecture & Endpoints](docs/API_ARCHITECTURE.md) (`docs/API_ARCHITECTURE.md`)
- [ATS Architecture & Hybrid Scoring](docs/ATS_ARCHITECTURE.md) (`docs/ATS_ARCHITECTURE.md`)
- [Authentication & RBAC](docs/AUTH_AND_RBAC.md) (`docs/AUTH_AND_RBAC.md`)
- [Database Architecture & Schemas](docs/DATABASE.md) (`docs/DATABASE.md`)
- [Resume Pipeline & Storage](docs/RESUME_PIPELINE.md) (`docs/RESUME_PIPELINE.md`)
- [Implementation Status Matrix](docs/IMPLEMENTATION_STATUS.md) (`docs/IMPLEMENTATION_STATUS.md`)
- [Testing & Quality Assurance](docs/TESTING.md) (`docs/TESTING.md`)
- [Environment Configuration](docs/ENVIRONMENT.md) (`docs/ENVIRONMENT.md`)
- [Security Baseline](docs/SECURITY_BASELINE.md) (`docs/SECURITY_BASELINE.md`)
- [Developer Guide](docs/DEVELOPMENT.md) (`docs/DEVELOPMENT.md`)

---

## Contributors & Internship

This project is developed for educational, research, and enterprise ATS demonstration purposes.

### Contributors
- **Project Lead:** SOHAM GHOSH
- **Team Members:** Jevin Parmar, Nayesha Suhail Ahmed Bijapure, Shubham Tiwari
- **Internship:** Zaalima Development Pvt. Ltd.

---

<p align="center">
  <strong>TalentTrack AI</strong><br />
  <em>Smarter Hiring. Brighter Teams.</em>
</p>

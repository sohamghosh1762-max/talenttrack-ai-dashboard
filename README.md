# TalentTrack AI

AI-Powered Applicant Tracking & Talent Sourcing Platform

**TalentTrack AI** is an enterprise-grade Applicant Tracking System (ATS) designed to streamline the entire recruitment lifecycle for organizations and provide job seekers with a transparent, intelligent application experience. The platform features a **Controlled Hybrid ATS Scoring Engine** that combines deterministic rule-based evaluation with Google Gemini semantic intelligence, robust Role-Based Access Control (RBAC), Firebase-authenticated applicant identity, Amazon S3 document storage, and MongoDB persistence.

> **Note:** AI-generated ATS evaluations and semantic candidate insights are designed to support recruiter decision-making. Final hiring authority remains with human talent acquisition teams.

---

## 1. Overview

TalentTrack AI unifies candidate sourcing, applicant tracking, automated AI resume screening, stage-based pipeline management, and recruitment analytics into a single cohesive web application. Built on React 19, TanStack Router, TanStack Query, Node.js/Express, MongoDB/Mongoose, and Google Gemini AI, it delivers real-time talent intelligence for recruiters and seamless application tracking for candidates.

---

## 2. Key Features

- **Controlled Hybrid ATS Scoring Engine**: Combines 60% deterministic objective measurements (completeness, structure, chronology, keyword density) with 40% Google Gemini semantic intelligence.
- **100% Score Repeatability**: Cryptographic SHA-256 canonical resume hashing and composite analysis keys eliminate AI score drift and cache evaluations idempotently.
- **Recruiter ATS Hub**: Complete job posting lifecycle management, candidate search and skill filtering, six-stage recruitment Kanban pipeline, interview management, and analytics.
- **Applicant Experience**: Firebase authentication (Google Sign-In, Email/Password, Phone OTP), resume upload, instant ATS score breakdown, job search, and application tracking.
- **Administrator Portal**: Platform-wide user lifecycle management (activate, suspend, unlock accounts), activity audit logs, and compliance reporting.
- **Secure Document Processing**: AWS S3 private object storage, presigned download URLs, and robust PDF/DOCX text extraction with automated corrupted header recovery.
- **Enterprise Security & RBAC**: Centralized permissions matrix across user roles, native Scrypt password hashing, SHA-256 session tokens, brute-force defense, and resource ownership protection.

---

## 3. Recruiter Module

The Recruiter Module serves as the primary workspace for talent acquisition professionals:

- **Recruiter Dashboard**: Displays KPI metrics (Active Jobs, Total Applicants, Scheduled Interviews, Time-to-Hire) and urgent actionable tasks.
- **Job Management**: Complete CRUD capabilities for job postings (Create, Edit, Draft, Publish, Archive states) with recruiter ownership verification.
- **Candidate Database & Search**: Full-text candidate search, skill tag filtering, and candidate profile drawer/modal views.
- **Resume Viewing & Re-parsing**: Instant candidate resume preview, S3 presigned downloads, and manual re-triggering of AI parsing.
- **AI Match Screening**: Match percentage calculations, skill gap analysis (matched vs. missing skills), and experience alignment scores.
- **Recruiter Settings**: Profile management, recruitment notifications, and organization preferences.

---

## 4. Applicant Workflow

Applicants navigate an intuitive, transparent application lifecycle:

- **Profile & Resume Upload**: Multi-format resume upload (PDF, DOCX) with text extraction and automatic parsing.
- **Personalized ATS Score**: Instant feedback on resume readiness (0–100 scale), category breakdowns, and AI recommendations.
- **Job Board & Application**: Browse published jobs, view match score previews, apply with one click, and track application status.
- **My Applications Hub**: View active applications, current recruitment pipeline stages, and interview invites.

---

## 5. AI ATS Screening

The Controlled Hybrid ATS engine evaluates candidates objectively and semantically:

1. **Deterministic Layer (60% Weight)**:
   - Contact Info & Completeness (15%)
   - Resume Section Structure & Hierarchy (10%)
   - Work Experience Chronology (15%)
   - Skill Keyword Match & Density (20%)
2. **Semantic Layer (40% Weight - Google Gemini AI)**:
   - Technical Depth & Scope (20%)
   - Evidence & Impact Citations (20%)
3. **Reproducibility & Safety**:
   - SHA-256 canonical resume hashing guarantees 100% repeatable scores.
   - Credentials (API keys, DB secrets) are strictly isolated from client-facing output.

---

## 6. Recruitment Pipeline

Candidates progress through a six-stage recruitment pipeline:

```text
APPLIED ──► SCREENING ──► INTERVIEW ──► OFFERED ──► HIRED
   │           │             │             │
   └───────────┴─────────────┴─────────────┴─────► REJECTED
```

- **Drag-and-Drop Kanban Board**: Visual stage transitions for recruiters.
- **Recruiter Ownership Scoping**: Recruiters only view and manage candidates for jobs they own.
- **Stage Change Auditing**: Automated timestamps and activity audit logs recorded on every stage update.

---

## 7. Interview Management

Schedule and manage candidate interviews directly within the platform:

- **Schedule Interviews**: Define interview type (Screening, Technical, Behavioral, Final), date, time, duration, and timezones.
- **Meeting Url Validation**: Include validated meeting URLs (Google Meet, Zoom, Microsoft Teams).
- **Interviewer Assignment**: Assign recruiters, hiring managers, or team members to interview panels.
- **Interview Status Tracking**: Manage states (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`).

---

## 8. Analytics & Reporting

Recruitment leaders gain actionable metrics:

- **Sourcing Analytics**: Distribution of applicants across channels and referral sources.
- **Pipeline Velocity**: Time spent by candidates in each pipeline stage.
- **AI Match Distribution**: Overview of candidate quality and match tier distributions.
- **Data Export**: Export candidate lists and report metrics to CSV.

---

## 9. Security & RBAC

TalentTrack AI enforces strict Zero-Trust security and Role-Based Access Control:

- **Server-Side Identity Enforcement**: All `recruiterId` and `applicantId` parameters are derived from authenticated server sessions. Client-supplied IDs in request bodies are ignored.
- **Resource Ownership Scoping**: Recruiters cannot access another recruiter's jobs, candidates, or applications.
- **Role Hierarchy**: `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `APPLICANT`.
- **Brute-Force Lockout Defense**: 5 failed login attempts trigger a mandatory 15-minute account lockout.
- **Secret Hygiene**: Strict `.gitignore` rules prevent staging `.env`, keys, or credentials.

---

## 10. Technical Architecture

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
│  └───────────────────┬───────────────────────────────────┬───────────────┘  │
│                      │                                   │                  │
│         ┌────────────┴───────────────┐       ┌───────────┴─────────────┐    │
│         ▼                            ▼       ▼                         ▼    │
│  ┌──────────────┐             ┌──────────────┐             ┌──────────────┐ │
│  │ Structured   │             │ Auth & RBAC  │             │ Zod Request  │ │
│  │ Logger & Req │             │ Middleware   │             │ Boundary     │ │
│  └──────────────┘             └──────────────┘             └──────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│                        ┌───────────────────────────┐                        │
│                        │       Service Layer       │                        │
│                        └─────────────┬─────────────┘                        │
│                                      │                                      │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         ▼                            ▼                            ▼         │
│  ┌──────────────┐             ┌──────────────┐             ┌──────────────┐ │
│  │ MongoDB &    │             │ AWS S3       │             │ Google       │ │
│  │ Mongoose     │             │ Object Store │             │ Gemini AI    │ │
│  └──────────────┘             └──────────────┘             └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Technology Stack

- **Frontend Framework**: React 19, TypeScript 5.8, Vite 8, Nitro SSR.
- **Routing & State**: TanStack Router, TanStack Query v5.
- **Styling**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Recharts.
- **Backend Framework**: Node.js (`>=20.0.0`), Express 5, TypeScript.
- **Database & Persistence**: MongoDB with Mongoose 9 (`mongoose`).
- **Cloud Storage**: Amazon Web Services (AWS) S3 (`@aws-sdk/client-s3`).
- **AI Provider**: Google Gemini AI (`@google/genai`) using `gemini-3.6-flash`.
- **Authentication**: Firebase Admin SDK (`firebase-admin`) + Native Scrypt password hashing.
- **Testing**: Native Node.js Test Runner (`node:test`, `node:assert/strict`) with 376 automated tests.

---

## 12. Project Structure

```text
talenttrack-ai-dashboard/
├── docs/                       # Comprehensive documentation index
├── public/                     # Static assets and icons
├── src/
│   ├── components/             # Reusable UI components & Radix primitives
│   │   ├── admin/              # Administrator portal components
│   │   ├── applicant/          # Applicant portal components
│   │   ├── dashboard/          # Recruiter dashboard components
│   │   └── ui/                 # Shared UI elements (buttons, inputs, modals)
│   ├── routes/                 # TanStack Router route tree & page components
│   ├── server/                 # Express backend server engine
│   │   ├── __tests__/          # Automated unit test suite (376 tests)
│   │   ├── db/                 # Repositories & seed data
│   │   ├── middleware/         # Auth, RBAC, CSRF & validation middleware
│   │   ├── models/             # Mongoose database models
│   │   ├── routes/             # Express API route handlers
│   │   ├── services/           # Gemini AI, ATS engine, S3 & Parser services
│   │   └── validators/         # Zod request validation schemas
│   └── lib/                    # API client, utilities, and helper functions
├── .env.example                # Safe environment variable configuration template
├── .gitignore                  # Git ignore rules protecting secrets & build artifacts
├── package.json                # Project dependencies & npm scripts
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite & Nitro build configuration
```

---

## 13. Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# Application Configuration
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/talenttrack

# Authentication & Session Security
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# AI Provider Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-3.6-flash

# Firebase Web Configuration (Client)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=

# Firebase Admin Configuration (Server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# AWS S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

> **IMPORTANT**: Never commit `.env` or files containing real secrets to version control.

---

## 14. Local Development

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- MongoDB instance (Local or MongoDB Atlas)

### Steps
```bash
# 1. Clone repository & install dependencies
git clone https://github.com/sohamghosh1762-max/talenttrack-ai-dashboard.git
cd talenttrack-ai-dashboard
npm install

# 2. Configure environment
cp .env.example .env

# 3. Seed database (Optional)
npm run db:seed

# 4. Start development server
npm run dev
```

---

## 15. Testing

The project uses the native Node.js Test Runner with 376 automated unit and integration tests:

```bash
# Run complete automated test suite
npm test

# Run strict TypeScript type checking
npm run typecheck
```

---

## 16. Production Build

To bundle the application for production:

```bash
# Execute production build (Vite + Nitro SSR bundle)
npm run build

# Preview production build locally
npm run preview
```

---

## 17. Deployment

The application is configured for deployment with Cloudflare Workers / Nitro SSR or Node.js server environments:

```bash
# Build production bundle
npm run build

# Deploy using Nitro (if configured)
npx nitro deploy --prebuilt
```

---

## 18. Current Implementation Status

### Fully Implemented
- [x] Recruiter Dashboard & KPI Metrics
- [x] Job creation, editing, publishing, archiving (Draft/Published/Archived states)
- [x] Recruiter application management with strict resource ownership
- [x] Candidate search, skill filtering, and detailed candidate modal
- [x] AI resume screening, match scoring, and skill-gap analysis
- [x] Six-stage recruitment pipeline (`APPLIED` ➔ `SCREENING` ➔ `INTERVIEW` ➔ `OFFERED` ➔ `HIRED` / `REJECTED`)
- [x] Interview scheduling, panel assignment, and status tracking
- [x] Recruitment analytics and CSV reporting
- [x] Role-Based Access Control (RBAC) and authenticated identity derivation
- [x] Recruiter profile & settings management
- [x] Applicant portal with Firebase identity & instant ATS score

### Partially Implemented
- [ ] External Google Calendar / Outlook calendar bi-directional synchronization (Local scheduling fully active; external API sync planned)
- [ ] Real-time WebSocket candidate messaging (REST-based messaging fully functional; WebSockets in progress)

---

## 19. Future Enhancements

- [ ] Multi-platform job syndication (LinkedIn, Indeed, Glassdoor integration)
- [ ] AI-assisted offer letter generation with compensation benchmarking
- [ ] Automated SMS candidate reminders & WhatsApp integration
- [ ] Video interview recording analysis & transcript summarization

---

## Contributors & Acknowledgments

- **Project Lead:** SOHAM GHOSH
- **Development Team:** Jevin Parmar, Nayesha Suhail Ahmed Bijapure, Shubham Tiwari
- **Organization:** Zaalima Development Pvt. Ltd.

<p align="center">
  <strong>TalentTrack AI</strong><br />
  <em>Smarter Hiring. Brighter Teams.</em>
</p>

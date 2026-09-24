# TalentTrack AI

## AI-Powered Applicant Tracking System

**TalentTrack AI** is a modern Applicant Tracking System (ATS) designed to streamline the recruitment lifecycle for organizations and provide job seekers with a structured application experience. The platform combines job management, candidate applications, resume processing, semantic candidate matching, recruitment pipelines, communication, and hiring analytics in one unified application.

> **Important:** AI-generated recommendations are intended to support recruiter decision-making. Final hiring decisions remain with human reviewers.

---

## 1. Project Implementation Status

This repository is organized into sequential engineering phases. Below is the accurate status of all platform capabilities:

### Currently Implemented (UI & Prototype Portals)

- **Frontend Presentation:** Complete responsive React 19 application with Tailwind CSS v4 and Radix UI accessible primitives.
- **Role Portals:**
  - **Recruiter ATS:** Dashboard, Job Openings, Candidate Directory, Kanban Pipeline, AI Screening UI, Messaging UI, Reports, and Settings.
  - **Applicant Portal:** Overview, Search Jobs, Saved Jobs, Applications, Profile & Resume view, and Messages.
  - **Admin Module:** User Management, Activity Logs, Platform Reports, and Platform Configuration.
- **Routing & Guards:** TanStack Router file-based routing with role-based protected route wrappers (`ProtectedRoute`).
- **State Management:** TanStack Query configured for async caching and query invalidation.
- **Development Mock Layer:** Isolated in-memory datasets providing realistic data for UI walkthroughs.

### Phase 1 Implemented (Production Foundation & Architecture)

- **Package Management:** Standardized on `npm` with synchronized `package-lock.json`, removed conflicting lockfiles.
- **Runtime Environment:** Explicit Node.js version requirement (`>=20.0.0`, `.nvmrc` configured to `22.12.0`).
- **Build System:** Vite + TanStack Start + Nitro SSR pipeline stabilized with zero native binding errors.
- **Environment Layer:** Type-safe configuration via Zod schema validation in `src/server/config/`, with zero secrets committed.
- **Server Architecture:** Modular backend structure (`config`, `middleware`, `routes`, `controllers`, `services`, `repositories`, `validators`, `models`, `workers`, `utils`).
- **API Foundation:** Centralized `/api` router dispatcher with `/api/health`, standard response wrappers, and structured HTTP request logging (`requestId`, `timestamp`, `method`, `route`, `status`, `duration`).
- **Error Handling:** Standardized error hierarchy (`AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `InternalServerError`) with safe production formatting.
- **Frontend API Client:** Type-safe `src/lib/api/client.ts` with automatic bearer token attachment, error normalization, and standard HTTP methods.
- **Documentation:** Complete architectural documentation suite under `docs/`.

### Prepared & Planned for Subsequent Phases

- **Phase 2 — Real Authentication & RBAC:** Production JWT session tokens, bcrypt/argon2 password hashing, refresh tokens, password reset flows.
- **Phase 3 — Multi-Tenancy & Organizations:** Organization onboarding, workspace isolation, team member invitations.
- **Phase 4 — Database Persistence & Real Job CRUD:** MongoDB/Mongoose connection layer, persistent job creation, candidate directories.
- **Phase 5 — Resume Parsing & Storage:** AWS S3 secure object storage, PDF/DOCX document text extraction.
- **Phase 6 — Application Lifecycle & Real Pipeline:** Database-persisted stage transitions, candidate audit history.
- **Phase 7 — AI Candidate Screening:** Embeddings, semantic matching engine, match explanation generation.
- **Phase 8 — Communication & Interviews:** Real-time messaging, calendar interview scheduling, SMTP email dispatch.
- **Phase 9 — Production Analytics:** Database-aggregated pipeline funnels, sourcing metrics, and export pipelines.

---

## 2. Product Overview

TalentTrack AI supports three primary user roles:

### Recruiter

- Create, edit, publish, pause, and archive job openings
- Review and manage applications
- View candidate profiles and analyze resumes
- Review explainable match scores
- Manage the hiring pipeline across Kanban stages
- Schedule interviews and communicate with candidates
- View recruitment analytics and reports

### Applicant

- Browse and search job openings with filters
- View detailed job descriptions and requirements
- Create and manage a candidate profile
- Upload resumes and track application progress
- Save jobs and receive recruiter communications

### Administrator

- User lifecycle management (search, role/status filtering, activate/suspend)
- Platform-wide activity audit logs
- Platform health, user distribution, and hiring compliance reports
- System settings configuration (General, Auth, Notifications, File Upload, AI, Security)

---

## 3. User Journey

```text
Public Homepage
       │
       ▼
Authentication
       │
       ├──────────────────────┬──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
   Recruiter               Applicant               Admin
       │                      │                      │
       ▼                      ▼                      ▼
 Recruiter ATS         Applicant Portal         Admin Portal
```

### Route Structure

#### Public Routes

- `/` — Homepage & Value Proposition
- `/jobs` — Public Job Board
- `/login` — User Login
- `/register` — User Registration

#### Recruiter Routes (Protected)

- `/dashboard` — Recruiter Dashboard & Analytics
- `/jobs` — Job Management & Postings
- `/applications` — Application Review
- `/candidates` — Candidate Directory & Profiles
- `/pipeline` — Kanban Hiring Pipeline
- `/ai-screening` — AI Screening & Matching Center
- `/messages` — Candidate Messaging
- `/reports` — Recruitment Reports & Analytics
- `/settings` — Recruiter & Organization Settings

#### Applicant Routes (Protected)

- `/applicant` — Applicant Portal Overview
- `/applicant/jobs` — Job Search & Recommendations
- `/applicant/applications` — Application Tracking
- `/applicant/saved-jobs` — Saved Job Openings
- `/applicant/profile` — Candidate Profile & Resume
- `/applicant/messages` — Recruiter Communications
- `/applicant/settings` — Applicant Settings

#### Admin Routes (Protected)

- `/admin` — Admin Dashboard
- `/admin/users` — User Directory & Status Management
- `/admin/activity` — System Activity & Audit Trail
- `/admin/reports` — Platform Analytics & Hiring Compliance
- `/admin/settings` — Platform System Configuration

---

## 4. Quick Start & Development

### Prerequisites

- **Node.js:** `>= 20.0.0` (Recommended: `22.12.0`)
- **Package Manager:** `npm` `>= 10.0.0`

### Setup Steps

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/sohamghosh1762-max/talenttrack-ai-dashboard.git
cd talenttrack-ai-dashboard
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev
```

The application will be running at `http://localhost:3000` (or `http://localhost:5173`).

### Quality & Build Verification Commands

```bash
# Run TypeScript type check
npm run typecheck

# Run production build
npm run build

# Run automated tests
npm test

# Run linter
npm run lint

# Run code formatter
npm run format
```

---

## 5. Architecture Documentation

Detailed architectural and engineering documentation is available in the [`docs/`](./docs) directory:

- [System Architecture](docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`)
- [Developer Guide](docs/DEVELOPMENT.md) (`docs/DEVELOPMENT.md`)
- [Environment Configuration](docs/ENVIRONMENT.md) (`docs/ENVIRONMENT.md`)
- [API Architecture & Response Standard](docs/API_ARCHITECTURE.md) (`docs/API_ARCHITECTURE.md`)
- [Security Baseline](docs/SECURITY_BASELINE.md) (`docs/SECURITY_BASELINE.md`)

---

## 6. Contributors & Internship

This project is developed for educational, research, and demonstration purposes.

### Contributors

- **Project Lead:** SOHAM GHOSH
- **Team Members:** Jevin Parmar, Nayesha Suhail Ahmed Bijapure, Shubham Tiwari
- **Internship:** Zaalima Development Pvt. Ltd.

---

<p align="center">
  <strong>TalentTrack AI</strong><br />
  <em>Smarter Hiring. Brighter Teams.</em>
</p>

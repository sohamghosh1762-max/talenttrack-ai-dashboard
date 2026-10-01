# TalentTrack AI — System Architecture

This document describes the high-level system architecture, client and server layers, data flow, and directory structure of **TalentTrack AI**, an AI-Powered Applicant Tracking System (ATS).

---

## 1. High-Level Architectural Overview

TalentTrack AI is built as a unified full-stack TypeScript application with clean architectural separation between client presentation, state management, API client, server routes, business logic services, repositories, database persistence, cloud storage, and AI semantic intelligence.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (BROWSER)                                 │
│  ┌───────────────────────────────┐       ┌───────────────────────────────┐  │
│  │         React 19 Views        │       │     Tailwind CSS v4 & Radix   │  │
│  │   (Applicant/Recruiter/Admin) │       │     UI Accessible Primitives  │  │
│  └───────────────┬───────────────┘       └───────────────────────────────┘  │
│                  │                                                          │
│                  ▼                                                          │
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
                                       │ HTTP / JSON (Bearer / Cookies)
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

## 2. Technology Stack

### Frontend Architecture:
- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool & Bundler**: Vite 8 with Nitro SSR runtime
- **Routing**: TanStack Router (`@tanstack/react-router`) with file-based routing and route guards
- **Data Fetching & State**: TanStack Query (`@tanstack/react-query`) with automatic cache management
- **Styling & UI**: Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`), Radix UI accessible primitives, Lucide React icons, Sonner toast notifications, Recharts data visualization
- **Forms & Validation**: React Hook Form (`react-hook-form`), Zod (`zod`), `@hookform/resolvers`

### Backend Architecture:
- **Runtime**: Node.js (`>=20.0.0`, ECMAScript Modules)
- **Framework**: Express 5 (`express`) with modular router dispatchers
- **Authentication**:
  - Firebase Admin SDK (`firebase-admin`) for Applicant token verification
  - Native Scrypt password hashing (`node:crypto`) & SHA-256 session token management for Recruiters/Hiring Managers/Admins
- **Database & ODM**: MongoDB with Mongoose 9 (`mongoose`)
- **Cloud Storage**: Amazon Web Services S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **AI & ATS Intelligence**: Google Gemini SDK (`@google/genai`) using `gemini-3.6-flash`
- **Document Processing**: `pdf-parse` (with header correction) and `mammoth` (DOCX extraction)

---

## 3. Directory Structure

```text
talenttrack-ai-dashboard/
├── docs/                        # Engineering and architecture documentation
│   ├── API_ARCHITECTURE.md
│   ├── ARCHITECTURE.md
│   ├── ATS_ARCHITECTURE.md
│   ├── AUTH_AND_RBAC.md
│   ├── DATABASE.md
│   ├── DEVELOPMENT.md
│   ├── ENVIRONMENT.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── RESUME_PIPELINE.md
│   ├── SECURITY_BASELINE.md
│   └── TESTING.md
├── public/                      # Static client assets
├── src/
│   ├── components/              # UI Component library
│   │   ├── admin/               # Admin views, tables, and dialogs
│   │   ├── applicant/           # Applicant components (ATS gauge, breakdown, upload)
│   │   ├── auth/                # ProtectedRoute, AccountTypeSelection, RoleSelector
│   │   ├── dashboard/           # Recruiter ATS components (Kanban, metrics, jobs)
│   │   ├── hiring-manager/      # Hiring Manager portal (Header, Sidebar, FeedbackModal, DecisionModal)
│   │   └── ui/                  # Radix UI / atomic components
│   ├── hooks/                   # Custom React & TanStack Query hooks (useHiringManager, useJobs, etc.)
│   ├── lib/                     # Client utilities and API client (`src/lib/api/client.ts`)
│   ├── routes/                  # File-based TanStack Router tree
│   │   ├── admin/               # Admin portal (`/admin/users`, `/admin/activity`, etc.)
│   │   ├── applicant/           # Applicant portal (`/applicant/ats-score`, `/applicant/jobs`, etc.)
│   │   ├── hiring-manager/      # Hiring Manager portal (`/hiring-manager`, `/candidates`, `/shortlisted`, `/analytics`, etc.)
│   │   ├── index.tsx            # Public landing page
│   │   ├── jobs.tsx             # Public job board
│   │   └── ...                  # Recruiter ATS routes (`/dashboard`, `/pipeline`, `/candidates`)
│   └── server/                  # Server architecture
│       ├── __tests__/           # Automated test suites (309 passing tests)
│       ├── auth/                # Scrypt hashing, rate limiting, session service
│       ├── config/              # Centralized environment & Zod schema validation
│       ├── controllers/         # Request handlers & response dispatchers
│       ├── db/                  # In-memory repositories & Mongoose connection
│       ├── middleware/          # Auth, RBAC, logging, and error handling middleware
│       ├── models/              # Mongoose schemas (User, Applicant, Recruiter, Job, Resume, Application)
│       ├── permissions/         # Central RBAC permissions definitions & matrix
│       ├── repositories/        # Database access layers (Job, Application, Resume, User, Session)
│       ├── routes/              # Express API route modules & Hiring Manager dispatcher
│       ├── services/            # Business logic (ATS engine, Gemini, S3, Firebase, Parser)
│       ├── types/               # TypeScript interface definitions
│       └── validators/          # Zod schema validators
```

---

## 4. User Journey & Portal Layout

```text
                                Public Homepage (/)
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                  Find Jobs (/jobs)             Login (/login)
                                                       │
         ┌──────────────────────────────┬──────────────┴──────────────┬──────────────────────────────┐
         ▼                              ▼                             ▼                              ▼
 APPLICANT PORTAL               RECRUITER PORTAL            HIRING MANAGER PORTAL              ADMIN PORTAL
   (/applicant)                   (/dashboard)                (/hiring-manager)                  (/admin)
```

### 1. Applicant Portal (`/applicant/*`)
- `/applicant` — Overview, application status counters, and quick actions.
- `/applicant/ats-score` — ATS Resume Score, category breakdowns, AI insights, re-analyze, and resume replacement.
- `/applicant/jobs` — Personalized job search, skill matching, and instant application.
- `/applicant/saved-jobs` — Saved job openings directory.
- `/applicant/applications` — Active applications tracking and stage timeline.
- `/applicant/profile` — Candidate profile management (skills, experience, education, portfolio).
- `/applicant/messages` — Recruiter communication threads.
- `/applicant/settings` — Account and notification preferences.

### 2. Recruiter Portal (`/dashboard`, `/pipeline`, etc.)
- `/dashboard` — Recruiter analytics, active job summaries, and recent candidate submissions.
- `/jobs` — Job posting management (create, edit, publish, pause, archive).
- `/applications` — Candidate application list with match scores and status filtering.
- `/candidates` — Candidate directory and detailed profile inspector.
- `/pipeline` — Interactive Kanban hiring pipeline with drag-and-drop stage updates.
- `/ai-screening` — AI candidate screening and semantic requirement matching.
- `/messages` — Candidate messaging and interview communication.
- `/reports` — Recruitment analytics, pipeline funnels, and time-to-hire reports.
- `/settings` — Recruiter profile and organization settings.

### 3. Hiring Manager Portal (`/hiring-manager/*`)
- `/hiring-manager` — Overview dashboard with assigned open positions, candidates to review, shortlisted count, pending decisions, and quick review queue.
- `/hiring-manager/jobs` — Directory of requisitions explicitly assigned to the manager.
- `/hiring-manager/candidates` — Candidate review list scoped strictly to assigned requisitions.
- `/hiring-manager/candidates/:candidateId` — Comprehensive candidate detail inspector with read-only profile, ATS score breakdown, structured feedback modal, and decision workflow (Approve/Reject).
- `/hiring-manager/shortlisted` — Dedicated workspace for reviewing advanced candidates.
- `/hiring-manager/analytics` — Job-scoped hiring analytics (average ATS scores, pipeline stage distribution, decision breakdown).
- `/hiring-manager/interviews` — Assigned candidate interview schedules and evaluation notes.
- `/hiring-manager/messages` — Direct collaboration and message threads with recruiters.
- `/hiring-manager/profile` — Manager organizational profile, department, and company credentials.

### 4. Admin Portal (`/admin/*`)
- `/admin` — System health overview, user counts, and platform activity.
- `/admin/users` — User directory with role/status controls (activate, suspend, unlock).
- `/admin/activity` — Platform-wide security and operational audit logs.
- `/admin/reports` — Platform compliance, user distribution, and system metrics.
- `/admin/settings` — Platform-wide configuration.Recruiter, Job, Resume, Application)
│       ├── permissions/         # Central RBAC permissions definitions & matrix
│       ├── repositories/        # Database access layers
│       ├── routes/              # Express API route modules
│       ├── services/            # Business logic (ATS engine, Gemini, S3, Firebase, Parser)
│       ├── types/               # TypeScript interface definitions
│       └── validators/          # Zod schema validators
```

---

## 4. User Journey & Portal Layout

```text
                               Public Homepage (/)
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 Find Jobs (/jobs)             Login (/login)
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       ▼                              ▼                              ▼
               APPLICANT PORTAL                RECRUITER PORTAL                 ADMIN PORTAL
                 (/applicant)                    (/dashboard)                     (/admin)
```

### 1. Applicant Portal (`/applicant/*`)
- `/applicant` — Overview, application status counters, and quick actions.
- `/applicant/ats-score` — ATS Resume Score, category breakdowns, AI insights, re-analyze, and resume replacement.
- `/applicant/jobs` — Personalized job search, skill matching, and instant application.
- `/applicant/saved-jobs` — Saved job openings directory.
- `/applicant/applications` — Active applications tracking and stage timeline.
- `/applicant/profile` — Candidate profile management (skills, experience, education, portfolio).
- `/applicant/messages` — Recruiter communication threads.
- `/applicant/settings` — Account and notification preferences.

### 2. Recruiter Portal (`/dashboard`, `/pipeline`, etc.)
- `/dashboard` — Recruiter analytics, active job summaries, and recent candidate submissions.
- `/jobs` — Job posting management (create, edit, publish, pause, archive).
- `/applications` — Candidate application list with match scores and status filtering.
- `/candidates` — Candidate directory and detailed profile inspector.
- `/pipeline` — Interactive Kanban hiring pipeline with drag-and-drop stage updates.
- `/ai-screening` — AI candidate screening and semantic requirement matching.
- `/messages` — Candidate messaging and interview communication.
- `/reports` — Recruitment analytics, pipeline funnels, and time-to-hire reports.
- `/settings` — Recruiter profile and organization settings.

### 3. Admin Portal (`/admin/*`)
- `/admin` — System health overview, user counts, and platform activity.
- `/admin/users` — User directory with role/status controls (activate, suspend, unlock).
- `/admin/activity` — Platform-wide security and operational audit logs.
- `/admin/reports` — Platform compliance, user distribution, and system metrics.
- `/admin/settings` — Platform-wide configuration.

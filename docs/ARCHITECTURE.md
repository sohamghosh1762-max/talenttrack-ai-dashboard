# TalentTrack AI — System Architecture

This document describes the high-level architecture of **TalentTrack AI**, an AI-Powered Applicant Tracking System (ATS).

---

## 1. Architectural Overview

TalentTrack AI is built as a unified full-stack TypeScript application utilizing modern web technologies with clean boundary separation between presentation, state management, API client, server routes, business services, and repositories.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │    React 19 Views       │   │  Tailwind CSS & Radix   │  │
│  │ (Recruiter/Applicant/   │   │  Accessible Components  │  │
│  │        Admin)           │   │                         │  │
│  └────────────┬────────────┘   └─────────────────────────┘  │
│               │                                             │
│               ▼                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   TanStack Router &     │   │     TanStack Query      │  │
│  │   Role Guards           │   │   (Async State & Hooks) │  │
│  └────────────┬────────────┘   └────────────┬────────────┘  │
│               │                             │               │
│               └──────────────┬──────────────┘               │
│                              │                              │
│                              ▼                              │
│                 ┌─────────────────────────┐                 │
│                 │   Frontend API Client   │                 │
│                 │  (src/lib/api/client)   │                 │
│                 └────────────┬────────────┘                 │
└──────────────────────────────┼──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────┼──────────────────────────────┐
│                              ▼                              │
│                       Server Engine                         │
│                 ┌─────────────────────────┐                 │
│                 │   Central API Router    │                 │
│                 │ (src/server/routes/...) │                 │
│                 └────────────┬────────────┘                 │
│                              │                              │
│         ┌────────────────────┼────────────────────┐         │
│         ▼                    ▼                    ▼         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │ Request Log  │     │ Zod Boundary │     │ Auth & Role  │ │
│  │ & Timing     │     │ Validation   │     │ Guards       │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                              │                              │
│                              ▼                              │
│                 ┌─────────────────────────┐                 │
│                 │     Service Layer       │                 │
│                 │  (src/server/services)  │                 │
│                 └────────────┬────────────┘                 │
│                              │                              │
│                              ▼                              │
│                 ┌─────────────────────────┐                 │
│                 │    Repository Layer     │                 │
│                 │ (src/server/repository) │                 │
│                 └────────────┬────────────┘                 │
│                              │                              │
│                              ▼                              │
│                 ┌─────────────────────────┐                 │
│                 │ Database (Phase 4 MDB)  │                 │
│                 └─────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```text
talenttrack-ai-dashboard/
├── docs/                        # Architecture & engineering documentation
├── public/                      # Static client assets
├── src/
│   ├── auth/                    # Client auth context, prototype auth provider & types
│   ├── components/              # Reusable UI component library (shadcn/radix/lucide)
│   │   ├── admin/               # Admin module views, modals, and tables
│   │   ├── dashboard/           # Recruiter ATS dashboard components
│   │   └── ui/                  # Atomic primitive components
│   ├── data/                    # Seed mock datasets (isolated for prototype UX)
│   ├── hooks/                   # Custom React hooks
│   │   └── api/                 # TanStack Query standard API hooks
│   ├── lib/                     # Client utilities & API client
│   │   └── api/                 # Type-safe API client & error definitions
│   ├── routes/                  # TanStack file-based routing tree
│   │   ├── admin/               # Admin management sub-routes
│   │   ├── applicant/           # Candidate portal sub-routes
│   │   ├── index.tsx            # Public homepage
│   │   └── ...                  # Recruiter ATS routes
│   └── server/                  # Server-side architecture
│       ├── config/              # Centralized environment & server configuration
│       ├── controllers/         # Request handling & response dispatchers
│       ├── db/                  # In-memory & DB driver abstractions
│       ├── middleware/          # Auth, logging, error-handling middleware
│       ├── models/              # Domain entities & database schemas
│       ├── repositories/        # Data access objects & queries
│       ├── routes/              # Central API router & module handlers
│       ├── services/            # Core business logic & audit trail
│       ├── utils/               # Error classes, response helpers, structured logger
│       ├── validators/          # Zod validation schemas
│       └── workers/             # Background job interfaces
├── .env.example                 # Production configuration template (zero secrets)
├── .gitignore                   # Production-safe repository ignore rules
├── .nvmrc                       # Node runtime specification
├── package.json                 # Standardized npm dependencies & scripts
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite build & SSR server configuration
```

---

## 3. Layer Breakdown

### Frontend Presentation Layer

- **Framework:** React 19 with TanStack Router
- **Design System:** Tailwind CSS v4 + Radix UI primitives + Lucide Icons + Recharts
- **State Management:** TanStack Query for server state caching; local React state for UI components
- **Mock Data Isolation:** Existing UI components consume structured mock datasets during Phase 1 without directly coupling to incomplete backend endpoints.

### API Layer

- **Client:** `src/lib/api/client.ts` provides a unified HTTP fetch wrapper supporting typed requests, JSON serialization, bearer token injection, and standard error parsing.
- **Server Router:** `src/server/routes/index.ts` routes incoming `/api/*` requests through standard middleware, route dispatchers, and error boundaries.

### Server Core Layer

- **Configuration:** `src/server/config/` validates environment settings with Zod and provides typed immutable access.
- **Validation:** `src/server/validators/` provides boundary validation schemas preventing invalid data from reaching business logic.
- **Error Handling:** `src/server/utils/errors.ts` and `src/server/middleware/error-handler.ts` handle operational and unhandled exceptions gracefully with consistent JSON error payloads.
- **Request Logging:** `src/server/utils/logger.ts` logs structured HTTP telemetry with requestId, duration, route, and status code.

---

## 4. Implementation Status Matrix

| Module / Layer                           | Status                      | Phase   |
| :--------------------------------------- | :-------------------------- | :------ |
| Project Foundation & Build System        | **Implemented**             | Phase 1 |
| Environment Validation & Config          | **Implemented**             | Phase 1 |
| Server Architecture & API Router         | **Implemented**             | Phase 1 |
| Error Hierarchy & Response Standards     | **Implemented**             | Phase 1 |
| Frontend API Client & TanStack Patterns  | **Implemented**             | Phase 1 |
| UI Portals (Recruiter, Applicant, Admin) | **Implemented (Prototype)** | Phase 1 |
| Production Authentication & RBAC         | _Prepared_                  | Phase 2 |
| Multi-Tenancy & Organizations            | _Prepared_                  | Phase 3 |
| MongoDB Database & Real Job CRUD         | _Prepared_                  | Phase 4 |
| S3 Resume Parsing & Document Extraction  | _Prepared_                  | Phase 5 |
| Application Lifecycle & Kanban Pipeline  | _Prepared_                  | Phase 6 |
| AI Resume Screening & Match Scoring      | _Prepared_                  | Phase 7 |
| Messaging & Interview Scheduling         | _Prepared_                  | Phase 8 |

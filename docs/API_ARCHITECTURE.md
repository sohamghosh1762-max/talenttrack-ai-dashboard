# TalentTrack AI — API Architecture & Endpoints Reference

This document describes the API architecture, request lifecycle, standardized response envelopes, error handling, and complete endpoint specifications for **TalentTrack AI**.

---

## 1. Request Lifecycle Flow

```text
Incoming HTTP Request
         │
         ▼
Vite Dev Middleware / TanStack Start Server Entry (`src/server.ts`)
         │
         ▼
Central API Dispatcher (`src/server/routes/index.ts`)
         │
         ├──────────────────────────────────┐
         ▼                                  ▼
 Request Logger Middleware          Route Matching (/api/*)
 (logs requestId, method, route)            │
                                            ▼
                                    Auth & RBAC Guards
                                    (`src/server/middleware/auth-middleware.ts`)
                                            │
                                            ▼
                                    Zod Input Validation
                                    (`src/server/validators/*`)
                                            │
                                            ▼
                                    Service Layer Logic
                                    (`src/server/services/*`)
                                            │
                                            ▼
                                    Repository & Database Layer
                                    (`src/server/repositories/*` & Models)
                                            │
                                            ▼
                                 Standardized Response Wrapper
                                 (`src/server/utils/response.ts`)
```

---

## 2. API Response & Error Standards

All API endpoints return JSON payloads conforming to standardized response envelopes.

### Successful Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional confirmation message"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters provided",
    "details": [
      {
        "path": "page",
        "message": "Must be a positive integer"
      }
    ]
  }
}
```

### HTTP Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation failed or malformed payload.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks permission for the resource.
- `404 Not Found`: Requested resource or route does not exist.
- `409 Conflict`: Resource state conflict (e.g. duplicate email, duplicate application).
- `500 Internal Server Error`: Unhandled server exception.

---

## 3. Complete API Endpoint Matrix

### 1. Authentication Endpoints (`/api/auth/*`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | Register a new user account (Scrypt password hash). |
| `POST` | `/api/auth/login` | No | Authenticate user credentials, generate session token & cookie. |
| `GET` | `/api/auth/me` | Yes (Session / Firebase) | Retrieve sanitized profile of currently authenticated user (`SafeUser`). |
| `POST` | `/api/auth/logout` | Yes | Revoke active server session and clear session cookie. |
| `POST` | `/api/auth/forgot-password`| No | Dispatch expiring single-use password reset token via email. |
| `POST` | `/api/auth/reset-password` | No | Validate token and update user password, invalidating all sessions. |
| `POST` | `/api/auth/verify-email` | No | Verify user email address with single-use verification token. |
| `POST` | `/api/auth/resend-verification` | No | Resend email verification link. |

---

### 2. Applicant & ATS Endpoints (`/api/applicant/*`)

| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/applicant/ats-score` | Yes | `APPLICANT` | Retrieve the ATS score and semantic analysis for the applicant's resume. Auto-parses if `NOT_STARTED`. |
| `POST` | `/api/applicant/ats-score/analyze` | Yes | `APPLICANT` | Trigger or re-calculate ATS analysis. Returns cached result idempotently if resume and context are identical. |
| `GET` | `/api/applicant/profile` | Yes | `APPLICANT` | Retrieve applicant profile (personal info, skills, experience, education, projects, certifications). |
| `PUT` | `/api/applicant/profile` | Yes | `APPLICANT` | Update applicant profile data in MongoDB. |
| `GET` | `/api/applicant/dashboard` | Yes | `APPLICANT` | Retrieve aggregated dashboard metrics (application count, saved jobs, interviews). |
| `GET` | `/api/applicant/saved-jobs` | Yes | `APPLICANT` | Retrieve list of saved job opening IDs. |
| `POST` | `/api/applicant/saved-jobs/:jobId`| Yes | `APPLICANT` | Save a job opening to the applicant's saved list. |
| `DELETE`| `/api/applicant/saved-jobs/:jobId`| Yes | `APPLICANT` | Remove a job from saved list. |

---

### 3. Resume Processing Endpoints (`/api/resumes/*`)

| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/resumes` | Yes | `APPLICANT` | Multipart resume upload (`.pdf`, `.docx`, max 10MB). Uploads to AWS S3 and creates MongoDB `Resume` record. |
| `GET` | `/api/resumes/:id` | Yes | `APPLICANT` / `RECRUITER` | Retrieve resume metadata and parsing status. |
| `POST` | `/api/resumes/:id/parse` | Yes | `APPLICANT` / `RECRUITER` | Extract document text and run Gemini structured resume parser. |
| `GET` | `/api/resumes/:id/download` | Yes | `APPLICANT` / `RECRUITER` | Generate a 15-minute AWS S3 presigned download URL. |
| `DELETE`| `/api/resumes/:id` | Yes | `APPLICANT` | Delete resume from S3 and MongoDB, invalidating associated ATS records. |

---

### 4. Job Management Endpoints (`/api/jobs/*`)

| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/jobs` | Optional | Public | Search and list published job openings with filters (department, location, type). |
| `GET` | `/api/jobs/:id` | Optional | Public | Retrieve complete job opening details. |
| `POST` | `/api/jobs` | Yes | `RECRUITER` / `ADMIN` | Create a new job opening in `DRAFT` or `PUBLISHED` status. |
| `PUT` | `/api/jobs/:id` | Yes | `RECRUITER` / `ADMIN` | Update job opening details. Restrict to job owner or admin. |
| `DELETE`| `/api/jobs/:id` | Yes | `RECRUITER` / `ADMIN` | Delete or archive a job opening. |

---

### 5. Application Lifecycle Endpoints (`/api/applications/*`)

| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | Yes | `APPLICANT` | Submit job application with attached resume and optional cover letter. Rejects duplicates with 409. |
| `GET` | `/api/applications` | Yes | All Roles | List applications. Applicants see their own; recruiters see candidates for their posted jobs. |
| `GET` | `/api/applications/:id` | Yes | All Roles | Get full application record with candidate profile. |
| `PATCH`| `/api/applications/:id/status` | Yes | `RECRUITER` / `ADMIN` | Advance application pipeline stage (`APPLIED`, `SCREENING`, `INTERVIEW`, `OFFERED`, `REJECTED`). |

---

### 6. Hiring Manager Endpoints (`/api/hiring-manager/*`)

All Hiring Manager endpoints enforce strict server-side resource-level authorization: requests are filtered and scoped strictly to assigned job requisitions (`hiringManagerId`/`hiringManagerIds`). Accessing unassigned jobs or candidates returns `403 Forbidden` (`AUTHORIZATION_ERROR`).

| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/hiring-manager/dashboard` | Yes | `HIRING_MANAGER` / `ADMIN` | Retrieve aggregated dashboard metrics (open assigned positions, candidates to review, shortlisted count, pending decisions, recent candidates). |
| `GET` | `/api/hiring-manager/jobs` | Yes | `HIRING_MANAGER` / `ADMIN` | List all job requisitions assigned to the authenticated Hiring Manager. |
| `GET` | `/api/hiring-manager/candidates` | Yes | `HIRING_MANAGER` / `ADMIN` | List candidates applied to assigned jobs. Supports filters (`jobId`, `stage`, `status`, `search`, `shortlisted=true`). |
| `GET` | `/api/hiring-manager/candidates/:id` | Yes | `HIRING_MANAGER` / `ADMIN` | Get comprehensive candidate review profile, parsed resume, ATS score breakdown, feedback history, and decision status. |
| `POST` | `/api/hiring-manager/candidates/:id/feedback` | Yes | `HIRING_MANAGER` / `ADMIN` | Submit structured candidate evaluation with skill ratings (1-5), strengths, concerns, and recommendation (`RECOMMEND`, `MAYBE`, `DO_NOT_RECOMMEND`). |
| `POST` | `/api/hiring-manager/candidates/:id/decision` | Yes | `HIRING_MANAGER` / `ADMIN` | Record binding hiring decision (`APPROVED` or `REJECTED`). Automatically advances candidate stage to `OFFERED` or `REJECTED`. |
| `GET` | `/api/hiring-manager/analytics` | Yes | `HIRING_MANAGER` / `ADMIN` | Retrieve real database-calculated hiring analytics (average ATS scores, pipeline stage distribution, decision breakdown) scoped to assigned jobs. |
| `GET` | `/api/hiring-manager/interviews` | Yes | `HIRING_MANAGER` / `ADMIN` | List upcoming interviews and candidate interview notes for assigned positions. |

---

### 7. Administration Endpoints (`/api/admin/*`)

| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Yes | `ADMIN` / `SUPER_ADMIN` | List platform users with pagination, search, and status/role filters. |
| `PATCH`| `/api/admin/users/:id/status` | Yes | `ADMIN` / `SUPER_ADMIN` | Update user status (`ACTIVE`, `SUSPENDED`, `LOCKED`, `DEACTIVATED`). |
| `GET` | `/api/admin/activity` | Yes | `ADMIN` / `SUPER_ADMIN` | Retrieve platform-wide security audit logs. |
| `GET` | `/api/admin/reports` | Yes | `ADMIN` / `SUPER_ADMIN` | Retrieve platform compliance, user distribution, and hiring analytics. |

---

### 8. Diagnostics & Health

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | Returns service health status, memory consumption, and uptime. |

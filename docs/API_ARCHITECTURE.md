# TalentTrack AI — API Architecture

This document describes the API routing layout, request lifecycle, standardization guidelines, validation strategies, and error handling for **TalentTrack AI**.

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
 (logs requestId, route, method)            │
                                            ▼
                                    Auth & Role Guards
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
                                    Repository / Data Layer
                                    (`src/server/repositories/*`)
                                            │
                                            ▼
                                 Standardized Response Wrapper
                                 (`src/server/utils/response.ts`)
```

---

## 2. API Response Standard

All backend endpoints return responses conforming to a strict JSON envelope.

### Successful Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
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

In development mode (`NODE_ENV=development`), error responses may include an optional `stack` property for diagnostic purposes.

---

## 3. Standard HTTP Status Codes

- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation failure or malformed payload.
- `401 Unauthorized`: Authentication token missing, invalid, or expired.
- `403 Forbidden`: Authenticated user lacks permission for the requested resource.
- `404 Not Found`: Requested resource or endpoint does not exist.
- `409 Conflict`: Resource state conflict (e.g. duplicate email, protected account).
- `500 Internal Server Error`: Unhandled server exception.

---

## 4. Route Blueprint

| Group         | Route Prefix           | Phase   | Purpose                                          |
| :------------ | :--------------------- | :------ | :----------------------------------------------- |
| Health        | `GET /api/health`      | Phase 1 | Service liveness & diagnostic check              |
| Admin         | `/api/admin/users/*`   | Phase 1 | Administrator user management & audit inspection |
| Auth          | `/api/auth/*`          | Phase 2 | Session, login, register, token refresh          |
| Organizations | `/api/organizations/*` | Phase 3 | Multi-tenant organization workspaces             |
| Jobs          | `/api/jobs/*`          | Phase 4 | Job openings CRUD & publication                  |
| Candidates    | `/api/candidates/*`    | Phase 4 | Candidate directory & profiles                   |
| Resumes       | `/api/resumes/*`       | Phase 5 | Resume upload, parsing & OCR extraction          |
| Applications  | `/api/applications/*`  | Phase 6 | Application submission & Kanban pipeline         |
| Screening     | `/api/screening/*`     | Phase 7 | AI match scoring & criteria evaluation           |
| Interviews    | `/api/interviews/*`    | Phase 8 | Interview scheduling & calendar integration      |
| Messages      | `/api/messages/*`      | Phase 8 | Recruiter-candidate messaging threads            |
| Reports       | `/api/reports/*`       | Phase 9 | Aggregated hiring analytics & metrics            |

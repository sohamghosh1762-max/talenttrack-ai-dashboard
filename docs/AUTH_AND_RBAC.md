# TalentTrack AI — Authentication, Identity & RBAC Architecture

This document describes the authentication systems, cryptographic session management, Firebase identity integration, and Role-Based Access Control (RBAC) implemented in **TalentTrack AI**.

---

## 1. Architectural Overview & Identity Separation

TalentTrack AI implements a clean architectural separation between **Applicant Authentication** (powered by Firebase Authentication for flexible social and passwordless sign-in) and **Recruiter/Admin Authentication** (powered by enterprise-grade Scrypt password hashing and cryptographic session management).

```
                            BROWSER CLIENT
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
   APPLICANT PORTAL                                RECRUITER / ADMIN
(Firebase Client SDK)                           (Direct Server Auth)
• Google Sign-In                                • Email + Password
• Email / Password                              • Scrypt Hash Verification
• Phone OTP Auth                                • 15-Min Account Lockout
         │                                                 │
         │ Authorization: Bearer <firebase-id-token>      │ HttpOnly Cookie `talenttrack_session`
         ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SERVER AUTHENTICATION GATE                   │
│                                                                  │
│  1. Identify Auth Scheme (Firebase ID Token vs Session Hash)     │
│  2. Firebase Admin SDK: `verifyIdToken(token)`                  │
│     └── Resolve or provision MongoDB `User` via `firebaseUid`    │
│  3. Session Validator: Look up SHA-256 token hash in DB          │
│  4. Verify Account Status (`ACTIVE`, not `LOCKED` or `SUSPENDED`)│
│  5. Attach Sanitized `req.user` (`SafeUser`)                     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   CENTRALIZED RBAC MIDDLEWARE                    │
│                                                                  │
│  • Evaluate Role Permissions (`requireRole`, `requirePermission`)│
│  • Strict Account Segregation: Rejects role hijacking attempts   │
│  • Enforce Context-Aware 403 Forbidden Response                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Applicant Authentication (Firebase Integration)

Applicants authenticate on the client using **Firebase Authentication**, enabling seamless Google OAuth, Email/Password, and Phone OTP verification.

### Server-Side Verification Flow (`src/server/services/firebase-admin-service.ts`):
1. **Token Ingestion**: The applicant client attaches the Firebase ID token in the `Authorization: Bearer <id-token>` HTTP header.
2. **Cryptographic Verification**: `firebaseAdminService.verifyIdToken(token)` validates the signature, issuer, and expiration using `firebase-admin/auth`.
3. **Account Resolution & Provisioning (`resolveOrProvisionApplicant`)**:
   - **Lookup by `firebaseUid`**: If a user exists in MongoDB with matching `firebaseUid`, the user is returned.
   - **Lookup by Verified Email**: If a user exists with matching verified email and role `APPLICANT`, the existing account is automatically linked with `firebaseUid`.
   - **Role Protection & Collision Prevention**: If an existing account with the same email has a `RECRUITER` or `ADMIN` role, Firebase linking is strictly **rejected with HTTP 409 Conflict** to prevent unauthorized access or privilege escalation.
   - **New Provisioning**: If no account exists, a new `User` (and associated `Applicant` document) is automatically provisioned in MongoDB with role `APPLICANT` and status `ACTIVE`.

---

## 3. Recruiter & Admin Authentication

Recruiters, Hiring Managers, and Administrators authenticate using direct server-managed credentials.

### Security Mechanisms:
1. **Password Hashing**: `src/server/auth/password.ts` uses `node:crypto` `scrypt` with a cryptographically secure 16-byte random salt per user (format: `scrypt:<salt>:<hash>`) and timing-safe comparison (`crypto.timingSafeEqual`).
2. **Opaque Session Tokens**: When an administrator or recruiter logs in, a high-entropy random token is generated. The raw token is sent to the client via an `HttpOnly`, `SameSite=Lax`, `Secure` cookie named `talenttrack_session`. The server stores only the cryptographic **SHA-256 hash** (`tokenHash`) in the database.
3. **Brute-Force & Lockout Protection**:
   - 5 consecutive failed login attempts automatically lock the account for 15 minutes (`lockedUntil` timestamp).
   - Successful login resets `failedLoginAttempts` to 0.
4. **IP Rate Limiting**: Max 15 login attempts per 15-minute window per IP address.
5. **Session Invalidation**: Changing or resetting a password immediately invalidates and revokes all active sessions across all devices for that user (`sessionRepository.revokeAllUserSessions`).

---

## 4. Role-Based Access Control (RBAC) Matrix

TalentTrack AI enforces a centralized permissions matrix (`src/server/permissions/`):

### Supported Roles:
- `SUPER_ADMIN`: Complete platform access, security settings, audit logs, and administrator lifecycle.
- `ADMIN`: Platform administration, user management, and compliance reports.
- `ORG_ADMIN`: Organization-level workspaces, team management, and billing settings.
- `RECRUITER`: Job openings CRUD, candidate directory, Kanban pipeline management, applicant screening, and messaging.
- `HIRING_MANAGER`: First-class decision maker scoped to assigned job requisitions (`hiringManagerId`/`hiringManagerIds`). Reviews candidates, evaluates ATS score breakdowns, provides structured feedback with skill ratings and recommendations, and records binding Approve/Reject hiring decisions.
- `INTERVIEWER`: Assigned candidate viewing and interview evaluation forms.
- `APPLICANT`: Job searching, application submission, resume upload, and ATS score analysis.

### Permissions Matrix Summary:

| Permission Area | SUPER_ADMIN / ADMIN | RECRUITER | HIRING_MANAGER | APPLICANT |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Users & Status** (`users.status.manage`) | ✅ | ❌ | ❌ | ❌ |
| **View Audit Logs** (`admin.audit.read`) | ✅ | ❌ | ❌ | ❌ |
| **Create & Edit Jobs** (`jobs.create`, `jobs.update`) | ✅ | ✅ | ❌ | ❌ |
| **Publish / Archive Jobs** (`jobs.publish`) | ✅ | ✅ | ❌ | ❌ |
| **Manage Pipeline Stages** (`applications.status.update`) | ✅ | ✅ | ❌ | ❌ |
| **Hiring Decision (Approve / Reject)** (`hiring.decision`) | ✅ | ❌ | ✅ (Assigned) | ❌ |
| **Submit Structured Evaluation Feedback** (`feedback.create`) | ✅ | ❌ | ✅ (Assigned) | ❌ |
| **View Candidate Resumes & ATS Details** (`resumes.read`) | ✅ | ✅ (Applied jobs) | ✅ (Assigned) | ✅ (Own resume) |
| **Upload Resume & ATS Analysis** (`applicant.ats.analyze`) | ❌ | ❌ | ❌ | ✅ |
| **Apply to Jobs** (`applications.create`) | ❌ | ❌ | ❌ | ✅ |

---

## 5. Hiring Manager Resource-Level Authorization & Access Control

Unlike broad administrative roles, `HIRING_MANAGER` role permissions are bound to **Resource-Level Authorization**:

1. **Job Ownership Scoping**:
   - Every `Job` document maintains `hiringManagerId` and `hiringManagerIds: string[]`.
   - When a Hiring Manager queries `/api/hiring-manager/jobs` or `/api/hiring-manager/dashboard`, the backend filters results strictly to jobs where `job.hiringManagerId === user.id` or `job.hiringManagerIds.includes(user.id)`.
2. **Candidate & Application Scoping**:
   - Candidate applications are queried via `applicationRepository.findAll({ jobIds: assignedJobIds })`.
   - Direct candidate detail requests (`GET /api/hiring-manager/candidates/:id`), feedback submissions (`POST /api/hiring-manager/candidates/:id/feedback`), and decision updates (`POST /api/hiring-manager/candidates/:id/decision`) explicitly verify that the candidate's `application.jobId` belongs to the manager's assigned jobs.
   - Attempting to inspect or modify an unassigned candidate immediately returns **HTTP 403 Forbidden** (`AUTHORIZATION_ERROR`).
3. **Identity Derivation & Anti-Tampering**:
   - The backend NEVER trusts `req.body.hiringManagerId`, `req.body.userId`, or client-supplied credentials.
   - Manager identity is derived server-side from the verified session token attached to `req.user`.

---

## 6. Route Protection & Guards

### Backend Middleware:
- `authenticate()`: Validates either session token or Firebase ID token, ensuring valid `req.user`.
- `requireRole(...roles)`: Verifies `req.user.role` is in the authorized list; returns 403 Forbidden with context-specific error messaging.
- `requirePermission(permission)`: Checks granular permission in `ROLE_PERMISSIONS`.
- `handleHiringManagerApiRequest(req)`: Scoped dispatcher enforcing role and resource boundaries across `/api/hiring-manager/*`.

### Frontend Route Guards (`src/components/auth/ProtectedRoute.tsx` and `src/auth/route-access.ts`):
- Non-authenticated users are redirected to `/login` with an intact return URL.
- Applicants attempting to access `/dashboard`, `/hiring-manager`, or `/admin` are redirected to `/applicant`.
- Recruiters attempting to access `/admin`, `/hiring-manager`, or `/applicant` are redirected to `/dashboard`.
- Hiring Managers attempting to access `/admin` or `/applicant` are redirected to `/hiring-manager`.
- Directs each role to its dedicated default landing route:
  - `APPLICANT` → `/applicant`
  - `RECRUITER` → `/dashboard`
  - `HIRING_MANAGER` → `/hiring-manager`
  - `ADMIN` / `SUPER_ADMIN` → `/admin`

# TalentTrack AI — Authentication, Sessions & RBAC Architecture (Phase 2)

## 1. Overview & Architecture

Phase 2 replaces all demo/mock authentication tokens and client-side authorization checks with an enterprise-grade, server-authoritative authentication, cryptographic session management, and Role-Based Access Control (RBAC) foundation.

```text
Browser Client
   │
   │ (HTTPS + SameSite=Lax + HttpOnly Cookie `talenttrack_session`)
   ▼
Dispatcher / Middleware Layer (`authenticate()`)
   │
   ├── Look up session by SHA-256 token hash in SessionRepository
   ├── Validate expiration, touch `lastUsedAt`, and verify user account status
   └── Convert to `SafeUser` (excluding password hashes and secret tokens)
   │
Authorization Layer (`requireRole()`, `requirePermission()`)
   │
   ├── Evaluate centralized RBAC permissions matrix (`ROLE_PERMISSIONS`)
   └── Reject unauthorized access with 403 Forbidden
   │
Controller Handler
   └── Return standard JSON response envelope
```

---

## 2. Authentication Endpoints

| Method | Endpoint                        | Description                                                                                        | Auth Required               |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| `POST` | `/api/auth/register`            | Create new user account, hash password via scrypt, issue session cookie & email verification token | No                          |
| `POST` | `/api/auth/login`               | Authenticate email/password with rate-limiting & lockout, create session                           | No                          |
| `GET`  | `/api/auth/me`                  | Retrieve authenticated user's sanitized profile (`SafeUser`)                                       | Yes (Session Cookie/Bearer) |
| `POST` | `/api/auth/logout`              | Revoke active server session and clear `talenttrack_session` cookie                                | Yes                         |
| `POST` | `/api/auth/forgot-password`     | Generate single-use expiring reset token and dispatch email (generic response)                     | No                          |
| `POST` | `/api/auth/reset-password`      | Validate reset token, update password, revoke all prior user sessions                              | No                          |
| `POST` | `/api/auth/verify-email`        | Validate email token, transition status from `PENDING_VERIFICATION` to `ACTIVE`                    | No                          |
| `POST` | `/api/auth/resend-verification` | Resend verification email if account is not yet verified                                           | No                          |

---

## 3. Role & Permission System

### Roles

- `SUPER_ADMIN` / `ADMIN`: Complete platform access, user management, audit logs, and settings.
- `ORG_ADMIN`: Organization-level administration and team management (prepared for Phase 3).
- `RECRUITER`: Job creation/editing, candidate pipeline management, applicant review, screening, and messaging.
- `HIRING_MANAGER`: Job viewing, candidate review, feedback notes, interview scheduling.
- `INTERVIEWER`: Assigned candidate viewing and interview notes.
- `APPLICANT`: Job searching/viewing, applying, application tracking, and profile management.

### Central Permission Matrix

All permissions are centralized in `src/server/permissions/` (`definitions.ts`, `roles.ts`, `hasPermission.ts`) covering:

- `users.*` (`users.read`, `users.create`, `users.update`, `users.delete`, `users.status.manage`)
- `jobs.*` (`jobs.read`, `jobs.create`, `jobs.update`, `jobs.delete`, `jobs.publish`)
- `candidates.*` (`candidates.read`, `candidates.create`, `candidates.update`, `candidates.delete`, `candidates.notes`)
- `applications.*` (`applications.read`, `applications.create`, `applications.update`, `applications.delete`, `applications.status.update`)
- `reports.*` (`reports.read`, `reports.export`)
- `settings.*` (`settings.read`, `settings.manage`)
- `admin.*` (`admin.access`, `admin.audit.read`, `admin.system.manage`)

---

## 4. Security Controls

1. **Password Hashing:** `node:crypto` scrypt algorithm with per-user 16-byte random salts and timing-safe comparisons.
2. **Session Security:** Opaque random tokens stored exclusively as SHA-256 cryptographic hashes (`tokenHash`). Cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
3. **Account Lockout:** 5 consecutive failed login attempts lock the account for 15 minutes (`failedLoginAttempts`, `lockedUntil`).
4. **IP Rate Limiting:** Max 15 login attempts per 15-minute window per IP.
5. **Token Single-Use & Expiry:** Password reset tokens (60 min TTL) and verification tokens (48 hr TTL) are hashed in repository and single-use only.
6. **Session Invalidation on Password Reset:** Changing password immediately invalidates all active sessions across all devices (`revokeAllUserSessions`).
7. **Privacy-Safe Audit Logging:** Sensitive fields (passwords, hashes, raw tokens, cookie contents) are never logged.

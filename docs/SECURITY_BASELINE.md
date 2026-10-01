# TalentTrack AI — Security Baseline & Controls

This document establishes the security principles, data protection policies, authentication boundaries, and defensive architecture implemented across **TalentTrack AI**.

---

## 1. Security Architecture Principles

1. **Zero Client Trust**: All authoritative state transitions, ATS scoring calculations, and access control evaluations are strictly executed on the server. The frontend is treated as untrusted presentation.
2. **Defense in Depth**: Security controls are applied at multiple layers: network middleware, authentication gates, Zod validation schemas, business logic guards, and database constraints.
3. **Least Privilege**: Users are constrained by a granular Role-Based Access Control (RBAC) matrix (`ROLE_PERMISSIONS`).
4. **Secret Sanitization**: No secrets, cryptographic keys, raw tokens, or database connection strings are committed to source control or exposed in API response envelopes.

---

## 2. Authentication & Credential Protection

### 1. Password Security (Recruiters & Admins)
- **Algorithm**: Native `scrypt` key derivation function (`node:crypto`).
- **Salts**: Cryptographically random 16-byte salt generated per user.
- **Comparison**: Timing-safe buffer comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

### 2. Session Management & Opaque Tokens
- Session tokens are high-entropy random strings.
- The server stores only the cryptographic **SHA-256 hash** (`tokenHash`).
- Session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` attributes in production.
- Password change/reset immediately revokes all active sessions across all devices (`revokeAllUserSessions`).

### 3. Brute-Force Defense & Rate Limiting
- **Account Lockout**: 5 consecutive failed login attempts lock the account for 15 minutes (`lockedUntil` timestamp).
- **IP Rate Limiting**: Max 15 login attempts per 15-minute window per IP.

### 4. Firebase ID Token Verification (Applicants)
- Applicant ID tokens are verified server-side using the Firebase Admin SDK (`verifyIdToken`).
- Expired, revoked, or malformed tokens are rejected with HTTP 401.
- Role isolation prevents Firebase OAuth logins from claiming or linking to Recruiter or Admin roles.

---

## 3. Storage & Document Security (AWS S3)

- **Private Buckets**: S3 buckets are configured with `Block Public Access: ON`. Direct unauthenticated access is forbidden.
- **Presigned URLs**: When a resume is accessed, the server generates a time-limited presigned URL (valid for 15 minutes).
- **Upload Validation**:
  - MIME-type and file extension validation (`.pdf`, `.docx`, `.doc`).
  - Size limitation capped at $10\text{ MB}$.
  - PDF/DOCX magic bytes verified before text extraction to prevent executable file uploads.

---

## 4. AI & Scoring Security

- **Gemini API Key Isolation**: Gemini API keys (`GEMINI_API_KEY`) are accessed strictly by backend services and are never sent to the browser.
- **Structured Schema Enforcement**: All AI outputs are schema-validated using Zod. Out-of-bounds scores, negative values, and non-numeric values are sanitized.
- **Backend-Owned ATS Scoring**: Scoring formulas ($60\%$ deterministic baselines + $40\%$ Gemini qualitative dimensions) are hardcoded and calculated on the server. The client cannot modify scoring weights or categories.

---

## 5. Input Validation & Error Sanitization

- **Zod Schema Validation**: All request bodies, route parameters, and query parameters are validated with Zod before processing.
- **Database Injection Prevention**: Mongoose ODM parameterized queries eliminate NoSQL and SQL injection vectors.
- **Sanitized Errors**: In production environments, stack traces and internal error details are stripped from response envelopes, returning safe error codes (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`).

---

## 6. Git & Secret Exclusion Rules

The following files are strictly excluded via `.gitignore` and must never be committed:

```text
.env
.env.local
.env.*.local
*.pem
*.key
service-account*.json
node_modules/
.output/
dist/
```

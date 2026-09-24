# TalentTrack AI — Security Baseline

This document outlines the security controls, baseline practices, and data handling standards for **TalentTrack AI**.

---

## 1. Secret Handling & Credentials

- **Version Control Safety:** No credentials, API tokens, or secrets are stored in Git. All configuration is injected via runtime environment variables.
- **Client Isolation:** Environment variables are validated on the server. Only non-sensitive variables are ever delivered to the client bundle.
- **Production Guardrails:** Production mode requires high-entropy secrets for JWT and session tokens.

---

## 2. Boundary Validation & Injection Prevention

- **Zod Schema Validation:** All incoming HTTP query parameters, path variables, and request bodies must pass Zod schema validation before hitting business services.
- **ID Sanitization:** ObjectIds and database keys are validated using strict regular expressions to prevent NoSQL/SQL injection attacks.
- **Safe Serialization:** Internal model entities (such as user records containing password hashes) are transformed through projection helpers (`toSafeUser`) before being sent across the wire.

---

## 3. Error Handling & Information Disclosure

- **Centralized Error Boundary:** Server exceptions are caught by `handleServerError` and converted into standardized JSON error structures.
- **Stack Trace Suppression:** Execution stack traces are omitted in production environments (`NODE_ENV=production`) to prevent internal system layout disclosures.

---

## 4. Structured Telemetry & Audit Logging

- **Audit Trail:** Administrative actions (such as user status modifications or role elevation) are automatically captured in the audit log service with initiator IDs, target IDs, timestamps, and previous state.
- **HTTP Request Logging:** Every API request is logged with unique request IDs, execution duration, HTTP method, and response status.

---

## 5. File Upload & Document Security (Phase 5 Foundation)

- File uploads will be constrained to supported document MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- File size thresholds are strictly enforced.
- Files will be stored in private object storage (S3) with presigned expiring URLs for authorized access.

---

## 6. Authentication & RBAC (Phase 2 Foundation)

- Multi-tier role permissions: `ADMIN`, `RECRUITER`, and `APPLICANT`.
- Middleware guards enforce token verification and role requirements on protected endpoints (`requireRole("ADMIN")`).
- Account state checks ensure suspended or inactive accounts cannot execute operations.

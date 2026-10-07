# TalentTrack AI — Testing Architecture & Quality Assurance

This document details the automated testing architecture, test suites inventory, execution commands, and verification protocols implemented in **TalentTrack AI**.

---

## 1. Test Framework & Architecture

TalentTrack AI uses the **Node.js Native Test Runner** (`node:test` and `node:assert/strict`) with native TypeScript support via `--experimental-strip-types`.

### Key Characteristics:
- **Zero External Heavy Test Dependencies**: Eliminates heavyweight Jest/Vitest runner overhead, running 285+ full-stack tests in under 40 seconds.
- **Hermetic In-Memory Repositories**: Test suites run against isolated repository instances and mock adapters for AWS S3 and Firebase Admin, ensuring fast, deterministic, reproducible execution.
- **End-to-End API Dispatch Simulation**: Tests simulate HTTP request dispatching through the actual server route hierarchy (`handleApiRequest`), verifying authentication middleware, Zod validators, controllers, and database transformations.

---

## 2. Test Execution & Verification

### Run Complete Test Suite
```bash
npm test
```
*Executes `node --test --experimental-strip-types src/server/__tests__/*.test.ts`.*

### Run Targeted Test File
```bash
# Example: Run Controlled Hybrid ATS & Repeatability Suite
node --test --experimental-strip-types src/server/__tests__/hybrid-ats-repeatability.test.ts

# Example: Run Firebase Authentication & Identity Linking Suite
node --test --experimental-strip-types src/server/__tests__/firebase-auth.test.ts
```

### Static Typechecking & Production Build Verification
```bash
# Strict TypeScript Type Check (0 errors expected)
npm run typecheck

# Full Production SSR & Client Build (0 errors expected)
npm run build
```

---

## 3. Test Suites Inventory (285 Tests / 79 Suites)

| Test File | Test Areas Covered |
| :--- | :--- |
| [`hybrid-ats-repeatability.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/hybrid-ats-repeatability.test.ts) | • 10-run score repeatability test (Run 1 = Run 2 = ... = Run 10).<br>• Controlled fusion math ($60\%$ deterministic + $40\%$ Gemini).<br>• SHA-256 `resumeHash` & `analysisKey` idempotency caching.<br>• Schema bounds clamping ($0 \le \text{score} \le 100$).<br>• Resume replacement cache invalidation.<br>• Versioning metadata persistence. |
| [`ats-score.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/ats-score.test.ts) | • Deterministic category baseline calculations.<br>• Category weighting sum verification ($100\%$).<br>• Gemini schema validation & malformed output recovery.<br>• `GET /api/applicant/ats-score` & `POST .../analyze` route matrix.<br>• Tenant privacy: Applicant 2 cannot view Applicant 1's score.<br>• Independence between ATS Resume Score & Job Match Score. |
| [`firebase-auth.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/firebase-auth.test.ts) | • Firebase ID token decoding & verification.<br>• Automatic applicant provisioning in MongoDB with `firebaseUid`.<br>• Safe email linking for existing applicants.<br>• Role protection: rejects Firebase login attempting to hijack Recruiter/Admin accounts.<br>• Rejection of expired, revoked, or malformed Firebase tokens. |
| [`role-authorization.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/role-authorization.test.ts) | • Complete RBAC matrix across all 7 roles.<br>• Backend `requireRole` & `requirePermission` middleware.<br>• Frontend route guard matrix (`/applicant`, `/dashboard`, `/admin`).<br>• Dynamic context-aware 403 Forbidden messaging.<br>• Prevention of client-side privilege escalation. |
| [`resume-parser.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/resume-parser.test.ts) | • PDF text extraction with corrupted header recovery (`pdf-parse`).<br>• DOCX text extraction (`mammoth`).<br>• Safe text truncation at 50,000 characters.<br>• Gemini structured parsing into `IParsedResumeProfile`.<br>• Parsing status progression (`NOT_STARTED` → `COMPLETED` / `FAILED`). |
| [`resume-api.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/resume-api.test.ts) | • Multipart resume upload (`POST /api/resumes`).<br>• S3 upload and presigned URL generation.<br>• MIME type validation and rejection of invalid files.<br>• Resume deletion and replacement. |
| [`phase2-auth.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/phase2-auth.test.ts) | • Scrypt password hashing with unique salts.<br>• Cryptographic SHA-256 session tokens (`talenttrack_session`).<br>• Account lockout after 5 failed attempts.<br>• IP rate limiting (15 requests / 15 mins).<br>• Password reset and email verification token single-use lifecycle. |
| [`admin-users.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/admin-users.test.ts) | • Admin user directory pagination & filtering.<br>• User status transitions (`ACTIVE`, `SUSPENDED`, `LOCKED`, `DEACTIVATED`).<br>• Super-admin protection: preventing self-demotion or deactivation of the last admin. |
| [`job-api.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/job-api.test.ts) | • Recruiter job creation, updating, publishing, and archiving.<br>• Public job search and department filtering.<br>• Authorization: only job owners/admins can edit job postings. |
| [`application-api.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/application-api.test.ts) | • Candidate application submission (`POST /api/applications`).<br>• Enforced compound unique index: duplicate applications rejected with 409.<br>• Recruiter Kanban stage updates (`APPLIED` → `INTERVIEW` → `OFFERED`).<br>• Application status filtering. |
| [`applicant-profile.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/applicant-profile.test.ts) | • Candidate profile CRUD (`GET /api/applicant/profile`, `PUT /api/applicant/profile`).<br>• Experience, education, skills, and project portfolio persistence. |
| [`applicant-dashboard.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/applicant-dashboard.test.ts) | • Aggregated applicant dashboard statistics (application counts, saved jobs). |
| [`gemini-service.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/gemini-service.test.ts) | • Gemini API structured output generation.<br>• Automated model fallback from `gemini-3.6-flash` to `gemini-3.5-flash-lite`.<br>• JSON Schema validation and error resilience. |
| [`mongodb-integration.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/mongodb-integration.test.ts) | • Mongoose model schemas, virtual mappings, and custom transforms.<br>• Database index verification. |
| [`phase1-foundation.test.ts`](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/__tests__/phase1-foundation.test.ts) | • Service health check (`GET /api/health`).<br>• Standardized error envelope format.<br>• Structured HTTP request logging. |

---

## 4. Current Test Results Summary

```text
✔ 285 tests passed
✔ 79 test suites passed
✔ 0 failed
✔ 0 cancelled
✔ 0 skipped
✔ Duration: ~37.1s
```

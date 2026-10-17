# TalentTrack AI — Database Architecture & Schemas

This document describes the MongoDB database architecture, Mongoose schemas, relations, compound indexes, constraints, and data transformations implemented in **TalentTrack AI**.

---

## 1. Overview

TalentTrack AI uses **MongoDB** as its primary persistent operational database, accessed via **Mongoose ORM** (`mongoose`). 

- **Object ID Mapping**: All schemas implement custom `toJSON` and `toObject` transform functions that map MongoDB `_id` to `id`, strip `__v`, and automatically sanitize sensitive internal fields (such as `passwordHash`).
- **Timestamps**: All core entity schemas enable `{ timestamps: true }` (`createdAt` and `updatedAt`).

```
                    ┌─────────────────────────┐
                    │          User           │
                    │   (Core User Identity)  │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │ (1:1)                 │ (1:1)                 │ (1:N)
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Applicant    │     │    Recruiter    │     │       Job       │
│(Profile/Skills) │     │ (Company/Dept)  │     │(Recruiter Owner)│
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         │ (1:N)                                         │
         ▼                                               │
┌─────────────────┐                                      │
│     Resume      │                                      │
│ (S3 & ATS Data) │                                      │
└────────┬────────┘                                      │
         │                                               │
         │ (1:N)                                         │ (1:N)
         └───────────────────────┬───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │       Application       │
                    │ (Stage, Status & Match) │
                    └─────────────────────────┘
```

---

## 2. Collections & Schemas

### 1. `User` Schema (`src/server/models/User.ts`)
The `User` collection is the central authentication and identity entity across all roles.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (Virtual) | Auto-mapped from `_id` | Unique user identifier |
| `name` | `String` | Required, Trimmed | Full display name |
| `email` | `String` | Required, Unique, Lowercase | User email address |
| `passwordHash` | `String` | Required (Scrypt / Placeholder) | Scrypt password hash (omitted from `toSafeUser`) |
| `firebaseUid` | `String` | Sparse, Unique, Indexed | Firebase UID for applicant OAuth accounts |
| `role` | `String` | Indexed, Enum | `ADMIN`, `SUPER_ADMIN`, `ORG_ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `APPLICANT` |
| `status` | `String` | Indexed, Enum | `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `LOCKED`, `DEACTIVATED`, `INACTIVE` |
| `emailVerified` | `Boolean` | Default: `false` | Email verification flag |
| `failedLoginAttempts` | `Number` | Default: `0` | Consecutive failed login count |
| `lockedUntil` | `String` / `Date` | Default: `null` | ISO timestamp until account lockout expires |
| `recruiterProfile` | `Object` | Embedded Schema | Embedded recruiter company metadata |
| `applicantProfile` | `Object` | Embedded Schema | Embedded candidate summary metadata |
| `adminProfile` | `Object` | Embedded Schema | Platform admin permissions |

---

### 2. `Applicant` Schema (`src/server/models/Applicant.ts`)
Stores detailed applicant profile data and links directly to the `User` document.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `ObjectId` | Required, Unique, Indexed | Foreign key referencing `User._id` |
| `firebaseUid` | `String` | Sparse, Unique, Indexed | Linked Firebase Authentication identifier |
| `headline` | `String` | Trimmed | Professional title / headline |
| `phone` | `String` | Trimmed | Contact phone number |
| `location` | `String` | Indexed, Trimmed | Geographic city / region |
| `skills` | `[String]` | Indexed, Default: `[]` | Array of applicant skill tags |
| `experience` | `[Mixed]` | Default: `[]` | Work history entries |
| `education` | `[Mixed]` | Default: `[]` | Academic degree history |
| `projects` | `[Mixed]` | Default: `[]` | Project portfolio entries |
| `certifications` | `[Mixed]` | Default: `[]` | Professional certifications |
| `resumeId` | `String` | Trimmed | ID of currently active resume |
| `summary` | `String` | Trimmed | Candidate bio / summary |

---

### 3. `Recruiter` Schema (`src/server/models/Recruiter.ts`)
Stores dedicated recruiter enterprise metadata.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `ObjectId` | Required, Unique, Indexed | Foreign key referencing `User._id` |
| `companyName` | `String` | Required, Trimmed, Indexed | Name of hiring company |
| `department` | `String` | Trimmed | Department (e.g. Engineering) |
| `jobTitle` | `String` | Trimmed | Recruiter corporate role |
| `phone` | `String` | Trimmed | Work phone number |

---

### 4. `Job` Schema (`src/server/models/Job.ts`)
Stores job openings posted by recruiters.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | Required, Indexed, Trimmed | Job title |
| `description` | `String` | Required | Markdown / rich job description |
| `department` | `String` | Required, Indexed, Trimmed | Department name |
| `location` | `String` | Required, Indexed, Trimmed | Job location / Remote status |
| `employmentType` | `String` | Enum | `Full-Time`, `Part-Time`, `Contract`, `Remote`, `Internship` |
| `experienceRequired`| `String` | Trimmed | Experience requirement string |
| `skills` | `[String]` | Indexed, Default: `[]` | Required job skill keywords |
| `salaryRange` | `Object` | Embedded Schema | `min`, `max`, `currency`, `isNegotiable` |
| `recruiterId` | `ObjectId` | Required, Indexed | Foreign key referencing `User._id` |
| `status` | `String` | Indexed, Enum | `DRAFT`, `PUBLISHED`, `ARCHIVED`, `CLOSED` |
| `applicationsCount`| `Number` | Default: `0` | Dynamic count of submitted applications |
| `deadline` | `String` | Optional ISO date | Application deadline |

#### Compound Indexes on `Job`:
- `{ status: 1, department: 1 }`: Optimized for filtered public job board searches.
- `{ recruiterId: 1, status: 1 }`: Optimized for recruiter dashboard listings.
- `{ status: 1, createdAt: -1 }`: Chronological sorting for active published job listings.
- `{ createdAt: -1 }`: Chronological sorting for recent jobs.

---

### 5. `Resume` Schema (`src/server/models/Resume.ts`)
Tracks binary S3 storage, text parsing status, and stored ATS evaluations.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `applicantId` | `ObjectId` | Required, Indexed | Foreign key referencing `User._id` |
| `applicationId` | `ObjectId` | Optional, Indexed | Associated `Application._id` if job-specific |
| `originalFileName` | `String` | Required, Trimmed | Original upload filename |
| `storedFileName` | `String` | Required, Trimmed | Server unique filename |
| `mimeType` | `String` | Required | `application/pdf` or `.docx` MIME |
| `fileSize` | `Number` | Required, Min: 0 | Size in bytes |
| `s3Key` | `String` | Required, Unique, Indexed | AWS S3 object storage path |
| `s3Bucket` | `String` | Required | S3 bucket name |
| `uploadedAt` | `String` | Indexed, ISO Date | Upload timestamp |
| `parsingStatus` | `String` | Indexed, Enum | `NOT_STARTED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `parsedProfile` | `Mixed` | Default: `null` | Structured JSON (`IParsedResumeProfile`) |
| `atsScore` | `Number` | Default: `null` | Persisted overall ATS score (0–100) |
| `atsAnalysis` | `Mixed` | Default: `null` | Complete `AtsAnalysisResult` record |

#### Compound Indexes on `Resume`:
- `{ applicantId: 1, uploadedAt: -1 }`: Fast retrieval of the applicant's latest active resume.

---

### 6. `Application` Schema (`src/server/models/Application.ts`)
Represents candidate applications to posted jobs.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `jobId` | `ObjectId` | Required, Indexed | Foreign key referencing `Job._id` |
| `applicantId` | `ObjectId` | Required, Indexed | Foreign key referencing `User._id` |
| `recruiterId` | `ObjectId` | Required, Indexed | Foreign key referencing `User._id` |
| `resumeId` | `String` | Trimmed | ID of resume submitted with application |
| `coverLetter` | `String` | Optional text | Candidate cover letter |
| `status` | `String` | Indexed, Enum | `APPLIED`, `SCREENING`, `INTERVIEW`, `OFFERED`, `REJECTED`, `WITHDRAWN` |
| `currentStage` | `String` | Indexed, Enum | Current Kanban column stage |
| `stageHistory` | `[Mixed]` | Default: `[]` | Immutable audit log of stage transitions |
| `aiScore` | `Number` | Min: 0, Max: 100 | AI match score against job requirements |
| `notes` | `String` | Optional text | Recruiter internal notes |
| `appliedAt` | `String` | Indexed, ISO Date | Submission timestamp |

#### Compound Indexes & Unique Constraints on `Application`:
- `{ jobId: 1, applicantId: 1 }` (**UNIQUE**): Guarantees that a candidate can only apply to a specific job once. Duplicate applications are rejected with HTTP 409 Conflict.
- `{ recruiterId: 1, status: 1 }`: Optimized for recruiter pipeline stage queries.
- `{ currentStage: 1, appliedAt: -1 }`: Optimized for Kanban column ordering.
- `{ applicantId: 1, appliedAt: -1 }`: Optimized for applicant dashboard history queries.
- `{ jobId: 1, currentStage: 1 }`: Optimized for recruiter candidate stage filters per job.

---

### 7. `Interview` Schema (`src/server/models/Interview.ts`)
Stores interview schedules, participants, meeting links, and recruiter/interviewer feedback.

| Field | Type | Index / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `applicationId` | `ObjectId` | Required, Indexed | Foreign key referencing `Application._id` |
| `jobId` | `ObjectId` | Required, Indexed | Foreign key referencing `Job._id` |
| `candidateId` | `ObjectId` | Required, Indexed | Foreign key referencing `User._id` |
| `recruiterId` | `ObjectId` | Required, Indexed | Foreign key referencing `User._id` |
| `hiringManagerId` | `ObjectId` | Optional, Indexed | Foreign key referencing `User._id` |
| `interviewType` | `String` | Required, Enum | `INITIAL_SCREEN`, `TECHNICAL`, `BEHAVIORAL`, `FINAL_ROUND` |
| `status` | `String` | Required, Enum | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED` |
| `scheduledAt` | `Date` | Required, Indexed | Date and time of interview |
| `durationMinutes` | `Number` | Default: 45, Min: 15 | Interview length |

#### Compound Indexes on `Interview`:
- `{ applicationId: 1, scheduledAt: 1 }`: Chronological ordering of interviews for an application.
- `{ recruiterId: 1, scheduledAt: 1 }`: Recruiter schedule calendar queries.
- `{ candidateId: 1, scheduledAt: 1 }`: Candidate interview schedule queries.
- `{ hiringManagerId: 1, scheduledAt: 1 }`: Hiring manager upcoming interviews.

---

## 3. Database Connection & Lifecycle

The connection lifecycle is managed in `src/server/db/mongodb.ts`:
- **Pool Management**: Configured with `maxPoolSize: 10`, `minPoolSize: 2`, `connectTimeoutMS: 10000`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`.
- **Event Listeners**: Idempotent registration of `connected`, `error`, `disconnected`, and `reconnected` events.
- **Credential Protection**: Strict URI masking in all logs preventing secret leaks.
- **Active Readiness Check**: `/api/ready` performs an active `admin.ping()` command on MongoDB and returns `503 Service Unavailable` if disconnected or unresponsive.
- **Index Synchronization**: Automated `ensureDatabaseIndexes()` invokes `syncIndexes()` safely across all registered schemas upon initial connection.

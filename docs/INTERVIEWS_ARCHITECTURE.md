# Persistent Interview Architecture

This document describes the design, data model, REST APIs, role-based authorization, and frontend integration for TalentTrack AI's database-backed Interview system.

---

## 1. Architecture & Core Distinctions

### Application Stage vs. Interview Record
- **Application Stage** (`currentStage`): Represents the pipeline progress of the candidate's application (`APPLIED`, `SCREENING`, `SHORTLISTED`, `INTERVIEW`, `OFFERED`, `REJECTED`, `WITHDRAWN`).
- **Interview Entity** (`Interview`): Represents the actual scheduled event (`SCHEDULED`, `CONFIRMED`, `RESCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
- An application can have **multiple sequential or panel interviews** (e.g. Initial Recruiter Screening $\rightarrow$ Technical System Design $\rightarrow$ Hiring Manager Final).
- Reaching `currentStage === "INTERVIEW"` without a scheduled interview record gracefully displays an informative notice to the applicant without fabricating fake meeting dates or links.

---

## 2. Data Models & Schemas

### 2.1. Interview Model (`interviews` collection)

```typescript
export interface IInterview {
  id: string;                          // Unique MongoDB ObjectId
  applicationId: string;              // Reference to Application
  jobId: string;                      // Reference to Job opening
  applicantId: string;                // Reference to Applicant (User ObjectId)
  recruiterId: string;                // Reference to Recruiter (User ObjectId)
  hiringManagerId?: string;           // Reference to Hiring Manager (optional)
  interviewerIds?: string[];          // List of interviewer User ObjectIds
  title: string;                      // E.g. "Technical Round: Frontend Architecture"
  type: "VIDEO" | "PHONE" | "ONSITE"; // Controlled interview modality
  scheduledAt: string;                // ISO 8601 UTC timestamp
  durationMinutes: number;            // Duration in minutes (5 to 480)
  timezone: string;                   // IANA timezone identifier (e.g. "Asia/Kolkata")
  meetingUrl?: string;                // Video conference URL (if VIDEO)
  location?: string;                  // Physical address/room (if ONSITE)
  instructions?: string;              // Candidate preparation & session notes
  status: InterviewStatus;            // SCHEDULED | CONFIRMED | RESCHEDULED | COMPLETED | CANCELLED | NO_SHOW
  notes?: string;                     // Internal recruiter notes (stripped for applicants)
  createdBy: string;                  // User ObjectId of organizer
  createdAt: string;                  // ISO creation timestamp
  updatedAt: string;                  // ISO update timestamp
}
```

**Indexes:**
- `{ applicantId: 1, scheduledAt: -1 }` (fast querying of applicant schedules)
- `{ recruiterId: 1, scheduledAt: -1 }` (recruiter calendar views)
- `{ hiringManagerId: 1, scheduledAt: -1 }` (assigned hiring manager schedules)
- `{ applicationId: 1 }` (application-level interview history)
- `{ scheduledAt: 1, status: 1 }` (chronological upcoming/past status queries)

---

## 3. REST API Endpoints

All endpoints require Bearer / Firebase Authentication.

| Method | Route | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/interviews/my` | Retrieve scheduled interviews for authenticated user | Applicant (own interviews), Recruiter (owned jobs), HM (assigned jobs) |
| `GET` | `/api/interviews/:id` | Retrieve single interview record and enriched metadata | Applicant (own only, internal notes hidden), Recruiter, HM, Admin |
| `POST` | `/api/interviews` | Schedule a new interview for a candidate application | Recruiter, Hiring Manager, Admin (Applicants forbidden) |
| `PATCH` | `/api/interviews/:id` | Update status, schedule time, meeting link, or instructions | Recruiter, Hiring Manager, Admin |
| `DELETE` | `/api/interviews/:id` | Cancel/remove an interview record | Recruiter, Admin |

---

## 4. Security & Privacy Guarantees

1. **Server-Derived Identity & Context**:
   - When creating an interview via `POST /api/interviews`, the client provides only the `applicationId` and scheduling parameters.
   - `applicantId`, `jobId`, and `recruiterId` are derived server-side from the verified Application document.
2. **Access Control**:
   - Applicants can ONLY access interviews where `interview.applicantId === req.user.id`. Requests for other applicants' interviews return `403 Forbidden`.
3. **Internal Note Redaction**:
   - Internal hiring evaluation notes, recruiter assessment details, and private notes are automatically redacted from API responses when queried by an Applicant.
4. **Input Validation**:
   - `scheduledAt` must be a valid ISO datetime string.
   - `durationMinutes` must be between 5 and 480.
   - `timezone` must be a valid IANA timezone name.
   - `type` must be `"VIDEO"`, `"PHONE"`, or `"ONSITE"`.
   - `meetingUrl` must be a valid HTTP/HTTPS URL when provided.

---

## 5. Client Integration (React Query)

Located in `src/hooks/api/useInterviews.ts`:

- `useMyInterviews(options)`: Queries `/api/interviews/my` with query key caching (`["interviews", "my", { status }]`).
- `useInterview(id, options)`: Queries individual interview details (`["interviews", "detail", id]`).
- `useCreateInterview()`: Mutation for recruiters/HMs that creates an interview and invalidates relevant caches.
- `useUpdateInterview()`: Mutation for updating status / rescheduling.

---

## 6. Applicant UI Features (`/applicant/interviews`)

- **Filter Tabs**: `All`, `Upcoming` (active scheduled sessions), `Completed` (past completed rounds), and `Cancelled`.
- **Status Badges**: Clean visual badges distinguishing `Scheduled`, `Confirmed`, `Rescheduled`, `Completed`, `Cancelled`, and `No Show`.
- **Timezone Awareness**: Displays the localized date, time, and explicit timezone (e.g. `15 Oct 2026 • 10:00 AM (Asia/Kolkata)`).
- **Safe Video Link Handling**: Displays `[ Join Video Meeting ]` ONLY when a real valid meeting URL is present. If missing, shows "Meeting link will be provided prior to the session".
- **Communication Integration**: Direct `[ Message Recruiter ]` action linking to `/applicant/messages`.
- **Stage Notice**: When an application is in the Interview stage but no interview has been scheduled yet, an informative alert is shown without generating fake mock times.

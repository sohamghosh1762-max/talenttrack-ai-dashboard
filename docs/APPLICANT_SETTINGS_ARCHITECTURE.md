# Applicant Preferences & Settings Architecture

This document outlines the architecture, data models, endpoints, and event integration for the persistent MongoDB-backed Applicant Preferences system in TalentTrack AI.

---

## 1. System Overview

Prior to this implementation, the Applicant Settings page stored notification toggles only in local React component state.

The persistent preferences architecture connects settings to the database and ensures they directly govern the notification creation pipeline:

```
Applicant UI (src/routes/applicant/settings.tsx)
       ↓
React Query Hook (src/hooks/api/useApplicantSettings.ts)
       ↓
REST API Endpoints (GET/PATCH /api/applicant/settings)
       ↓
Applicant Preferences Repository (src/server/repositories/applicant-preferences.repository.ts)
       ↓
MongoDB Collection (src/server/models/ApplicantPreferences.ts)
       ↓
Notification Service Decision Engine (src/server/services/notification-service.ts)
```

---

## 2. Data Model & Schema

Defined in [src/server/models/ApplicantPreferences.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/models/ApplicantPreferences.ts) and [src/server/types/preference-types.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/types/preference-types.ts):

### Fields

```typescript
export interface IApplicantPreferences {
  id: string;
  userId: string;                     // Unique 1:1 foreign key reference to User model
  applicationStatusUpdates: boolean;  // Controls application submission and stage change notifications
  interviewReminders: boolean;        // Controls interview schedule/reschedule/cancellation notifications
  jobRecommendationAlerts: boolean;   // Controls AI matched job alerts
  messageNotifications: boolean;      // Controls direct recruiter messaging notifications
  emailNotifications: boolean;        // Controls email digest & critical schedule alerts
  createdAt: string;                  // Server-generated timestamp
  updatedAt: string;                  // Server-generated timestamp
}
```

### Unique Indexing
- `{ userId: 1 }` (unique): Enforces strict 1-to-1 ownership per applicant account.

---

## 3. Default Values & Lazy Initialization

Safe defaults for every applicant account:
```typescript
export const DEFAULT_APPLICANT_PREFERENCES = {
  applicationStatusUpdates: true,
  interviewReminders: true,
  jobRecommendationAlerts: true,
  messageNotifications: true,
  emailNotifications: true,
};
```

If an applicant account opens Settings for the first time without a pre-existing Preferences document in MongoDB, the repository lazily initializes and stores their default record idempotently.

---

## 4. API Specification

All settings endpoints require authentication (`authenticate(req)`) and operate strictly on the authenticated `user.id`.

### `GET /api/applicant/settings`
- **Role Requirement**: `APPLICANT` (or Admin)
- **Response**:
```json
{
  "success": true,
  "data": {
    "applicationStatusUpdates": true,
    "interviewReminders": true,
    "jobRecommendationAlerts": true,
    "messageNotifications": true,
    "emailNotifications": true,
    "updatedAt": "2026-10-02T17:55:00.000Z"
  },
  "message": "Applicant settings retrieved successfully."
}
```

### `PATCH /api/applicant/settings` & `PUT /api/applicant/settings`
- **Role Requirement**: `APPLICANT` (or Admin)
- **Validation**: Accepts partial JSON payload. Validates that every provided field is a genuine boolean. Non-boolean values return `400 Bad Request`.
- **Payload Example**:
```json
{
  "applicationStatusUpdates": false,
  "interviewReminders": false
}
```
- **Response**: Returns the updated preferences object with fresh `updatedAt`.

---

## 5. Notification System Integration

The `NotificationService` ([src/server/services/notification-service.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/services/notification-service.ts)) checks the recipient's persistent preferences before creating in-app notification records:

| Event | Setting Checked | Behavior when `false` |
| :--- | :--- | :--- |
| Application Submitted | `applicationStatusUpdates` | Application is created; in-app notification suppressed |
| Application Stage Changed | `applicationStatusUpdates` | Stage transition succeeds; in-app notification suppressed |
| Interview Scheduled / Rescheduled / Cancelled | `interviewReminders` | Interview record is created/updated; in-app notification suppressed |
| New Recruiter Message | `messageNotifications` | Message is delivered and saved in conversation; in-app notification suppressed |
| AI Job Recommendation | `jobRecommendationAlerts` | Matched jobs remain visible in dashboard; notification alert suppressed |

---

## 6. Frontend UI Capabilities

- **React Query Integration**: Uses `useApplicantSettings()` and `useUpdateApplicantSettings()` with query cache synchronization.
- **Dirty State Tracking**: The Save button tracks changes against the server state (`isDirty`).
- **Real Feedback**: The "Preferences saved" badge only displays upon a verified HTTP 200 response from the backend.
- **Loading & Error Recovery**: Displays animated loading skeletons during fetches and an explicit Retry button on network failure.

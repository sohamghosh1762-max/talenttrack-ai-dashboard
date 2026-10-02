# Persistent Notification Architecture

This document describes the design, implementation, and security guarantees of the persistent MongoDB-backed notification system in TalentTrack AI.

---

## 1. System Overview

Prior to this implementation, applicant notifications were locally derived from application arrays and tracked unauthoritative read state in transient React state (`useState<string[]>`).

The persistent notification architecture transforms this into a real backend-driven event system:

```
Real System Event (Application, Interview, Message, ATS Analysis)
       ↓
Central Notification Service (src/server/services/notification-service.ts)
       ↓
MongoDB Notification Collection (src/server/models/Notification.ts)
       ↓
Authenticated Session Routing & Security Filtering
       ↓
REST API Endpoints (/api/notifications)
       ↓
TanStack React Query Cache (src/hooks/api/useNotifications.ts)
       ↓
Applicant UI (Header Bell Dropdown & Real-Time Count Badge)
```

---

## 2. Notification Model

The `Notification` entity is defined in [src/server/models/Notification.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/models/Notification.ts) and [src/server/types/notification-types.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/types/notification-types.ts).

### Schema Definition

```typescript
export interface INotification {
  id: string;
  userId: string;                     // Owner user ID (Applicant, Recruiter, HM, Admin)
  type: NotificationType;             // Controlled enumeration of event types
  title: string;                      // Display title (e.g. "Interview Scheduled 📅")
  message: string;                    // Applicant-facing descriptive message
  applicationId?: string | undefined; // Associated Application ID
  jobId?: string | undefined;         // Associated Job ID
  interviewId?: string | undefined;   // Associated Interview ID
  conversationId?: string | undefined;// Associated Conversation ID
  metadata?: Record<string, unknown> | undefined;
  readAt?: string | null | undefined; // ISO timestamp when read (null if unread)
  createdAt: string;                  // Server-generated creation ISO timestamp
  updatedAt: string;                  // Server-generated modification ISO timestamp
}
```

### Database Indexes

To ensure high-throughput queries and efficient unread counts:
- `{ userId: 1, createdAt: -1 }`: Fast retrieval of user notifications ordered by newest first.
- `{ userId: 1, readAt: 1 }`: Fast unread count aggregation and queries.
- `{ applicationId: 1 }`: Querying notifications by application context.
- `{ interviewId: 1 }`: Querying notifications by interview context.
- `{ conversationId: 1 }`: Querying notifications by conversation context.

---

## 3. Controlled Notification Types

| Notification Type | Trigger Event | Destination Route |
| :--- | :--- | :--- |
| `APPLICATION_SUBMITTED` | Candidate submits application | `/applicant/applications` |
| `APPLICATION_STATUS_CHANGED` | Recruiter moves candidate to Screening, etc. | `/applicant/applications` |
| `APPLICATION_SHORTLISTED` | Candidate moved to Shortlisted stage | `/applicant/applications` |
| `APPLICATION_REJECTED` | Application rejected | `/applicant/applications` |
| `INTERVIEW_SCHEDULED` | Recruiter / HM schedules an interview | `/applicant/interviews` |
| `INTERVIEW_RESCHEDULED` | Interview datetime or details changed | `/applicant/interviews` |
| `INTERVIEW_CANCELLED` | Interview status set to CANCELLED | `/applicant/interviews` |
| `NEW_MESSAGE` | Recruiter sends a direct message | `/applicant/messages` |
| `ATS_ANALYSIS_READY` | ATS resume scoring calculation completed | `/applicant/profile` |
| `JOB_RECOMMENDATION` | AI engine recommends matching job | `/applicant/jobs/:id` |

---

## 4. Central Notification Service

The `NotificationService` ([src/server/services/notification-service.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/server/services/notification-service.ts)) provides methods for generating notifications:

- `notifyApplicationSubmitted({ applicantId, applicationId, jobId, jobTitle, companyName })`
- `notifyApplicationStatusChanged({ applicantId, applicationId, jobId, jobTitle, companyName, oldStage, newStage, status })`: **Guards against duplicate notifications** if the stage has not actually changed.
- `notifyInterviewScheduled({ applicantId, interviewId, applicationId, jobId, jobTitle, interviewTitle, scheduledAt, timezone, type, meetingUrl })`
- `notifyInterviewRescheduled({ applicantId, interviewId, applicationId, jobId, jobTitle, interviewTitle, scheduledAt, timezone })`
- `notifyInterviewCancelled({ applicantId, interviewId, applicationId, jobId, jobTitle, interviewTitle })`
- `notifyNewMessage({ recipientId, conversationId, senderName, messageText, jobTitle })`
- `notifyAtsScoreReady({ applicantId, overallScore, resumeFileName })`

---

## 5. API Endpoints

All notification endpoints enforce authentication via `authenticate(req)` and derive user ownership strictly from the session token.

### 1. `GET /api/notifications`
- **Auth**: Required (Applicant, Recruiter, HM, Admin)
- **Query Params**: `page` (default: 1), `limit` (default: 20, max: 100), `unreadOnly` (boolean), `type` (optional filter).
- **Response**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "65f1a2b3c4d5e6f7a8b9c701",
        "userId": "65f1a2b3c4d5e6f7a8b9c008",
        "type": "INTERVIEW_SCHEDULED",
        "title": "Interview Scheduled 📅",
        "message": "Technical Round for Senior Frontend Developer is scheduled for Oct 15, 10:00 AM.",
        "applicationId": "65f1a2b3c4d5e6f7a8b9c201",
        "jobId": "65f1a2b3c4d5e6f7a8b9c101",
        "interviewId": "65f1a2b3c4d5e6f7a8b9c601",
        "readAt": null,
        "createdAt": "2026-10-02T17:25:00.000Z"
      }
    ],
    "total": 12,
    "unreadCount": 3,
    "page": 1,
    "limit": 20
  },
  "message": "Notifications retrieved successfully."
}
```

### 2. `GET /api/notifications/unread-count`
- **Auth**: Required
- **Response**:
```json
{
  "success": true,
  "data": { "count": 3 },
  "message": "Unread notification count retrieved."
}
```

### 3. `PATCH /api/notifications/:id/read` & `POST /api/notifications/:id/read`
- **Auth**: Required
- **Security Check**: Verifies `notification.userId === authenticatedUser.id`. Returns `403 Forbidden` if another user attempts to mark it read.
- **Behavior**: Sets `readAt` to current server timestamp.
- **Response**: Updated notification object.

### 4. `POST /api/notifications/read-all`
- **Auth**: Required
- **Behavior**: Sets `readAt` for all unread notifications belonging to the authenticated user.
- **Response**: `{ "count": 3, "success": true }`.

---

## 6. Security and RBAC Guarantees

1. **Strict User Ownership**: `userId` is never trusted from request body or query parameters; it is extracted strictly from the authenticated token session.
2. **Cross-Tenant Isolation**: Users cannot read, mark read, or access another user's notifications.
3. **Internal Information Protection**: Applicant notification templates only contain candidate-facing information (stage name, interview schedule, sender name) and never leak internal recruiter notes, evaluation scorecards, or private hiring manager comments.

---

## 7. Frontend Integration & React Query

- **Hooks**: [src/hooks/api/useNotifications.ts](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/hooks/api/useNotifications.ts)
  - `useNotifications(params, options)`: Queries paginated notifications with polling interval.
  - `useUnreadNotificationsCount(options)`: Queries unread count badge.
  - `useMarkNotificationRead()`: Mutation with optimistic cache updates and query invalidation.
  - `useMarkAllNotificationsRead()`: Mutation that zeros unread badge and updates active list items.
- **UI Component**: [src/components/applicant/ApplicantHeader.tsx](file:///Users/sohamghosh/talenttrack-ai-dashboard/src/components/applicant/ApplicantHeader.tsx)
  - Replaces all local `readIds` and derived application arrays with live React Query data.
  - Shows loading skeleton while fetching.
  - Shows clear error state with retry button on network failures.
  - Shows empty state ("No notifications yet") when no notifications exist.
  - Clicking an item marks it read and navigates to the relevant entity (Applications, Interviews, Messages, Profile).

# Persistent Messaging & Conversation Architecture

This document describes the design, data model, REST APIs, security rules, and frontend integration for TalentTrack AI's real-time/persistent messaging system between Applicants, Recruiters, and Hiring Teams.

---

## 1. Core Principles

1. **MongoDB Persistence**: Messages and conversations are stored in MongoDB collections (`conversations` and `messages`) with an in-memory dual-mode repository for testing and offline development.
2. **Server-Derived Identity**: The message sender is strictly determined by backend authentication (`req.user.id` via Firebase or session token). Client-submitted `senderId` in the request body is discarded and overridden.
3. **Strict Resource Authorization**: Only verified conversation participants (`conversation.participantIds.includes(req.user.id)`) or platform admins can retrieve threads, read messages, or post new messages (returning `403 Forbidden` for non-participants).
4. **Application & Job Context**: Conversations are linked to candidate job applications (`applicationId`, `jobId`). An applicant can only initiate conversations regarding jobs they have actively applied to.
5. **Separation of Concerns**: Internal recruiter notes, hiring manager evaluation feedback, and ATS screening notes are strictly decoupled and never exposed via the candidate messaging API.

---

## 2. Data Models & Schemas

### 2.1. Conversation Model (`conversations`)

```typescript
export interface IConversation {
  id: string;                          // Unique MongoDB ObjectId
  participantIds: string[];            // Array of User ObjectIds (Applicant, Recruiter, etc.)
  applicationId?: string;              // Related Application ObjectId (optional)
  jobId?: string;                      // Related Job ObjectId (optional)
  lastMessageId?: string;              // Most recent Message ObjectId
  lastMessageText?: string;            // Text preview snippet of the last message
  lastMessageAt?: string;              // ISO timestamp of the last message
  lastMessageSenderId?: string;        // ObjectId of the user who sent the last message
  createdAt: string;                   // ISO creation timestamp
  updatedAt: string;                   // ISO update timestamp
}
```

**Indexes:**
- `{ participantIds: 1 }` (fast querying of a user's conversations)
- `{ applicationId: 1 }` (lookup by application)
- `{ lastMessageAt: -1 }` (sorting conversations chronologically)

---

### 2.2. Message Model (`messages`)

```typescript
export interface IMessage {
  id: string;                          // Unique MongoDB ObjectId
  conversationId: string;              // Reference to Conversation
  senderId: string;                    // User ObjectId of sender (derived from auth)
  recipientId: string;                // User ObjectId of recipient
  text: string;                        // Message body (trimmed, 1 to 3000 chars)
  attachments?: string[];              // Future attachment URLs (empty array for text-only phase)
  readAt?: string | null;              // Null if unread; ISO timestamp when marked read
  createdAt: string;                   // Server-generated creation timestamp
  updatedAt: string;                   // Server-generated update timestamp
}
```

**Indexes:**
- `{ conversationId: 1, createdAt: 1 }` (chronological message retrieval per thread)
- `{ recipientId: 1, readAt: 1 }` (unread badge count queries)

---

## 3. REST API Endpoints

All endpoints require standard Bearer Authentication (`Authorization: Bearer <token>` or Firebase token).

| Method | Route | Description | Auth / RBAC |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/conversations` | List all conversations where authenticated user is a participant | Any authenticated role (Applicant, Recruiter, HM, Admin) |
| `POST` | `/api/conversations` | Find or create a conversation for an application | Participant or Job Owner only |
| `GET` | `/api/conversations/:id` | Retrieve single conversation metadata & enriched participant info | Participant or Admin only (403 if unauthorized) |
| `GET` | `/api/conversations/:id/messages` | Retrieve chronological message history for a conversation | Participant or Admin only (403 if unauthorized) |
| `POST` | `/api/conversations/:id/messages` | Send a new message in a conversation | Participant or Admin only (`senderId` derived from session) |
| `PATCH` / `POST` | `/api/conversations/:id/read` | Mark all unread incoming messages as read for current user | Participant only |

---

## 4. Authorization & Security Rules

1. **Sender Authentication**:
   - The backend validates `authenticate(req)` and obtains `req.user.id` and `req.user.role`.
   - `senderId` is automatically assigned to `req.user.id`.
   - `recipientId` is computed by picking the other participant in `conversation.participantIds`.

2. **Access Control**:
   - `conversation.participantIds.includes(req.user.id)` is checked on every single conversation and message endpoint.
   - Unauthorized attempts return `403 Forbidden`.

3. **Message Input Validation**:
   - Whitespace is stripped via `.trim()`.
   - Empty messages (`""` or `"    "`) return `400 Bad Request`.
   - Messages exceeding 3000 characters return `400 Bad Request`.

4. **Internal ATS Privacy Protection**:
   - Internal hiring manager feedback, recruiter notes, and automated ATS raw logs are stored in separate schemas and are never returned in message responses.

---

## 5. Client Integration (React Query)

The frontend uses custom React Query hooks located in `src/hooks/api/useConversations.ts`:

- `useConversations()`: Fetches the user's conversation list with periodic background refetching.
- `useConversation(id)`: Fetches metadata for the active thread.
- `useConversationMessages(conversationId)`: Retrieves chronological message history.
- `useSendMessage()`: Mutation that posts message to `/api/conversations/:id/messages` and invalidates message and conversation queries.
- `useMarkConversationRead()`: Mutation that marks messages read on thread focus.

---

## 6. Page Layout & Responsive Design

Target Route: `/applicant/messages`

- **Left Panel (Conversations List)**:
  - Search filter by recruiter name, role, company, or job title.
  - Avatar initials, participant name, role badge, job title pill.
  - Last message preview snippet with relative timestamp ("Just now", "5m", "Yesterday").
  - Unread badge counter.
  - Real empty state ("No conversations yet", "View My Applications" button).
- **Right Panel (Chat Thread)**:
  - Header with participant name, role badge, company name, and link to job details.
  - Chronological message bubbles distinguishing current user (Applicant) vs. hiring team.
  - Read receipts (single check vs. double check).
  - Composer input with Enter-to-send and sending loading state.
  - Responsive mobile support with back button navigation.

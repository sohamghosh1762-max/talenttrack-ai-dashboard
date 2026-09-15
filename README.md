# TalentTrack AI
## AI-Powered Applicant Tracking System

**TalentTrack AI** is a modern Applicant Tracking System (ATS) designed to streamline the recruitment lifecycle for organizations and provide job seekers with a structured application experience. The platform combines job management, candidate applications, resume processing, semantic candidate matching, recruitment pipelines, communication, and hiring analytics in one unified application.

> **Important:** AI-generated recommendations are intended to support recruiter decision-making. Final hiring decisions remain with human reviewers.

---

## Product Overview

TalentTrack AI supports two primary user roles:

### Recruiter
- Create, edit, publish, pause, and archive job openings
- Review and manage applications
- View candidate profiles
- Analyze resumes
- Compare candidates with job requirements
- Review explainable match scores
- Manage the hiring pipeline
- Schedule interviews
- Communicate with candidates
- View recruitment analytics

### Applicant
- Browse and search job openings
- View detailed job descriptions
- Create and manage a profile
- Upload a resume
- Apply for jobs
- Track applications
- Save jobs
- Receive recruiter communications

---

## User Journey

The application follows a deliberate three-stage experience:

```text
Public Homepage
       │
       ▼
Authentication
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
   Recruiter               Applicant
       │                      │
       ▼                      ▼
 Recruiter ATS          Applicant Portal
```

### Route Structure

#### Public Routes
- `/` — Homepage
- `/jobs` — Public Job Board
- `/login` — User Login
- `/register` — User Registration

#### Recruiter Routes (Protected)
- `/dashboard` — Recruiter Dashboard & Analytics
- `/jobs` — Job Management & Postings
- `/applications` — Application Review
- `/candidates` — Candidate Directory & Profiles
- `/pipeline` — Kanban Hiring Pipeline
- `/ai-screening` — AI Screening & Matching Center
- `/messages` — Candidate Messaging
- `/reports` — Recruitment Reports & Analytics
- `/settings` — Recruiter & Organization Settings

#### Applicant Routes (Protected)
- `/applicant` — Applicant Portal Overview
- `/applicant/jobs` — Job Search & Recommendations
- `/applicant/applications` — Application Tracking
- `/applicant/saved-jobs` — Saved Job Openings
- `/applicant/profile` — Candidate Profile & Resume
- `/applicant/messages` — Recruiter Communications
- `/applicant/settings` — Applicant Settings

*Unauthenticated users cannot access protected recruiter or applicant routes.*

---

## Core Features

### 1. Public Homepage
The homepage introduces the platform before authentication and contains:
- Product branding and value proposition
- Recruitment-focused hero section
- Job seeker and recruiter calls-to-action
- Live platform statistics
- Core platform capabilities
- "How It Works" workflow guide
- Social proof and trust indicators
- Success stories & testimonials
- Conversion-oriented final CTA and professional footer

### 2. Authentication & Role Management
- Secure Login and Registration
- Role selection (`Recruiter` vs. `Applicant`)
- Strict client- and server-side form validation
- Session and JWT token management
- Protected route middleware with role-based redirects
- User profiles initialization

### 3. Recruiter Dashboard
- High-level KPIs: Active Job Openings, Total Applications, Shortlisted Candidates, Scheduled Interviews
- Visual application trends over time
- Top candidate skills distribution
- AI-driven recruitment insights
- Recent job openings and application feed
- Hiring pipeline summary with quick action triggers

### 4. Job Management
Recruiters can manage job openings throughout their lifecycle with comprehensive metadata:
- **Fields:** Job Title, Department, Company, Location, Employment Type, Salary Range, Job Description, Required Skills, Preferred Skills, Experience Requirement, Education Requirement, Application Deadline, Status.
- **Statuses:** `Draft` | `Published` | `Paused` | `Archived`

### 5. Application Management
Applications connect applicants, jobs, resumes, and recruitment stages.
- **Statuses:** `Applied` ➔ `Screening` ➔ `Shortlisted` ➔ `Interview` ➔ `Offered` (or `Rejected` / `Withdrawn`)
- Full audit history and recruiter notes for every application stage.

### 6. Resume Processing
Designed to support PDF and DOCX resumes.

```text
Resume Upload ──► Secure Storage ──► Document Extraction ──► Resume Text ──► Structured Candidate Data
```

**Extracted Information:**
- Professional summary
- Skills & competencies
- Work experience & duration
- Education background
- Certifications & credentials
- Projects & domain relevance

### 7. Candidate Matching & Scoring Model
Candidate-job comparison evaluates job-relevant criteria:

| Evaluation Component | Weight |
| :--- | :--- |
| **Skill Match** | 40% |
| **Experience Match** | 25% |
| **Education Match** | 10% |
| **Project Relevance** | 15% |
| **Preferred Skills** | 10% |
| **Total Overall Match** | **100%** |

Candidate recommendations include explainable breakdowns: matched skills, missing requirements, relevant experience highlights, and concise AI-generated summaries.

### 8. Candidate Ranking & Filtering
Recruiters can filter and sort candidates by:
- Match score
- Skills & experience level
- Education requirements
- Application status & timeline
- Job title & location
- Availability

### 9. Hiring Pipeline
Interactive Kanban board managing candidate progression:
```text
Applied ──► Screening ──► Shortlisted ──► Interview ──► Offered
                              │
                              └──► Rejected / Withdrawn
```

### 10. Communication & Notifications
- Application status updates
- Interview invitations & calendar reminders
- Offer letters and notifications
- Recruiter-to-applicant direct messaging
- In-app notification center

### 11. Analytics & Reports
- Applications per job and over time
- Full hiring funnel & stage conversion rates (Shortlisting, Interview, Offer)
- Pipeline distribution across departments
- Common skill frequency in candidate pool
- Average candidate match scores per opening

---

## Architecture

```text
                    Web Application
                          │
                          ▼
                 React / TypeScript
                          │
                    React Query
                          │
                          ▼
                  Node.js / Express
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
        MongoDB        AWS S3       AI Service
                                      │
                                      ▼
                               Python / FastAPI
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                         ▼                         ▼
                    LLM Provider            NLP / Embeddings
```

### Technology Stack

- **Frontend:** React.js, TypeScript, TanStack Router, React Query, Tailwind CSS, Radix UI, Lucide Icons, Recharts
- **Backend:** Node.js, Express.js, REST APIs, Authentication & Authorization Middleware
- **AI & Document Processing:** Python, FastAPI, PDF/DOCX Extraction, LLM APIs (Gemini / OpenAI), Semantic Embeddings & NLP
- **Database:** MongoDB
- **File Storage:** AWS S3, Multer
- **Communication:** Nodemailer / Transactional Email Provider

---

## Recommended Repository Structure

```text
talenttrack-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── candidates/
│   │   │   ├── pipeline/
│   │   │   ├── auth/
│   │   │   └── ui/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── data/
│   │   └── lib/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── config/
│   └── package.json
│
├── ai-service/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── utils/
│   ├── requirements.txt
│   └── main.py
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── database.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Data Model

```text
User
├── id
├── name
├── email
├── passwordHash
├── role ('recruiter' | 'applicant')
├── createdAt
└── updatedAt

RecruiterProfile
├── userId
├── companyName
├── jobTitle
├── companyWebsite
└── createdAt

ApplicantProfile
├── userId
├── headline
├── location
├── skills
├── experience
├── education
├── certifications
└── projects

Job
├── recruiterId
├── title
├── department
├── description
├── requiredSkills
├── preferredSkills
├── experienceRequirement
├── educationRequirement
├── location
├── employmentType
├── salaryRange
├── status ('draft' | 'published' | 'paused' | 'archived')
├── createdAt
└── updatedAt

Application
├── applicantId
├── jobId
├── resumeId
├── status ('applied' | 'screening' | 'shortlisted' | 'interview' | 'offered' | 'rejected' | 'withdrawn')
├── aiAnalysisId
├── recruiterNotes
├── appliedAt
└── updatedAt

Resume
├── applicantId
├── storageKey
├── originalFilename
├── fileType
├── extractedText
├── parsedData
└── uploadedAt

CandidateAnalysis
├── applicationId
├── matchScore
├── matchedSkills
├── missingSkills
├── experienceMatch
├── educationMatch
├── projectRelevance
├── summary
└── createdAt
```

---

## Security & Responsible AI

### Security Best Practices
- Password hashing with salted bcrypt
- Role-based authorization (RBAC) & protected API routes
- Strict input validation and sanitization
- MIME type and file-size constraints for resume uploads
- Private S3 storage with presigned URLs for authorized document access
- Rate limiting, security headers (Helmet), and CORS configuration
- Zero secrets committed to frontend bundles or git history

### Responsible Candidate Evaluation
The candidate analysis system evaluates strictly job-relevant criteria (skills, experience, education, projects, certifications).

- **Strict Non-Discrimination:** Protected or irrelevant characteristics (e.g., religion, gender, age, marital status, political affiliation, photographs) are never used in scoring or ranking.
- **Decision Support:** AI outputs are structured as decision support with full auditability and explanations, preserving human oversight for all hiring decisions.

---

## API Design

### Authentication
- `POST /api/auth/register` — Register a new recruiter or applicant
- `POST /api/auth/login` — Authenticate and receive session/token
- `POST /api/auth/logout` — Invalidate user session
- `GET /api/auth/me` — Retrieve current authenticated user profile

### Jobs
- `GET /api/jobs` — List jobs (with search and status filters)
- `GET /api/jobs/:id` — Get job details
- `POST /api/jobs` — Create a new job opening
- `PATCH /api/jobs/:id` — Update job details
- `DELETE /api/jobs/:id` — Delete a job opening
- `PATCH /api/jobs/:id/status` — Update job lifecycle status

### Applications
- `GET /api/applications` — List applications (filtered by job/applicant)
- `GET /api/applications/:id` — Get application details
- `POST /api/applications` — Submit a new job application
- `PATCH /api/applications/:id/status` — Update application stage

### Candidates
- `GET /api/candidates` — Search and filter candidate profiles
- `GET /api/candidates/:id` — Get candidate profile
- `GET /api/candidates/:id/applications` — Get candidate application history

### Resumes
- `POST /api/resumes/upload` — Upload and trigger document extraction
- `GET /api/resumes/:id` — Get resume details and signed download URL
- `DELETE /api/resumes/:id` — Remove resume document

### Candidate Analysis
- `POST /api/analysis/resume` — Parse and extract structured resume data
- `POST /api/analysis/match` — Run semantic matching between candidate and job
- `GET /api/analysis/:applicationId` — Retrieve analysis and explainable match breakdown

### Pipeline
- `GET /api/pipeline` — Get pipeline board metrics and categorized stages
- `PATCH /api/pipeline/:applicationId` — Move application stage

---

## Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=

SESSION_SECRET=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

OPENAI_API_KEY=
# OR
GEMINI_API_KEY=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

VITE_API_URL=http://localhost:5000/api
```

---

## Development Roadmap & Status

| Phase | Milestone | Status |
| :--- | :--- | :--- |
| **Phase 1** | Frontend Foundation (Homepage, Dashboard, UI Components) | Completed / In Progress |
| **Phase 2** | Authentication & Role-Based Access | In Progress |
| **Phase 3** | Job Management & MongoDB Integration | Planned |
| **Phase 4** | Application Management & History | Planned |
| **Phase 5** | Resume Storage & Document Processing | Planned |
| **Phase 6** | Candidate Analysis & Semantic Matching | Planned |
| **Phase 7** | Recruitment Pipeline & Kanban Board | Planned |
| **Phase 8** | Communication & Notification System | Planned |
| **Phase 9** | Analytics, Funnels & Reporting | Planned |
| **Phase 10** | End-to-End Testing & Deployment | Planned |

---

## Four-Week Implementation Plan

### Week 1 — Portals and Job Management
- **Days 1–2:** Database schema design (Recruiter, Applicant, Job, Application).
- **Days 3–5:** Authentication, RBAC, Job APIs (creation, editing, archiving).
- **Days 6–7:** Recruiter dashboard, public job board, job detail pages.

### Week 2 — Applications and Storage
- **Days 1–3:** AWS S3 integration, Multer file upload validation, secure storage.
- **Days 4–5:** Application submission workflows, application history, candidate profiles.
- **Days 6–7:** Application pipeline stages (`Applied`, `Screening`, `Interview`, `Offered`, `Rejected`).

### Week 3 — Resume Processing and Analysis
- **Days 1–3:** PDF & DOCX extraction and text normalization.
- **Days 4–6:** Information extraction, job requirement parsing, semantic candidate matching.
- **Day 7:** Persist analysis results and link to application records.

### Week 4 — Ranking, Communication and Deployment
- **Days 1–3:** Explainable candidate ranking, advanced filtering, candidate comparison.
- **Days 4–5:** Email notifications, interview invitations, status updates.
- **Days 6–7:** End-to-end testing, security audit, S3 access control verification, deployment.

---

## Git Workflow & Commit Conventions

Recommended branch structure: `main` ➔ `develop` ➔ `feature/<feature-name>`

### Commit Conventions
- `feat: implement recruiter authentication`
- `feat: add job creation workflow`
- `feat: create application submission API`
- `feat: integrate secure resume uploads`
- `feat: implement resume text extraction`
- `feat: add candidate matching service`
- `feat: implement recruitment pipeline`
- `feat: add interview notification workflow`
- `test: add application API integration tests`
- `fix: restrict unauthorized resume access`
- `refactor: separate candidate analysis service`
- `docs: update API documentation`

---

## Non-Functional Requirements & Design Principles

- **Visual Direction:** Enterprise SaaS UI, clean light content areas, deep navy navigation (`#10213D`), blue primary actions (`#1264F5`), pastel stage badges, soft elevation, and crisp typographic hierarchy.
- **Performance:** Optimized document processing, smart client caching with React Query, minimal re-renders.
- **Reliability:** Graceful API failures, retry strategies for AI/cloud services, and clear user-facing error boundaries.

---

## License & Contributors

This project is developed for educational, research, and demonstration purposes unless a separate commercial license is provided.

### Contributors
- **Project Lead: SOHAM GHOSH**
- **Team Members: Jevin Parmar, Nayesha Suhail Ahmed Bijapure, Shubham Tiwari.**
- **Internship: Zaalima Development Pvt. Ltd.**

---

<p align="center">
  <strong>TalentTrack AI</strong><br />
  <em>Smarter Hiring. Brighter Teams.</em>
</p>

# TalentTrack AI — Resume Ingestion & Parsing Pipeline

This document details the complete end-to-end lifecycle of candidate resume documents in **TalentTrack AI**, covering file ingestion, private S3 storage, document text extraction, AI-powered structured parsing with Google Gemini, and metadata persistence.

---

## 1. Resume Ingestion Lifecycle

```
  Candidate Upload (Browser)
             │
             │ HTTP POST /api/resumes (multipart/form-data)
             ▼
    Multer Ingestion & Validation
    (MIME, magic bytes, 10MB limit)
             │
             ├── S3 Upload (`@aws-sdk/client-s3`)
             │   └── Key: `resumes/<applicantId>/<uuid>.<ext>`
             │
             └── MongoDB Persistence (`Resume` Model)
                 └── Status: `NOT_STARTED`
             │
             ▼
    Text Extraction Pipeline (`resume-text-extractor.ts`)
    ├── PDF: `pdf-parse` (with corrupted header fix)
    └── DOCX: `mammoth` (XML stream extraction)
             │
             ▼
    AI Structured Parsing (`resume-parser-service.ts`)
    ├── Google Gemini Model (`gemini-3.6-flash`)
    └── Schema Validation (`resume-parser-validator.ts`)
             │
             ▼
    Structured Profile Output (`IParsedResumeProfile`)
    ├── personal (name, email, phone, links)
    ├── summary
    ├── skills (categorized array)
    ├── experience (chronology, roles, accomplishments)
    ├── education (degrees, institutions, dates)
    ├── projects & certifications
    └── languages & achievements
             │
             ▼
    Database State Update
    └── `Resume.parsingStatus` = `COMPLETED`
    └── `Resume.parsedProfile` = `<structured-profile>`
```

---

## 2. File Validation & Ingestion

File uploads are handled by Express middleware using `multer` configured with strict validation guards:

- **Supported File Types**:
  - PDF: `application/pdf` (`.pdf`)
  - Word Document: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`)
  - Legacy Word: `application/msword` (`.doc`)
- **Size Limitation**: Maximum $10\text{ MB}$ per file ($10 \times 1024 \times 1024$ bytes).
- **Security Check**: Magic byte inspection and MIME-type verification ensure executable files masquerading with resume extensions are rejected with `400 Bad Request`.

---

## 3. Secure AWS S3 Storage Architecture

Resume binaries are stored privately in Amazon Web Services (AWS) Simple Storage Service (S3).

- **Bucket Access**: S3 Bucket is configured with `Block Public Access: ON`. All direct unauthenticated HTTP access is forbidden.
- **Storage Key Convention**:
  ```text
  resumes/<applicantId>/<timestamp>-<sanitized-original-filename>
  ```
- **Presigned Download URLs**: When recruiters or applicants view or download original resume files, the server generates a time-limited AWS S3 presigned URL (valid for 15 minutes) using `@aws-sdk/s3-request-presigner`.

---

## 4. Text Extraction & Sanitization

Document extraction is performed in `src/server/services/resume-text-extractor.ts`:

### 1. PDF Parsing (`pdf-parse`)
- Reads raw binary buffers into memory.
- **Corrupted PDF Header Correction**: Automatically detects and normalizes missing `%PDF-` header offsets or truncated header wrappers before parsing.
- Removes unprintable binary control characters and standardizes multiline whitespace.

### 2. DOCX Extraction (`mammoth`)
- Extracts raw text content from Microsoft Word OpenXML packages.
- Preserves paragraph separations and list items.

### 3. Safety Truncation & Normalization
- Extracts up to a maximum of $50,000$ characters. Excess text is safely truncated with an ellipsis marker to prevent buffer exhaustion and token overflow.

---

## 5. Gemini Structured Resume Parsing

Structured data extraction is powered by the Google Gemini SDK (`@google/genai`) using model `gemini-3.6-flash`.

### Parsing Workflow:
1. The extracted plain text is submitted to Gemini along with a strict system instruction defining candidate resume schema constraints.
2. Gemini processes the text and returns a strictly typed JSON object matching `IParsedResumeProfile`.
3. The response is validated through Zod in `src/server/validators/resume-parser-validator.ts`.

### Parsed Profile Schema (`IParsedResumeProfile`):
```ts
export interface IParsedResumeProfile {
  personal: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary?: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    location?: string;
    startDate: string;
    endDate: string;
    description: string[];
    technologies: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    grade?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
  }>;
  languages?: string[];
  achievements?: string[];
}
```

---

## 6. Parsing Status States & Error Recovery

The `Resume` model tracks the parsing state via `parsingStatus`:

| Status | Description |
| :--- | :--- |
| `NOT_STARTED` | File has been uploaded to S3 and MongoDB record created; parsing has not yet been triggered. |
| `PROCESSING` | Text extraction or Gemini AI parsing is currently executing. |
| `COMPLETED` | Text extraction and Gemini structured parsing succeeded; `parsedProfile` is populated and ready for ATS analysis. |
| `FAILED` | Parsing encountered an error (e.g. password-protected PDF, OCR scan failure, API rate limit). The `parsingError` field stores a sanitized diagnostic message. |

### Auto-Parsing on Demand:
If an applicant requests their ATS score (`GET /api/applicant/ats-score`) and their uploaded resume is in `NOT_STARTED` status, the backend automatically triggers `parseResume()` asynchronously before running the ATS analysis, ensuring seamless zero-friction user onboarding.

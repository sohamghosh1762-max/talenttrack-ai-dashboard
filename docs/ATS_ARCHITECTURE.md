# TalentTrack AI — ATS Architecture & Controlled Hybrid Scoring

This document describes the design, scoring formulas, idempotency mechanisms, and implementation of the **Controlled Hybrid ATS Scoring Engine** in TalentTrack AI.

---

## 1. Architectural Overview

The TalentTrack AI ATS evaluates candidate resumes using a **Controlled Hybrid Architecture**. This system combines an objective, deterministic rule engine with semantic AI evaluation powered by Google Gemini, governed by a backend-controlled fusion layer.

```
                         RESUME (PDF / DOCX)
                                 ↓
                         Resume Ingestion
                         (S3 Object Store)
                                 ↓
                         Text Extraction
                       (pdf-parse / mammoth)
                                 ↓
                      Structured Gemini Parser
                                 ↓
                           parsedProfile
                                 ↓
              ┌──────────────────┴──────────────────┐
              ↓                                     ↓
     DETERMINISTIC ENGINE                   GEMINI AI ENGINE
  • Section Completeness                 • Skills Relevance
  • Skills Presentation                  • Experience Quality
  • Experience Chronology                • Project Depth
  • Education Presence                   • Summary Focus
  • Structure & Formatting               • Keyword Semantics
  • Keyword Verification                 • Quantified Achievements
              ↓                                     ↓
     Deterministic Scores                    Semantic Scores
       (0–100 per category)                 (0–100 per dimension)
              │                                     │
              └──────────────────┬──────────────────┘
                                 ↓
                        CONTROLLED FUSION
                (60% Deterministic + 40% Gemini)
                                 ↓
                         FINAL ATS REPORT
                    (Overall Score: 0–100)
                                 ↓
                        MONGODB PERSISTENCE
                                 ↓
                       APPLICANT ATS DASHBOARD
```

---

## 2. Deterministic ATS Engine

The deterministic scoring engine (`atsService.calculateDeterministicBaselines`) evaluates measurable, objective structural and content criteria extracted from `parsedProfile`. It is 100% reproducible and free of any stochastic or non-deterministic variables.

### Evaluated Criteria:
1. **Resume Completeness**:
   - Contact information presence (full name, email, phone, location, portfolio/links).
   - Professional summary existence and length.
   - Core section presence (Experience, Education, Skills, Projects, Certifications).
2. **Skills Presentation**:
   - Total skill count and categorization (Languages, Backend, Frontend, DevOps, Cloud, Databases).
   - Balance across technical domains.
3. **Experience Chronology & Quality**:
   - Number of employment entries, date validity, chronology, and role definitions.
   - Company names, descriptions, and technology stack associations.
4. **Keyword Optimization**:
   - Presence and density of industry-standard technical keywords and role-specific terms.
5. **Education & Credentials**:
   - Degree level, institution, field of study, graduation dates, and certifications.
6. **Formatting & Structure**:
   - Section structure cleanliness, bullet point density, and readability.

---

## 3. Gemini AI Semantic Analysis Engine

The Gemini AI engine provides qualitative, semantic assessment of the resume content using Google's `@google/genai` SDK configured at zero temperature (`temperature: 0`).

### Configuration & Model Matrix:
- **Primary Model**: `gemini-3.6-flash`
- **Fallback Models**: `gemini-3.5-flash-lite`, `gemini-2.5-flash`
- **Sampling Temperature**: `0.0` (eliminates random sampling variance)
- **Output Format**: Enforced JSON Schema (`responseSchema`)

### Evaluated Semantic Dimensions:
1. `skillsRelevance`: Evaluates technical depth and modern industry alignment.
2. `experienceQuality`: Evaluates career trajectory, leadership, and operational scale.
3. `projectQuality`: Evaluates architectural complexity and implementation depth.
4. `summaryQuality`: Evaluates the clarity, positioning, and focus of the professional summary.
5. `keywordRelevance`: Evaluates contextual keyword density and industry terminology.
6. `achievementQuality`: Assesses quantifiable outcomes, business metrics, and performance impact.

### Evidence & Anti-Hallucination Constraints:
Gemini is strictly constrained by system instructions to:
- Output numeric scores strictly between $0$ and $100$.
- Provide concrete **evidence citations** quoting or referencing actual resume contents.
- Return 3–5 factual strengths, 3–5 constructive areas for improvement, and 3–5 actionable recommendations.
- Never invent, extrapolate, or hallucinate skills, metrics, or credentials not in the resume.

---

## 4. Controlled Hybrid Scoring & Fusion Formulas

Scoring weights and fusion rules are defined strictly in the backend configuration (`src/server/types/ats-types.ts`):

```ts
export const ATS_SCORING_CONFIG = {
  deterministicWeight: 0.60,
  geminiWeight: 0.40,
  rubricVersion: "1.0",
  engineVersion: "1.0",
  promptVersion: "1.0",
} as const;
```

### Category-Level Fusion Formula:
For each of the 6 ATS categories, the final category score is calculated as:

$$\text{Category Score} = \text{round}\left(\min\left(100, \max\left(0, \text{Deterministic Score} \times 0.60 + \text{Gemini Dimension Score} \times 0.40\right)\right)\right)$$

### ATS Category Weights:
The overall ATS resume score is computed as the weighted sum of all 6 category scores:

| Category | Category Key | Deterministic Metric | Gemini Dimension | Weight |
| :--- | :--- | :--- | :--- | :---: |
| **Resume Completeness** | `completeness` | Section & contact coverage | `summaryQuality` | **15%** |
| **Skills Presentation** | `skills` | Count & categorization | `skillsRelevance` | **25%** |
| **Experience Quality** | `experience` | Chronology & role entries | `experienceQuality` | **25%** |
| **Keyword Optimization** | `keywords` | Keyword presence & match | `keywordRelevance` | **15%** |
| **Education & Credentials**| `education` | Degree & certificates | `achievementQuality` | **10%** |
| **Formatting & Structure** | `structure` | Readability & hierarchy | `projectQuality` | **10%** |
| **Total** | | | | **100%** |

### Overall Score Calculation:
$$\text{Overall ATS Score} = \sum_{i=1}^{6} \left(\text{Category Score}_i \times \text{Weight}_i\right)$$

### Compatibility Tier Mapping:
- **85 – 100**: `EXCELLENT` (*"Excellent ATS Compatibility"*)
- **70 – 84**: `GOOD` (*"Good ATS Compatibility"*)
- **50 – 69**: `MODERATE` (*"Moderate ATS Compatibility"*)
- **0 – 49**: `NEEDS_IMPROVEMENT` (*"Needs Improvement"*)

---

## 5. Cryptographic Idempotency & Repeatability

To guarantee that analyzing the same resume always yields the exact same score ($100\%$ repeatability), TalentTrack AI implements SHA-256 analysis caching.

### 1. Canonical Resume Hash (`resumeHash`)
A deterministic SHA-256 hash is generated from a canonicalized representation of the candidate profile:
```ts
const canonical = {
  fileName: fileName.trim().toLowerCase(),
  fileSize,
  personal: { fullName, email, phone, location, linkedin, github, portfolio },
  summary: profile.summary.trim(),
  skills: [...profile.skills].map(s => s.trim().toLowerCase()).sort(),
  experience: profile.experience.map(e => ({ company, role, startDate, endDate, description, technologies })),
  education: profile.education.map(edu => ({ institution, degree, fieldOfStudy, startDate, endDate, grade })),
  certifications: profile.certifications.map(c => ({ name, issuer, date })),
  projects: profile.projects.map(p => ({ name, description, technologies })),
};
const resumeHash = crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
```

### 2. Composite Analysis Key (`analysisKey`)
A unique composite analysis key is generated combining the resume hash and system versions:
$$\text{analysisKey} = \text{SHA-256}\left(\text{resumeHash} : \text{rubricVersion} : \text{engineVersion} : \text{geminiModel} : \text{promptVersion} : \text{jobContextHash}\right)$$

### 3. Re-Analysis Behavior:
- When an applicant clicks **"Re-analyze ATS Score"**, the server calculates `analysisKey`.
- If an existing analysis in MongoDB matches the `analysisKey`, the server **returns the cached result instantly**.
- Zero duplicate Gemini API calls, zero latency delay, and 100% identical numerical results across repeated runs.

### 4. Resume Replacement Behavior:
- When an applicant uploads a new resume, a new `Resume` document is created with a new `resumeHash` and `analysisKey`.
- The previous resume is archived, invalidating old scores and triggering a fresh hybrid analysis.

---

## 6. Offline / AI Fallback Mode

If Gemini is unreachable (e.g. 429 quota exhaustion, network partition, or missing API credentials):
1. The ATS engine automatically falls back to **Deterministic Only** mode ($100\%$ deterministic weight).
2. The endpoint returns HTTP 200 with `aiAvailable: false` and `aiNotice`:
   > *"AI analysis is temporarily unavailable. The score below is based on the available ATS evaluation."*
3. The system remains fully operational and never crashes or fabricates scores.

---

## 7. Security & Zero Client Trust

- **Backend-Only Scoring**: The frontend never calculates, overrides, or submits scores. All calculations occur inside `atsService.ts`.
- **Secret Protection**: API keys, Gemini credentials, AWS keys, and database connection strings are never returned in ATS API responses.
- **Tenant Isolation**: Applicants can only access ATS analysis for their own resumes (`req.user.id === resume.applicantId`).

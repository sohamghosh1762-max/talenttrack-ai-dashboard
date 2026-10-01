# TalentTrack AI — Developer Guide & Setup

This guide describes how to configure, develop, test, and build **TalentTrack AI** locally.

---

## 1. Prerequisites

Ensure your development environment meets the following minimum requirements:

- **Node.js**: `>= 20.0.0` (Recommended: `22.12.0` or higher; see `.nvmrc`)
- **Package Manager**: `npm` `>= 10.0.0`
- **Database**: Active MongoDB instance (Local or MongoDB Atlas cluster)
- **AI Credentials**: Valid Google Gemini API Key
- **Storage**: AWS S3 Bucket with read/write IAM credentials (optional for in-memory mock dev)
- **Auth**: Firebase project with web credentials & service account key (for applicant OAuth)

---

## 2. Local Setup Steps

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/sohamghosh1762-max/talenttrack-ai-dashboard.git
cd talenttrack-ai-dashboard
npm install
```

### 2. Configure Environment Variables
Copy the template configuration and supply your local credentials:
```bash
cp .env.example .env
```
*Review [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md) for detailed variable descriptions.*

### 3. Start Local Development Server
```bash
npm run dev
```
The application will launch with hot module reloading at `http://localhost:8080` (or `http://localhost:3000`).

---

## 3. Available npm Scripts

All standard development tasks are defined in `package.json`:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite + Nitro SSR development server. |
| `npm test` | Runs the full automated test suite (285 tests across 79 suites). |
| `npm run typecheck` | Executes `tsc --noEmit` to verify strict TypeScript type safety. |
| `npm run build` | Builds the optimized production client and server bundles. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues. |
| `npm run format` | Runs Prettier to automatically format code across the repository. |
| `npm run db:seed` | Seeds the database with default administrative users and demo job postings. |

---

## 4. Testing & Verification Workflows

### Run Full Test Suite
```bash
npm test
```

### Run Single Targeted Test Suite
```bash
node --test --experimental-strip-types src/server/__tests__/hybrid-ats-repeatability.test.ts
```

### Pre-Commit Verification Checklist
Before submitting changes, run:
```bash
npm run typecheck
npm test
npm run build
```
All three commands must exit with code `0`.

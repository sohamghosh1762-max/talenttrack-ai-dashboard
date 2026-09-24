# TalentTrack AI — Developer Guide

This document outlines the local development setup, toolchain requirements, scripts, and workflows for **TalentTrack AI**.

---

## 1. Prerequisites & Toolchain

- **Node.js:** `>= 20.0.0` (Recommended: `22.12.0` via `.nvmrc`)
- **Package Manager:** `npm` `>= 10.0.0` (npm is the standardized package manager for this repository)

Ensure you switch to the correct Node version:

```bash
nvm use
```

---

## 2. Installation

Clone the repository and install dependencies cleanly:

```bash
npm install
```

---

## 3. Environment Configuration

Copy the example environment template to `.env`:

```bash
cp .env.example .env
```

Review the values in `.env`. For local development, default values are sufficient for Phase 1. Real database and AI API keys will be configured in subsequent phases.

---

## 4. Development Workflow

Start the local development server:

```bash
npm run dev
```

The application will be accessible at:

- **Application URL:** `http://localhost:3000` (or `http://localhost:5173`)
- **API Health Check:** `http://localhost:3000/api/health`

---

## 5. Build, Lint & Quality Commands

| Command             | Description                                                     |
| :------------------ | :-------------------------------------------------------------- |
| `npm run dev`       | Starts the local Vite development server with API middleware    |
| `npm run typecheck` | Executes TypeScript type validation (`tsc --noEmit`)            |
| `npm run build`     | Produces the production SSR and client bundles via Vite + Nitro |
| `npm run preview`   | Previews the production build locally                           |
| `npm run lint`      | Runs ESLint across the codebase                                 |
| `npm run format`    | Runs Prettier code formatting                                   |
| `npm test`          | Runs the server test suite using Node's native test runner      |

---

## 6. Testing Philosophy

Server-side tests use Node.js's built-in test runner with native TypeScript support (`node --test --experimental-strip-types`).

To execute tests:

```bash
npm test
```

All new API routes, services, and repositories must include unit and integration tests under `src/server/__tests__/`.

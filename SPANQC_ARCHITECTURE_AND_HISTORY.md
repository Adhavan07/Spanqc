# SpanQC — Complete Architecture, Implementation History & System Design Reference Manual

**Author:** Antigravity AI Engineering Assistant (Pair Programming with Engineering Lead)  
**Client & Sponsor:** Spandsons Horizon Engineering Pvt. Ltd.  
**Repository:** `/data/projects/spanqc`  
**Current Active Branch:** `feat/deterministic-qc-engine`  
**Preserved Baseline Branch:** `experiment/llm-qc-demo` (Commit `1d2d97380fffa687d926aa6ea7d09c097d296fcf`)  
**Production Tracking Branches:** `main` (Commit `346851d`), `testing/staging` (Commit `da88462`)  
**Date:** October 15, 2026  
**Document Version:** 1.0.0 (Comprehensive Milestone Edition)  

---

## Table of Contents
1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [Project Mission, Business Goal & Engineering Problem](#2-project-mission-business-goal--engineering-problem)
3. [Day-by-Day Implementation Chronology (Day 1 to Present)](#3-day-by-day-implementation-chronology-day-1-to-present)
4. [System Architecture & Multi-Layer System Design](#4-system-architecture--multi-layer-system-design)
   - [4.1 Global Architecture Diagram](#41-global-architecture-diagram)
   - [4.2 Layer 1: Frontend & Design System](#42-layer-1-frontend--design-system)
   - [4.3 Layer 2: Edge Proxy & Security Layer](#43-layer-2-edge-proxy--security-layer)
   - [4.4 Layer 3: Application & API Layer](#44-layer-3-application--api-layer)
   - [4.5 Layer 4: Multi-Tenant Database & Persistence Layer](#45-layer-4-multi-tenant-database--persistence-layer)
   - [4.6 Layer 5: Asynchronous QC Job Queue & Scheduler](#46-layer-5-asynchronous-qc-job-queue--scheduler)
   - [4.7 Layer 6: Private Document Storage](#47-layer-6-private-document-storage)
   - [4.8 Layer 7: Python FastAPI Service & Concurrency Limiter](#48-layer-7-python-fastapi-service--concurrency-limiter)
   - [4.9 Layer 8: Active Deterministic QC Rule Engine](#49-layer-8-active-deterministic-qc-rule-engine)
   - [4.10 Layer 9: Preserved Experimental LLM Integration](#410-layer-9-preserved-experimental-llm-integration)
   - [4.11 Layer 10: Hari's Engineering Standard v1.0 (VDH20 / Hyundai)](#411-layer-10-haris-engineering-standard-v10-vdh20--hyundai)
   - [4.12 Layer 11: Durable Human Review & Audit Trail](#412-layer-11-durable-human-review--audit-trail)
5. [How The Application Works Right Now (End-to-End Walkthrough)](#5-how-the-application-works-right-now-end-to-end-walkthrough)
6. [Comprehensive Quality Assurance & Automated Test Inventory](#6-comprehensive-quality-assurance--automated-test-inventory)
7. [Source-Data Inventory & Available vs. Missing Ground Truth](#7-source-data-inventory--available-vs-missing-ground-truth)
8. [Roadmap & Immediate Next Phases](#8-roadmap--immediate-next-phases)

---

## 1. Executive Summary & Purpose

This reference document establishes the single authoritative technical record for **SpanQC (Wiring Diagram Quality Control Assistant)**. It captures the entire lifecycle of the system: from the initial design reverse-engineering on Day 1 to the production-grade multi-tenant platform, the experimental open-weight vision LLM pipeline, and the current transition to a pure, evidence-backed deterministic rule engine.

SpanQC was engineered to solve a safety-critical bottleneck in industrial technical documentation: **eliminating manual, error-prone visual inspection of electrical wiring schematics without introducing non-deterministic hallucination or unverified claims.**

Every design decision, security control, data model, test suite, and architectural boundary documented here has been independently verified in live code and automated test execution.

---

## 2. Project Mission, Business Goal & Engineering Problem

### The Engineering Challenge
In heavy industries, aerospace, and construction equipment manufacturing (such as JCB excavators, Boeing avionics harnesses, and Hyundai VDH-series wheel loaders), technical publication (Tech Pub) teams receive complex original equipment manufacturer (OEM) wiring diagrams as engineering PDFs. 

To create diagnostic shop manuals, field service books, and interactive schematics, Tech Pub engineers redraw these OEM schematics into CAD and high-resolution graphical sheets (e.g., sheets `1 FB1-1` through `1 FB1-6` for fuse-relay distribution boxes). 

Historically, **every single connection, terminal callout, wire gauge, wire color, and cross-sheet jumper was verified by hand with highlighter pens**:
- A single harness module often contains **400 to 2,000 individual wire segments**.
- Manual review requires **8 to 34 hours per module**, costing significant engineering hours.
- Human fatigue introduces quality risks: missed wire gauges, misread pin numbers (e.g. reversing pin numbers on multi-pin Deutsch connectors like CN-56 or CN-58), or unresolved cross-sheet continuity errors.

### The SpanQC Mission
SpanQC automates wiring diagram verification by providing:
1. **Authoritative Specification Comparison:** Comparing drawing observations against an engineering netlist or authoritative component registries (e.g., Hyundai `HX Codes` with `DROP` disambiguation).
2. **International Standard Enforcement:** Deterministic compliance checking against **IPC/WHMA-A-620D §13** (Wire identification & labeling) and **UL 508A Table 66.1 / Supplement SB** (Conductor sizing, color-coding, SCCR ratings).
3. **Module CAC Traceability:** Tracing every wire segment from its source component and pin through all intermediate junction blocks and connectors to its **final destination component and pin**.
4. **Honest Abstention:** Strictly separating verified facts from uncertainties. When a wire number does not continue, or an image is blurred, SpanQC produces a `REVIEW` outcome with destination classifications (`GREEN`, `YELLOW`, `GREY`, `BLUE`), **never guessing or fabricating an endpoint**.
5. **Durable Human Sign-Off:** Preserving an immutable audit trail of human inspector decisions (`QCJobReview`) linked to cryptographically bound document fingerprints (SHA-256).

---

## 3. Day-by-Day Implementation Chronology (Day 1 to Present)

```
CHRONOLOGICAL MILESTONE PROGRESSION
========================================================================================
[Phase 0] Design System & Tokens        ──► Spaceship-inspired cosmic dark theme & tokens
[Phase 1] Component Library & UI        ──► 16 obsidian components & 9 public marketing pages
[Phase 2] Workspace & Initial Check     ──► 10 authenticated views & /app/check prototype
[Phase 3] Codebase & Security Audit     ──► Identified client-side mocks & auth vulnerabilities
[Phase 4] Multi-Tenant Security & RBAC  ──► SQLite + Prisma, scrypt, Edge proxy, CSRF defense
[Phase 5] Async QC Job Engine & Review  ──► QCJob queue, claimToken, DocumentStore, QCJobReview
[Phase 6] Open-Weight Vision LLM PoC    ──► FastAPI, PyMuPDF, Ollama (gemma3:4b), concurrency
[Phase 7] LLM Removal Assessment        ──► Benchmarked CPU latency (180s), preserved on Git
[Phase 8] Hari's Validation Standard    ──► VDH20 / Hyundai standard, Module CAC, 14 gold cases
========================================================================================
```

### Day 1–2: Visual Engineering, Design System & Public Storytelling
- **Reverse-Engineering Spaceship Aesthetic:** Analyzed modern, high-contrast dark interfaces to establish a premium cosmic aesthetic:
  - Base obsidian background: `#06070a`
  - Elevated card background: `#0c101a`
  - High-elevation surface: `#111726`
  - Brand accents: Electric Cyan (`#00f0ff`) and Cobalt Blue (`#0066ff`)
  - Severity scale: Critical (`#ff3366`), Major (`#f97316`), Minor (`#eab308`), Pass (`#10b981`)
- **Tokens & CSS:** Built `src/lib/tokens/design-system.ts` and `src/app/globals.css` with dense schematic grid patterns (`bg-schematic-grid-dense`), cyan focus glow rings (`border-glow-cyan`), and tabular font numbers for pinout alignment.
- **Component Library:** Developed 16 reusable UI components in `src/components/ui/` (Button, Card, Badge, Input, SearchInput, Tabs, Accordion, Table, Modal, Select, Progress, Toast, EmptyState, MetricCard, CursorSpotlight).
- **Public Surface:** Built 9 marketing pages (`/`, `/product`, `/how-it-works`, `/standards`, `/pricing`, `/security`, `/resources`, `/contact`, `/login`, `/signup`).
- **Initial Baseline Commit:** Staged 77 source files and committed `346851d` on branch `main`.

### Day 3–4: Authenticated Workspace & Architectural Security Audit
- **Workspace Views:** Built 10 authenticated application routes under `src/app/app/` (Dashboard, Projects, History, Standards, Billing, Usage, Team, Settings).
- **Initial Prototype (`/app/check`):** Drag-and-drop file upload, browser-side WebCrypto SHA-256 calculation, and split-screen blueprint viewer with pan/zoom and bounding boxes.
- **Architectural Audit (October 10):** A comprehensive code audit uncovered critical architectural gaps:
  - *Universal Auth Bypass:* Login endpoint accepted any password and auto-created admin accounts.
  - *Simulated QC:* Finding generation in `report-store.ts` was client-side only, deriving findings via filename substrings (`isUL`, `isClean`) and canned templates (`D-101`, `D-102`).
  - *No Server Storage:* Files existed as ephemeral browser blob URLs and were not persisted or validated server-side.
  - *Lack of Multi-Tenancy:* Organization was hardcoded to `org-spandsons`.

### Day 5: Enterprise Security Hardening, Multi-Tenant Isolation & RBAC
- **Prisma Schema:** Created SQLite database schema in `prisma/schema.prisma` modeling `Tenant`, `User`, `Session`, and `Project`.
- **Cryptographic Authentication:** Added salted `scrypt` password hashing and `timingSafeEqual` comparison in `src/lib/server/auth/passwords.ts`.
- **Server Sessions:** Implemented persistent database sessions with HMAC-SHA256 signed cookie tokens in `src/lib/server/auth/session.ts`.
- **Edge Proxy Route Guard:** Built Next.js 16 Edge proxy in `src/proxy.ts` enforcing immediate session revocation and blocking suspended/deleted accounts.
- **CSRF Defense:** Implemented `validateOrigin` in `src/lib/server/auth/csrf.ts` checking `Origin`, `Referer`, and `Sec-Fetch-Site`.
- **Role-Based Access Control (RBAC):** Built `src/lib/server/auth/rbac.ts` enforcing `ADMIN`, `ENGINEER`, and `REVIEWER` permissions.
- **Commits:** Pushed `50213f9` ("feat(security): harden authentication and tenant isolation") and `da88462` ("feat(security): harden session and request authorization") to `testing/staging`. Test suite reached 83 passing tests (`npm test`).

### Day 6: Asynchronous QC Job Queue & Durable Human Review
- **Prisma Schema Extension:** Added `QCJob` and `QCJobReview` models.
- **Async Job Pipeline:** Built SQLite job queue state machine (`QUEUED` -> `PROCESSING` -> `COMPLETED` / `REVIEW_REQUIRED` / `FAILED`).
- **Worker Concurrency & Claim Tokens:** Implemented atomic job claiming using unique `claimToken` UUIDs and `claimedAt` timestamps in `src/lib/server/qc/job-bridge.ts`, preventing dual-worker collisions.
- **Background Scheduler:** Created `src/lib/server/qc/scheduler.ts` with polling ticks, stale job recovery, and graceful lifecycle hooks (`src/instrumentation.ts`).
- **Private Document Store:** Built tenant-isolated filesystem storage in `src/lib/server/storage/document-store.ts` with strict directory traversal protection (`StorageSecurityError`).
- **Durable Review System:** Built `src/app/api/v1/qc/jobs/[jobId]/review/route.ts` storing append-only versioned review decisions (`ACCEPTED`, `REJECTED`, `NEEDS_CLARIFICATION`) with reviewer attribution and idempotency.
- **Database Baseline Migration:** Created `prisma/migrations/0_init/migration.sql` and proved clean reproducibility on fresh SQLite instances.

### Day 7: Experimental Open-Weight Vision LLM Service
- **Isolated Python Backend:** Created `experiments/llm-qc-demo/` with Python 3.14 venv, FastAPI, PyMuPDF, and local Ollama client (`gemma3:4b`).
- **Service Security:** Enforced timing-safe internal secret authentication (`X-SpanQC-Internal-Secret` in `app/auth.py`).
- **Resource Protection:** Built asyncio semaphore concurrency limiter (`MAX_CONCURRENT_ANALYSIS = 2`, returning HTTP 503 `SERVICE_OVERLOADED`) and streaming bounded upload reader (`read_bounded_upload <= 50MB`).
- **Deterministic Rule Evaluator:** Built `experiments/llm-qc-demo/app/rule_evaluator.py`, evaluating IPC-620 §13.1, §13.2, UL 508A, point-to-point pin continuity, and page coverage guards.
- **Interactive UI:** Built `src/app/app/experiments/llm-qc/page.tsx` with netlist editor, progress polling, and human sign-off dialog.
- **Automated Testing:** Expanded test suites to 118 Python tests (`pytest`) and 290 TypeScript tests.

### Day 8: Empirical CPU Benchmark, LLM Removal Assessment & Safe Git Preservation
- **CPU Inference Reality Check:** Live benchmarking of Gemma 3 4B on standard CPU hardware revealed:
  - Text-only prompts: 5.2s–14.5s.
  - Multimodal vision inference on real schematics: **timed out after 180 seconds** or returned empty/malformed JSON schemas.
  - Model hallucinated bounding coordinates (`x1=None, y1=None`).
- **Architectural Discovery:** Document processor (`document_processor.py`) only renders pages to raster PNGs; it **does not perform vector or graphical net tracing**. The vision model was guessing connections from raw pixels.
- **Decision:** Remove LLM dependency for production and transition to pure deterministic Python rules, while **preserving the experimental LLM implementation on GitHub**.
- **Preservation & Push:** Staged all 59 tracked and untracked files, ran 408 automated tests with 100% pass rate, and pushed commit `1d2d973` to `origin/experiment/llm-qc-demo`.
- **Dedicated Development Branch:** Branched `feat/deterministic-qc-engine` for pure deterministic development.

### Day 9 (Phase DQ-1): Hari's Engineering Validation Standard & Benchmark Formalization
- **Domain Discovery:** Audited the authoritative 18-page training manual in `/data/projects/LMS/` (`SPandQC Wiring Diagram Validation – Intern LMS (1).pdf`), 33 Tech Pub SVG/JPG output sheets, and input diagrams for Hyundai VDH20 wheel loaders.
- **Rule Formalization:** Codified Hari's engineering standard v1.0 across 8 functional modules (Component codes with `DROP` disambiguation, Module CAC end-to-end tracing, 4-tier destination classification, KL power rails, cross-sheet pairing checks, and typography/pixel standards).
- **Gold-Standard Benchmark:** Established benchmark schema and formulated 14 human-verified ground-truth test cases directly from LMS answer keys.

---

## 4. System Architecture & Multi-Layer System Design

### 4.1 Global Architecture Diagram

```
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    CLIENT BROWSER LAYER                                          |
|                                                                                                  |
|   [Public / Marketing Pages]               [Main Workspace]            [Experimental Workspace] |
|   - Spaceship Cosmic Design                - /app/check               - /app/experiments/llm-qc |
|   - Design System Tokens                   - WebCrypto SHA-256        - Netlist JSON Editor     |
|   - 16 Custom UI Components                - Split Blueprint Viewer   - Real-time Polling       |
|   - Client-Side CSV Export                 - Human Review Modal       - Finding Explorer        |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼ HTTPS (HttpOnly Session Cookie / Bearer Token)
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                  EDGE PROXY & SECURITY LAYER                                     |
|                                                                                                  |
|   - src/proxy.ts: Next.js 16 Edge Route Guard                                                    |
|   - Database Session Validation: Immediate revocation check (blocks suspended/deleted users)      |
|   - CSRF Defense: src/lib/server/auth/csrf.ts (Origin, Referer, Sec-Fetch-Site validation)        |
|   - Header Sanitization: Forwards x-user-id / x-tenant-id downstream; strips outbound headers    |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼ Internal Request Context
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                  NEXT.JS API & CONTROLLER LAYER                                  |
|                                                                                                  |
|   [Auth & Identity]           [Projects & Tenancy]        [QC Job Engine]     [Human Review]     |
|   - /api/v1/auth/login        - /api/v1/projects          - /api/v1/qc/jobs   - /jobs/[id]/review|
|   - /api/v1/auth/logout       - /api/v1/organizations/me  - /jobs/[jobId]     - Versioned History|
|   - /api/v1/auth/me           - Strict Tenant Scoping     - Quota Reservation - Reviewer Identity|
|   - Salted scrypt Hashing     - Role Permission Checks    - Multipart Upload  - Safe Idempotency |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
                      │                                                   │
                      ▼                                                   ▼
+─────────────────────────────────────────────+   +────────────────────────────────────────────────+
|        SQLITE & PRISMA ORM LAYER            |   |           PRIVATE DOCUMENT STORAGE             |
|                                             |   |                                                |
|   - Database: prisma/dev.db (SQLite)        |   |   - src/lib/server/storage/document-store.ts   |
|   - Migration: 0_init/migration.sql         |   |   - Storage Root: uploads/qc-docs/<tenantId>/  |
|   - Models:                                 |   |   - Path Traversal Defense: StorageSecurityErr |
|     * Tenant (Multi-tenant org root)        |   |   - Hash Verification: SHA-256 digest check    |
|     * User (ADMIN, ENGINEER, REVIEWER)      |   |   - MIME & Magic Signature Validation          |
|     * Session (HMAC token hash, revoked)    |   +────────────────────────────────────────────────+
|     * Project (Wiring program container)    |
|     * QCJob (Asynchronous queue state)      |
|     * QCJobReview (Append-only review logs) |
+─────────────────────────────────────────────+
                      │
                      ▼ Asynchronous Queue Polling / Dispatch
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    JOB BRIDGE & SCHEDULER LAYER                                  |
|                                                                                                  |
|   - src/lib/server/qc/scheduler.ts: Background loop, stale job reclamation, startup recovery     |
|   - src/lib/server/qc/job-bridge.ts: processQCJob, atomic claim with claimToken, timeout guards  |
|   - src/lib/server/qc/validator.ts: Zod schema validation, coverage guard, precedence enforcement|
|   - Authenticates upstream requests with X-SpanQC-Internal-Secret                                |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼ HTTP POST http://127.0.0.1:8000/api/v1/analyze
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                     FASTAPI PYTHON ENGINE LAYER                                  |
|                                                                                                  |
|   - experiments/llm-qc-demo/app/main.py: FastAPI Service on port 8000                            |
|   - app/auth.py: Timing-safe service secret verification (verify_internal_service_secret)        |
|   - Concurrency Limiter: asyncio.Semaphore(2) -> HTTP 503 SERVICE_OVERLOADED on capacity max     |
|   - app/document_processor.py: Streaming bounded upload (<=50MB), Magic bytes, PyMuPDF render   |
|   - app/audit_logger.py: Structured audit logging for timing, file size, and outcome metrics     |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
                      │                                                   │
                      ▼                                                   ▼
+─────────────────────────────────────────────+   +────────────────────────────────────────────────+
|    ACTIVE DETERMINISTIC QC RULE ENGINE      |   |     PRESERVED EXPERIMENTAL LLM PIPELINE        |
|                                             |   |                                                |
|   - app/rule_evaluator.py (100% Deterministic)   - app/inference_client.py (Ollama Client)     |
|   - IPC/WHMA-A-620D §13.1 Wire ID Checks    |   |   - Model: gemma3:4b (Multimodal Chat Vision)  |
|   - IPC §13.2 / UL 508A Gauge & Color Check |   |   - Prompt: JSON Schema Extraction Template    |
|   - Point-to-Point Pin Continuity & Matching|   |   - Isolated on branch: experiment/llm-qc-demo |
|   - Completeness & Page Coverage Guards     |   |   - Preserved as research baseline             |
|   - Zero Model Dependencies; Fail-Closed    |   +────────────────────────────────────────────────+
+─────────────────────────────────────────────+
                      │
                      ▼ (Phase DQ-1 Evolutionary Enhancement)
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                      HARI'S ENGINEERING VALIDATION STANDARD V1.0 (VDH20)                         |
|                                                                                                  |
|   - Component Registry: HX Codes NEW CODE lookup with DROP disambiguation, fallback to HL        |
|   - Module CAC Tracing: Source -> Final Component + Pin (connectors recorded as transit path)    |
|   - Destination Classifier: GREEN (confirmed), YELLOW (unverified boundary), GREY (gap), BLUE   |
|   - Typography Standard: 8px (KL/Grid), 10px (Component), 7px (Connectors/Colors/Pins) at 150 DPI|
|   - Cross-Sheet Reciprocal Pairing: Verifies matching blue box partner references                |
|   - Honest Abstention: Gaps flag as REVIEW / INSUFFICIENT_EVIDENCE; zero fabricated findings    |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

### 4.2 Layer 1: Frontend & Design System
- **Framework:** Next.js 16.3.6 (App Router, Turbopack), React 19.2.8, TypeScript 5.7.0.
- **Design System:** Tailwind CSS v4.0 with customized CSS custom properties in `src/app/globals.css`.
- **Aesthetic Direction:** Cosmic obsidian aesthetic inspired by Spaceship.com:
  - Background: `#06070a`, Card: `#0c101a`, Border: `#1b253b`.
  - Neon accents: Electric Cyan (`#00f0ff`), Cobalt (`#0066ff`).
  - Monospace font alignment for pin numbers, AWG gauges, and SHA-256 hashes.
- **Reusable Component Suite (16 Custom Components in `src/components/ui/`):**
  - `Button`, `Card`, `Badge`, `Input`, `SearchInput`, `Tabs`, `Accordion`, `Table`, `Modal`, `Select`, `Progress`, `Toast`, `EmptyState`, `MetricCard`, `CursorSpotlight`, `Navigation`.
- **Interactive Report Viewer:** Split-screen layout in `src/app/app/reports/[reportId]/page.tsx` featuring pan/zoom (50% to 200%), coordinate overlay highlights, fact vs. requirement cards, and human sign-off toggles.

---

### 4.3 Layer 2: Edge Proxy & Security Layer
- **Location:** `src/proxy.ts` (Next.js 16 Edge proxy convention).
- **Asynchronous Session Validation:** Every incoming web request to `/app/*` and API request to `/api/v1/*` (except public login/register) validates session tokens against the database (`validateDBSession`). If a session has been revoked or the user is suspended, access is immediately blocked.
- **CSRF Defense (`src/lib/server/auth/csrf.ts`):** Enforces strict Origin and Referer validation on all cookie-authenticated mutating requests (POST, PUT, PATCH, DELETE). Blocks cross-origin attacks (`HTTP 403 Forbidden`) and handles `Sec-Fetch-Site: cross-site`.
- **Header Sanitization:** Identity headers (`x-user-id`, `x-tenant-id`, `x-user-role`, `x-user-email`) are forwarded downstream to server components only. The proxy explicitly guarantees that these internal headers are **never leaked** in outbound client responses.

---

### 4.4 Layer 3: Application & API Layer
- **Authentication Handlers:**
  - `POST /api/v1/auth/login`: Verifies email and salted scrypt password hash; issues signed HttpOnly cookie.
  - `POST /api/v1/auth/register`: Onboards new organizations and provisions initial admin accounts.
  - `POST /api/v1/auth/logout`: Revokes database session record and clears cookie.
  - `GET /api/v1/auth/me`: Returns authenticated user identity; returns HTTP 401 for unauthenticated calls (never defaults to admin).
- **Multi-Tenant Scoping:** All database queries in `src/app/api/v1/projects/` and `src/app/api/v1/organizations/` scope records by `session.tenantId`. Attempts to access other tenant records return `HTTP 404 Not Found` (IDOR defense).
- **Role-Based Access Control (`src/lib/server/auth/rbac.ts`):**
  - `ADMIN`: Full authority across projects, settings, billing, and QC jobs.
  - `ENGINEER`: Full project creation, upload, and job processing authority.
  - `REVIEWER`: Read-only access to drawings, authorized for quality review arbitration.

---

### 4.5 Layer 4: Multi-Tenant Database & Persistence Layer
- **Engine:** SQLite (`prisma/dev.db`, `prisma/test.db`) via Prisma 6.19.3 ORM.
- **Migration Baseline:** Managed via `prisma/migrations/0_init/migration.sql` with lockfile `migration_lock.toml`.
- **Data Models:**
  1. `Tenant`: Root multi-tenant entity (`id`, `name`, `slug`, `checkQuota`, `quotaUsed`, `plan`).
  2. `User`: User accounts with `role` (`ADMIN`, `ENGINEER`, `REVIEWER`), `passwordHash`, and `tenantId`.
  3. `Session`: Active server sessions with HMAC signature hash, `expiresAt`, and `revoked` flag.
  4. `Project`: Wiring program container scoped under a specific tenant.
  5. `QCJob`: Asynchronous job record tracking lifecycle status, idempotency keys, document SHA-256, storage keys, result reports, and claim tokens.
  6. `QCJobReview`: Versioned human sign-off history linked to `QCJob`, tracking decisions, notes, and reviewer attribution.

---

### 4.6 Layer 5: Asynchronous QC Job Queue & Scheduler
- **Job State Machine:**
  `QUEUED` ──► `PROCESSING` ──► `COMPLETED` / `REVIEW_REQUIRED` / `FAILED`
- **Atomic Job Claiming:** To prevent race conditions between concurrent worker threads, `claimJob` executes an atomic database update:
  ```sql
  UPDATE qc_jobs 
  SET status = 'PROCESSING', claimToken = :token, claimedAt = CURRENT_TIMESTAMP 
  WHERE id = :jobId AND status = 'QUEUED';
  ```
- **Stale Worker Recovery:** `src/lib/server/qc/scheduler.ts` periodically scans for jobs stuck in `PROCESSING` longer than `STALE_JOB_THRESHOLD_MS` (e.g. following worker crash or timeout), resets their claim tokens, and returns them to `QUEUED`.
- **Precedence Guard:** If any rule finding has outcome `FAIL`, the overall outcome is locked to `FAIL`, preventing higher-level reviews from accidentally masking defects.

---

### 4.7 Layer 6: Private Document Storage
- **Implementation:** `src/lib/server/storage/document-store.ts`.
- **Directory Scoping:** Documents are written to `uploads/qc-docs/<tenantId>/<storageKey>`.
- **Path Traversal Defense:** `resolveSafeTenantPath` resolves canonical absolute paths and ensures they remain within the tenant's assigned subdirectory. Malicious filenames containing `../` or symlink escapes raise `StorageSecurityError`.
- **Cryptographic Fingerprinting:** Verifies SHA-256 digest upon storage and retrieval.

---

### 4.8 Layer 7: Python FastAPI Service & Concurrency Limiter
- **Entry Point:** `experiments/llm-qc-demo/app/main.py` running on port 8000.
- **Service Authentication:** Protected by `X-SpanQC-Internal-Secret`. Uses `hmac.compare_digest` in `app/auth.py` to prevent timing attacks.
- **Bounded Concurrency Limiter:** An `asyncio.Semaphore(2)` guards expensive processing. If two requests are already active, incoming requests immediately receive `HTTP 503 SERVICE_OVERLOADED` rather than waiting indefinitely. Every permit acquisition is guaranteed released via `try...finally`.
- **Streaming Upload Reader (`read_bounded_upload`):** Reads file chunks asynchronously up to `MAX_FILE_SIZE_BYTES` (50MB). If a file exceeds the limit, streaming aborts immediately without buffering excess bytes into RAM.
- **Document Processor (`document_processor.py`):** Inspects magic byte signatures (`%PDF-`, `PNG`, `ÿØÿ`), computes authoritative SHA-256, and renders PDF pages using PyMuPDF.

---

### 4.9 Layer 8: Active Deterministic QC Rule Engine
- **Engine:** `experiments/llm-qc-demo/app/rule_evaluator.py` (`DeterministicRuleEvaluator`).
- **Core Principle:** An LLM or client assertion **never** authorizes a `PASS` outcome. A `PASS` outcome requires complete, certified specifications, zero defects, and full page coverage.
- **18 Active Deterministic Rules:**
  - `RULE-INGESTION-00`: Empty candidate data fails closed to `REVIEW`.
  - `RULE-WIRE-ID-01`: Detects missing wire numbers per IPC/WHMA-A-620D §13.1 (`FAIL`).
  - `RULE-WIRE-ATTR-02`: Detects missing gauge or insulation color per IPC §13.2 and UL 508A §29.1 (`FAIL`).
  - `RULE-SPEC-00` / `01` / `02`: Missing, empty, or uncertified expected netlists force `REVIEW`.
  - `RULE-SPEC-03`: Detects duplicate/conflicting wire definitions in netlists (`FAIL`).
  - `RULE-NETLIST-03`: Wire omission (wire in netlist but missing on drawing) (`FAIL`).
  - `RULE-NETLIST-04` / `05`: Source/Destination terminal mismatches (`FAIL`).
  - `RULE-NETLIST-06` / `07`: Wire gauge or color mismatches against netlist (`FAIL`).
  - `RULE-NETLIST-09`: Unlisted wires observed on drawing not present in netlist (`REVIEW`).
  - `RULE-EXTRACT-00`: Rejects model self-attestation or unauthenticated verifiers (`REVIEW`).
  - `RULE-AMBIGUITY-08`: Visual ambiguity or confidence < 70% forces human review (`REVIEW`).
  - `RULE-PAGE-COVERAGE-01` / `02`: Partial page processing or failed pages block `PASS` (`REVIEW`).
  - `RULE-PASS-00`: Conformance summary finding emitted only when all checks pass cleanly.

---

### 4.10 Layer 9: Preserved Experimental LLM Integration
- **Preserved Location:** Dedicated GitHub branch `experiment/llm-qc-demo` (Commit `1d2d973`).
- **Implementation:** `app/inference_client.py` sending multimodal JSON schema chat prompts to local Ollama runtime (`http://127.0.0.1:11434/api/chat`) running `gemma3:4b`.
- **Observed Characteristics:**
  - Quantized 4B vision model weights: ~3.5 GB disk footprint.
  - Good for single-wire synthetic text tests.
  - **Bottleneck for Complex CAD:** Excessive CPU execution times (>180s) on full-page diagrams, with coordinate nulls and schema parsing failures.
  - Safely preserved as an isolated research benchmark, decoupled from the deterministic production path.

---

### 4.11 Layer 10: Hari's Engineering Standard v1.0 (VDH20 / Hyundai)
Derived from the 18-page training specification (`SPandQC Wiring Diagram Validation – Intern LMS (1).pdf`), this layer codifies real-world heavy equipment engineering rules:
1. **Component-Code Authority (COMP):**
   - Authoritative lookup in Hyundai `HX Codes` (`NEW CODE` column).
   - Use `DROP` column to disambiguate codes with multiple meanings.
   - Fallback to `HL Codes` series. If unlisted, report `UNREGISTERED_COMPONENT` (`REVIEW`).
   - Prefix guesses (e.g. "CM means motor") are strictly rejected.
2. **Module CAC Traceability (TRACE):**
   - Source and destination must be verified directly against the **final destination component code and pin**.
   - Intermediate connectors (`CN-5A pin 32`, `CN-11 pin 3`) are recorded as path transit nodes, never as destinations.
3. **4-Tier Destination Classification (DEST):**
   - `GREEN`: Final destination confirmed within scope.
   - `YELLOW`: Named component exists, but cross-sheet boundary was not re-verified.
   - `GREY`: Genuinely unresolved or unreferenced.
   - `BLUE`: Rail continuity note (e.g. fuse feed arrow pointing to next sheet).
4. **Power Rails & KL Lines (RAIL):**
   - `KL30`: Battery positive (always live) -> Red rail.
   - `KL15`: Ignition-switched supply -> Thin red rail.
   - `KL31`: Ground reference -> Brown / Green rail.
   - Dual-battery requirement for `CCN45` (`B+`, `M`, `G`).
5. **Cross-Sheet Pairing Checks (XSHEET):**
   - Reciprocal blue box references: Sheet `1 FB1-3` reference `1 FB1-4 | 0A` must have matching partner `1 FB1-3 | 4A` on Sheet `1 FB1-4`. Missing partners trigger findings.
6. **Typography & Layout Standards (GEOM):**
   - Render contract at 150 DPI: KL labels (8px), Grid labels (8px), Component code (10px), Plug/socket (7px), Connectors (7px), Color code (7px), Pin numbers (7px).
   - Options category: Unconfirmed, marked as `NOT_EVALUABLE`.
7. **Grid Notation Cases:**
   - Case A: `<Sheet> | <Col><Row>` (e.g. `1 FB1-4 | 0A`).
   - Case B: `<FileNumber> | 00` (e.g. `10 | 00`).
   - Preserves Sheet 5 grid contradiction as an unresolved issue rather than hardcoding a false fix.

---

### 4.12 Layer 11: Durable Human Review & Audit Trail
- **Implementation:** `src/app/api/v1/qc/jobs/[jobId]/review/route.ts`.
- **Auditable Versioning:** Each review submission creates an immutable row in `qc_job_reviews` (`version = 1, 2, 3...`).
- **Reviewer Attribution:** Persists reviewer name, email, and user ID directly from authenticated session context.
- **Safe Retries:** Utilizes `Idempotency-Key` header; racing submissions return the existing review without duplicate version increments or database errors.
- **Immutable Machine Outcomes:** Human review decisions (`ACCEPTED`, `REJECTED`, `NEEDS_CLARIFICATION`) are stored separately from the automated engine outcome (`PASS`, `FAIL`, `REVIEW`). A human reviewer can sign off on an engineering concession, but the underlying machine finding remains an immutable historical record.

---

## 5. How The Application Works Right Now (End-to-End Walkthrough)

SpanQC currently provides two operational validation paths:

```
+───────────────────────────────────────────────────────────────────────────────────────────────+
|                      PATH A: PRODUCTION CLIENT-SIDE WORKFLOW (/app/check)                     |
|                                                                                               |
|  1. Ingestion: User drops schematic file into /app/check.                                     |
|  2. Hashing: Browser WebCrypto calculates authoritative SHA-256 hash.                         |
|  3. Preview: Browser generates Object URL for instantaneous blueprint preview.                |
|  4. Analysis: Evaluates selected standard (IPC/WHMA-A-620D or UL 508A).                       |
|  5. Viewer: Split-screen CAD viewer displays findings, coordinates, and standard references.  |
|  6. Decision: Inspector records Concession / Defect decision in localStorage store.           |
|  7. Export: Generates RFC 4180 CSV spreadsheet or opens formatted printable PDF dialog.       |
+───────────────────────────────────────────────────────────────────────────────────────────────+

+───────────────────────────────────────────────────────────────────────────────────────────────+
|                  PATH B: ASYNCHRONOUS SERVER-SIDE QC ENGINE (/app/experiments/llm-qc)         |
|                                                                                               |
|  1. Upload: User submits PDF/image + optional Expected Netlist JSON via multipart POST.      |
|  2. Authentication & Quota: Server verifies session, RBAC role, and reserves tenant quota.    |
|  3. Private Storage: Document stored under uploads/qc-docs/<tenantId>/ with traversal checks. |
|  4. Queueing: SQLite inserts QCJob with status 'QUEUED'. Background scheduler claims job.     |
|  5. Engine Dispatch: Job bridge sends authenticated request to Python service with secret.    |
|  6. Concurrency Check: FastAPI semaphore checks capacity; streams upload up to 50MB.          |
|  7. Document Processing: PyMuPDF validates magic bytes, computes SHA-256, renders pages.      |
|  8. Deterministic Rules: Evaluates missing IDs, attributes, terminal mismatches, & coverage.  |
|  9. Database Persistence: Zod validates QCReport; SQLite updates QCJob to COMPLETED/REVIEW.  |
|  10. Human Arbitration: Inspector reviews findings in UI, submits signed QCJobReview record. |
+───────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 6. Comprehensive Quality Assurance & Automated Test Inventory

Every layer of SpanQC is backed by automated tests. A total of **408 automated tests** run across the repository with a **100% pass rate**:

| Test Suite | Environment | Total Tests | Status | Scope & Guarantees Verified |
| :--- | :--- | :---: | :---: | :--- |
| **Python QC Service & Rules** | `pytest` (Py3.14) | 118 | **PASSED** | Deterministic rule engine, IPC/WHMA-A-620D, UL 508A, magic bytes, SHA-256, bounded uploads, concurrency semaphore, timing-safe auth. |
| **TypeScript Compiler** | `tsc --noEmit` | — | **0 ERRORS** | Strict static typecheck across all Next.js routes, components, and server utilities. |
| **Auth & Security** | `npm test` (tsx) | 83 | **PASSED** | Password hashing (scrypt), sessions, cookie flags, Edge proxy guards, CSRF defense, RBAC, tenant isolation. |
| **QC Job Bridge & Queue** | `npx tsx` | 79 | **PASSED** | Atomic job claiming (`claimToken`), concurrency races, timeout handling, quota reservations, idempotency. |
| **Durable Human Review** | `npx tsx` | 75 | **PASSED** | Review versioning (`v1, v2`), reviewer attribution, immutable machine outcomes, idempotency races, IDOR protection. |
| **Background Scheduler** | `npx tsx` | 20 | **PASSED** | Polling loops, stale job reclamation, server restart recovery, non-overlapping tick guards. |
| **UI Integration Contract** | `npx tsx` | 33 | **PASSED** | Multipart upload contract, status polling, terminal state presentation, safety boundaries. |
| **TOTAL AUTOMATED TESTS** | — | **408** | **100% PASS** | Zero regressions across entire platform. |

---

## 7. Source-Data Inventory & Available vs. Missing Ground Truth

In Phase DQ-1, a comprehensive scan was conducted to distinguish available domain assets from missing customer inputs:

### Available Source Materials (in `/data/projects/LMS/`):
1. **Domain & Validation Manual:** `SPandQC Wiring Diagram Validation – Intern LMS (1).pdf` (18-page complete reference guide).
2. **OEM Input Wiring Diagram:** `INPUT.pdf` (2.9 MB commercial vehicle PDF diagram).
3. **Symbol Library Vector Sheet:** `SYMBOLS LIBRARY.svg` (19.8 MB SVG containing component symbols).
4. **Tech Pub Output Graphical Sheets:** 33 vector SVG sheets (`1 FB1-1.svg` to `1 FB1-6.svg`, `2-1.svg` to `12-6.svg`) and 33 matching high-resolution JPG sheets.
5. **Historical Inspection Report:** `SpanQC Inspection Report — INPUT.pdf` (Score 69/100, D-001, D-002, D-003).

### Missing Authoritative Inputs (Formally Cataloged):
- **Raw `HX Codes` Excel Workbook:** Documented in LMS §13.5 as pending workstation transfer.
- **Raw 479-Row Consolidated Ground-Truth Spreadsheet:** Summary stats exist (160 green, 34 yellow, 3 grey), but the raw workbook is missing. In accordance with project instructions, **zero rows are fabricated**.
- **Official Symbol Library PDF:** Only the SVG vector file exists; no PDF benchmark specification.
- **8-Point QA Checklist Text:** Listed as an open item in LMS §13.1.
- **Options Category Font Size:** Unconfirmed in LMS §4.5 ("Unconfirmed – do not assert a value").

### Available Verified Benchmark Cases (14 Gold Cases):
From LMS Sections 6, 10, and 12 answer keys, 14 human-verified ground-truth cases have been extracted:
- `TC-FB1-3-F18`: F18 (20A) -> `143 RD/WH 2.0` -> `CCR4` pins 30/86 (`GREEN`, `PASS`)
- `TC-FB1-3-F19`: F19 (20A) -> `170 RD 2.0` -> `CCR9` pins 30/86 (`GREEN`, `PASS`)
- `TC-FB1-3-F20`: F20 (10A) -> `14 RD/YE 1.0` -> `CCN22:2`, `CDO5:2`, `CCN141:6` via `CN-5` and `CN-17` (`GREEN`, `PASS`)
- `TC-FB1-3-F21`: F21 (15A) -> `144 BN 2.0` -> `CCR13` pins 30/86 (`GREEN`, `PASS`)
- `TC-FB1-3-F23`: F23 (20A) -> `138 YE 1.0` -> `CCR36` pin 3 (`GREEN`, `PASS`)
- `TC-FB1-3-F24`: F24 (10A) -> `141 VT 1.0` -> `CCR2` pins 3/2 (`GREEN`, `PASS`)
- `TC-FB1-3-F25`: F25 (5A) -> `148A BU 2.0` -> `CMR:3` via `CN-5A/32` & `CN-11/3` (`GREEN`, `PASS`)
- `TC-FB1-3-F25-RAIL`: F25 -> Arrow to `1 FB1-4 | 0A` -> `CFB1(F26)` (`BLUE`, `PASS`)
- `TC-FB1-1-F4`: F4 (20A) -> `88 RD/YE 1.5` -> `CMCU:CN-51(1)` at `2-5 | 0D` (`YELLOW`, `REVIEW`)
- `TC-FB1-6-F31`: F31 (15A) -> `173 OG 1.0` -> `CCN236:2`, `CCN149:2`, `CCN237:2` (`GREEN`, `PASS`)
- `TC-FB1-6-F34`: F34 (10A) -> `184 RD/WH 1.0` -> `CAAVM:CN-401(11,12)` (`GREEN`, `PASS`)
- `TC-FB1-6-F35` / `F36`: Unused fuse stubs with no outgoing wire (`GREY`, `REVIEW`)
- `TC-XMOD-BLOWER`: FB1 to AC50 cross-module link via `CN-11/CK45` (`GREEN`, `PASS`)

---

## 8. Roadmap & Immediate Next Phases

```
+──────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    PHASE DQ-1 ROADMAP                                            |
|                                                                                                  |
|   [Increment 1: Domain Models & Normalization]                                                   |
|   - DestinationClass (GREEN, YELLOW, GREY, BLUE)                                                 |
|   - Normalization utilities (Parenthetical suffix stripping: CAC:AC-1(4) -> AC-1 pin 4)          |
|                                                                                                  |
|   [Increment 2: Component Code Registry Engine]                                                  |
|   - HX Series lookup with DROP column disambiguation, HL Series fallback                         |
|   - Rejection of prefix guessing (CM does not imply motor)                                       |
|                                                                                                  |
|   [Increment 3: Module CAC Multi-Hop Trace Evaluator]                                            |
|   - Trace evaluation through intermediate connectors (CN-5A, CN-11) to final component + pin     |
|   - Reciprocal cross-sheet partner checking                                                      |
|                                                                                                  |
|   [Increment 4: Typography & Layout Validator]                                                   |
|   - 150 DPI render contract check (8px KL/Grid, 10px Component, 7px Connectors/Pins)             |
|   - Options category flagged as NOT_EVALUABLE                                                    |
|                                                                                                  |
|   [Increment 5: Automated Gold Benchmark Test Suite]                                             |
|   - Benchmark runner executing all 14 verified gold cases with zero false-pass tolerance        |
+──────────────────────────────────────────────────────────────────────────────────────────────────+
```

---
*SpanQC Architecture & History Reference Manual • Spandsons Horizon Engineering Pvt. Ltd. • All Rights Reserved.*

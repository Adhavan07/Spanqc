# SpanQC — Open-Weight LLM Wiring QC Proof of Concept

## Overview & Architecture

This experiment implements an isolated, reproducible quality-control (QC) pipeline for aerospace and industrial electrical wiring diagrams using an open-weight vision-language model (`Gemma 3 4B Vision` via local Ollama runtime) coupled with a deterministic rule evaluation layer.

Unlike the main application's current simulated QC flows (which use client-side timers, filename heuristics, and synthetic findings in `localStorage`), this proof-of-concept performs **real document processing, cryptographic integrity verification, genuine vision model inference, and strict rule enforcement**.

### System Architecture

```
                  ┌───────────────────────────────────────────────┐
                  │          Uploaded Schematic Document          │
                  │             (PDF, PNG, JPEG <= 25MB)          │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │           Document Ingestion Layer            │
                  │  - Magic-byte validation (not extension-only) │
                  │  - Real SHA-256 integrity calculation         │
                  │  - PyMuPDF high-DPI page rasterization        │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │      Local Vision Model Runtime (Ollama)      │
                  │   Gemma 3 4B Vision (Quantized, Low-Temp)     │
                  │  - Bounded page processing (no hallucinations)│
                  │  - Schema validation & type/bounds rejection  │
                  │  - Returns Candidate Observations ONLY        │
                  │    * Wire IDs, gauge, color                   │
                  │    * Source & destination terminals           │
                  │    * Normalized bbox evidence coordinates     │
                  │    * Ambiguity & human review flags           │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │          Deterministic Rule Evaluator         │
                  │  - RULE-SPEC-00: Expected Netlist Missing     │
                  │  - RULE-SPEC-01: Expected Netlist Empty       │
                  │  - RULE-WIRE-ID-01: Missing Wire ID           │
                  │  - RULE-WIRE-ATTR-02: Missing Gauge/Color     │
                  │  - RULE-NETLIST-03: Netlist Wire Omission     │
                  │  - RULE-NETLIST-04: Source Terminal Mismatch  │
                  │  - RULE-NETLIST-05: Dest Terminal Mismatch    │
                  │  - RULE-NETLIST-06: Conductor Gauge Mismatch  │
                  │  - RULE-NETLIST-07: Conductor Color Mismatch  │
                  │  - RULE-AMBIGUITY-08: Visual Ambiguity Flag   │
                  │  - RULE-PASS-00: Verified Conformance (PASS)  │
                  │                                               │
                  │  Outcome: PASS | FAIL | REVIEW                │
                  │  * PASS requires valid, non-empty netlist     │
                  │  * Missing or empty netlist produces REVIEW   │
                  │  * Confirmed violations always produce FAIL   │
                  │  * Model output ALONE NEVER authorizes PASS   │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │             Standardized QC Report            │
                  │  - Document hash & model metadata             │
                  │  - Rule findings with cited standards         │
                  │  - Highlighted evidence coordinates           │
                  │  - Prominent Experimental PoC Disclaimer      │
                  └───────────────────────────────────────────────┘
```

---

## Comparison: Existing Simulated Flow vs. Experimental Engine

| Dimension | Existing Main Workflow (`/app/check`) | Experimental Service (`experiments/llm-qc-demo`) |
| :--- | :--- | :--- |
| **Document Processing** | Client-side metadata reading; no backend parsing | PyMuPDF server-side rendering, magic-byte inspection, SHA-256 checksum |
| **Inference Runtime** | Fake progress timer (`setInterval`) across 6 steps | Real multimodal vision model (`gemma3:4b` via Ollama `/api/chat`) |
| **Model Failure Handling** | Fallback to hardcoded sample findings (`D-101`, `D-102`) | Strict failure propagation (`503 OLLAMA_UNREACHABLE`, `404 MODEL_NOT_FOUND`). **Never returns canned data** |
| **Data Extraction** | Hardcoded mock records in `report-store.ts` | Pydantic-validated candidate observations with coordinates `[ymin, xmin, ymax, xmax]` |
| **Quality Evaluation** | Fixed sample outcome from template fixture | Deterministic rule engine evaluating against IPC/WHMA-A-620D standards |
| **Pass Authority** | Preset string in mock database | **Model output alone can never authorize PASS**. Deterministic checks required. |
| **Persistence** | Browser `localStorage` | Pure stateless API returning signed experimental JSON audit report |

---

## Prerequisites & Hardware Requirements

### Hardware Requirements
- **CPU:** 4+ cores (x86_64 or ARM64)
- **RAM:** Minimum 8 GB (16 GB recommended)
- **GPU (Optional):** NVIDIA GPU with 4GB+ VRAM accelerates inference (~1-3s per page). CPU inference operates at ~8-15s per page on Gemma 3 4B quantized.
- **Disk Space:** ~3.5 GB for Ollama runtime and quantized model weights (`gemma3:4b`).

### Software Prerequisites
- **OS:** Fedora Linux 40+, Ubuntu 22.04+, or RHEL/CentOS 9+
- **Python:** 3.10+ (Tested on Python 3.14)
- **Ollama:** Version 0.3.0+

---

## Setup & Run Instructions (Fedora / Linux)

### 1. Install & Launch Ollama
```bash
# Install Ollama on Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start the Ollama daemon (in background or separate terminal)
ollama serve

# In another terminal, pull the quantized Gemma 3 4B vision model
ollama pull gemma3:4b
```

Verify Ollama is listening:
```bash
curl http://localhost:11434/api/tags
# Expected: JSON response listing "gemma3:4b"
```

### 2. Configure Python Virtual Environment
From the repository root (`/data/projects/spanqc`):
```bash
cd experiments/llm-qc-demo

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install experiment dependencies
pip install -r requirements.txt
```

### 3. Run Automated Tests
```bash
# Run complete test suite (76 tests)
PYTHONPATH=. pytest tests/ -v
```

### 4. Start the Isolated Service
```bash
# Start FastAPI service on port 8000
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Documentation & UI:
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Standalone Experimental UI:** `http://localhost:8000/ui/`
- **Next.js Integrated PoC Route:** `http://localhost:3000/app/experiments/llm-qc`

---

## API Contract & Endpoints

### `GET /health`
Returns service status, model configuration, and Ollama daemon connectivity.

### `POST /api/v1/extract`
Accepts a document upload (`file`), calculates SHA-256, rasterizes pages, calls Ollama vision inference, and validates output against `CandidateObservation` schema.

### `POST /api/v1/evaluate`
Consumes `EvaluateRequest` JSON (`observations`, `expected_netlist`, `specification_is_complete`, `extraction_is_verified`, `standard`) to execute deterministic rules without calling the model.

### `POST /api/v1/analyze`
Complete end-to-end endpoint: ingestion ➔ rasterization ➔ vision inference ➔ deterministic rule evaluation ➔ standardized `QCReport`. Accepts multipart form data with optional `expected_netlist_json`, `specification_is_complete` (boolean), `extraction_is_verified` (boolean), and `scope_description`.

---

## Dual Verification Contract & Rule Evaluator

### Precedence Hierarchy: `FAIL > REVIEW > PASS`

To prevent partial-specification or unverified `PASS` outcomes, the rule evaluator enforces two distinct, non-overlapping verification contracts:

1. **Specification Completeness Contract (`specification_is_complete: bool`):**
   - The caller certifies whether the supplied expected netlist covers 100% of the declared drawing scope.
   - Missing or uncertified specifications fail closed to `REVIEW` (`RULE-SPEC-00`, `RULE-SPEC-01`, or `RULE-SPEC-02`).
   - Duplicate wire identifiers in the specification trigger deterministic `FAIL` (`RULE-SPEC-03`).

2. **Extraction Coverage Verification Contract & Trust Boundary:**
   - A vision-language model **cannot prove its own negative**; it cannot guarantee that no drawn conductors were silently missed during inference.
   - High confidence, successful responses, or absence of unlisted candidate observations do **not** constitute proof of complete extraction.
   - **Caller-Supplied Booleans Are Untrusted:** A caller-supplied boolean (`extraction_is_verified: true`) in JSON or multipart form data is untrusted client metadata and **cannot authorize a document-level PASS**.
   - **Trusted Verification Evidence Required:** Satisfying extraction completeness requires an authoritative `TrustedExtractionVerification` record bound to:
     * Non-empty authenticated reviewer identity (`verifier_id`).
     * Approved independent method (`INDEPENDENT_HUMAN_INSPECTION` or `DETERMINISTIC_CAD_VECTOR_RECONCILIATION`). Model self-attestation (`MODEL_SELF_ATTESTATION`) is explicitly inadmissible and rejected.
     * Document SHA-256 digest matching the evaluated document.
     * Verified drawing scope matching the declared specification scope.
   - **Fail-Closed API Default:** Because this isolated experiment does not incorporate an authenticated reviewer workflow or PKI digital signature authority, all external HTTP requests to `/api/v1/evaluate` and `/api/v1/analyze` fail closed to `REVIEW` (`RULE-EXTRACT-00`) for complete specifications. Automated PASS is blocked across public API endpoints by default.

3. **Candidate Reconciliation & Discrepancy Defense:**
   - When a specification is certified complete, any extracted candidate wire not listed in the specification is flagged as an unlisted discrepancy (`RULE-NETLIST-09`), triggering `REVIEW`.

4. **Defect Precedence Over Review:**
   - Any confirmed deterministic defect (omissions `RULE-NETLIST-03`, terminal mismatches `RULE-NETLIST-04/05`, gauge/color mismatches `RULE-NETLIST-06/07`, missing wire IDs `RULE-WIRE-ID-01`, missing attributes `RULE-WIRE-ATTR-02`, or duplicate specifications `RULE-SPEC-03`) produces `FAIL`, overriding `REVIEW`.

5. **Strict PASS Definition:**
   - A document-level `PASS` is permitted **only** when BOTH contracts are satisfied:
     1. Specification is certified complete (`specification_is_complete: true`).
     2. Visual extraction coverage is verified by genuine trusted evidence (`TrustedExtractionVerification`).
     3. All required connections and conductor attributes match candidate observations.
     4. Zero unlisted extra wires exist.
     5. Zero visual ambiguities remain.

### Rule Identifiers

- `RULE-SPEC-00`: Authoritative Expected Netlist Missing (`REVIEW`, Severity: WARNING)
- `RULE-SPEC-01`: Authoritative Expected Netlist Empty (`REVIEW`, Severity: WARNING)
- `RULE-SPEC-02`: Specification Completeness Uncertified (`REVIEW`, Severity: WARNING)
- `RULE-SPEC-03`: Duplicate / Conflicting Expected Wire Specification (`FAIL`, Severity: CRITICAL)
- `RULE-EXTRACT-00`: Drawing Extraction Coverage Unverified / Untrusted Caller Assertion (`REVIEW`, Severity: WARNING)
- `RULE-WIRE-ID-01`: Missing Wire Callout Identifier (`FAIL`, Severity: CRITICAL)
- `RULE-WIRE-ATTR-02`: Missing Conductor Gauge or Insulation Color (`FAIL`, Severity: CRITICAL)
- `RULE-NETLIST-03`: Expected Wire Omission Detected (`FAIL`, Severity: CRITICAL)
- `RULE-NETLIST-04`: Source Terminal Mismatch (`FAIL`, Severity: CRITICAL)
- `RULE-NETLIST-05`: Destination Terminal Mismatch (`FAIL`, Severity: CRITICAL)
- `RULE-NETLIST-06`: Conductor Gauge Mismatch (`FAIL`, Severity: CRITICAL)
- `RULE-NETLIST-07`: Conductor Color Mismatch (`FAIL`, Severity: CRITICAL)
- `RULE-AMBIGUITY-08`: Visual Ambiguity / Low Extraction Confidence (`REVIEW`, Severity: WARNING)
- `RULE-NETLIST-09`: Unlisted Candidate Wire Detected (`REVIEW`, Severity: WARNING)
- `RULE-PAGE-COVERAGE-01`: Document Page Limit Exceeded (`REVIEW`, Severity: WARNING)
- `RULE-PAGE-COVERAGE-02`: Page Candidate Extraction Failure (`REVIEW`, Severity: WARNING)
- `RULE-PASS-00`: Verified Complete Netlist Conformance (`PASS`, Severity: INFO)

---

## Multi-Page Extraction & Coverage Enforcement

The pipeline evaluates all rendered pages up to the configured `MAX_PAGES_TO_PROCESS` (default: 10 pages):
1. **Per-Page Observation Attribution:** Candidate observations preserve the exact 1-based `page_number` where the text or conductor callout appeared.
2. **Global Observation ID Uniqueness:** Observation IDs are namespaced per page (e.g. `P2-OBS-1`) to prevent ID collisions across sheets.
3. **Coverage Accounting:** Reports expose `total_page_count`, `processed_page_count`, `failed_page_count`, and `unprocessed_page_numbers`.
4. **Unprocessed Page Defense (`RULE-PAGE-COVERAGE-01`):** If a document contains pages exceeding the processing limit, scope-level `PASS` is strictly blocked and fails closed to `REVIEW`.
5. **Partial Failure Defense (`RULE-PAGE-COVERAGE-02`):** If model inference fails on any page (e.g. timeout or malformed output), the failure is recorded and blocks scope-level `PASS`.
6. **Defect Precedence:** Confirmed deterministic defects on processed pages override coverage warnings, guaranteeing `FAIL > REVIEW > PASS`.

---

## Synthetic Benchmark Runner

The benchmark suite (`benchmark/benchmark_runner.py`) provides repeatable evaluation across 12 standard scenarios (BM-01 to BM-12):

```bash
# Mode A: Fast, deterministic rule engine benchmark (sub-second, CI-safe)
PYTHONPATH=experiments/llm-qc-demo ./experiments/llm-qc-demo/.venv/bin/python experiments/llm-qc-demo/benchmark/benchmark_runner.py --mode deterministic

# Mode B: Live vision model inference benchmark (opt-in, requires local Ollama)
PYTHONPATH=experiments/llm-qc-demo ./experiments/llm-qc-demo/.venv/bin/python experiments/llm-qc-demo/benchmark/benchmark_runner.py --mode live
```

| Case ID | Scenario Name | Expected Outcome |
| :--- | :--- | :--- |
| **BM-01** | Single Wire Conforming (Baseline) | `PASS` |
| **BM-02** | Multi-Wire Diagram Conforming | `PASS` |
| **BM-03** | Destination Terminal Mismatch | `FAIL` (`RULE-NETLIST-05`) |
| **BM-04** | Conductor Gauge Mismatch | `FAIL` (`RULE-NETLIST-06`) |
| **BM-05** | Insulation Color Mismatch | `FAIL` (`RULE-NETLIST-07`) |
| **BM-06** | Required Wire Omission | `FAIL` (`RULE-NETLIST-03`) |
| **BM-07** | Extra Unlisted Candidate Wire | `REVIEW` (`RULE-NETLIST-09`) |
| **BM-08** | Duplicate Expected Wire in Netlist | `FAIL` (`RULE-SPEC-03`) |
| **BM-09** | Authoritative Netlist Missing | `REVIEW` (`RULE-SPEC-00`) |
| **BM-10** | Uncertified Partial Netlist | `REVIEW` (`RULE-SPEC-02`) |
| **BM-11** | Multi-Page Continuity Across Sheets | `PASS` |
| **BM-12** | Visual Ambiguity / Low Confidence | `REVIEW` (`RULE-AMBIGUITY-08`) |

---

## Limitations & Known Constraints

1. **Unauthenticated Public API Trust Boundary:** The experimental FastAPI service has no reviewer authentication or cryptographic signing authority. Public API callers cannot self-attest extraction completeness, and automated `PASS` is blocked across public API endpoints by default (failing closed to `REVIEW`).
2. **Text Callout Reliance vs Vector Tracing:** The vision model extracts textual callouts visible on the sheet. It does not trace raw copper track vectors or graphical line geometries without labels.
3. **Dense Bounding Boxes:** Standard open-weight vision models may report null or approximate bounding boxes for tiny wire callouts. Coordinates must always be verified by an engineer.
4. **No Autonomous Flight Signoff:** All outputs include `is_experimental: true` and the required experimental disclaimer.
5. **Zero Cloud Telemetry:** Document contents and schematic drawings are processed strictly in-memory or on local disk; no customer data is transmitted externally.


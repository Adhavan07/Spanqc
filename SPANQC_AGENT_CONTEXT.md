# SpanQC — Persistent Context for AI Coding Agents

**Purpose:** Read this file before every task. It is durable working memory, not proof that the current checkout still matches every detail. Verify the live repository before acting.

**Consolidated:** 2026-10-12  
**Coding agent/editor:** Antigravity  
**Workflow:** User gives Antigravity a bounded task, brings back its findings/diff/test output, and reviews before the next step.

## 1. Non-negotiable rules

1. Read this file fully, then inspect the live repository, branch, working tree, relevant files, tests, and diffs.
2. Evidence before claims. Never say a feature is implemented, secure, AI-powered, tested, fixed, or production-ready without evidence for that exact claim.
3. Unknown means `UNKNOWN`. Do not invent missing context, APIs, test results, model responses, evidence, coordinates, or architecture.
4. Start with a read-only investigation. Before editing, report current behavior with file/line evidence, knowns/unknowns, minimal plan, risks, and acceptance tests.
5. Keep scope narrow. No unrelated refactors or silent architecture changes.
6. Keep the experimental LLM QC path separate from the main `/app/check` path unless explicitly authorized.
7. Never switch branches, commit, push, merge, rebase, reset, clean, discard changes, or overwrite user work unless explicitly asked.
8. Preserve existing changes. Inspect `git status --short` and diffs before touching files.
9. Run tests; report exact commands, results, warnings, and what was not tested. Never claim a test passed if it was not run.
10. Use synthetic data by default. Do not expose secrets or send customer documents to external services without explicit approval.
11. Tenant isolation and server-side authorization are mandatory. Never trust a client-provided tenant ID/header without validating membership and access. Fail closed.
12. Report limitations plainly. A prototype or polished UI is not proof of production readiness.

## 2. Product definition

SpanQC is intended to be a multi-tenant SaaS wiring-diagram quality-control validation tool for engineering/technical-publication teams.

Problem statement discussed with the client:
> Tech Pub engineers redraw client wiring diagrams (PDF) into JPG sheets, and today every sheet is checked by hand. We are building a validation tool that traces each connection and flags mismatches, so reviewers only look at what the tool could not prove.

Intended flow:
1. Authenticated user belongs to an organization/tenant and is authorized for a project.
2. Real document upload goes through a server endpoint and is validated.
3. File is stored privately with tenant-aware access control.
4. Pages are processed and candidate wiring information is extracted.
5. An electrical representation/netlist is constructed from drawing evidence.
6. Deterministic rules compare candidates against an **authoritative expected specification/netlist** and declared scope.
7. Findings include rule IDs, expected/observed values, severity/status, evidence/page/region where available, and uncertainty.
8. Unproven/ambiguous cases go to human review.
9. Reports include traceability, integrity information, and audit trail.
10. Tenant isolation, metering, quotas, entitlements, and billing are enforced server-side.

This is the target design, **not a claim that all stages exist**. Verify each stage in code and runtime.

## 3. Distinguish AI, rules, evidence, and simulation

- **AI extraction:** model proposes candidate wires, labels, terminals, gauges, colors, or ambiguities from actual document images.
- **Deterministic validation:** code compares candidates to an authoritative specification and evaluates explicit rules.
- **Evidence:** source page/region/text supporting an observation or finding.
- **Mock/simulation:** hardcoded, fixture-based, filename-based, timer-based, localStorage-based, or canned output that does not analyze the uploaded document.
- **Human review:** deliberate path for uncertain or unprovable cases.

A report that looks professional does not prove AI analyzed the PDF or that the electrical conclusions are correct. Trace each finding to its evidence and generating code. Do not treat model confidence as correctness. A score such as `69/100` is not meaningful unless its formula and interpretation are documented and tested. Never claim whole-drawing validation unless the declared scope was actually processed and completeness was tested.

Where possible, findings should show finding ID, severity/status, rule ID, wire/connection, expected versus observed values, source page/region, evidence, extraction method, confidence/uncertainty, and reviewer decision. Do not fabricate missing fields; label them unavailable.

## 4. Historical repo and branch context — verify all of it

Project/repo references used previously:
- `https://github.com/jojoasta381-max/Qc-assistance`
- Local clone previously reported at `/data/projects/Qc-assistance`
- Deployment previously mentioned: `qc-assistance.vercel.app`

Historical branches/observations:
- `main` was reported at different points as `f5a2dd1` and `346851d`; neither should be assumed current.
- `legacy-phase8` was described as an application-recovery baseline with an eight-stage pipeline, seven-state state machine, deterministic rules, AI abstraction, document/OCR processing, reports/XLSX, executive summary, and SSE.
- `phase-6-aws-migration` was described as AWS ECS/Fargate/infrastructure reference work. Architecture diverged from the recovery branch; do not merge without a deliberate comparison and approval.
- `testing/staging` was reported to contain newer auth/session/Prisma work.
- `experiment/llm-qc-demo` was an isolated local experiment based on `da88462662cbb2622ce02806b25dad04ecb47b63`. Last known working tree:
  ```
   M .gitignore
  ?? experiments/
  ?? src/app/app/experiments/
  ```
  This may be stale. Inspect before acting; never reset/clean it.

## 5. Previously identified risks — re-check current code

Earlier reviews judged the product **not production-ready** because parts of the operational pipeline appeared simulated, hardcoded, or connected to dead endpoints. Previously reported issues included:
- Main `/app/check` flow partly simulated.
- `createReportFromUploadedFile()` reportedly derived findings from filename/standard rather than full electrical analysis.
- Timer-driven progress, localStorage-backed state, and sample/fallback API records.
- End-to-end real upload → page rendering → extraction → electrical graph/netlist → rules → evidence-backed report not demonstrated.
- IDOR risk from an untrusted tenant header; hardcoded/insecure secrets; Razorpay webhook test bypass; SSRF risk in endpoint validation; non-atomic quota checks.
- Authentication/authorization gaps; some project/detail/team routes falling back to fixtures/local state; report/reviewer decisions stored in localStorage; mocked billing/quota; login rate limiting reportedly missing.
- One historical audit recorded 8 Critical (P0), 5 High (P1), and 3 Medium (P2). This is a historical count, not a current verified count.

Treat these as risks until verified fixed. Do not claim a security issue remains or is fixed without current code/test evidence.

Historical Phase 1 experiment changes reportedly included runtime application modes, fail-closed AI routing, removal of randomized analysis, authoritative rule counts, SHA-256 report fingerprints, removal of unverified customer claims, and updated pricing. Verify before relying on them. Previously discussed prices were Engineering Team ₹9,999/month (50 checks), Enterprise Team ₹24,999/month (350 checks), Industrial Scale ₹75,000+/month (1,500+ checks, custom rules, dedicated SLA). Do not change business pricing without approval.

## 6. Isolated LLM/QC experiment — prior evidence and limitations

Previously reported components:
- FastAPI backend, PyMuPDF, Pydantic, Ollama vision client, deterministic evaluator, static HTML frontend.
- Experimental Next.js route: `src/app/app/experiments/llm-qc/page.tsx`.
- Local Ollama at `127.0.0.1:11434`, model `gemma3:4b`.
- Python environment: `experiments/llm-qc-demo/.venv`.
- Prior test command:
  ```bash
  PYTHONPATH=experiments/llm-qc-demo ./experiments/llm-qc-demo/.venv/bin/pytest experiments/llm-qc-demo/tests/ -v
  ```

Historical observed results:
- Real local Gemma inference on a synthetic PDF extracted one observation: W101, J1:1 → TB1:1, 20AWG RED; coordinates were null and confidence was 1.0; runtime about 66 seconds.
- A synthetic failing fixture compared with a three-wire expected netlist returned FAIL for omissions/mismatches; about 87 seconds.
- An ambiguous synthetic fixture returned REVIEW; about 84 seconds.
- A one-wire expected netlist once produced PASS against a synthetic sample.
- Phase 1E reportedly made missing spec return REVIEW (`RULE-SPEC-00`), empty spec return REVIEW (`RULE-SPEC-01`), normalized gauge whitespace, and enforced FAIL > REVIEW > PASS.
- Last reported tests: 55 passed, one warning; `git diff --check` clean.

These results apply only to those tests and synthetic inputs. They do not prove complete/multi-page extraction, accurate coordinates, real-world engineering accuracy, production-grade tracing, tenant-safe deployment, or that `/app/check` calls Ollama.

### Completeness flaw and Phase 1F status

A prior audit found PASS could be based on a subset comparison (`expected_netlist ⊆ candidate_observations`) without proving the expected spec covered the full declared drawing scope. Extra observed wires could be ignored; an incomplete spec could cause an over-broad PASS.

A planned Phase 1F should require:
- Explicit completeness declaration and drawing scope before PASS.
- Missing/empty/incomplete spec → REVIEW unless a confirmed deterministic defect independently justifies FAIL.
- Every expected wire accounted for and every observed candidate reconciled; extra/unlisted candidates cannot be silently ignored.
- Explicit treatment of duplicate IDs, conflicting specs, ambiguity, omissions, and status precedence FAIL > REVIEW > PASS.
- Tests for missing/incomplete/complete specs, omitted expected wires, extra observations, duplicates/conflicts, ambiguity, and defect precedence.
- No whole-drawing coverage claim without a scope contract.

**Phase 1F completion was not confirmed when this file was assembled. Inspect the repo and actual tests.**

## 7. Recent `INPUT.pdf` report: unresolved verification

The user saw a report with:
- FAIL, score 69/100
- D-001: W102 gauge missing
- D-002: W103 insulation colour missing
- D-003: ambiguous crossing between CAN_HI and DC_GND

Do not assume these findings came from the PDF. Perform a **read-only trace**:
1. Identify whether the report came from main `/app/check` or `/app/experiments/llm-qc`.
2. Record safe file metadata (hash, size, page count); do not expose document contents unnecessarily.
3. Trace upload endpoint and backend calls.
4. Prove whether actual rendered PDF page images reached Ollama/model inference.
5. Capture sanitized raw model response and extracted observations.
6. Trace each finding to the exact evaluator/rule and supporting evidence.
7. Determine whether the score is calculated, hardcoded, fixture-derived, or frontend-only.
8. Classify the output as real AI extraction, deterministic validation, mock/fixture, or a mixture.
9. Make no edits during this investigation. Do not use customer documents for experiments without explicit approval.

## 8. Standard workflow for every task

### Ground truth first
Run and report:
```bash
pwd
git branch --show-current
git status --short
git log -1 --oneline
git diff --check
```
Then inspect relevant source, configuration, tests, and diffs. Do not print secrets.

### Before implementation
Classify task: `READ-ONLY INVESTIGATION`, `BUG FIX`, `FEATURE`, `SECURITY FIX`, `REFACTOR`, `DEPLOYMENT / INFRA`, or `DOCUMENTATION`.

Explain:
- Current behavior with file/line evidence.
- Verified facts vs hypotheses vs unknowns.
- Root-cause investigation plan.
- Exact files likely to change.
- Minimal plan, risks, and acceptance tests.
- What must remain unchanged.

For read-only investigations, **do not edit**. For broad, destructive, security-sensitive, or architecture-changing work, present the plan and wait for approval.

### After implementation, if approved
- Change only in-scope files.
- Add regression tests, including failure/negative cases.
- Keep authorization and tenant checks server-side; fail closed.
- Do not add fake-success fallbacks, hardcoded credentials, fabricated evidence, or bypasses.
- Run targeted then broader relevant tests.
- Report exact commands, pass/fail/skip counts, warnings, and whether AI inference was real, mocked, or not exercised.
- Run `git diff --check`; inspect `git diff --stat`, final diff, and `git status --short`.

### Final report format
1. Result: complete / partial / blocked.
2. Evidence: paths and line numbers.
3. Files changed and why.
4. Exact test commands and results.
5. AI inference: real / mocked / not exercised.
6. Remaining limitations and risks.
7. Current branch and working-tree state.
8. Whether any commit/push occurred.
9. One smallest recommended next step.

## 9. End-to-end QC definition of done

Do not claim end-to-end validation until the relevant items have evidence:
- [ ] Authenticated, authorized upload; tenant/project ownership enforced server-side.
- [ ] Real file received and validated; private tenant-safe storage where applicable.
- [ ] All declared pages processed or omissions explicitly reported.
- [ ] AI/OCR actually invoked when claimed; model/config safely recorded.
- [ ] Candidate observations trace to source-page evidence.
- [ ] Electrical graph/netlist construction tested, not assumed from text extraction.
- [ ] Authoritative expected specification and declared scope exist.
- [ ] Completeness contract blocks unsupported PASS.
- [ ] Deterministic rules are reproducible.
- [ ] Missing, extra, contradictory, and ambiguous connections are not silently ignored.
- [ ] Findings trace to evidence and rule.
- [x] Human review works for uncertainty (Phase 3.1: Durable, versioned, append-only review records stored in `qc_job_reviews`, authenticated via RBAC `qc:review`, CSRF-protected, tenant-isolated, safe retry via Idempotency-Key, separated from immutable machine outcome).
- [ ] Score/status formula is transparent and tested.
- [ ] Audit trail, integrity, quotas, and billing are real if claimed.
- [ ] Negative tests cover tenant isolation, authorization, malformed files/specs, and failure paths.
- [ ] Mock paths are not mistaken for production.
- [ ] User-facing claims describe real capabilities and limitations.

Any missing item must be reported as missing.

## 10. Reusable prompt — paste before every Antigravity task

Copy this block, replacing the task with one specific request:

> **SPANQC TASK — CONTEXT FIRST, EVIDENCE ALWAYS**
>
> Read `SPANQC_AGENT_CONTEXT.md` completely before acting. Treat it as persistent context, not current proof. Verify every relevant historical claim against the current checkout.
>
> **Task:** `[PASTE ONE SPECIFIC TASK HERE]`
>
> 1. First inspect `pwd`, branch, `git status --short`, latest commit, relevant diffs, files, and tests.
> 2. Classify this task as read-only investigation, bug fix, feature, security fix, refactor, deployment/infra, or documentation.
> 3. State current behavior with file/line evidence. Separate verified facts, hypotheses, and unknowns.
> 4. Propose the smallest plan and acceptance tests before editing. If this is an investigation, remain read-only. For broad, destructive, security-sensitive, or architecture-changing work, wait for approval.
> 5. Preserve all user changes. Do not switch branches, commit, push, merge, rebase, reset, clean, or discard changes unless explicitly asked.
> 6. Do not fabricate model responses, evidence, coordinates, endpoint behavior, test results, or production readiness.
> 7. Keep the main `/app/check` flow separate from the LLM experiment unless explicitly authorized.
> 8. Protect authentication, RBAC, tenant isolation, CSRF, upload validation, private storage, quotas, and billing. Fail closed.
> 9. Use synthetic data by default. Do not send customer documents to external services or log sensitive contents without explicit approval.
> 10. Run relevant tests and report exact commands/results. Include `git diff --check`, `git status --short`, `git diff --stat`, and final diff review after edits.
> 11. Update this context file only when durable facts/decisions/status have been verified. Mark historical facts as historical.
>
> **Final response must include:** result (complete/partial/blocked), evidence with paths/lines, files changed, exact tests and results, whether AI inference was real/mocked/not exercised, limitations/risks, branch/working-tree state, commit/push status, and one smallest next step.
>
> If context is missing or the repository contradicts this file, do not guess. Investigate and report the contradiction. If the task is ambiguous, ask one concise question before editing.

## 11. Keep this file useful

After a meaningful task, update this file only with verified durable facts, decisions, architecture changes, actual test baselines, and current limitations. Keep detailed audit/phase reports in separate docs and link them here only after confirming their paths. Do not turn this file into an unverified changelog.

**Final principle:** Antigravity is an assistant, not the source of truth. The source of truth is the current repository, reproducible tests, observed runtime behavior, and approved requirements.

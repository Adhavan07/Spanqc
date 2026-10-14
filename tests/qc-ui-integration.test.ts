import "./setup";
import { db } from "../src/lib/server/db";
import { runSeed, TEST_PASSWORDS } from "../prisma/seed";
import { POST as createJobHandler } from "../src/app/api/v1/qc/jobs/route";
import { GET as getJobHandler } from "../src/app/api/v1/qc/jobs/[jobId]/route";
import { createServerSession } from "../src/lib/server/auth/session";
import {
  createQCJob,
  processQCJob,
  validateAndSanitizeReport,
} from "../src/lib/server/qc/job-bridge";
import type { QCJobRecord } from "../src/app/app/experiments/llm-qc/page";
import fs from "node:fs";
import path from "node:path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  PASS: ${message}`);
    passedCount++;
  }
}

const VALID_PDF_BYTES = Buffer.from(
  "JVBERi0xLjcKJcK1wrYKJSBXcml0dGVuIGJ5IE11UERGIDEuMjguMgoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFIvSW5mbzw8L1Byb2R1Y2VyKE11UERGIDEuMjguMik+Pj4+CmVuZG9iagoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1s0IDAgUl0+PgplbmRvYmoKCjMgMCBvYmoKPDwvRm9udDw8L2hlbHYgNSAwIFI+Pj4+CmVuZG9iagoKNCAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYwMCA0MDBdL1JvdGF0ZSAwL1Jlc291cmNlcyAzIDAgUi9QYXJlbnQgMiAwIFIvQ29udGVudHNbNiAwIFJdPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYS9FbmNvZGluZy9XaW5BbnNpRW5jb2Rpbmc+PgplbmRvYmoKCjYgMCBvYmoKPDwvTGVuZ3RoIDgyPj4Kc3RyZWFtCgpxCkJUCjEgMCAwIDEgNTAgMzUwIFRtCi9oZWx2IDEyIFRmIFs8NTM3MDYxNmU1MTQzMjA1NDY1NzM3NDIwNTM2ODY1NjU3ND5dVEoKRVQKUQoKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDQyIDAwMDAwIG4gCjAwMDAwMDAxMjAgMDAwMDAgbiAKMDAwMDAwMDE3MiAwMDAwMCBuIAowMDAwMDAwMjEzIDAwMDAwIG4gCjAwMDAwMDAzMjAgMDAwMDAgbiAKMDAwMDAwMDQwOSAwMDAwMCBuIAoKdHJhaWxlcgo8PC9TaXplIDcvUm9vdCAxIDAgUi9JRFs8N0VDMzg3QzM4RjNCNjlDM0ExQzNCNkMyODE1QjBBMUM+PEI0MjdBRDVGMEE0OEQ2RjBGQjc0NEZFRkFCMDg0NzYxPl0+PgpzdGFydHhyZWYKNTQwCiUlRU9GCg==",
  "base64"
);

async function runUIIntegrationTestSuite() {
  console.log("================================================================================");
  console.log("SPANQC PHASE 3: EXPERIMENTAL UI INTEGRATION & CONTRACT TEST SUITE");
  console.log("================================================================================");

  // Clean & Seed dedicated test database
  await db.qCJob.deleteMany();
  await db.session.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();
  await runSeed();

  const spandsonsTenantId = "f8c5091c-50a3-4436-88bd-369c7c6b1727";
  const acmeTenantId = "tenant-acme-aerospace-9999";

  const pravinProject = await db.project.findFirstOrThrow({
    where: { tenantId: spandsonsTenantId },
  });

  // Pravin Admin session (Spandsons)
  const pravinSession = await createServerSession(
    "bc4a8b56-47da-4de2-b4ab-da448f4163dc",
    spandsonsTenantId,
    "ADMIN",
    "pravin@spandsons.com"
  );
  const pravinCookie = `spanqc_session=${pravinSession.token}`;

  // Alice User session (Acme)
  const aliceSession = await createServerSession(
    "usr-alice-acme-1111",
    acmeTenantId,
    "ADMIN",
    "alice@acme-aero.com"
  );
  const aliceCookie = `spanqc_session=${aliceSession.token}`;

  // Inspector Reviewer session (Reviewer role — denied qc:execute)
  const inspectorSession = await createServerSession(
    "f33cd61a-e604-41a2-8756-241777740b9d",
    spandsonsTenantId,
    "REVIEWER",
    "inspector@spandsons.com"
  );
  const inspectorCookie = `spanqc_session=${inspectorSession.token}`;

  // ---------------------------------------------------------------------------
  // TEST 1: UI Contract — Successful Multipart Upload to POST /api/v1/qc/jobs
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 1] UI Contract: Successful Multipart Submission to POST /api/v1/qc/jobs");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(VALID_PDF_BYTES)]), "schematic.pdf");
  formData.append("projectId", pravinProject.id);
  formData.append("standard", "IPC/WHMA-A-620D");
  formData.append("specification_is_complete", "true");
  formData.append("extraction_is_verified", "false");
  formData.append("idempotency_key", "test-ui-idempotency-001");

  const submitReq = new Request("http://localhost:3000/api/v1/qc/jobs", {
    method: "POST",
    headers: {
      Cookie: pravinCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": "test-ui-idempotency-001",
    },
    body: formData,
  });

  const submitRes = await createJobHandler(submitReq);
  assert(submitRes.status === 201, "Server returns HTTP 201 Created on valid upload");
  const submitJson = await submitRes.json();
  assert(Boolean(submitJson.job_id), "Response contains job_id");
  assert(submitJson.status === "QUEUED" || submitJson.status === "PROCESSING", "Initial status is QUEUED or PROCESSING");
  assert(submitJson.quota_reserved === true, "Quota is confirmed reserved");

  const createdJobId = submitJson.job_id;

  // ---------------------------------------------------------------------------
  // TEST 2: UI Contract — Initial Polling State (QUEUED / PROCESSING)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2] UI Contract: Polling returns QUEUED / PROCESSING state with page coverage");
  const pollReq = new Request(`http://localhost:3000/api/v1/qc/jobs/${createdJobId}`, {
    method: "GET",
    headers: { Cookie: pravinCookie },
  });

  const pollRes = await getJobHandler(pollReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  assert(pollRes.status === 200, "Polling returns HTTP 200 OK");
  const pollJson: QCJobRecord = await pollRes.json();
  assert(pollJson.job_id === createdJobId, "Returned job_id matches");
  assert(Boolean(pollJson.page_coverage), "Contains page_coverage object");
  assert(pollJson.is_experimental === true, "Marked as experimental prototype");
  assert(Boolean(pollJson.disclaimer), "Contains prominent prototype disclaimer");

  // ---------------------------------------------------------------------------
  // TEST 3: UI Contract — Terminal States: PASS, FAIL, REVIEW, and FAILED
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3] UI Contract: Presentation of Terminal States (PASS, FAIL, REVIEW, FAILED)");

  // 3A. REVIEW State (Unverified extraction forced to REVIEW)
  const mockReviewReport = {
    report_id: "rep-ui-rev-01",
    document_name: "schematic.pdf",
    sha256_hash: pollJson.document_sha256,
    standard: "IPC/WHMA-A-620D",
    overall_outcome: "REVIEW",
    specification_is_complete: true,
    extraction_is_verified: false,
    total_page_count: 1,
    processed_page_count: 1,
    failed_page_count: 0,
    unprocessed_page_numbers: [],
    failed_page_numbers: [],
    rule_findings: [
      {
        finding_id: "find-01",
        rule_id: "RULE-SPEC-02",
        rule_name: "Extraction Certification",
        standard_reference: "IPC/WHMA-A-620D",
        severity: "WARNING",
        outcome: "REVIEW",
        title: "Unverified Visual Extraction",
        reason: "Visual extraction has not been signed off by human reviewer.",
        evidence_observation_ids: [],
        human_review_required: true,
      },
    ],
    candidate_observations: [],
    pages_rendered: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA"],
  };

  await db.qCJob.update({
    where: { id: createdJobId },
    data: {
      status: "REVIEW_REQUIRED",
      overallOutcome: "REVIEW",
      resultReportJson: JSON.stringify(mockReviewReport),
    },
  });

  const reviewPollRes = await getJobHandler(pollReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  const reviewJson: QCJobRecord = await reviewPollRes.json();
  assert(reviewJson.status === "REVIEW_REQUIRED", "Status is REVIEW_REQUIRED");
  assert(reviewJson.overall_outcome === "REVIEW", "Overall outcome is REVIEW");
  assert(reviewJson.report?.rule_findings.length === 1, "Report findings preserved");
  assert(reviewJson.report?.rule_findings[0].outcome === "REVIEW", "Finding outcome is REVIEW");

  // 3B. FAIL State (Confirmed Defect)
  await db.qCJob.update({
    where: { id: createdJobId },
    data: {
      status: "COMPLETED",
      overallOutcome: "FAIL",
      resultReportJson: JSON.stringify({
        ...mockReviewReport,
        overall_outcome: "FAIL",
        rule_findings: [
          {
            finding_id: "find-fail-01",
            rule_id: "RULE-NETLIST-05",
            rule_name: "Terminal Connection Verification",
            standard_reference: "IPC/WHMA-A-620D",
            severity: "CRITICAL",
            outcome: "FAIL",
            title: "Terminal Mismatch",
            reason: "Wire W101 destination terminal TB1:9 does not match expected TB1:1",
            evidence_observation_ids: ["obs-01"],
            human_review_required: false,
          },
        ],
      }),
    },
  });

  const failPollRes = await getJobHandler(pollReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  const failJson: QCJobRecord = await failPollRes.json();
  assert(failJson.status === "COMPLETED", "Defect status is COMPLETED");
  assert(failJson.overall_outcome === "FAIL", "Overall outcome is FAIL (Defect confirmed)");
  assert(failJson.report?.rule_findings[0].severity === "CRITICAL", "Severity is CRITICAL");

  // 3C. PASS State
  await db.qCJob.update({
    where: { id: createdJobId },
    data: {
      status: "COMPLETED",
      overallOutcome: "PASS",
      resultReportJson: JSON.stringify({
        ...mockReviewReport,
        overall_outcome: "PASS",
        specification_is_complete: true,
        extraction_is_verified: true,
        rule_findings: [
          {
            finding_id: "find-pass-01",
            rule_id: "RULE-PASS-00",
            rule_name: "Full Netlist Conformance",
            standard_reference: "IPC/WHMA-A-620D",
            severity: "INFO",
            outcome: "PASS",
            title: "All Connections Verified",
            reason: "All 3 wires matched certified netlist with zero discrepancies.",
            evidence_observation_ids: [],
            human_review_required: false,
          },
        ],
      }),
    },
  });

  const passPollRes = await getJobHandler(pollReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  const passJson: QCJobRecord = await passPollRes.json();
  assert(passJson.status === "COMPLETED", "Pass status is COMPLETED");
  assert(passJson.overall_outcome === "PASS", "Overall outcome is PASS");

  // 3D. Operational FAILED State (Worker timeout / crash — distinguished from drawing FAIL)
  await db.qCJob.update({
    where: { id: createdJobId },
    data: {
      status: "FAILED",
      overallOutcome: null,
      errorMessage: "Analysis worker timed out after 90 seconds. Quota check has been refunded.",
    },
  });

  const workerFailRes = await getJobHandler(pollReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  const workerFailJson: QCJobRecord = await workerFailRes.json();
  assert(workerFailJson.status === "FAILED", "Status is FAILED (Worker failure)");
  assert(workerFailJson.overall_outcome === null, "Overall outcome is null (never PASS)");
  assert(
    Boolean(workerFailJson.error_message?.includes("timed out")),
    "Clear error message distinguishes worker error from drawing defect"
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Security — Unauthorized Submission & Cross-Tenant Access Protection
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4] Security: Unauthorized submission, RBAC, and IDOR cross-tenant defense");

  // 4A. Unauthenticated upload
  const unauthReq = new Request("http://localhost:3000/api/v1/qc/jobs", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
    body: formData,
  });
  const unauthRes = await createJobHandler(unauthReq);
  assert(unauthRes.status === 401, "Unauthenticated submission returns HTTP 401");

  // 4B. RBAC — Reviewer role cannot submit
  const rbacReq = new Request("http://localhost:3000/api/v1/qc/jobs", {
    method: "POST",
    headers: {
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: formData,
  });
  const rbacRes = await createJobHandler(rbacReq);
  assert(rbacRes.status === 403, "Reviewer role denied submission with HTTP 403 Forbidden");

  // 4C. IDOR Defense — Alice (Acme) polling Pravin's (Spandsons) job
  const idorReq = new Request(`http://localhost:3000/api/v1/qc/jobs/${createdJobId}`, {
    method: "GET",
    headers: { Cookie: aliceCookie },
  });
  const idorRes = await getJobHandler(idorReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  assert(idorRes.status === 404, "Cross-tenant polling returns HTTP 404 Not Found to prevent data leak");

  // ---------------------------------------------------------------------------
  // TEST 5: Quota & Validation Error Handling
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5] Validation & Quota Exhaustion Error Handling");

  // 5A. Missing Project ID
  const noProjForm = new FormData();
  noProjForm.append("file", new Blob([new Uint8Array(VALID_PDF_BYTES)]), "test.pdf");
  const noProjReq = new Request("http://localhost:3000/api/v1/qc/jobs", {
    method: "POST",
    headers: {
      Cookie: pravinCookie,
      Origin: "http://localhost:3000",
    },
    body: noProjForm,
  });
  const noProjRes = await createJobHandler(noProjReq);
  assert(noProjRes.status === 400, "Missing project ID rejected with HTTP 400");

  // 5B. Quota Exhaustion
  await db.tenant.update({
    where: { id: spandsonsTenantId },
    data: { checkQuota: 10, quotaUsed: 10 },
  });

  const quotaReq = new Request("http://localhost:3000/api/v1/qc/jobs", {
    method: "POST",
    headers: {
      Cookie: pravinCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": "quota-test-key-999",
    },
    body: formData,
  });
  const quotaRes = await createJobHandler(quotaReq);
  assert(quotaRes.status === 402, "Exhausted quota returns HTTP 402 Payment Required");

  // Restore quota
  await db.tenant.update({
    where: { id: spandsonsTenantId },
    data: { checkQuota: 120, quotaUsed: 38 },
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Disclaimers & Partial Page Coverage Verification
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 6] Page Coverage Diagnostics & Experimental Disclaimers");
  await db.qCJob.update({
    where: { id: createdJobId },
    data: {
      status: "REVIEW_REQUIRED",
      overallOutcome: "REVIEW",
      totalPageCount: 3,
      processedPageCount: 2,
      failedPageCount: 1,
      unprocessedPages: JSON.stringify([3]),
      failedPages: JSON.stringify([3]),
    },
  });

  const covPollRes = await getJobHandler(pollReq, {
    params: Promise.resolve({ jobId: createdJobId }),
  });
  const covJson: QCJobRecord = await covPollRes.json();
  assert(covJson.page_coverage.total_pages === 3, "Total pages is 3");
  assert(covJson.page_coverage.processed_pages === 2, "Processed pages is 2");
  assert(covJson.page_coverage.failed_pages === 1, "Failed pages recorded as 1");
  assert(covJson.page_coverage.failed_page_numbers.includes(3), "Failed page number 3 identified");

  // ---------------------------------------------------------------------------
  // TEST 7: Safety Boundary Check — /app/check flow remains untouched
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 7] Safety Boundary: Confirm production /app/check flow is untouched");
  const checkPagePath = path.resolve(process.cwd(), "src/app/app/check/page.tsx");
  assert(fs.existsSync(checkPagePath), "Production /app/check/page.tsx exists");
  const checkPageContent = fs.readFileSync(checkPagePath, "utf8");
  assert(!checkPageContent.includes("/api/v1/qc/jobs"), "Production /app/check does NOT use /api/v1/qc/jobs");
  assert(checkPageContent.includes("createReportFromUploadedFile"), "Production /app/check preserves its mock report generator");

  console.log("\n================================================================================");
  console.log(`UI INTEGRATION & CONTRACT SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
}

runUIIntegrationTestSuite().catch((err) => {
  console.error("UI Integration test fatal error:", err);
  process.exit(1);
});

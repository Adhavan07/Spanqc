import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/server/db";
import { runSeed, TEST_PASSWORDS } from "../prisma/seed";
import {
  createQCJob,
  processQCJob,
  reclaimStaleJobs,
  processPendingQueuedJobs,
  validateAndSanitizeReport,
} from "../src/lib/server/qc/job-bridge";
import { runSchedulerTick } from "../src/lib/server/qc/scheduler";

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

const BASE_URL = "http://localhost:3000";
const FIXTURE_PDF_PATH = path.join(
  process.cwd(),
  "experiments/llm-qc-demo/fixtures/synthetic_sample_schematic.pdf"
);
const PASS_NETLIST_PATH = path.join(
  process.cwd(),
  "experiments/llm-qc-demo/fixtures/expected_netlist_pass.json"
);

async function runStagingSmokeTest() {
  console.log("================================================================================");
  console.log("SPANQC PHASE 2.2: STAGING READINESS SMOKE TEST SUITE");
  console.log("================================================================================");

  // Seed staging database
  await runSeed();

  const fixturePdfBuffer = fs.readFileSync(FIXTURE_PDF_PATH);
  const passNetlistJson = fs.readFileSync(PASS_NETLIST_PATH, "utf8");

  // ---------------------------------------------------------------------------
  // AUTH SETUP: Authenticate as Pravin (Spandsons Admin) and Alice (Acme User)
  // ---------------------------------------------------------------------------
  console.log("\n[AUTH SETUP] Obtaining staging authentication sessions...");
  const pravinLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "pravin@spandsons.com",
      password: TEST_PASSWORDS.pravin,
    }),
  });
  assert(pravinLoginRes.status === 200, "Pravin (Spandsons Admin) authenticated successfully");
  const pravinCookie = pravinLoginRes.headers.get("set-cookie") || "";

  const aliceLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "alice@acme-aero.com",
      password: TEST_PASSWORDS.alice,
    }),
  });
  assert(aliceLoginRes.status === 200, "Alice (Acme User) authenticated successfully");
  const aliceCookie = aliceLoginRes.headers.get("set-cookie") || "";

  const pravinProject = await db.project.findFirstOrThrow({
    where: { tenant: { slug: "spandsons-horizon" } },
  });

  // ---------------------------------------------------------------------------
  // STEP 1 & 2: Submit an authorized PDF & Receive Job ID in QUEUED / PROCESSING status
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 1 & 2] Submit authorized schematic and receive queued job");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(fixturePdfBuffer)]), "synthetic_sample.pdf");
  formData.append("projectId", pravinProject.id);
  formData.append("standard", "IPC/WHMA-A-620D");
  formData.append("expected_netlist_json", passNetlistJson);
  formData.append("specification_is_complete", "true");
  formData.append("extraction_is_verified", "false"); // Untrusted extraction

  const submitRes = await fetch(`${BASE_URL}/api/v1/qc/jobs`, {
    method: "POST",
    headers: {
      Cookie: pravinCookie,
      Origin: BASE_URL,
    },
    body: formData,
  });

  assert(submitRes.status === 201, `Submit returned HTTP 201 Created (got ${submitRes.status})`);
  const submitJson = await submitRes.json();
  assert(Boolean(submitJson.job_id), "Received non-empty job_id");
  assert(["QUEUED", "PROCESSING"].includes(submitJson.status), `Initial status is QUEUED or PROCESSING (${submitJson.status})`);
  assert(submitJson.quota_reserved === true, "Check quota was successfully reserved");

  const createdJobId = submitJson.job_id;

  // ---------------------------------------------------------------------------
  // STEP 3 & 4: Observe background processing & retrieve final result
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 3 & 4] Polling background processing via authorized status endpoint...");
  let finalJobState: any = null;
  const pollStart = Date.now();
  const maxWaitMs = 60_000; // 60s max wait

  while (Date.now() - pollStart < maxWaitMs) {
    const statusRes = await fetch(`${BASE_URL}/api/v1/qc/jobs/${createdJobId}`, {
      headers: { Cookie: pravinCookie },
    });
    assert(statusRes.status === 200, "Authorized status poll returned HTTP 200");
    const statusJson = await statusRes.json();

    if (["COMPLETED", "REVIEW_REQUIRED", "FAILED"].includes(statusJson.status)) {
      finalJobState = statusJson;
      break;
    }

    // Wait 2s before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }

  assert(finalJobState !== null, "Job finished background processing within timeout");
  console.log(`  Background processing concluded with status: ${finalJobState.status}, outcome: ${finalJobState.overall_outcome}`);
  assert(Boolean(finalJobState.report), "Result report payload is persisted and present");
  assert(finalJobState.overall_outcome !== "PASS", "Live inference with extraction_is_verified=false did not produce false PASS");
  assert(finalJobState.report.model_used === "gemma3:4b", "Report confirms live Ollama gemma3:4b inference");

  // ---------------------------------------------------------------------------
  // STEP 5: Verify incomplete or unverified extraction cannot receive PASS [SYNTHETIC]
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 5] Verification Guard: Incomplete / unverified extraction cannot receive PASS [SYNTHETIC]");
  const unverifiedReport = {
    report_id: "rep-unverified-01",
    document_name: "synthetic.pdf",
    sha256_hash: "mockhash64chars0000000000000000000000000000000000000000000000000000",
    standard: "IPC/WHMA-A-620D",
    overall_outcome: "PASS", // Upstream model erroneously claimed PASS
    specification_is_complete: true,
    extraction_is_verified: false, // Unverified extraction
    total_page_count: 1,
    processed_page_count: 1,
    failed_page_count: 0,
    rule_findings: [
      { rule_id: "RULE-SPEC-02", outcome: "REVIEW", severity: "WARNING", message: "Extraction is unverified." },
    ],
  };

  const sanitizedUnverified = validateAndSanitizeReport(
    unverifiedReport,
    "mockhash64chars0000000000000000000000000000000000000000000000000000"
  );
  assert(
    sanitizedUnverified.overall_outcome === "REVIEW",
    `Overall outcome forced to REVIEW for unverified extraction (got ${sanitizedUnverified.overall_outcome})`
  );

  const incompleteSpecReport = {
    report_id: "rep-incomplete-01",
    document_name: "synthetic.pdf",
    sha256_hash: "mockhash64chars0000000000000000000000000000000000000000000000000000",
    standard: "IPC/WHMA-A-620D",
    overall_outcome: "PASS",
    specification_is_complete: false,
    extraction_is_verified: true,
    total_page_count: 1,
    processed_page_count: 1,
    failed_page_count: 0,
    rule_findings: [
      { rule_id: "RULE-SPEC-00", outcome: "REVIEW", severity: "WARNING", message: "Specification is incomplete." },
    ],
  };

  const sanitizedIncomplete = validateAndSanitizeReport(
    incompleteSpecReport,
    "mockhash64chars0000000000000000000000000000000000000000000000000000"
  );
  assert(
    sanitizedIncomplete.overall_outcome === "REVIEW",
    `Overall outcome forced to REVIEW for incomplete specification (got ${sanitizedIncomplete.overall_outcome})`
  );

  // ---------------------------------------------------------------------------
  // STEP 6: Verify confirmed defect retains FAIL precedence (Unit Verification)
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 6] Precedence Guard: Confirmed defect retains FAIL precedence [MOCKED/SYNTHETIC]");
  const conflictingReport = {
    report_id: "rep-defect-prec-01",
    document_name: "synthetic.pdf",
    sha256_hash: "mockhash64chars0000000000000000000000000000000000000000000000000000",
    standard: "IPC/WHMA-A-620D",
    overall_outcome: "PASS", // Service erroneously claimed PASS
    total_page_count: 1,
    processed_page_count: 1,
    failed_page_count: 0,
    rule_findings: [
      {
        rule_id: "RULE-NETLIST-05",
        outcome: "FAIL",
        severity: "CRITICAL",
        message: "Terminal mismatch: expected TB1:1, got TB1:9",
      },
    ],
  };

  const sanitizedDefect = validateAndSanitizeReport(
    conflictingReport,
    "mockhash64chars0000000000000000000000000000000000000000000000000000"
  );
  assert(
    sanitizedDefect.overall_outcome === "FAIL",
    `Outcome overridden to FAIL due to presence of FAIL rule finding (got ${sanitizedDefect.overall_outcome})`
  );

  // ---------------------------------------------------------------------------
  // STEP 7: Verify worker timeout or service failure never returns PASS
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 7] Failure Safety: Worker timeout/failure never returns PASS [SIMULATED]");
  const originalFetch = globalThis.fetch;
  try {
    const { job: failJob } = await createQCJob({
      tenantId: pravinProject.tenantId,
      projectId: pravinProject.id,
      userId: "user-test",
      fileBuffer: fixturePdfBuffer,
      autoDispatch: false,
    });

    // Simulate network error / service crash
    globalThis.fetch = async () => {
      throw new Error("Connection refused: Python analysis engine down.");
    };

    await processQCJob(failJob.id);

    const refreshedFailedJob = await db.qCJob.findUniqueOrThrow({ where: { id: failJob.id } });
    assert(refreshedFailedJob.status === "FAILED", "Job status marked as FAILED");
    assert(refreshedFailedJob.overallOutcome === null, "Overall outcome is null (never PASS)");
    assert(refreshedFailedJob.quotaRefunded === true, "Quota check was refunded to tenant");
    assert(
      Boolean(refreshedFailedJob.errorMessage?.includes("Connection refused")),
      "Error message records failure cause"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ---------------------------------------------------------------------------
  // STEP 8: Verify cross-tenant job access remains denied (IDOR protection)
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 8] Multi-Tenant Isolation: Cross-tenant job access denied (IDOR Defense)");
  const crossTenantRes = await fetch(`${BASE_URL}/api/v1/qc/jobs/${createdJobId}`, {
    headers: { Cookie: aliceCookie }, // Alice belongs to Acme, trying to read Pravin's Spandsons job
  });
  assert(
    crossTenantRes.status === 404,
    `Cross-tenant access returned HTTP 404 Not Found to prevent leaking job existence (got ${crossTenantRes.status})`
  );

  // ---------------------------------------------------------------------------
  // STEP 9: Restart / Recovery behavior verification
  // ---------------------------------------------------------------------------
  console.log("\n[SMOKE TEST 9] Restart & Recovery: Stale PROCESSING job reclaimed and resumed on restart");
  const { job: rebootJob } = await createQCJob({
    tenantId: pravinProject.tenantId,
    projectId: pravinProject.id,
    userId: "user-reboot",
    fileBuffer: fixturePdfBuffer,
    autoDispatch: false,
  });

  // Simulate process terminated while job was mid-execution
  await db.qCJob.update({
    where: { id: rebootJob.id },
    data: {
      status: "PROCESSING",
      claimToken: "killed-process-token-404",
      claimedAt: new Date(Date.now() - 180_000), // 3 minutes ago
      retryCount: 1,
    },
  });

  const mockReport = {
    report_id: "rep-reboot-01",
    document_name: "reboot.pdf",
    sha256_hash: rebootJob.documentSha256,
    standard: "IPC/WHMA-A-620D",
    overall_outcome: "REVIEW",
    specification_is_complete: false,
    extraction_is_verified: false,
    total_page_count: 1,
    processed_page_count: 1,
    failed_page_count: 0,
    unprocessed_page_numbers: [],
    failed_page_numbers: [],
    rule_findings: [
      { rule_id: "RULE-SPEC-00", outcome: "REVIEW", severity: "WARNING" },
    ],
    candidate_observations: [],
    pages_rendered: [],
  };

  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockReport), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    // Execute startup recovery cycle
    const recoveryTick = await runSchedulerTick({ forceRecovery: true, staleThresholdMs: 120_000 });
    assert(recoveryTick.reclaimedCount >= 1, "Recovery cycle reclaimed abandoned job");

    const restoredJob = await db.qCJob.findUniqueOrThrow({ where: { id: rebootJob.id } });
    assert(
      ["COMPLETED", "REVIEW_REQUIRED"].includes(restoredJob.status),
      `Abandoned job successfully resumed and reached final durable status (${restoredJob.status})`
    );
  } finally {
    globalThis.fetch = origFetch;
  }

  console.log("\n================================================================================");
  console.log(`STAGING SMOKE TEST COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
}

runStagingSmokeTest().catch((err) => {
  console.error("Smoke test fatal error:", err);
  process.exit(1);
});

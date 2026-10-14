import "./setup";
import { db } from "../src/lib/server/db";
import { runSeed } from "../prisma/seed";
import {
  createQCJob,
  claimJob,
  reclaimStaleJobs,
  processPendingQueuedJobs,
} from "../src/lib/server/qc/job-bridge";
import {
  getSchedulerState,
  runSchedulerTick,
  startQCScheduler,
  stopQCScheduler,
} from "../src/lib/server/qc/scheduler";

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

async function runSchedulerTestSuite() {
  console.log("================================================================================");
  console.log("SPANQC PHASE 2.2: QC SCHEDULER & RECOVERY VERIFICATION TEST SUITE");
  console.log("================================================================================");

  // Clean and seed
  await db.qCJob.deleteMany();
  await db.session.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();
  await runSeed();

  const spandsonsTenantId = "f8c5091c-50a3-4436-88bd-369c7c6b1727";
  const project = await db.project.findFirstOrThrow({
    where: { tenantId: spandsonsTenantId },
  });
  const user = await db.user.findFirstOrThrow({
    where: { tenantId: spandsonsTenantId },
  });

  // Ensure scheduler is stopped before starting tests
  stopQCScheduler();

  // -------------------------------------------------------------------------
  // TEST 1: QUEUED jobs are automatically processed by processPendingQueuedJobs
  // -------------------------------------------------------------------------
  console.log("\n[TEST 1] QUEUED jobs are processed in batch by queue worker");
  const originalFetch = globalThis.fetch;
  try {
    const mockReport = {
      report_id: "rep-sched-01",
      document_name: "test.pdf",
      sha256_hash: "mock",
      standard: "IPC/WHMA-A-620D",
      overall_outcome: "PASS",
      specification_is_complete: true,
      extraction_is_verified: true,
      total_page_count: 1,
      processed_page_count: 1,
      failed_page_count: 0,
      unprocessed_page_numbers: [],
      failed_page_numbers: [],
      rule_findings: [
        { rule_id: "RULE-PASS-00", outcome: "PASS", severity: "INFO" },
      ],
      candidate_observations: [],
      pages_rendered: [],
    };

    // Create job with autoDispatch disabled
    const { job: queuedJob } = await createQCJob({
      tenantId: spandsonsTenantId,
      projectId: project.id,
      userId: user.id,
      fileBuffer: VALID_PDF_BYTES,
      autoDispatch: false,
    });

    assert(queuedJob.status === "QUEUED", "Job is initially persisted in QUEUED status");

    // Mock fetch for analysis
    mockReport.sha256_hash = queuedJob.documentSha256;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockReport), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    // Run queue worker
    const processed = await processPendingQueuedJobs(1);
    assert(processed === 1, "Queue worker successfully processed 1 pending job");

    const refreshedJob = await db.qCJob.findUniqueOrThrow({
      where: { id: queuedJob.id },
    });
    assert(refreshedJob.status === "COMPLETED", "Job transitioned from QUEUED to COMPLETED");
    assert(refreshedJob.overallOutcome === "PASS", "Job overallOutcome is PASS");
  } finally {
    globalThis.fetch = originalFetch;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Single-instance scheduler tick reclaims stale jobs automatically
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Scheduler tick automatically reclaims stale jobs");
  const staleClaimedAt = new Date(Date.now() - 150_000); // 150s ago (exceeds 120s cutoff)
  const staleJob = await db.qCJob.create({
    data: {
      tenantId: spandsonsTenantId,
      projectId: project.id,
      userId: user.id,
      documentName: "stale_test.pdf",
      documentSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      storageKey: `tenants/${spandsonsTenantId}/documents/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.pdf`,
      standard: "IPC/WHMA-A-620D",
      status: "PROCESSING",
      claimToken: "stale-worker-token-001",
      claimedAt: staleClaimedAt,
      retryCount: 1,
      maxRetries: 3,
    },
  });

  const tickResult = await runSchedulerTick({ forceRecovery: true, staleThresholdMs: 120_000, processQueued: false });
  assert(tickResult.reclaimedCount === 1, "Scheduler tick reclaimed exactly 1 stale job");

  const recoveredJob = await db.qCJob.findUniqueOrThrow({
    where: { id: staleJob.id },
  });
  assert(recoveredJob.status === "QUEUED", "Stale job returned to QUEUED status");
  assert(recoveredJob.claimToken === null, "Claim token was cleared");
  assert(recoveredJob.claimedAt === null, "Claimed timestamp was cleared");
  await db.qCJob.delete({ where: { id: staleJob.id } });

  // -------------------------------------------------------------------------
  // TEST 3: Concurrent scheduler tick invocations do not overlap
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Concurrent scheduler tick invocations are guarded against overlap");
  const state = getSchedulerState();
  state.isExecuting = true; // Simulate tick in progress

  const concurrentTick = await runSchedulerTick();
  assert(concurrentTick.reclaimedCount === 0, "Concurrent tick skipped while isExecuting is true");
  assert(concurrentTick.processedCount === 0, "Concurrent tick did not attempt duplicate processing");

  state.isExecuting = false; // Reset lock

  // -------------------------------------------------------------------------
  // TEST 4: Simulated restart: stale PROCESSING job reclaimed & completed on boot
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Simulated process restart: abandoned job recovered and resumed to completion");
  try {
    const mockReport = {
      report_id: "rep-restart-01",
      document_name: "restart_test.pdf",
      sha256_hash: "mock",
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

    // Create a real file in storage and a job abandoned in PROCESSING before restart
    const { job: abandonedJob } = await createQCJob({
      tenantId: spandsonsTenantId,
      projectId: project.id,
      userId: user.id,
      fileBuffer: VALID_PDF_BYTES,
      autoDispatch: false,
    });

    mockReport.sha256_hash = abandonedJob.documentSha256;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockReport), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    // Simulate worker claimed it then died
    await db.qCJob.update({
      where: { id: abandonedJob.id },
      data: {
        status: "PROCESSING",
        claimToken: "dead-process-token-999",
        claimedAt: new Date(Date.now() - 200_000), // Died 200s ago
        retryCount: 1,
      },
    });

    // Verify it is currently in PROCESSING (would be permanently stuck without recovery)
    const stuckJob = await db.qCJob.findUniqueOrThrow({ where: { id: abandonedJob.id } });
    assert(stuckJob.status === "PROCESSING", "Job verified abandoned in PROCESSING state");

    // Simulate new server instance startup recovery tick
    const startupTick = await runSchedulerTick({ forceRecovery: true, staleThresholdMs: 120_000 });
    assert(startupTick.reclaimedCount >= 1, "Startup tick recovered the abandoned job");
    assert(startupTick.processedCount >= 1, "Startup tick immediately processed recovered job");

    // Verify the job was durably completed
    const completedAfterRestart = await db.qCJob.findUniqueOrThrow({
      where: { id: abandonedJob.id },
    });
    assert(
      completedAfterRestart.status === "REVIEW_REQUIRED",
      "Abandoned job transitioned cleanly to REVIEW_REQUIRED upon recovery"
    );
    assert(completedAfterRestart.overallOutcome === "REVIEW", "Outcome accurately persisted as REVIEW");
  } finally {
    globalThis.fetch = originalFetch;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Background scheduler start and stop lifecycle
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Scheduler start and stop lifecycle");
  startQCScheduler({ pollIntervalMs: 50, recoveryIntervalMs: 50, staleThresholdMs: 100 });
  const runningState = getSchedulerState();
  assert(runningState.isRunning === true, "Scheduler state is marked running");
  assert(runningState.timer !== null, "Timer handle exists");

  // Re-calling start does not spawn duplicate timers
  const timerBefore = runningState.timer;
  startQCScheduler({ pollIntervalMs: 50 });
  assert(runningState.timer === timerBefore, "Re-calling start preserves existing timer handle");

  stopQCScheduler();
  const stoppedState = getSchedulerState();
  assert(stoppedState.isRunning === false, "Scheduler state is marked stopped");
  assert(stoppedState.timer === null, "Timer handle cleared");

  console.log("\n================================================================================");
  console.log(`QC SCHEDULER TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSchedulerTestSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});

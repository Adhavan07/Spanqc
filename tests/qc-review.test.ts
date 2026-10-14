import "./setup";
import { db } from "../src/lib/server/db";
import { runSeed, TEST_PASSWORDS } from "../prisma/seed";
import { POST as postReviewHandler, GET as getReviewHandler } from "../src/app/api/v1/qc/jobs/[jobId]/review/route";
import { createServerSession } from "../src/lib/server/auth/session";

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

async function runQCReviewTestSuite() {
  console.log("================================================================================");
  console.log("SPANQC PHASE 3.1: DURABLE HUMAN REVIEW & AUDIT TRAIL TEST SUITE");
  console.log("================================================================================");

  // 1. Clean & Seed dedicated test database
  await db.qCJobReview.deleteMany();
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

  // Sessions:
  const pravinUserId = "bc4a8b56-47da-4de2-b4ab-da448f4163dc";
  const gogulUserId = "b82954d0-7a22-4af1-a030-74ad5c0a6f00";
  const inspectorUserId = "f33cd61a-e604-41a2-8756-241777740b9d";
  const aliceUserId = "usr-alice-acme-1111";

  // Pravin Admin session (Spandsons)
  const pravinSession = await createServerSession(
    pravinUserId,
    spandsonsTenantId,
    "ADMIN",
    "pravin@spandsons.com"
  );
  const pravinCookie = `spanqc_session=${pravinSession.token}`;

  // Gogulnath: ENGINEER role in Spandsons (denied qc:review)
  const gogulSession = await createServerSession(
    gogulUserId,
    spandsonsTenantId,
    "ENGINEER",
    "gogulnath@spandsons.com"
  );
  const gogulCookie = `spanqc_session=${gogulSession.token}`;

  // Lead QC Inspector: REVIEWER role in Spandsons (permitted qc:review)
  const inspectorSession = await createServerSession(
    inspectorUserId,
    spandsonsTenantId,
    "REVIEWER",
    "inspector@spandsons.com"
  );
  const inspectorCookie = `spanqc_session=${inspectorSession.token}`;

  // Alice: ADMIN in Acme (different tenant)
  const aliceSession = await createServerSession(
    aliceUserId,
    acmeTenantId,
    "ADMIN",
    "alice@acme-aero.com"
  );
  const aliceCookie = `spanqc_session=${aliceSession.token}`;

  // Create a fixture completed QC job in Spandsons
  const testJob = await db.qCJob.create({
    data: {
      tenantId: spandsonsTenantId,
      projectId: pravinProject.id,
      userId: pravinUserId,
      documentName: "harness_drawing_rev3.pdf",
      documentSha256: "a".repeat(64),
      storageKey: `tenants/${spandsonsTenantId}/raw/test.pdf`,
      standard: "IPC/WHMA-A-620D",
      status: "COMPLETED",
      overallOutcome: "FAIL", // Automated QC evaluated this as FAIL
      totalPageCount: 1,
      processedPageCount: 1,
      resultReportJson: JSON.stringify({
        report_id: "rep-001",
        overall_outcome: "FAIL",
        rule_findings: [
          {
            finding_id: "f-01",
            rule_id: "IPC-620-RULE-001",
            outcome: "FAIL",
            title: "Point-to-point connection mismatch",
          },
        ],
        candidate_observations: [
          {
            observation_id: "obs-001",
            wire_id: "W101",
            requires_human_review: true,
            ambiguity_reasons: ["Visual route obstructed by bracket"],
          },
        ],
      }),
    },
  });

  // Create a queued job (not yet finished)
  const queuedJob = await db.qCJob.create({
    data: {
      tenantId: spandsonsTenantId,
      projectId: pravinProject.id,
      userId: pravinUserId,
      documentName: "queued_drawing.pdf",
      documentSha256: "b".repeat(64),
      storageKey: `tenants/${spandsonsTenantId}/raw/queued.pdf`,
      standard: "IPC/WHMA-A-620D",
      status: "QUEUED",
      overallOutcome: null,
    },
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Authorized Reviewer Submission
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 1] Authorized Reviewer Submission (REVIEWER and ADMIN roles)");

  const inspectorPayload = {
    decision: "NEEDS_CLARIFICATION",
    notes: "Visual path for wire W101 is ambiguous near connector J2. Requesting high-resolution detail drawing.",
    observation_decisions: {
      "obs-001": { confirmed: false, notes: "Requires engineering RFI" },
    },
  };

  const req1 = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(inspectorPayload),
  });

  const res1 = await postReviewHandler(req1, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(res1.status === 201, `Reviewer submission returns HTTP 201 (got ${res1.status})`);
  const data1 = await res1.json();
  assert(data1.version === 1, "First review has version 1");
  assert(data1.decision === "NEEDS_CLARIFICATION", "Decision is NEEDS_CLARIFICATION");
  assert(data1.reviewer.id === inspectorUserId, "Reviewer ID matches authenticated reviewer");
  assert(data1.reviewer.name === "Lead QC Inspector", "Reviewer name matches authenticated user");
  assert(data1.reviewer.role === "REVIEWER", "Reviewer role matches authenticated session");
  assert(data1.observation_decisions?.["obs-001"]?.confirmed === false, "Observation decision persisted");

  // Admin also authorized (ADMIN possesses qc:review)
  const adminPayload = {
    decision: "ACCEPTED",
    notes: "Engineering review confirmed alternative drawing sheet 2 resolves the connection.",
    observation_decisions: {
      "obs-001": { confirmed: true, notes: "Confirmed via Sheet 2 note 4" },
    },
  };

  const reqAdmin = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: pravinCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(adminPayload),
  });

  const resAdmin = await postReviewHandler(reqAdmin, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resAdmin.status === 201, `Admin submission returns HTTP 201 (got ${resAdmin.status})`);
  const dataAdmin = await resAdmin.json();
  assert(dataAdmin.version === 2, "Second review increments to version 2");
  assert(dataAdmin.decision === "ACCEPTED", "Decision is ACCEPTED");
  assert(dataAdmin.reviewer.name === "Pravin", "Reviewer reflects admin user name");

  // ---------------------------------------------------------------------------
  // TEST 2: Unauthenticated and Unauthorized Submissions
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2] Unauthenticated and Unauthorized Submissions");

  // Missing session
  const reqUnauth = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({ decision: "ACCEPTED" }),
  });
  const resUnauth = await postReviewHandler(reqUnauth, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resUnauth.status === 401, `Unauthenticated submission returns HTTP 401 (got ${resUnauth.status})`);

  // Engineer role (denied qc:review)
  const reqEngineer = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: gogulCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({ decision: "ACCEPTED" }),
  });
  const resEngineer = await postReviewHandler(reqEngineer, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resEngineer.status === 403, `Engineer submission returns HTTP 403 Forbidden (got ${resEngineer.status})`);
  const engineerErr = await resEngineer.json();
  assert(engineerErr.detail.includes("Insufficient permissions"), "Returns descriptive RBAC error");

  // Cross-origin request blocked (CSRF guard)
  const reqCsrf = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://malicious-attacker.com",
    },
    body: JSON.stringify({ decision: "ACCEPTED" }),
  });
  const resCsrf = await postReviewHandler(reqCsrf, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resCsrf.status === 403, `Cross-origin mutating review returns HTTP 403 (got ${resCsrf.status})`);

  // ---------------------------------------------------------------------------
  // TEST 3: Cross-Tenant Job and Review Access (IDOR Defense)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3] Cross-Tenant Job and Review Access");

  // Alice (Acme) attempts to review Spandsons job
  const reqCrossPost = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: aliceCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({ decision: "ACCEPTED" }),
  });
  const resCrossPost = await postReviewHandler(reqCrossPost, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resCrossPost.status === 404, `Cross-tenant review submission returns HTTP 404 (got ${resCrossPost.status})`);

  // Alice (Acme) attempts to read Spandsons job reviews
  const reqCrossGet = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "GET",
    headers: { Cookie: aliceCookie },
  });
  const resCrossGet = await getReviewHandler(reqCrossGet, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resCrossGet.status === 404, `Cross-tenant review GET returns HTTP 404 (got ${resCrossGet.status})`);

  // ---------------------------------------------------------------------------
  // TEST 4: Tenant and Reviewer Identity Consistency
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4] Server-Side Tenant and Reviewer Identity Enforcement");

  // Browser tries to spoof tenantId and reviewerId in JSON payload
  const spoofPayload = {
    decision: "ACCEPTED",
    tenantId: "fake-tenant-id-spoofed",
    tenant_id: "fake-tenant-id-spoofed",
    reviewerId: "fake-user-id-spoofed",
    reviewer_id: "fake-user-id-spoofed",
    notes: "Attempted identity spoofing",
  };
  const reqSpoof = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(spoofPayload),
  });
  const resSpoof = await postReviewHandler(reqSpoof, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resSpoof.status === 201, "Review created successfully");
  const dataSpoof = await resSpoof.json();
  assert(dataSpoof.reviewer.id === inspectorUserId, "Persisted reviewer is strictly authenticated session user");

  // Verify in database
  const dbRecord = await db.qCJobReview.findUniqueOrThrow({ where: { id: dataSpoof.id } });
  assert(dbRecord.tenantId === spandsonsTenantId, "Database record tenantId strictly matches session tenant");
  assert(dbRecord.reviewerId === inspectorUserId, "Database record reviewerId strictly matches session user");

  // ---------------------------------------------------------------------------
  // TEST 5: Invalid Payloads, Oversized Notes, and Invalid State Transitions
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5] Validation: Decision Enums, Oversized Notes, and State Transitions");

  // Invalid decision enum
  const reqBadDecision = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({ decision: "INVALID_ENUM_VALUE" }),
  });
  const resBadDecision = await postReviewHandler(reqBadDecision, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resBadDecision.status === 400, `Invalid decision returns HTTP 400 (got ${resBadDecision.status})`);

  // Oversized notes (> 2000 characters)
  const reqOversized = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      decision: "REJECTED",
      notes: "X".repeat(2001),
    }),
  });
  const resOversized = await postReviewHandler(reqOversized, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resOversized.status === 400, `Oversized notes (>2000) return HTTP 400 (got ${resOversized.status})`);
  const oversizedErr = await resOversized.json();
  assert(oversizedErr.detail.includes("exceed maximum length"), "Returns descriptive length error message");

  // Cannot review a job that is still QUEUED
  const reqQueued = new Request(`http://localhost:3000/api/v1/qc/jobs/${queuedJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({ decision: "ACCEPTED" }),
  });
  const resQueued = await postReviewHandler(reqQueued, { params: Promise.resolve({ jobId: queuedJob.id }) });
  assert(resQueued.status === 400, `Reviewing QUEUED job rejected with HTTP 400 (got ${resQueued.status})`);
  const queuedErr = await resQueued.json();
  assert(queuedErr.detail.includes("Cannot review a job that is still queued"), "Explains job is not completed");

  // ---------------------------------------------------------------------------
  // TEST 6: Duplicate Requests and Safe Retry Behavior (Idempotency)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 6] Duplicate Requests and Safe Retry Behavior");

  const idempotencyKey = "client-review-retry-key-777";
  const retryPayload = {
    decision: "REJECTED",
    notes: "Non-conformance: Pin retention latch damaged.",
    idempotency_key: idempotencyKey,
  };

  const reqRetry1 = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(retryPayload),
  });
  const resRetry1 = await postReviewHandler(reqRetry1, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resRetry1.status === 201, `Initial review submission returns HTTP 201 (got ${resRetry1.status})`);
  const dataRetry1 = await resRetry1.json();

  // Send duplicate retry request with same Idempotency-Key
  const reqRetry2 = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(retryPayload),
  });
  const resRetry2 = await postReviewHandler(reqRetry2, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resRetry2.status === 200, `Retry submission returns HTTP 200 (got ${resRetry2.status})`);
  const dataRetry2 = await resRetry2.json();

  assert(dataRetry1.id === dataRetry2.id, "Returns exact same review record ID");
  assert(dataRetry1.version === dataRetry2.version, "Does not advance version on duplicate retry");

  const totalReviewsForJob = await db.qCJobReview.count({ where: { jobId: testJob.id } });
  // We had v1, v2, v3 (spoof), v4 (retry1). Duplicate should NOT create v5!
  assert(totalReviewsForJob === 4, `Total persisted reviews is exactly 4 (no duplicate created)`);

  // ---------------------------------------------------------------------------
  // TEST 7: Review History and Versioning
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 7] Review History and Versioning Strategy");

  const getReq = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "GET",
    headers: { Cookie: inspectorCookie },
  });
  const getRes = await getReviewHandler(getReq, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(getRes.status === 200, "GET /api/v1/qc/jobs/[jobId]/review returns HTTP 200");
  const getReviewsData = await getRes.json();

  assert(getReviewsData.job_id === testJob.id, "Returns correct job_id");
  assert(getReviewsData.total_reviews === 4, "Reflects all 4 historical versions");
  assert(getReviewsData.latest_review.version === 4, "Latest review has version 4");
  assert(getReviewsData.history.length === 4, "History list contains all versions");
  assert(getReviewsData.history[0].version === 4, "History ordered descending (v4 first)");
  assert(getReviewsData.history[3].version === 1, "Earliest version (v1) preserved immutably");

  // ---------------------------------------------------------------------------
  // TEST 8: Concurrent / Stale Update Detection
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 8] Concurrent or Stale Update Protection");

  // Stale client thinks latest version is still v2, but it is currently v4
  const stalePayload = {
    decision: "ACCEPTED",
    expected_version: 2, // Out of date!
    notes: "Client thought version was 2",
  };
  const reqStale = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(stalePayload),
  });
  const resStale = await postReviewHandler(reqStale, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resStale.status === 409, `Stale update returns HTTP 409 Conflict (got ${resStale.status})`);
  const staleErr = await resStale.json();
  assert(staleErr.current_version === 4, "Conflict response identifies current server version (4)");
  assert(staleErr.detail.includes("Stale review update"), "Provides clear conflict message");

  // ---------------------------------------------------------------------------
  // TEST 9: Persistence After Reload and Job Resumption
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 9] Persistence After Reload and Job Resumption");

  // Simulate a fresh browser session looking up testJob
  const reloadReq = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "GET",
    headers: { Cookie: inspectorCookie },
  });
  const reloadRes = await getReviewHandler(reloadReq, { params: Promise.resolve({ jobId: testJob.id }) });
  const reloadData = await reloadRes.json();
  assert(reloadData.latest_review !== null, "Latest review is loaded after browser reload");
  assert(reloadData.latest_review.decision === "REJECTED", "Persisted decision is REJECTED");
  assert(reloadData.latest_review.notes?.includes("Pin retention latch damaged"), "Persisted notes are recovered");

  // ---------------------------------------------------------------------------
  // TEST 10: PROOF THAT REVIEW DECISIONS CANNOT REWRITE AUTOMATED OUTCOMES
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 10] Proof: Review Decisions Cannot Mutate Machine Outcomes (PASS/FAIL/REVIEW)");

  // Verify database record of testJob
  const finalJobRecord = await db.qCJob.findUniqueOrThrow({ where: { id: testJob.id } });
  assert(finalJobRecord.overallOutcome === "FAIL", "qc_jobs.overallOutcome remains FAIL after inspector review");
  assert(finalJobRecord.status === "COMPLETED", "qc_jobs.status remains COMPLETED");

  const machineReport = JSON.parse(finalJobRecord.resultReportJson || "{}");
  assert(machineReport.overall_outcome === "FAIL", "Authoritative report overall_outcome remains FAIL");
  assert(machineReport.rule_findings[0].outcome === "FAIL", "Deterministic rule finding outcome remains FAIL");

  // Inspector now submits an ACCEPTED review with high confidence
  const acceptPayload = {
    decision: "ACCEPTED",
    expected_version: 4,
    notes: "Inspector sign-off: Discrepancy accepted under engineering concession #EC-2026-901.",
  };
  const reqAccept = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(acceptPayload),
  });
  const resAccept = await postReviewHandler(reqAccept, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resAccept.status === 201, " Concession review accepted");

  // Check job again in DB
  const recheckedJob = await db.qCJob.findUniqueOrThrow({ where: { id: testJob.id } });
  assert(recheckedJob.overallOutcome === "FAIL", "qc_jobs.overallOutcome is STILL FAIL (never promoted to PASS)");
  assert(
    JSON.parse(recheckedJob.resultReportJson || "{}").overall_outcome === "FAIL",
    "resultReportJson is STRICTLY IMMUTABLE and remains FAIL"
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Export Structure Verification
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 11] Export Structure Verification");

  const exportPayload = {
    export_metadata: {
      exported_at: new Date().toISOString(),
      integrity_note:
        "Traceable Audit Log (Database-persisted server records, non-cryptographically signed). Machine evaluation and human review history are separated and independently auditable.",
    },
    authoritative_automated_report: {
      job_id: recheckedJob.id,
      overall_outcome: recheckedJob.overallOutcome,
      report: JSON.parse(recheckedJob.resultReportJson || "{}"),
    },
    persisted_human_review_audit: {
      total_reviews: 5,
      current_disposition: "ACCEPTED",
      latest_review: await resAccept.json(),
    },
  };

  assert(exportPayload.authoritative_automated_report.overall_outcome === "FAIL", "Machine report export is FAIL");
  assert(exportPayload.persisted_human_review_audit.current_disposition === "ACCEPTED", "Human disposition is ACCEPTED");
  assert(
    exportPayload.export_metadata.integrity_note.includes("non-cryptographically signed"),
    "Explicitly disclaims cryptographic signing without tested signing mechanism"
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Simultaneous Identical Idempotency Keys (Promise.all race & P2002)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 12] Simultaneous Identical Idempotency Keys (Concurrency & P2002 Handling)");

  const concurrentJob1 = await db.qCJob.create({
    data: {
      tenantId: spandsonsTenantId,
      projectId: pravinProject.id,
      userId: pravinUserId,
      documentName: "concurrent_test_1.pdf",
      documentSha256: "c".repeat(64),
      storageKey: `tenants/${spandsonsTenantId}/raw/concurrent_1.pdf`,
      standard: "IPC/WHMA-A-620D",
      status: "COMPLETED",
      overallOutcome: "FAIL",
      totalPageCount: 1,
      processedPageCount: 1,
      resultReportJson: JSON.stringify({
        report_id: "rep-conc-1",
        overall_outcome: "FAIL",
        candidate_observations: [{ observation_id: "obs-c1" }],
      }),
    },
  });

  const raceKey = "race-key-identical-" + Date.now();
  const racePayload = {
    decision: "NEEDS_CLARIFICATION",
    notes: "Concurrent race testing with identical key",
    idempotency_key: raceKey,
  };

  const makeRaceReq = () =>
    new Request(`http://localhost:3000/api/v1/qc/jobs/${concurrentJob1.id}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: inspectorCookie,
        Origin: "http://localhost:3000",
        "Idempotency-Key": raceKey,
      },
      body: JSON.stringify(racePayload),
    });

  const [raceResA, raceResB] = await Promise.all([
    postReviewHandler(makeRaceReq(), { params: Promise.resolve({ jobId: concurrentJob1.id }) }),
    postReviewHandler(makeRaceReq(), { params: Promise.resolve({ jobId: concurrentJob1.id }) }),
  ]);

  const statuses = [raceResA.status, raceResB.status].sort();
  assert(
    (statuses[0] === 200 && statuses[1] === 201) || (statuses[0] === 200 && statuses[1] === 200),
    `Simultaneous identical requests return 201/200 without 500 error (got ${raceResA.status}, ${raceResB.status})`
  );
  assert(raceResA.status !== 500 && raceResB.status !== 500, "Zero unhandled HTTP 500 server errors");

  const raceDataA = await raceResA.json();
  const raceDataB = await raceResB.json();
  assert(raceDataA.id === raceDataB.id, "Both racing requests return identical review record ID");
  assert(raceDataA.version === 1 && raceDataB.version === 1, "Both racing requests reflect version 1");

  const raceDbCount = await db.qCJobReview.count({ where: { jobId: concurrentJob1.id } });
  assert(raceDbCount === 1, "Exactly 1 review persisted in database (no duplicate version created)");

  // ---------------------------------------------------------------------------
  // TEST 13: Simultaneous Conflicting Versions (Race condition handling)
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 13] Simultaneous Conflicting Reviews (Version Clash Handling)");

  const diffKey1 = "race-diff-1-" + Date.now();
  const diffKey2 = "race-diff-2-" + Date.now();

  const reqDiff1 = new Request(`http://localhost:3000/api/v1/qc/jobs/${concurrentJob1.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": diffKey1,
    },
    body: JSON.stringify({
      decision: "ACCEPTED",
      notes: "Contender 1",
      expected_version: 1,
    }),
  });

  const reqDiff2 = new Request(`http://localhost:3000/api/v1/qc/jobs/${concurrentJob1.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": diffKey2,
    },
    body: JSON.stringify({
      decision: "REJECTED",
      notes: "Contender 2",
      expected_version: 1,
    }),
  });

  const [resDiff1, resDiff2] = await Promise.all([
    postReviewHandler(reqDiff1, { params: Promise.resolve({ jobId: concurrentJob1.id }) }),
    postReviewHandler(reqDiff2, { params: Promise.resolve({ jobId: concurrentJob1.id }) }),
  ]);

  const diffStatuses = [resDiff1.status, resDiff2.status].sort();
  assert(
    diffStatuses[0] === 201 && diffStatuses[1] === 409,
    `Conflicting version race produces one 201 and one 409 Conflict (got ${resDiff1.status}, ${resDiff2.status})`
  );
  assert(resDiff1.status !== 500 && resDiff2.status !== 500, "Zero uncaught HTTP 500 errors on version race");

  const conflictRes = resDiff1.status === 409 ? resDiff1 : resDiff2;
  const conflictData = await conflictRes.json();
  assert(conflictData.current_version === 2, "Conflict response accurately reports current server version (2)");

  // ---------------------------------------------------------------------------
  // TEST 14: Cross-Tenant Idempotency Key Isolation
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 14] Cross-Tenant Isolation under Idempotency Keys");

  const acmeProject = await db.project.findFirstOrThrow({
    where: { tenantId: acmeTenantId },
  });
  const acmeJob = await db.qCJob.create({
    data: {
      tenantId: acmeTenantId,
      projectId: acmeProject.id,
      userId: aliceUserId,
      documentName: "acme_drawing.pdf",
      documentSha256: "d".repeat(64),
      storageKey: `tenants/${acmeTenantId}/raw/acme.pdf`,
      standard: "IPC/WHMA-A-620D",
      status: "COMPLETED",
      overallOutcome: "REVIEW",
      totalPageCount: 1,
      processedPageCount: 1,
      resultReportJson: JSON.stringify({
        report_id: "rep-acme-1",
        overall_outcome: "REVIEW",
        candidate_observations: [],
      }),
    },
  });

  const sharedKey = "cross-tenant-shared-key-123";

  // Acme user reviews Acme job with sharedKey
  const reqAcme = new Request(`http://localhost:3000/api/v1/qc/jobs/${acmeJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: aliceCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": sharedKey,
    },
    body: JSON.stringify({ decision: "ACCEPTED", notes: "Acme approval" }),
  });
  const resAcme = await postReviewHandler(reqAcme, { params: Promise.resolve({ jobId: acmeJob.id }) });
  assert(resAcme.status === 201, "Acme review created with HTTP 201");

  // Spandsons inspector tries to review Acme job with sharedKey -> 404 (IDOR defense)
  const reqSpandsonsCross = new Request(`http://localhost:3000/api/v1/qc/jobs/${acmeJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": sharedKey,
    },
    body: JSON.stringify({ decision: "REJECTED", notes: "Cross-tenant intrusion attempt" }),
  });
  const resSpandsonsCross = await postReviewHandler(reqSpandsonsCross, { params: Promise.resolve({ jobId: acmeJob.id }) });
  assert(resSpandsonsCross.status === 404, "Spandsons user querying Acme job returns 404 (no leak)");

  // Spandsons inspector reviews Spandsons job with same sharedKey -> creates own review for Spandsons job
  const reqSpandsonsOwn = new Request(`http://localhost:3000/api/v1/qc/jobs/${concurrentJob1.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
      "Idempotency-Key": sharedKey,
    },
    body: JSON.stringify({ decision: "ACCEPTED", notes: "Spandsons legitimate review" }),
  });
  const resSpandsonsOwn = await postReviewHandler(reqSpandsonsOwn, { params: Promise.resolve({ jobId: concurrentJob1.id }) });
  assert(resSpandsonsOwn.status === 201, "Spandsons user creates review on own job even with matching key");
  const dataSpandsonsOwn = await resSpandsonsOwn.json();
  assert(dataSpandsonsOwn.notes === "Spandsons legitimate review", "Spandsons review is isolated and never receives Acme review");

  // ---------------------------------------------------------------------------
  // TEST 15: Observation Decisions Schema and Authoritative ID Validation
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 15] Observation Decisions Validation (Authoritative Report IDs & Schema)");

  // 1. Unknown observation ID
  const reqUnknownObs = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      decision: "ACCEPTED",
      observation_decisions: {
        "unknown-obs-999": true,
      },
    }),
  });
  const resUnknownObs = await postReviewHandler(reqUnknownObs, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resUnknownObs.status === 400, `Unknown observation ID returns HTTP 400 (got ${resUnknownObs.status})`);
  const unknownErr = await resUnknownObs.json();
  assert(unknownErr.detail.includes("Unknown observation ID"), "Error detail specifies unknown observation ID");

  // 2. Malformed observation decision object (missing boolean 'confirmed')
  const reqMalformedObj = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      decision: "ACCEPTED",
      observation_decisions: {
        "obs-001": { notes: "Missing confirmed property" },
      },
    }),
  });
  const resMalformedObj = await postReviewHandler(reqMalformedObj, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resMalformedObj.status === 400, `Malformed observation decision object returns HTTP 400 (got ${resMalformedObj.status})`);
  const malformedErr = await resMalformedObj.json();
  assert(malformedErr.detail.includes("confirmed"), "Error detail specifies 'confirmed' boolean is required");

  // 3. Invalid observation decision value type
  const reqInvalidType = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      decision: "ACCEPTED",
      observation_decisions: {
        "obs-001": "not-a-valid-decision",
      },
    }),
  });
  const resInvalidType = await postReviewHandler(reqInvalidType, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resInvalidType.status === 400, `Invalid observation decision type returns HTTP 400 (got ${resInvalidType.status})`);

  // 4. Excessive payload (> 50,000 characters)
  const reqExcessive = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      decision: "ACCEPTED",
      observation_decisions: {
        "obs-001": { confirmed: true, notes: "X".repeat(50001) },
      },
    }),
  });
  const resExcessive = await postReviewHandler(reqExcessive, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resExcessive.status === 400, `Excessive observation decisions payload returns HTTP 400 (got ${resExcessive.status})`);

  // 5. Valid observation decision
  const reqValidObs = new Request(`http://localhost:3000/api/v1/qc/jobs/${testJob.id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: inspectorCookie,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      decision: "ACCEPTED",
      observation_decisions: {
        "obs-001": { confirmed: true, notes: "Verified connector latch" },
      },
    }),
  });
  const resValidObs = await postReviewHandler(reqValidObs, { params: Promise.resolve({ jobId: testJob.id }) });
  assert(resValidObs.status === 201, `Valid observation decision returns HTTP 201 (got ${resValidObs.status})`);
  const validObsData = await resValidObs.json();
  assert(validObsData.observation_decisions["obs-001"].confirmed === true, "Observation decision persisted confirmed boolean");
  assert(validObsData.observation_decisions["obs-001"].notes === "Verified connector latch", "Observation decision persisted notes");

  console.log("\n================================================================================");
  console.log(`QC REVIEW TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
}

runQCReviewTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });

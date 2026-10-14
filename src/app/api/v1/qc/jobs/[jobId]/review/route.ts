import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { extractRequestAuth, validateDBSession } from "@/lib/server/auth/session";
import { validateOrigin } from "@/lib/server/auth/csrf";
import { hasPermission } from "@/lib/server/auth/rbac";
import type { ReviewDecision, SanitizedReviewRecord } from "@/lib/server/qc/types";

export const ALLOWED_DECISIONS: readonly ReviewDecision[] = [
  "ACCEPTED",
  "REJECTED",
  "NEEDS_CLARIFICATION",
] as const;

export const MAX_NOTES_LENGTH = 2000;

function sanitizeReview(r: any): SanitizedReviewRecord {
  let obsDecisions: Record<string, unknown> | null = null;
  if (r.observationDecisions) {
    try {
      obsDecisions = JSON.parse(r.observationDecisions);
    } catch {
      obsDecisions = null;
    }
  }

  return {
    id: r.id,
    job_id: r.jobId,
    version: r.version,
    decision: r.decision as ReviewDecision,
    notes: r.notes || null,
    observation_decisions: obsDecisions,
    idempotency_key: r.idempotencyKey || null,
    reviewer: {
      id: r.reviewer?.id || r.reviewerId,
      name: r.reviewer?.name || "Unknown",
      email: r.reviewer?.email || "unknown@spanqc.local",
      role: r.reviewer?.role || "REVIEWER",
    },
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
    updated_at: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt).toISOString(),
  };
}

async function resolveJobId(
  request: Request,
  context?: { params?: Promise<{ jobId: string }> | { jobId: string } }
): Promise<string | undefined> {
  let jobId: string | undefined;
  if (context?.params) {
    const resolved = await Promise.resolve(context.params);
    jobId = resolved?.jobId;
  }
  if (!jobId) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const revIdx = parts.indexOf("review");
    if (revIdx > 0) {
      jobId = parts[revIdx - 1];
    } else {
      jobId = parts[parts.length - 1];
    }
  }
  return jobId;
}

export async function GET(
  request: Request,
  context?: { params?: Promise<{ jobId: string }> | { jobId: string } }
) {
  // 1. Authenticate server-side
  const auth = extractRequestAuth(request);
  if (!auth.token) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const session = await validateDBSession(auth.token);
  if (!session) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  // 2. RBAC check (ADMIN, ENGINEER, REVIEWER can view reviews)
  const canRead =
    hasPermission(session.user.role, "projects:read") ||
    hasPermission(session.user.role, "qc:review") ||
    hasPermission(session.user.role, "qc:execute");

  if (!canRead) {
    return NextResponse.json(
      { detail: "Forbidden: Insufficient permissions to view QC reviews." },
      { status: 403 }
    );
  }

  // 3. Resolve jobId
  const jobId = await resolveJobId(request, context);
  if (!jobId || jobId === "review") {
    return NextResponse.json({ detail: "Job ID is required." }, { status: 400 });
  }

  // 4. Fetch job to verify existence and tenant isolation
  const job = await db.qCJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.tenantId !== session.tenantId) {
    // Return 404 to avoid leaking cross-tenant existence (IDOR defense)
    return NextResponse.json({ detail: "QC job not found." }, { status: 404 });
  }

  // 5. Fetch all reviews ordered by version descending (latest first)
  const reviews = await db.qCJobReview.findMany({
    where: {
      jobId: job.id,
      tenantId: session.tenantId,
    },
    orderBy: { version: "desc" },
    include: {
      reviewer: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  const sanitized = reviews.map(sanitizeReview);

  return NextResponse.json({
    job_id: job.id,
    total_reviews: sanitized.length,
    latest_review: sanitized[0] || null,
    history: sanitized,
  });
}

export async function POST(
  request: Request,
  context?: { params?: Promise<{ jobId: string }> | { jobId: string } }
) {
  // 1. Authenticate server-side
  const auth = extractRequestAuth(request);
  if (!auth.token) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  // 2. CSRF Guard on cookie auth
  if (auth.authType === "cookie" && !validateOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin request blocked." }, { status: 403 });
  }

  const session = await validateDBSession(auth.token);
  if (!session) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  // 3. RBAC: Enforce qc:review permission
  if (!hasPermission(session.user.role, "qc:review")) {
    return NextResponse.json(
      { detail: "Forbidden: Insufficient permissions to review QC jobs." },
      { status: 403 }
    );
  }

  // 4. Resolve jobId
  const jobId = await resolveJobId(request, context);
  if (!jobId || jobId === "review") {
    return NextResponse.json({ detail: "Job ID is required." }, { status: 400 });
  }

  // 5. Fetch job and verify tenant boundary
  const job = await db.qCJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.tenantId !== session.tenantId) {
    return NextResponse.json({ detail: "QC job not found." }, { status: 404 });
  }

  // 6. Check job status - can only review terminal jobs (COMPLETED, REVIEW_REQUIRED, FAILED)
  if (["QUEUED", "PROCESSING"].includes(job.status)) {
    return NextResponse.json(
      { detail: "Cannot review a job that is still queued or processing. Please wait for completion." },
      { status: 400 }
    );
  }

  // 7. Parse and validate payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Malformed JSON request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Request body must be a JSON object." }, { status: 400 });
  }

  // Validate decision
  const decision = body.decision;
  if (!decision || typeof decision !== "string" || !ALLOWED_DECISIONS.includes(decision as ReviewDecision)) {
    return NextResponse.json(
      {
        detail: `Invalid decision '${decision}'. Must be one of: ${ALLOWED_DECISIONS.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // Validate notes
  let notes: string | null = null;
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") {
      return NextResponse.json({ detail: "Review notes must be a string." }, { status: 400 });
    }
    const trimmedNotes = body.notes.trim();
    if (trimmedNotes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        {
          detail: `Review notes exceed maximum length of ${MAX_NOTES_LENGTH} characters (received ${trimmedNotes.length}).`,
        },
        { status: 400 }
      );
    }
    notes = trimmedNotes || null;
  }

  // 7c. Parse authoritative persisted report to collect recognized observation IDs
  const candidateObservationIds = new Set<string>();
  if (job.resultReportJson) {
    try {
      const parsedReport = JSON.parse(job.resultReportJson);
      if (Array.isArray(parsedReport.candidate_observations)) {
        for (const obs of parsedReport.candidate_observations) {
          if (obs && typeof obs.observation_id === "string") {
            candidateObservationIds.add(obs.observation_id);
          } else if (obs && typeof obs.id === "string") {
            candidateObservationIds.add(obs.id);
          }
        }
      }
      if (Array.isArray(parsedReport.observations)) {
        for (const obs of parsedReport.observations) {
          if (obs && typeof obs.observation_id === "string") {
            candidateObservationIds.add(obs.observation_id);
          } else if (obs && typeof obs.id === "string") {
            candidateObservationIds.add(obs.id);
          }
        }
      }
    } catch {
      // Authoritative report in DB is malformed or unparseable JSON; leave candidateObservationIds empty
    }
  }

  // Validate observation_decisions if provided
  let observationDecisionsJson: string | null = null;
  if (body.observation_decisions !== undefined && body.observation_decisions !== null) {
    if (typeof body.observation_decisions !== "object" || Array.isArray(body.observation_decisions)) {
      return NextResponse.json(
        { detail: "observation_decisions must be a key-value object." },
        { status: 400 }
      );
    }
    try {
      observationDecisionsJson = JSON.stringify(body.observation_decisions);
      if (observationDecisionsJson.length > 50000) {
        return NextResponse.json(
          { detail: "observation_decisions payload is too large." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { detail: "Invalid observation_decisions serialization." },
        { status: 400 }
      );
    }

    // Validate each observation decision against authoritative report and explicit schema
    const allowedDecisionKeys = new Set(["confirmed", "notes"]);
    for (const [obsId, decisionVal] of Object.entries(body.observation_decisions)) {
      if (!candidateObservationIds.has(obsId)) {
        return NextResponse.json(
          {
            detail: `Unknown observation ID '${obsId}'. Observation decisions must correspond to candidate observations in the authoritative report.`,
          },
          { status: 400 }
        );
      }

      if (typeof decisionVal === "boolean") {
        // Valid boolean shorthand
        continue;
      } else if (
        typeof decisionVal === "object" &&
        decisionVal !== null &&
        !Array.isArray(decisionVal)
      ) {
        const valObj = decisionVal as Record<string, unknown>;
        if (typeof valObj.confirmed !== "boolean") {
          return NextResponse.json(
            {
              detail: `Invalid decision for observation '${obsId}': 'confirmed' boolean property is required.`,
            },
            { status: 400 }
          );
        }

        if (valObj.notes !== undefined && valObj.notes !== null) {
          if (typeof valObj.notes !== "string") {
            return NextResponse.json(
              {
                detail: `Invalid notes for observation '${obsId}': notes must be a string.`,
              },
              { status: 400 }
            );
          }
          if (valObj.notes.length > 500) {
            return NextResponse.json(
              {
                detail: `Notes for observation '${obsId}' exceed maximum allowed length of 500 characters.`,
              },
              { status: 400 }
            );
          }
        }

        for (const propKey of Object.keys(valObj)) {
          if (!allowedDecisionKeys.has(propKey)) {
            return NextResponse.json(
              {
                detail: `Unrecognized property '${propKey}' in observation decision for '${obsId}'.`,
              },
              { status: 400 }
            );
          }
        }
      } else {
        return NextResponse.json(
          {
            detail: `Malformed decision value for observation '${obsId}'. Expected boolean or object { confirmed: boolean, notes?: string }.`,
          },
          { status: 400 }
        );
      }
    }
  }

  // Check idempotencyKey (from header or body)
  const idempotencyKey =
    request.headers.get("Idempotency-Key")?.trim() ||
    (typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : null);

  if (idempotencyKey) {
    const existing = await db.qCJobReview.findFirst({
      where: {
        jobId: job.id,
        tenantId: session.tenantId,
        idempotencyKey,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (existing) {
      // Safe duplicate retry: return existing persisted review without creating duplicate version
      return NextResponse.json(sanitizeReview(existing), { status: 200 });
    }
  }

  // Concurrency / Stale Update Guard
  // If client passes expected_version, verify it matches current latest version
  const latestReview = await db.qCJobReview.findFirst({
    where: { jobId: job.id, tenantId: session.tenantId },
    orderBy: { version: "desc" },
  });

  const currentLatestVersion = latestReview?.version ?? 0;

  if (body.expected_version !== undefined && body.expected_version !== null) {
    const expected = Number(body.expected_version);
    if (!Number.isInteger(expected) || expected !== currentLatestVersion) {
      return NextResponse.json(
        {
          detail: `Stale review update: A newer review version (v${currentLatestVersion}) exists. Please refresh and review latest status before submitting.`,
          current_version: currentLatestVersion,
        },
        { status: 409 }
      );
    }
  }

  const nextVersion = currentLatestVersion + 1;

  // Derive reviewer identity and tenant EXCLUSIVELY from authenticated session
  // Any client-supplied tenantId or reviewerId in body is strictly ignored
  let newReview;
  try {
    newReview = await db.qCJobReview.create({
      data: {
        jobId: job.id,
        tenantId: session.tenantId,
        reviewerId: session.user.id,
        version: nextVersion,
        decision,
        notes,
        observationDecisions: observationDecisionsJson,
        idempotencyKey: idempotencyKey || null,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      // Handle unique constraint race (P2002)
      // 1. If duplicate request with identical idempotency key lost race, return existing review with HTTP 200
      if (idempotencyKey) {
        const existingIdempotent = await db.qCJobReview.findFirst({
          where: {
            jobId: job.id,
            tenantId: session.tenantId,
            idempotencyKey,
          },
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
        if (existingIdempotent) {
          return NextResponse.json(sanitizeReview(existingIdempotent), { status: 200 });
        }
      }

      // 2. Conflicting version race: query latest review to return current_version with HTTP 409
      const recheckedLatest = await db.qCJobReview.findFirst({
        where: { jobId: job.id, tenantId: session.tenantId },
        orderBy: { version: "desc" },
      });
      const currentVersion = recheckedLatest?.version ?? currentLatestVersion;
      return NextResponse.json(
        {
          detail: `Review version conflict: A newer review version (v${currentVersion}) exists. Please refresh and review latest status before submitting.`,
          current_version: currentVersion,
        },
        { status: 409 }
      );
    }
    throw err;
  }

  // CRITICAL INVARIANT: The automated QC outcome (job.overallOutcome) and automated report (job.resultReportJson)
  // MUST NEVER BE MUTATED by human review. The automated evaluation remains immutable.
  
  return NextResponse.json(sanitizeReview(newReview), { status: 201 });
}

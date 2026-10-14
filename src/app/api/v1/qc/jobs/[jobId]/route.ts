import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { extractRequestAuth, validateDBSession } from "@/lib/server/auth/session";
import { hasPermission } from "@/lib/server/auth/rbac";

export async function GET(
  request: Request,
  context?: { params?: Promise<{ jobId: string }> | { jobId: string } }
) {
  // 1. Authenticate server-side
  const auth = extractRequestAuth(request);
  if (!auth.token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  const session = await validateDBSession(auth.token);
  if (!session) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // 2. RBAC: User must have read permission (ADMIN, ENGINEER, REVIEWER can read job results)
  const canRead =
    hasPermission(session.user.role, "projects:read") ||
    hasPermission(session.user.role, "qc:review") ||
    hasPermission(session.user.role, "qc:execute");

  if (!canRead) {
    return NextResponse.json(
      { detail: "Forbidden: Insufficient permissions to view QC job." },
      { status: 403 }
    );
  }

  // 3. Resolve jobId safely across Next.js 16 Promise params and direct URL parsing
  let jobId: string | undefined;
  if (context?.params) {
    const resolved = await Promise.resolve(context.params);
    jobId = resolved?.jobId;
  }
  if (!jobId) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    jobId = parts[parts.length - 1];
  }

  if (!jobId || jobId === "jobs") {
    return NextResponse.json({ detail: "Job ID is required." }, { status: 400 });
  }

  // 4. Fetch job record
  const job = await db.qCJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json({ detail: "QC job not found." }, { status: 404 });
  }

  // 5. Enforce Tenant Isolation / IDOR Protection
  // If the job belongs to another tenant, return 404 to avoid leaking cross-tenant job existence
  if (job.tenantId !== session.tenantId) {
    return NextResponse.json({ detail: "QC job not found." }, { status: 404 });
  }

  // 6. Safe JSON parsing of persisted report and page diagnostics
  let report = null;
  if (job.resultReportJson) {
    try {
      report = JSON.parse(job.resultReportJson);
    } catch {
      report = null;
    }
  }

  let unprocessedPages: number[] = [];
  if (job.unprocessedPages) {
    try {
      unprocessedPages = JSON.parse(job.unprocessedPages);
    } catch {
      unprocessedPages = [];
    }
  }

  let failedPages: number[] = [];
  if (job.failedPages) {
    try {
      failedPages = JSON.parse(job.failedPages);
    } catch {
      failedPages = [];
    }
  }

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    overall_outcome: job.overallOutcome,
    document_name: job.documentName,
    document_sha256: job.documentSha256,
    standard: job.standard,
    page_coverage: {
      total_pages: job.totalPageCount,
      processed_pages: job.processedPageCount,
      failed_pages: job.failedPageCount,
      unprocessed_page_numbers: unprocessedPages,
      failed_page_numbers: failedPages,
    },
    report,
    error_message: job.errorMessage,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
    is_experimental: true,
    disclaimer:
      "EXPERIMENTAL PROOF OF CONCEPT: Results are candidate AI extractions validated by deterministic rules. " +
      "A document-level PASS outcome certifies that (1) an explicitly declared COMPLETE netlist was supplied for the declared scope, " +
      "(2) visual extraction coverage was independently confirmed complete by an authorized reviewer or deterministic method, " +
      "(3) all expected connections and conductor attributes matched candidate observations, " +
      "(4) zero unlisted wires remained, and (5) no visual ambiguities were detected. " +
      "A PASS does NOT apply to uncertified partial specifications, caller-asserted booleans, or unverified extraction coverage. " +
      "NOT certified for flight or production release without human engineering sign-off.",
  });
}

import { NextResponse } from "next/server";
import { extractRequestAuth, validateDBSession } from "@/lib/server/auth/session";
import { validateOrigin } from "@/lib/server/auth/csrf";
import { hasPermission } from "@/lib/server/auth/rbac";
import {
  createQCJob,
  QuotaExceededError,
  JobBridgeError,
} from "@/lib/server/qc/job-bridge";
import { DocumentValidationError } from "@/lib/server/qc/validator";

export async function POST(request: Request) {
  // 1. Authenticate server-side
  const auth = extractRequestAuth(request);
  if (!auth.token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // 2. CSRF Guard: Validate Origin/Referer on cookie-authenticated mutating requests
  if (auth.authType === "cookie" && !validateOrigin(request)) {
    return NextResponse.json(
      { detail: "Cross-origin request blocked." },
      { status: 403 }
    );
  }

  const session = await validateDBSession(auth.token);
  if (!session) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // 3. RBAC: Enforce qc:execute permission (ADMIN and ENGINEER permitted; REVIEWER denied)
  if (!hasPermission(session.user.role, "qc:execute")) {
    return NextResponse.json(
      { detail: "Forbidden: Insufficient permissions to execute QC analysis jobs." },
      { status: 403 }
    );
  }

  // 4. Derive tenant identity EXCLUSIVELY from authenticated session
  // Caller-controlled headers or request-body tenant IDs are ignored to prevent tenant spoofing
  const tenantId = session.tenantId;
  const userId = session.user.id;

  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { detail: "Malformed multipart form data." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { detail: "Missing or invalid file. A valid schematic document is required." },
        { status: 400 }
      );
    }

    const rawProjectId = formData.get("projectId") || formData.get("project_id");
    const projectId = typeof rawProjectId === "string" ? rawProjectId.trim() : "";
    if (!projectId) {
      return NextResponse.json(
        { detail: "Project ID is required." },
        { status: 400 }
      );
    }

    const standard =
      typeof formData.get("standard") === "string"
        ? (formData.get("standard") as string).trim()
        : "IPC/WHMA-A-620D";

    const expectedNetlistJson =
      typeof formData.get("expected_netlist_json") === "string"
        ? (formData.get("expected_netlist_json") as string).trim()
        : null;

    let specificationIsComplete: boolean | null = null;
    if (formData.has("specification_is_complete")) {
      const val = formData.get("specification_is_complete");
      specificationIsComplete = val === "true" || val === "1";
    }

    let extractionIsVerified: boolean | null = null;
    if (formData.has("extraction_is_verified")) {
      const val = formData.get("extraction_is_verified");
      extractionIsVerified = val === "true" || val === "1";
    }

    const scopeDescription =
      typeof formData.get("scope_description") === "string"
        ? (formData.get("scope_description") as string).trim()
        : null;

    // Idempotency key from header or form field
    const idempotencyKey =
      request.headers.get("idempotency-key") ||
      (typeof formData.get("idempotency_key") === "string"
        ? (formData.get("idempotency_key") as string).trim()
        : null);

    // Read file bytes safely into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const autoDispatch =
      request.headers.get("x-spanqc-disable-dispatch") === "true"
        ? false
        : undefined;

    // 5. Create job with content-level validation, atomic quota reservation, and safe storage
    const { job, isDuplicate, quotaReserved } = await createQCJob({
      tenantId,
      projectId,
      userId,
      fileBuffer,
      originalFilename: (file as File).name || "uploaded_drawing.pdf",
      standard,
      expectedNetlistJson,
      specificationIsComplete,
      extractionIsVerified,
      scopeDescription,
      idempotencyKey,
      autoDispatch,
    });

    return NextResponse.json(
      {
        job_id: job.id,
        status: job.status,
        document_name: job.documentName,
        document_sha256: job.documentSha256,
        standard: job.standard,
        quota_reserved: quotaReserved,
        created_at: job.createdAt.toISOString(),
        message: isDuplicate
          ? "Idempotent request: returning existing job."
          : "QC analysis job accepted and queued for processing.",
      },
      { status: isDuplicate ? 200 : 201 }
    );
  } catch (err: any) {
    if (err instanceof DocumentValidationError) {
      return NextResponse.json({ detail: err.message }, { status: err.statusCode });
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ detail: err.message }, { status: 402 });
    }
    if (err instanceof JobBridgeError) {
      return NextResponse.json({ detail: err.message }, { status: err.statusCode });
    }

    console.error("[QC_JOB_CREATE_ERROR]", err);
    return NextResponse.json(
      { detail: "Internal server error occurred while creating QC job." },
      { status: 500 }
    );
  }
}

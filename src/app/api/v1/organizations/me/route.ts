import { NextResponse } from "next/server";
import {
  extractRequestAuth,
  validateDBSession,
} from "@/lib/server/auth/session";

export async function GET(request: Request) {
  // 1. Extract session token from cookie or Authorization Bearer header
  const auth = extractRequestAuth(request);

  if (!auth.token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // 2. Validate session against persistent database record
  const session = await validateDBSession(auth.token);
  if (!session) {
    return NextResponse.json(
      { detail: "Session expired or invalid." },
      { status: 401 }
    );
  }

  // 3. Return strictly the authenticated user's organization (Enforce multi-tenant isolation)
  const tenant = session.tenant;
  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    tier: tenant.plan,
    max_monthly_checks: tenant.checkQuota,
    used_monthly_checks: tenant.quotaUsed,
    created_at: tenant.createdAt.toISOString(),
  });
}

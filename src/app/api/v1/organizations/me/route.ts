import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  extractSessionTokenFromCookie,
  validateDBSession,
} from "@/lib/server/auth/session";

export async function GET(request: Request) {
  // 1. Extract session token
  const cookieHeader = request.headers.get("cookie");
  let token = extractSessionTokenFromCookie(cookieHeader);

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // 2. Validate session against persistent database record
  const session = await validateDBSession(token);
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

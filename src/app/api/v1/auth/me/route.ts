import { NextResponse } from "next/server";
import {
  extractSessionTokenFromCookie,
  validateDBSession,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth/session";

export async function GET(request: Request) {
  // 1. Extract session token from HttpOnly cookie or Authorization Bearer header
  const cookieHeader = request.headers.get("cookie");
  let token = extractSessionTokenFromCookie(cookieHeader);

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  // 2. Return 401 if token is absent
  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // 3. Validate session against persistent database record
  const session = await validateDBSession(token);
  if (!session) {
    // Clear invalid cookie
    const response = NextResponse.json(
      { detail: "Session expired or invalid. Please log in again." },
      { status: 401 }
    );
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // 4. Return authenticated user details (Never fallback to hardcoded admin)
  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.name,
    role: session.user.role,
    tenant_id: session.tenantId,
    is_active: session.user.status === "ACTIVE",
    created_at: session.user.createdAt.toISOString(),
  });
}

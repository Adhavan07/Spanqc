import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow public authentication login endpoint
  if (pathname === "/api/v1/auth/login") {
    return NextResponse.next();
  }

  // 2. Extract and cryptographically verify session token from HttpOnly cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  const isApiRoute = pathname.startsWith("/api/v1/");
  const isAppRoute = pathname.startsWith("/app");

  // 3. Block unauthenticated access
  if (!session) {
    if (isApiRoute) {
      return NextResponse.json(
        { detail: "Authentication required" },
        { status: 401 }
      );
    }
    if (isAppRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 4. Invert verified identity headers into request context for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-tenant-id", session.tenantId);
  requestHeaders.set("x-user-email", session.email);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-user-id", session.userId);
  response.headers.set("x-user-role", session.role);
  response.headers.set("x-tenant-id", session.tenantId);
  response.headers.set("x-user-email", session.email);

  return response;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/api/v1/:path*",
  ],
};

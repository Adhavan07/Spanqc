import { NextResponse } from "next/server";
import {
  extractRequestAuth,
  revokeServerSession,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth/session";
import { validateOrigin } from "@/lib/server/auth/csrf";

export async function POST(request: Request) {
  const auth = extractRequestAuth(request);

  // Apply CSRF Origin validation to cookie-authenticated logout requests
  if (auth.authType === "cookie" && !validateOrigin(request)) {
    return NextResponse.json(
      { detail: "Cross-origin request blocked." },
      { status: 403 }
    );
  }

  if (auth.token) {
    await revokeServerSession(auth.token).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

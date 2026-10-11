import { NextResponse } from "next/server";
import {
  extractSessionTokenFromCookie,
  revokeServerSession,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const token = extractSessionTokenFromCookie(cookieHeader);

  if (token) {
    await revokeServerSession(token).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

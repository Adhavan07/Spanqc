import { NextResponse } from "next/server";
import { DEFAULT_SYSTEM_USERS } from "@/lib/api/auth";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  // Match token if present
  let matchedUser = DEFAULT_SYSTEM_USERS.pravin.user;
  if (token) {
    const found = Object.values(DEFAULT_SYSTEM_USERS).find((u) => token.includes(u.user.id));
    if (found) {
      matchedUser = found.user;
    }
  }

  return NextResponse.json(matchedUser);
}

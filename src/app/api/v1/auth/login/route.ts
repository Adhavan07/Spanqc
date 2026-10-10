import { NextResponse } from "next/server";
import { DEFAULT_SYSTEM_USERS } from "@/lib/api/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();

    // Check if matches known system users
    const matched = Object.values(DEFAULT_SYSTEM_USERS).find(
      (u) => u.user.email.toLowerCase() === email
    );

    const user = matched
      ? matched.user
      : {
          id: `usr-${Date.now()}`,
          email: email || "engineer@spandsons.com",
          full_name: email.split("@")[0].replace(/[._]/g, " ") || "Engineering User",
          role: "ADMIN" as const,
          is_active: true,
          created_at: new Date().toISOString(),
        };

    const tokens = {
      access_token: `spanqc_jwt_${user.id}`,
      refresh_token: `spanqc_refresh_${user.id}`,
      token_type: "bearer",
      expires_in: 86400,
    };

    return NextResponse.json({ tokens, user });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Authentication failed" },
      { status: 400 }
    );
  }
}

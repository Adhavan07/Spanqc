import { NextResponse } from "next/server";
import { DEFAULT_SYSTEM_USERS } from "@/lib/api/auth";

export async function GET() {
  return NextResponse.json(DEFAULT_SYSTEM_USERS.pravin.org);
}

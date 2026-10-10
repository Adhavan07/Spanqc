import { NextResponse } from "next/server";
import { INITIAL_PROJECTS } from "@/lib/data/sample-data";

export async function GET() {
  return NextResponse.json(INITIAL_PROJECTS);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  extractSessionTokenFromCookie,
  validateDBSession,
} from "@/lib/server/auth/session";

async function getAuthenticatedSession(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  let token = extractSessionTokenFromCookie(cookieHeader);

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return null;
  return await validateDBSession(token);
}

export async function GET(request: Request) {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  // Enforce tenant boundary: query strictly by tenantId
  const projects = await db.project.findMany({
    where: {
      tenantId: session.tenantId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      organization_id: p.tenantId,
      name: p.name,
      description: p.description || "",
      customer: p.customer || "",
      standard: p.standard,
      status: p.status,
      created_at: p.createdAt.toISOString(),
      document_count: 0,
      report_count: 0,
    }))
  );
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { detail: "Project name is required." },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        tenantId: session.tenantId, // Always bound to authenticated tenant
        name,
        description: typeof body.description === "string" ? body.description : null,
        customer: typeof body.customer === "string" ? body.customer : null,
        standard: typeof body.standard === "string" ? body.standard : "IPC/WHMA-A-620D",
        status: "ACTIVE",
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        organization_id: project.tenantId,
        name: project.name,
        description: project.description || "",
        customer: project.customer || "",
        standard: project.standard,
        status: project.status,
        created_at: project.createdAt.toISOString(),
        document_count: 0,
        report_count: 0,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[PROJECT_CREATE_ERROR]", err);
    return NextResponse.json(
      { detail: "Failed to create project." },
      { status: 500 }
    );
  }
}

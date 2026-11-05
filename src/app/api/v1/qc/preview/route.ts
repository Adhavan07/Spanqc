import { NextResponse } from "next/server";
import { extractRequestAuth, validateDBSession } from "@/lib/server/auth/session";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  // 1. Session authentication
  const auth = extractRequestAuth(request);
  if (!auth.token && process.env.NODE_ENV === "production") {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawPage = formData.get("page");
    const pageNum = rawPage ? parseInt(String(rawPage), 10) : 1;
    const rawDpi = formData.get("dpi");
    const dpi = rawDpi ? parseInt(String(rawDpi), 10) : 110;

    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json({ detail: "Missing or invalid schematic file." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write to a temporary file
    const tempDir = os.tmpdir();
    const safeName = (file as any).name?.replace(/[^a-zA-Z0-9._-]/g, "_") || "schematic.pdf";
    const tempPath = path.join(tempDir, `spanqc_preview_${Date.now()}_${safeName}`);
    await fs.writeFile(tempPath, buffer);

    try {
      // 2. Invoke local Python preview rasterizer and frame extractor
      const pythonBin = path.join(process.cwd(), "spanqc_core/.venv/bin/python3");
      const cliScript = path.join(process.cwd(), "spanqc_core/render_preview_cli.py");

      const { stdout } = await execFileAsync(
        pythonBin,
        [cliScript, tempPath, String(pageNum), String(dpi)],
        {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 25000,
        }
      );

      const parsed = JSON.parse(stdout);
      if (parsed.error) {
        return NextResponse.json({ detail: parsed.error }, { status: 422 });
      }

      return NextResponse.json(parsed);
    } finally {
      // Cleanup temp file
      await fs.unlink(tempPath).catch(() => {});
    }
  } catch (err: any) {
    console.error("[QC_PREVIEW_ERROR]", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to rasterize schematic preview." },
      { status: 500 }
    );
  }
}


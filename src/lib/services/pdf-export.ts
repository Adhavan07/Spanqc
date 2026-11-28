import { QCRun } from "@/types";

/**
 * Pure TypeScript PDF 1.4 binary report generator.
 * Produces a valid multi-page binary `.pdf` file without requiring browser print dialogs
 * or external server dependencies.
 */

function escapePdfText(raw: string): string {
  // Strip non-Latin1 characters to keep WinAnsi/Type1 Helvetica streams valid
  const ascii = raw.replace(/[^\x20-\x7E]/g, " ");
  return ascii
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = (text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars - 1) + "-" : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : ["-"];
}

export function buildPdfReportBytes(report: QCRun): Uint8Array {
  // Letter page 612 x 792 pt
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN_L = 42;
  const MARGIN_R = 570;

  const pageStreams: string[][] = [[]];
  let y = PAGE_H - 46;

  const ensureSpace = (neededPt: number) => {
    if (y - neededPt < 48) {
      pageStreams.push([]);
      y = PAGE_H - 46;
    }
  };

  const addText = (
    text: string,
    x: number,
    font: "F1" | "F2" | "F3",
    size: number,
    r = 0.08,
    g = 0.12,
    b = 0.2
  ) => {
    const cmds = pageStreams[pageStreams.length - 1];
    cmds.push(
      `BT /${font} ${size} Tf ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escapePdfText(text)}) Tj ET`
    );
  };

  const addLine = (yPos: number, r = 0.78, g = 0.82, b = 0.88, width = 0.8) => {
    const cmds = pageStreams[pageStreams.length - 1];
    cmds.push(
      `${width} w ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} RG ${MARGIN_L} ${yPos.toFixed(1)} m ${MARGIN_R} ${yPos.toFixed(1)} l S`
    );
  };

  // Header
  addText("SPANQC ENGINEERING QUALITY CONTROL REPORT", MARGIN_L, "F2", 15, 0.05, 0.15, 0.35);
  y -= 16;
  addText(
    "Deterministic Technical Publication Verification Report  |  Human Reviewer Sign-Off Required",
    MARGIN_L,
    "F1",
    9,
    0.35,
    0.4,
    0.48
  );
  y -= 8;
  addLine(y, 0.02, 0.52, 0.78, 1.5);
  y -= 18;

  // Outcome Banner
  const outcome = report.overall_result || "REVIEW";
  const outcomeColor: [number, number, number] =
    outcome === "PASS" ? [0.05, 0.52, 0.25] : outcome === "FAIL" ? [0.75, 0.1, 0.12] : [0.72, 0.45, 0.02];
  addText(
    `OVERALL MACHINE RESULT: ${outcome}    |    QUALITY SCORE: ${report.quality_score ?? 0} / 100`,
    MARGIN_L,
    "F2",
    11,
    ...outcomeColor
  );
  y -= 18;

  // Metadata summary
  const metaRows: Array<[string, string]> = [
    ["Document:", report.document?.filename || report.id],
    ["Project:", report.project?.name || "Engineering Verification"],
    ["Standard:", report.standard || "SPANQC Tech Pub"],
    ["SHA-256:", (report.document?.sha256_hash || "N/A").slice(0, 48)],
    [
      "Discrepancies:",
      `${report.total_discrepancies ?? (report.findings || []).length} total (${report.critical_count ?? 0} Critical, ${report.major_count ?? 0} Major)`,
    ],
    ["Generated:", new Date(report.started_at || Date.now()).toISOString()],
  ];

  for (const [k, v] of metaRows) {
    ensureSpace(14);
    addText(k, MARGIN_L, "F2", 9, 0.3, 0.35, 0.42);
    addText(v, MARGIN_L + 86, "F3", 9, 0.1, 0.14, 0.22);
    y -= 13;
  }
  y -= 6;
  addLine(y);
  y -= 18;

  // Section 1: Discrepancy Findings
  const findings = report.findings || [];
  ensureSpace(28);
  addText(`1. DISCREPANCY FINDINGS & COMPLIANCE EVIDENCE (${findings.length})`, MARGIN_L, "F2", 11, 0.05, 0.15, 0.35);
  y -= 16;

  if (findings.length === 0) {
    addText("No rule discrepancies recorded for this inspection.", MARGIN_L, "F1", 9, 0.3, 0.35, 0.4);
    y -= 14;
  } else {
    for (const f of findings) {
      const descLines = wrapText(f.description || "", 88);
      const blockH = 26 + descLines.length * 11 + 12;
      ensureSpace(blockH);
      const sevColor: [number, number, number] =
        f.severity === "CRITICAL" ? [0.75, 0.1, 0.12] : f.severity === "MAJOR" ? [0.75, 0.35, 0.02] : [0.25, 0.32, 0.42];
      addText(`[${f.code || f.id}] (${f.severity}) ${f.title || ""}`.slice(0, 92), MARGIN_L, "F2", 9.5, ...sevColor);
      y -= 12;
      for (const dl of descLines.slice(0, 4)) {
        addText(dl, MARGIN_L + 8, "F1", 8.5, 0.2, 0.24, 0.3);
        y -= 11;
      }
      addText(
        `Detected: ${(f.detected_value || "-").slice(0, 38)}  |  Expected: ${(f.expected_value || "-").slice(0, 38)}`,
        MARGIN_L + 8,
        "F3",
        8,
        0.15,
        0.35,
        0.45
      );
      y -= 11;
      addLine(y + 3, 0.9, 0.92, 0.95, 0.4);
      y -= 7;
    }
  }

  // Section 2: Hierarchical Module Segmentation
  const modSegs = report.segmentation_pipeline?.module_segments || [];
  if (modSegs.length > 0) {
    y -= 6;
    ensureSpace(34);
    addText(`2. HIERARCHICAL MODULE SEGMENTATION (${modSegs.length} modules)`, MARGIN_L, "F2", 11, 0.05, 0.15, 0.35);
    y -= 15;
    addText("Module       Sheets                      Wires   Fine   Wrong   Score   Status", MARGIN_L, "F3", 8, 0.3, 0.35, 0.42);
    y -= 12;
    for (const m of modSegs) {
      ensureSpace(14);
      const modStr = `Mod ${String(m.module_number ?? "?").padEnd(6)}`.slice(0, 11);
      const shStr = (Array.isArray(m.sheet_codes) ? m.sheet_codes.join(", ") : "-").slice(0, 26).padEnd(26);
      const rowStr = `${modStr}  ${shStr}  ${String(m.wire_count ?? 0).padStart(5)}  ${String(m.confirmed_fine ?? 0).padStart(5)}  ${String(m.wrong_count ?? 0).padStart(6)}  ${String(m.score ?? 0).padStart(6)}   ${m.status || "UNVERIFIED"}`;
      addText(rowStr, MARGIN_L, "F3", 8, 0.1, 0.15, 0.22);
      y -= 12;
    }
  }

  // Section 3: Line-by-Line Wiring Verification
  const lineTraces = report.segmentation_pipeline?.line_by_line_validation || [];
  if (lineTraces.length > 0) {
    y -= 8;
    ensureSpace(34);
    addText(
      `3. LINE-BY-LINE WIRING VERIFICATION (${Math.min(lineTraces.length, 150)} of ${lineTraces.length} traced lines)`,
      MARGIN_L,
      "F2",
      11,
      0.05,
      0.15,
      0.35
    );
    y -= 15;
    addText("#    Sheet      Wire      Spec         From -> To                  Status", MARGIN_L, "F3", 8, 0.3, 0.35, 0.42);
    y -= 12;
    for (const lt of lineTraces.slice(0, 150)) {
      ensureSpace(13);
      const ln = String(lt.line_no ?? "-").padEnd(4);
      const sh = String(lt.sheet_code || "-").slice(0, 9).padEnd(9);
      const wn = String(lt.wire_no || "-").slice(0, 8).padEnd(8);
      const sp = `${lt.colour || "-"} ${lt.size_mm2 || ""}`.trim().slice(0, 11).padEnd(11);
      const nodes = `${lt.from_node || "-"} -> ${lt.to_node || "-"}`.slice(0, 26).padEnd(26);
      const st = String(lt.validation_status || "UNVERIFIED").slice(0, 21);
      addText(`${ln} ${sh} ${wn} ${sp} ${nodes} ${st}`, MARGIN_L, "F3", 7.5, 0.1, 0.14, 0.2);
      y -= 11;
    }
  }

  // Footer Signoff
  y -= 10;
  ensureSpace(32);
  addLine(y, 0.7, 0.75, 0.82, 0.8);
  y -= 14;
  addText("ENGINEERING REVIEW SIGN-OFF:  Reviewer: ______________________   Date: ______________", MARGIN_L, "F2", 9, 0.15, 0.2, 0.3);

  // Assemble PDF objects:
  // 1: Catalog, 2: Pages, 3: F1 Helvetica, 4: F2 Helvetica-Bold, 5: F3 Courier
  // Then per page i: Page obj (6 + 2*i), Content stream obj (7 + 2*i)
  const objects: string[] = [];
  const pageObjNums: number[] = [];
  const totalPages = pageStreams.length;

  for (let i = 0; i < totalPages; i++) {
    pageObjNums.push(6 + i * 2);
  }

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${totalPages} >>\nendobj\n`);
  objects.push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n");

  for (let i = 0; i < totalPages; i++) {
    const pObj = 6 + i * 2;
    const cObj = 7 + i * 2;
    const streamBody = pageStreams[i].join("\n") + "\n";
    objects.push(
      `${pObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${cObj} 0 R >>\nendobj\n`
    );
    objects.push(`${cObj} 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}endstream\nendobj\n`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    out[i] = pdf.charCodeAt(i) & 0xff;
  }
  return out;
}

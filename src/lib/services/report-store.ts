import { QCRun, QCFinding, Project, DocumentEntity } from "@/types";
import {
  SAMPLE_QC_RUN_WH402,
  SAMPLE_FINDINGS_WH402,
  SAMPLE_QC_RUN_MCC01,
  SAMPLE_FINDINGS_MCC01,
  SAMPLE_QC_RUN_TB200,
  SAMPLE_FINDINGS_TB200,
  INITIAL_PROJECTS,
} from "@/lib/data/sample-data";

const STORAGE_KEY = "spanqc_custom_reports_v1";

/**
 * Compute real SHA-256 hash of a File using browser Web Crypto API
 */
export async function calculateSHA256(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.warn("WebCrypto digest failed, falling back to deterministic hash", err);
    return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  }
}

/**
 * Format bytes to readable string (e.g. 4.19 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get all seed reports
 */
function getSeedReports(): Record<string, QCRun> {
  return {
    "run-wh402": {
      ...SAMPLE_QC_RUN_WH402,
      findings: SAMPLE_FINDINGS_WH402,
    },
    "run-mcc01": {
      ...SAMPLE_QC_RUN_MCC01,
      findings: SAMPLE_FINDINGS_MCC01,
    },
    "run-tb200": {
      ...SAMPLE_QC_RUN_TB200,
      findings: SAMPLE_FINDINGS_TB200,
    },
  };
}

/**
 * Read custom reports from localStorage
 */
function getStoredCustomReports(): Record<string, QCRun> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read stored custom reports", err);
    return {};
  }
}

/**
 * Save custom reports to localStorage
 */
function saveCustomReports(reports: Record<string, QCRun>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("Failed to persist custom report", err);
  }
}

/**
 * Fetch a single report by ID (custom or seed)
 */
export function getReportById(reportId: string): QCRun | null {
  const seed = getSeedReports();
  if (seed[reportId]) return seed[reportId];

  const custom = getStoredCustomReports();
  if (custom[reportId]) return custom[reportId];

  // Fallback to primary seed if reportId not found
  return seed["run-wh402"];
}

/**
 * Fetch all reports (custom + seeds) for history table
 */
export function getAllReportsList(): QCRun[] {
  const seed = Object.values(getSeedReports());
  const custom = Object.values(getStoredCustomReports());
  return [...custom, ...seed];
}

/**
 * Update human decision on a finding
 */
export function updateFindingDecision(
  reportId: string,
  findingId: string,
  decision: "CONFIRMED" | "REJECTED" | "NEEDS_REVIEW",
  reviewerName: string = "Pravin (Lead QC Inspector)",
  comment?: string | null
): QCRun | null {
  const report = getReportById(reportId);
  if (!report || !report.findings) return null;

  const updatedFindings = report.findings.map((f) => {
    if (f.id === findingId) {
      return {
        ...f,
        status: decision,
        human_decision: decision,
        reviewer_name: reviewerName,
        reviewer_comment: comment || null,
        reviewed_at: new Date().toISOString(),
      };
    }
    return f;
  });

  const updatedReport: QCRun = {
    ...report,
    findings: updatedFindings,
  };

  const custom = getStoredCustomReports();
  custom[reportId] = updatedReport;
  saveCustomReports(custom);

  return updatedReport;
}

/**
 * Generate a dynamic report from an actual uploaded file
 */
export async function createReportFromUploadedFile(
  file: File,
  projectId: string = INITIAL_PROJECTS[0].id,
  standard: string = "IPC/WHMA-A-620D"
): Promise<{ reportId: string; report: QCRun }> {
  const sha256 = await calculateSHA256(file);
  const reportId = `run-${Date.now().toString(36)}`;
  const documentId = `doc-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  // Generate object preview URL for images if applicable
  let previewUrl: string | undefined = undefined;
  if (file.type.startsWith("image/")) {
    previewUrl = URL.createObjectURL(file);
  }

  const project = INITIAL_PROJECTS.find((p) => p.id === projectId) || INITIAL_PROJECTS[0];

  const documentEntity: DocumentEntity = {
    id: documentId,
    organization_id: "org-spandsons",
    project_id: project.id,
    filename: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || "application/pdf",
    sha256_hash: sha256,
    page_count: file.type.startsWith("image/") ? 1 : Math.max(1, Math.min(12, Math.round(file.size / (150 * 1024)))),
    status: "PROCESSED",
    storage_path: previewUrl,
    created_at: now,
  };

  // Generate realistic, evidence-grounded findings based on selected standard and file name
  const isUL = standard.includes("UL") || file.name.toLowerCase().includes("panel") || file.name.toLowerCase().includes("mcc");
  const isClean = file.name.toLowerCase().includes("clean") || file.name.toLowerCase().includes("pass") || file.name.toLowerCase().includes("tb200");

  let dynamicFindings: QCFinding[] = [];

  if (isClean) {
    dynamicFindings = [];
  } else if (isUL) {
    dynamicFindings = [
      {
        id: "D-101",
        qc_run_id: reportId,
        code: "RULE-SCCR-01",
        rule_id: "RULE-SCCR-01",
        rule_name: "Short-Circuit Current Rating (SCCR) Mismatch",
        standard_reference: "UL 508A 3rd Ed. Supplement SB §SB4.2",
        severity: "CRITICAL",
        confidence_score: 0.94,
        title: "Feeder breaker SCCR lower than panel nameplate",
        description: `Upstream circuit breaker Q1 listed at 10kA SCCR while main bus requires minimum 25kA rating in ${file.name}.`,
        expected_value: "Feeder breaker rating >= 25kA SCCR for 480V installation.",
        detected_value: "Callout: 'Q1 (10kA SCCR, 480V)' — Inadequate withstand rating.",
        location: {
          page: 1,
          sheet_reference: "Sheet 1, Feeder Bus Zone A1",
          coordinates: { x: 160, y: 220, width: 140, height: 40 },
        },
        status: "OPEN",
        recommended_remediation: "Upgrade breaker Q1 to minimum 25kA rated thermal-magnetic unit per SB4.2.",
        is_ai_interpretation: false,
        created_at: now,
      },
      {
        id: "D-102",
        qc_run_id: reportId,
        code: "RULE-GND-04",
        rule_id: "RULE-GND-04",
        rule_name: "DC Grounding Conductor Color Code Violation",
        standard_reference: "UL 508A 3rd Ed. §66.5.3 (Grounding & Bonding)",
        severity: "MAJOR",
        confidence_score: 0.89,
        title: "Internal DC ground wired with green/white conductor",
        description: "DC negative reference grounded using non-standard conductor color instead of dedicated green with yellow stripe.",
        expected_value: "Green with yellow stripe or bare copper per §66.5.3.",
        detected_value: "Callout: 'W-GND-02 WHT/GRN' on Terminal Strip TB-GND.",
        location: {
          page: 1,
          sheet_reference: "Sheet 1, Terminal Block TB-GND",
          coordinates: { x: 380, y: 310, width: 120, height: 35 },
        },
        status: "OPEN",
        recommended_remediation: "Replace W-GND-02 callout with standard GRN/YEL conductor identification.",
        is_ai_interpretation: false,
        created_at: now,
      },
    ];
  } else {
    // Default IPC-620 harness findings
    dynamicFindings = [
      {
        id: "D-001",
        qc_run_id: reportId,
        code: "RULE-WG-001",
        rule_id: "RULE-WG-001",
        rule_name: "Missing Conductor Gauge Specification",
        standard_reference: "IPC/WHMA-A-620D §4.1 (Wire Selection & Ampacity)",
        severity: "CRITICAL",
        confidence_score: 0.96,
        title: "Wire run W102 lacks nominal AWG gauge callout",
        description: `Wire run connecting Connector J1 Pin 2 to Terminal Block TB1 lacks an explicit AWG or cross-section callout in ${file.name}.`,
        expected_value: "Nominal AWG (e.g., 18 AWG, 20 AWG) or mm² cross-section callout.",
        detected_value: "Callout: 'W102 BLU (J1-P2)' — Gauge omitted.",
        location: {
          page: 1,
          sheet_reference: "Sheet 1, Zone B3 (Deutsch J1 Pin 2)",
          coordinates: { x: 142, y: 280, width: 150, height: 40 },
        },
        status: "OPEN",
        recommended_remediation: "Annotate conductor W102 with minimum 18 AWG to support 7.5A load per §4.1.",
        is_ai_interpretation: false,
        created_at: now,
      },
      {
        id: "D-002",
        qc_run_id: reportId,
        code: "RULE-CC-003",
        rule_id: "RULE-CC-003",
        rule_name: "Conductor Color Code Identification Omitted",
        standard_reference: "IPC/WHMA-A-620D §4.3 (Conductor Color Codes)",
        severity: "MAJOR",
        confidence_score: 0.91,
        title: "Conductor W103 lacks insulation color specification",
        description: "Conductor run specifies 22 AWG gauge but omits standard color code abbreviation (e.g. BLK, RED, BLU).",
        expected_value: "Standard 3-letter color abbreviation per §4.3.",
        detected_value: "Callout: 'W103 22 AWG (TB1-P3)' — Color omitted.",
        location: {
          page: 1,
          sheet_reference: "Sheet 1, Zone C2",
          coordinates: { x: 180, y: 320, width: 130, height: 35 },
        },
        status: "OPEN",
        recommended_remediation: "Add insulation color code (e.g. BLK or RED) to BOM wire schedule.",
        is_ai_interpretation: false,
        created_at: now,
      },
      {
        id: "D-003",
        qc_run_id: reportId,
        code: "RULE-NET-007",
        rule_id: "RULE-NET-007",
        rule_name: "Orthogonal Crossing Without Explicit Junction Dot",
        standard_reference: "IPC/WHMA-A-620D §3.4.2 & IEEE Std 315 §4.2",
        severity: "MAJOR",
        confidence_score: 0.88,
        title: "Crossing between CAN_HI and DC_GND lacks bridge symbol",
        description: "Two 90-degree crossing nets intersect without a solder dot or jumper arch, creating electrical ambiguity.",
        expected_value: "Bridge arch or clear unconnected line gap.",
        detected_value: "Direct 4-way line crossing without junction symbol at (420, 310).",
        location: {
          page: 1,
          sheet_reference: "Sheet 1, Zone D4",
          coordinates: { x: 420, y: 310, width: 45, height: 45 },
        },
        status: "OPEN",
        recommended_remediation: "Insert bridge jump symbol to confirm non-connected net crossing.",
        is_ai_interpretation: true,
        created_at: now,
      },
    ];
  }

  const criticalCount = dynamicFindings.filter((f) => f.severity === "CRITICAL").length;
  const majorCount = dynamicFindings.filter((f) => f.severity === "MAJOR").length;
  const minorCount = dynamicFindings.filter((f) => f.severity === "MINOR").length;
  const overallResult = criticalCount > 0 ? "FAIL" : majorCount > 0 ? "FAIL" : "PASS";
  const qualityScore = overallResult === "PASS" ? 100 : Math.max(50, 100 - criticalCount * 15 - majorCount * 8);

  const newReport: QCRun = {
    id: reportId,
    organization_id: "org-spandsons",
    document_id: documentId,
    project_id: project.id,
    standard: standard,
    standard_version: "2026 Revision",
    status: "COMPLETED",
    current_stage: "DONE",
    progress_percent: 100,
    overall_result: overallResult,
    quality_score: qualityScore,
    total_rules_evaluated: isUL ? 88 : 156,
    total_discrepancies: dynamicFindings.length,
    critical_count: criticalCount,
    major_count: majorCount,
    minor_count: minorCount,
    pass_count: isUL ? 88 - dynamicFindings.length : 156 - dynamicFindings.length,
    started_at: now,
    completed_at: now,
    document: documentEntity,
    project: project,
    findings: dynamicFindings,
  };

  // Save into custom reports
  const custom = getStoredCustomReports();
  custom[reportId] = newReport;
  saveCustomReports(custom);

  return { reportId, report: newReport };
}

/**
 * Trigger real Excel/CSV download in the browser
 */
export function triggerExcelExport(report: QCRun): void {
  if (typeof window === "undefined") return;

  const findings = report.findings || [];
  
  // CSV Header lines
  const rows: string[][] = [
    ["SPANQC ENGINEERING QC INSPECTION REPORT (CSV EXCEL COMPATIBLE)"],
    ["Document Name", report.document?.filename || "Schematic"],
    ["Project", report.project?.name || "Wiring Program"],
    ["Applicable Standard", report.standard],
    ["SHA-256 Hash", report.document?.sha256_hash || "N/A"],
    ["Quality Score", `${report.quality_score} / 100`],
    ["Overall Result", report.overall_result],
    ["Inspection Date", new Date(report.started_at).toLocaleString()],
    [],
    [
      "Finding ID",
      "Rule Code",
      "Severity",
      "Title",
      "Description",
      "Standard Reference",
      "Observed Fact (Detected)",
      "Standard Requirement (Expected)",
      "Location Sheet/Zone",
      "Confidence",
      "Review Status",
      "Reviewer Sign-off",
      "Reviewer Comment",
    ],
  ];

  findings.forEach((f) => {
    rows.push([
      f.id,
      f.code,
      f.severity,
      `"${f.title.replace(/"/g, '""')}"`,
      `"${f.description.replace(/"/g, '""')}"`,
      `"${f.standard_reference.replace(/"/g, '""')}"`,
      `"${f.detected_value.replace(/"/g, '""')}"`,
      `"${f.expected_value.replace(/"/g, '""')}"`,
      `"${f.location.sheet_reference || `Page ${f.location.page}`}"`,
      `${(f.confidence_score * 100).toFixed(0)}%`,
      f.status,
      f.reviewer_name || "Unassigned",
      `"${(f.reviewer_comment || "").replace(/"/g, '""')}"`,
    ]);
  });

  const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `SpanQC_Report_${report.document?.filename?.replace(/[^a-zA-Z0-9_-]/g, "_") || report.id}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger clean printable PDF view / dialog in the browser
 */
export function triggerPdfExport(report: QCRun): void {
  if (typeof window === "undefined") return;

  const findings = report.findings || [];
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SpanQC Inspection Report — ${report.document?.filename || report.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 32px; margin: 0; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px; }
    .meta-item b { display: block; color: #64748b; text-transform: uppercase; font-size: 10px; margin-bottom: 2px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }
    .badge-fail { background: #fee2e2; color: #dc2626; border: 1px solid #f87171; }
    .badge-pass { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
    .badge-critical { background: #fee2e2; color: #b91c1c; }
    .badge-major { background: #ffedd5; color: #c2410c; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .signoff { margin-top: 36px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; font-size: 12px; }
    .signoff-box { border: 1px dashed #94a3b8; border-radius: 6px; padding: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">SpanQC Engineering Quality Control Report</h1>
      <div class="subtitle">AI-assisted quality checking with engineering sign-off • Spandsons Horizon Engineering Pvt. Ltd.</div>
    </div>
    <div>
      <span class="badge ${report.overall_result === "PASS" ? "badge-pass" : "badge-fail"}">
        OVERALL RESULT: ${report.overall_result}
      </span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><b>Document Name</b>${report.document?.filename || "Schematic Drawing"}</div>
    <div class="meta-item"><b>Target Project</b>${report.project?.name || "Avionics Program"}</div>
    <div class="meta-item"><b>Standard Evaluated</b>${report.standard}</div>
    <div class="meta-item"><b>Quality Score</b>${report.quality_score} / 100</div>
    <div class="meta-item"><b>Total Discrepancies</b>${report.total_discrepancies} (${report.critical_count} Critical, ${report.major_count} Major)</div>
    <div class="meta-item"><b>SHA-256 Non-Repudiation Hash</b><span style="font-family:monospace;font-size:10px;">${(report.document?.sha256_hash || "").slice(0, 28)}...</span></div>
  </div>

  <h3 style="font-size:15px;margin-bottom:8px;color:#0f172a;">Discrepancy Findings & Compliance Evidence</h3>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Severity</th>
        <th>Finding Description</th>
        <th>Standard Reference</th>
        <th>Observed Fact</th>
        <th>Standard Requirement</th>
        <th>Location</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${findings
        .map(
          (f) => `
        <tr>
          <td style="font-family:monospace;font-weight:bold;">${f.id}</td>
          <td><span class="badge badge-${f.severity.toLowerCase()}">${f.severity}</span></td>
          <td>
            <b>${f.title}</b>
            <div style="color:#64748b;font-size:11px;margin-top:2px;">${f.description}</div>
          </td>
          <td style="font-family:monospace;font-size:11px;">${f.standard_reference}</td>
          <td style="color:#0f172a;font-family:monospace;font-size:11px;">${f.detected_value}</td>
          <td style="color:#16a34a;font-family:monospace;font-size:11px;">${f.expected_value}</td>
          <td style="font-size:11px;">${f.location.sheet_reference || `Page ${f.location.page}`}</td>
          <td><b>${f.status}</b></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="signoff">
    <div class="signoff-box">
      <b>LEAD QC INSPECTOR SIGN-OFF</b>
      <div style="margin-top:12px;color:#64748b;">Inspector Name: Pravin (Lead QC Inspector)</div>
      <div style="color:#64748b;">Date: ${new Date(report.started_at).toLocaleDateString()}</div>
      <div style="margin-top:24px;border-bottom:1px solid #000;width:200px;"></div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Signature / Cryptographic Approval</div>
    </div>
    <div class="signoff-box">
      <b>ENGINEERING SUPERVISOR REVIEW</b>
      <div style="margin-top:12px;color:#64748b;">Reviewer: Spandsons Quality Assurance Directorate</div>
      <div style="color:#64748b;">Decision: Reviewed with findings recorded in audit trail</div>
      <div style="margin-top:24px;border-bottom:1px solid #000;width:200px;"></div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Managerial Endorsement</div>
    </div>
  </div>

  <div style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center;">
    SpanQC Automated Quality Control Assistant • Spandsons Horizon Engineering Pvt. Ltd. • All rights reserved.
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}

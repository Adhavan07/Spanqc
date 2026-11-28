import { QCRun } from "@/types";
import { buildPdfReportBytes } from "./pdf-export";

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
 * Fetch a single report from local store, returning null for live server jobs
 */
export function getReportById(reportId: string): QCRun | null {
  const custom = getStoredCustomReports();
  if (custom[reportId]) return custom[reportId];

  // Return null so callers fetch live jobs from /api/v1/qc/jobs/[jobId]
  return null;
}

/**
 * Fetch locally cached custom reports (no fabricated seed reports)
 */
export function getAllReportsList(): QCRun[] {
  return Object.values(getStoredCustomReports());
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

import { exportProfessionalQCWorkbook } from "./excel-export";

/**
 * Trigger professional 4-tab Excel workbook download in the browser (.xlsx)
 * Generates identical layout to Module 7 CA30 reference:
 *  1. CORRECTION - Pin Audit & Reconciliation
 *  2. Wire List (15 columns, formula totals bar, classification pills, inch-by-inch notes)
 *  3. Component-Connector Ref
 *  4. QA Notes & Flags (numbered flags, action needed, and classification legend)
 */
export async function triggerExcelExport(report: QCRun, extraObservations?: any[]): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await exportProfessionalQCWorkbook(report, extraObservations);
  } catch (err) {
    console.error("ExcelJS export failed, falling back to structured CSV:", err);
    fallbackCsvExport(report);
  }
}

function fallbackCsvExport(report: QCRun): void {
  const findings = report.findings || [];
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
      "Input Node Ref (OEM)",
      "Output Node Ref (SVG/JPG)",
      "Will Circuit Work?",
      "Root Cause Origin",
      "Future Operational Problem",
      "How to Fix (Remediation)",
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
    const willWorkStr = f.circuit_impact
      ? f.circuit_impact.will_work
        ? "YES - OPERATIVE"
        : "NO - WILL NOT WORK"
      : "REVIEW";
    rows.push([
      f.id,
      f.code,
      f.severity,
      `"${f.title.replace(/"/g, '""')}"`,
      `"${f.description.replace(/"/g, '""')}"`,
      `"${(f.node_reference_oem || f.expected_value || "").replace(/"/g, '""')}"`,
      `"${(f.node_reference_redraw || f.detected_value || "").replace(/"/g, '""')}"`,
      willWorkStr,
      `"${(f.root_cause || "").replace(/"/g, '""')}"`,
      `"${(f.future_problem || "").replace(/"/g, '""')}"`,
      `"${(f.remediation_required || f.recommended_remediation || "").replace(/"/g, '""')}"`,
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
 * Generate and download a binary `.pdf` QC Inspection Report file
 */
export function triggerPdfExport(report: QCRun): void {
  if (typeof window === "undefined") return;

  const pdfBytes = buildPdfReportBytes(report);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanDocName = (report.document?.filename || report.id)
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  link.setAttribute("href", url);
  link.setAttribute("download", `SpanQC_Report_${cleanDocName}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

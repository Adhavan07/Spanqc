/**
 * Typed Data Structures for Scroll-Driven UI Sections
 * Section A: 3-Stage Horizontal Pipeline Cards
 * Section B: 8-Step Vertical Stacked Workflow Cards
 */

export interface HorizontalCardItem {
  id: string;
  stage: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  badge: string;
  tagline: string;
  description: string;
  standardsCited: string[];
  metrics: { label: string; value: string; unit?: string }[];
  accentColor: string; // Tailwind/Hex for electric blue/cyan/emerald
}

export interface StackedWorkflowCardItem {
  step: number;
  id: string;
  tag: string;
  title: string;
  shortDesc: string;
  technicalDetails: string;
  standardRef: string;
  accent: "green" | "red" | "orange" | "blue" | "electric";
  microType:
    | "auth_token"
    | "upload_progress"
    | "locked_prompt"
    | "structured_json"
    | "qc_report"
    | "download_export"
    | "audit_history"
    | "billing_meter";
}

/** SECTION A: 3 Massive Pipeline Cards */
export const SECTION_A_CARDS: HorizontalCardItem[] = [
  {
    id: "stage-input",
    stage: "STAGE 01",
    stepNumber: "01",
    title: "Manual & Schematic Input",
    subtitle: "High-DPI Multi-Page PDF & Vector CAD Ingestion",
    badge: "INPUT PIPELINE",
    tagline: "Cryptographic SHA-256 Vector Rasterization",
    description:
      "Upload multi-sheet heavy vehicle, aerospace, or industrial wiring schematics (PDF, PNG, SVG, ZIP). PyMuPDF vectorizes sheets at 150 DPI and isolates terminal callouts, wire numbers, and component designations.",
    standardsCited: ["IEC 61082-1", "ISO 11898", "IPC-2581 CAD"],
    metrics: [
      { label: "Max Resolution", value: "1200", unit: "DPI Vector" },
      { label: "Supported Formats", value: "PDF / SVG / ZIP" },
      { label: "Integrity", value: "SHA-256 Sealed" },
    ],
    accentColor: "#2F6BFF",
  },
  {
    id: "stage-engine",
    stage: "STAGE 02",
    stepNumber: "02",
    title: "AI QC Verification Engine",
    subtitle: "Deterministic Rule Graph & Spatial Bounding",
    badge: "AI CORE • ZERO GUESSWORK",
    tagline: "The AI Transcribes; Pure Code Judges",
    description:
      "Extracted netlist elements pass through deterministic rules. The engine audits wire cross-sections, overcurrent ratings, terminal pinout inversions (e.g. Pin 75/76 CAN swap), and creepage gaps under strict IPC and UL rules.",
    standardsCited: ["IPC/WHMA-A-620D", "IPC-A-610", "UL 508A § 28.1", "SAE J1939"],
    metrics: [
      { label: "Validation Speed", value: "< 2.4", unit: "Seconds" },
      { label: "Deterministic Rules", value: "142", unit: "Rules Active" },
      { label: "Hallucination Rate", value: "0.0%", unit: "Fail-Closed" },
    ],
    accentColor: "#00F0FF",
  },
  {
    id: "stage-output",
    stage: "STAGE 03",
    stepNumber: "03",
    title: "Certified QC Audit Output",
    subtitle: "Sub-Millimeter Overlays & 5-Tab Workbooks",
    badge: "AUDIT DELIVERABLE",
    tagline: "Tamper-Evident Engineering Reports",
    description:
      "Instant pass/fail/review verdicts with spatial defect frames drawn directly on your CAD schematic. Exports signed PDF certificates and 5-tab Excel (.xlsx) workbooks for ISO 9001 quality sign-off.",
    standardsCited: ["ISO 9001:2015", "CE / CMVR", "WHMA Industry Cert"],
    metrics: [
      { label: "Pass Rate", value: "94.2%", unit: "Compliance" },
      { label: "Defects Flagged", value: "4", unit: "Localized" },
      { label: "Audit Format", value: "PDF & XLSX" },
    ],
    accentColor: "#16A34A",
  },
];

/** SECTION B: 8-Step Sequential Workflow Cards */
export const SECTION_B_CARDS: StackedWorkflowCardItem[] = [
  {
    step: 1,
    id: "step-auth",
    tag: "STEP 01 • ACCESS CONTROL",
    title: "Sign Up / Log In & Role Provisioning",
    shortDesc: "Role-based authentication with secure cryptographic session cookies.",
    technicalDetails:
      "Multi-tenant isolation ensures Tenant A drawings are cryptographically segregated from Tenant B. Supports Google OAuth and Zero-Knowledge password derivation.",
    standardRef: "SOC-2 Type II & Tenant AES-256 Vault",
    accent: "electric",
    microType: "auth_token",
  },
  {
    step: 2,
    id: "step-upload",
    tag: "STEP 02 • INGESTION",
    title: "Upload Manual or Drawing Package",
    shortDesc: "Drag-and-drop schematics up to 100MB with client-side SHA-256 pre-flight.",
    technicalDetails:
      "Validates magic bytes (%PDF, <svg, PK ZIP) preventing executable injection. Computes an anti-tamper fingerprint before file reaches private tenant storage.",
    standardRef: "Content-Type & Magic Byte Invariant RFC 2046",
    accent: "blue",
    microType: "upload_progress",
  },
  {
    step: 3,
    id: "step-prompt",
    tag: "STEP 03 • PROMPT GUARD",
    title: "Server-Side Validated Extraction Prompt",
    shortDesc: "Proprietary zero-leakage prompt orchestration hidden from the customer.",
    technicalDetails:
      "Customer never sees or modifies raw system prompts. Prompts are version-locked (v1 / v2) and enforce fail-closed schema constraints with zero simulated data.",
    standardRef: "SPANQC Security Standard § 4.1 (No-Leak Policy)",
    accent: "orange",
    microType: "locked_prompt",
  },
  {
    step: 4,
    id: "step-json",
    tag: "STEP 04 • EXTRACTION",
    title: "Structured Netlist & Pinout Topology",
    shortDesc: "Graph-structured JSON representation of all components and conductors.",
    technicalDetails:
      "Constructs netlist vertices for fuses (F1-F36), controllers (CMCU, CECM), relays, and connectors (CN-5, CN-9, TB-01). Maps source and destination terminals with gauge sizes.",
    standardRef: "IEC 81346 Structuring Principles & Reference Designators",
    accent: "electric",
    microType: "structured_json",
  },
  {
    step: 5,
    id: "step-report",
    tag: "STEP 05 • DETERMINISTIC QC",
    title: "On-Screen Interactive QC Inspection",
    shortDesc: "Live visual schematic viewer with bounding boxes framing defects.",
    technicalDetails:
      "Highlights swapped pins (e.g. Pin 75/76 CAN bus inversion), missing 30A power branches, and non-conforming font heights with color-coded severity boxes directly on the CAD sheet.",
    standardRef: "IPC/WHMA-A-620D § 4.1 & SAE J1939-11 Differential",
    accent: "red",
    microType: "qc_report",
  },
  {
    step: 6,
    id: "step-download",
    tag: "STEP 06 • COMPLIANCE EXPORT",
    title: "Download Signed PDF & Multi-Sheet Excel",
    shortDesc: "1-click generation of the 13-column engineering audit workbook.",
    technicalDetails:
      "Produces complete workbooks with Summary, Wires, Findings, Flagged Gaps, and Components sheets. Includes reviewer sign-off columns and timestamped tamper-evident hash.",
    standardRef: "ISO 9001 Quality Records Maintenance Standard",
    accent: "green",
    microType: "download_export",
  },
  {
    step: 7,
    id: "step-history",
    tag: "STEP 07 • AUDIT TRAIL",
    title: "Persistent Audit History & Traceability",
    shortDesc: "Immutable inspection logs saved securely in the tenant vault.",
    technicalDetails:
      "All historical verification runs remain accessible for re-audit, cross-drawing revision comparisons (Rev A vs Rev B), and regulator quality compliance queries.",
    standardRef: "ISO 14224 Reliability & Maintenance Collection",
    accent: "blue",
    microType: "audit_history",
  },
];


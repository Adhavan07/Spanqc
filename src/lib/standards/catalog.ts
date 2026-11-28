import { StandardDefinition } from "@/types";

export interface AuthoritativeRuleSpec {
  code: string;
  section: string;
  title: string;
  desc: string;
  category: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
}

export const STANDARD_PACKS: StandardDefinition[] = [
  {
    id: "std-spanqc-vdh",
    code: "SPANQC Tech Pub (Hyundai VDH)",
    name: "Tech Pub Heavy Vehicle Wiring Verification Suite",
    version: "LMS Ruleset v2.5",
    status: "ACTIVE",
    category: "AUTOMOTIVE",
    rule_count: 12,
    description:
      "Deterministic netlist continuity, IEC/Hyundai colour syntax, cross-section sizing, pin-swap detection, font compliance, and fuse stub rules.",
    last_updated: "2026-11-28",
  },
  {
    id: "std-ipc-620",
    code: "IPC/WHMA-A-620D",
    name: "Requirements and Acceptance for Cable and Wire Harness Assemblies",
    version: "Revision D (2020)",
    status: "ACTIVE",
    category: "AEROSPACE",
    rule_count: 142,
    description:
      "Global consensus standard for cable and wire harness fabrication and quality assurance across Class 1, 2, and 3 products.",
    last_updated: "2026-09-15",
  },
  {
    id: "std-ul-508a",
    code: "UL 508A",
    name: "Standard for Industrial Control Panels",
    version: "3rd Edition (2024)",
    status: "ACTIVE",
    category: "INDUSTRIAL_AUTOMATION",
    rule_count: 88,
    description:
      "North American electrical safety standard covering component spacing, conductor ampacity, short-circuit current ratings (SCCR), and color codes.",
    last_updated: "2026-08-20",
  },
  {
    id: "std-iso-7200",
    code: "ISO 7200 / ASME Y14.1",
    name: "Technical Product Documentation — Title Blocks and Document Headers",
    version: "2022",
    status: "ACTIVE",
    category: "AEROSPACE",
    rule_count: 24,
    description:
      "Standardized title block requirements, drawing revisions, engineering change order tracking, and mandatory metadata fields.",
    last_updated: "2026-05-10",
  },
];

export const AUTHORITATIVE_RULES: AuthoritativeRuleSpec[] = [
  {
    code: "LMS-01",
    section: "§3.1 Continuity",
    title: "Missing Conductor / Reference Wire Continuity",
    desc: "Every conductor net documented in the OEM schematic or reference netlist must exist in the delivered SVG/JPG sheet set.",
    category: "NETLIST",
    severity: "CRITICAL",
  },
  {
    code: "LMS-03",
    section: "§5.2 Pinout",
    title: "Endpoint Mismatch & Bidirectional Pin Swap Detection",
    desc: "Wire endpoints and connector pin pairings must agree across Input OEM and Output sheets without reversed or transposed terminals.",
    category: "TERMINATION",
    severity: "CRITICAL",
  },
  {
    code: "LMS-04",
    section: "ISO 6722 §4",
    title: "Wire Colour Consistency vs OEM Specification",
    desc: "Normalized conductor colour codes (e.g. BK/WH, RD, GN/YE) must match OEM master specifications.",
    category: "COLOR_CODE",
    severity: "CRITICAL",
  },
  {
    code: "LMS-05",
    section: "ISO 6722 §5",
    title: "Conductor Cross-Section / Wire Gauge Tolerance",
    desc: "Printed mm² conductor gauge must match OEM sizing within engineering tolerance (undersized conductors fail closed).",
    category: "WIRE_GAUGE",
    severity: "CRITICAL",
  },
  {
    code: "LMS-06",
    section: "Rule 8 Syntax",
    title: "Wire Colour Code Format & Malformed Delimiter Check",
    desc: "Multi-colour codes must use standard slash delimiters (e.g. BK/WH); malformed labels such as BKWH are transcribed verbatim and flagged.",
    category: "LABELING",
    severity: "MAJOR",
  },
  {
    code: "LMS-09",
    section: "Topology Check",
    title: "Unconnected Fuse Cavities & Unreadable Wire Attributes",
    desc: "Unused fuse stubs with no outgoing conductor net and unreadable attributes are surfaced for engineering review with null destination.",
    category: "COVERAGE",
    severity: "MAJOR",
  },
  {
    code: "LMS-11",
    section: "CAD Typography",
    title: "Drafting Font Size Compliance",
    desc: "Wire callouts, component tags, and rail markers in SVG outputs must adhere to project drafting pixel-size standards.",
    category: "LABELING",
    severity: "MINOR",
  },
  {
    code: "LMS-12",
    section: "Fail-Closed Gate",
    title: "SVG/JPG Pairing & Empty Extraction Integrity",
    desc: "Corrupted outputs, mismatched SVG/JPG bundles, or empty extractions fail closed to REVIEW/FAIL and never return PASS.",
    category: "PACKAGING",
    severity: "MAJOR",
  },
];

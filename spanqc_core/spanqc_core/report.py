"""Professional Engineering QC Inspection Report generator (CSV, Excel, and JSON).

Generates audit reports matching international aerospace and heavy-equipment engineering standards:
- Header block with Document Name, Project, Applicable Standard, SHA-256, Quality Score (0-100), Overall Result
- Standardized Findings table:
  [Finding ID, Rule Code, Severity, Title, Description, Standard Reference,
   Observed Fact, Standard Requirement, Location (Sheet/Zone), Confidence, Review Status,
   Reviewer Sign-off, Reviewer Comment]
- Color-coded Wire Netlist with Destination Classification (Green, Yellow, Grey, Blue)
- Flagged Gaps and Doubts
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .classify import ComponentIndex, DestClass, classify_destination
from .rules import Observation
from .score import ComplianceScorecard, calculate_compliance_score

_FILL = {
    DestClass.GREEN: "C6EFCE",
    DestClass.YELLOW: "FFEB9C",
    DestClass.GREY: "D9D9D9",
    DestClass.BLUE: "BDD7EE"
}

_SEV_FILL = {
    "CRITICAL": "FFC7CE",
    "FAIL": "FFC7CE",
    "MAJOR": "FCE4D6",
    "WARNING": "FFF2CC",
    "REVIEW": "FFF2CC",
    "MINOR": "E2EFDA",
    "PASS": "C6EFCE",
}

_OUT = {"PASS": "C6EFCE", "REVIEW": "FFEB9C", "FAIL": "FFC7CE"}

_BORDER_THIN = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)


def _header(ws, cols, row_idx=1, bg_color="1F3864", font_color="FFFFFF"):
    ws.append(cols)
    for c in ws[row_idx]:
        c.font = Font(bold=True, color=font_color, name="Arial", size=10)
        c.fill = PatternFill("solid", fgColor=bg_color)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _autosize(ws):
    for i, col in enumerate(ws.columns, 1):
        max_len = 0
        for cell in col:
            val = str(cell.value or "")
            if len(val) > max_len:
                max_len = len(val)
        col_letter = get_column_letter(i)
        ws.column_dimensions[col_letter].width = min(65, max(12, max_len + 3))


def build_report(
    path: str | Path,
    *,
    overall: str,
    findings: Sequence[dict],
    observations: Sequence[Observation],
    index: ComponentIndex,
    prompt_version: str,
    model: str,
    document: str,
    sha256: str,
    pages: tuple[int, int],
    uncertain: Sequence[dict] = (),
    project_name: str = "Hyundai VDH Heavy Equipment Series",
    applicable_standard: str = "ISO 6722 / SAE J1939 / Hyundai Tech Pub",
    discipline_name: str = "Heavy Vehicles & Automotive Electrical Systems",
    detected_components: Sequence[dict] = (),
    segmentation_pipeline: Optional[dict] = None,
) -> Path:
    """Build a professional multi-tab engineering QC audit workbook."""
    scorecard: ComplianceScorecard = calculate_compliance_score(
        findings,
        total_observations=len(observations),
        overall_outcome=overall
    )

    wb = Workbook()

    # ── TAB 1: SUMMARY ───────────────────────────────────────────────────────
    ws = wb.active
    ws.title = "Summary"
    classes: Dict[DestClass, int] = {c: 0 for c in DestClass}
    rows = []
    for o in observations:
        cls = classify_destination(o.destination, index)
        classes[cls] += 1
        rows.append((o, cls))

    meta_items = [
        ("Document", document),
        ("SHA-256", sha256),
        ("Project", project_name),
        ("Discipline", discipline_name),
        ("Applicable Standard", applicable_standard),
        ("Quality Score", f"{scorecard.quality_score} / 100"),
        ("Overall (machine)", overall),
        ("Generated (UTC)", datetime.now(timezone.utc).isoformat(timespec="seconds")),
        ("Prompt version", prompt_version),
        ("Model", model),
        ("Pages processed", f"{pages[0]}/{pages[1]}"),
        ("Findings", len(findings)),
        ("Green / Yellow / Grey / Blue", " / ".join(str(classes[c]) for c in DestClass)),
        ("Status", "Machine result only. A human reviewer must sign off.")
    ]
    for k, v in meta_items:
        ws.append([k, v])

    ws["A1"].font = ws["A4"].font = Font(bold=True)
    for r in ws.iter_rows(min_row=1, max_row=ws.max_row):
        r[0].font = Font(bold=True)
    # Highlight Overall status cell
    for r_idx in range(1, ws.max_row + 1):
        if ws.cell(row=r_idx, column=1).value == "Overall (machine)":
            ws.cell(row=r_idx, column=2).fill = PatternFill("solid", fgColor=_OUT.get(overall, "FFFFFF"))
            ws.cell(row=r_idx, column=2).font = Font(bold=True)
    _autosize(ws)

    # ── TAB 2: WIRES ─────────────────────────────────────────────────────────
    wr = wb.create_sheet("Wires")
    _header(wr, ["Page", "Wire", "Colour", "Size mm2", "Source", "Destination", "Dest class", "Confidence", "Evidence"])
    for o, cls in rows:
        wr.append([o.page, o.wire_no, o.colour, o.size, o.source, o.destination, cls.value, round(o.confidence, 2), o.evidence])
        wr.cell(row=wr.max_row, column=7).fill = PatternFill("solid", fgColor=_FILL[cls])
    _autosize(wr)

    # ── TAB 3: FINDINGS (Full Root-Cause + Node Reference + Viability Schema) ─
    wf = wb.create_sheet("Findings")
    _header(wf, [
        "Finding ID", "Rule Code", "Severity", "Title", "Description",
        "Component / Symbol", "Input Node Ref (OEM)", "Output Node Ref (SVG/JPG)",
        "Circuit Viability (Will It Work?)", "Circuit Consequence",
        "Root Cause Origin", "Future Operational Problem", "How to Fix (Remediation)",
        "Standard Reference", "Observed Fact", "Standard Requirement",
        "Location", "Confidence", "Review Status", "Reviewer Sign-off", "Reviewer Comment"
    ])
    for f in findings:
        conf_pct = f"{int(round(f.get('confidence', 0.95) * 100))}%" if isinstance(f.get('confidence'), (int, float)) else "95%"
        ci = f.get("circuit_impact") or {}
        will_work_str = "YES - OPERATIVE" if ci.get("will_work", True) else "NO - WILL NOT WORK"
        wf.append([
            f.get("finding_id", "D-001"),
            f.get("rule_code", f.get("rule_id", "RULE-NET-001")),
            f.get("severity", "MAJOR"),
            f.get("title", ""),
            f.get("description", f.get("reason", "")),
            f.get("component_symbol") or f.get("component_category") or "Wiring / Terminal",
            f.get("node_reference_oem", f.get("expected_value", "")),
            f.get("node_reference_redraw", f.get("detected_value", "")),
            will_work_str,
            ci.get("circuit_consequence", f.get("reason", "")),
            f.get("root_cause", ""),
            f.get("future_problem", ""),
            f.get("remediation_required", ci.get("remediation_required", "")),
            f.get("standard_reference", "SPANQC Heavy Vehicle Standard"),
            f.get("observed_fact", f.get("detected_value", f.get("evidence_text", ""))),
            f.get("standard_requirement", f.get("expected_value", "")),
            f.get("location", f"Sheet {f.get('page_number', 1)}"),
            conf_pct,
            f.get("review_status", "OPEN"),
            f.get("reviewer_signoff", "Unassigned"),
            f.get("reviewer_comment", "")
        ])
        cur_row = wf.max_row
        sev = f.get("severity", "MAJOR")
        wf.cell(row=cur_row, column=3).fill = PatternFill("solid", fgColor=_SEV_FILL.get(sev, "FFFFFF"))
        wf.cell(row=cur_row, column=9).fill = PatternFill("solid", fgColor="C6EFCE" if ci.get("will_work", True) else "FFC7CE")
        for col_idx in range(1, 22):
            c = wf.cell(row=cur_row, column=col_idx)
            c.font = Font(size=9, name="Arial")
            c.border = _BORDER_THIN
    _autosize(wf)

    # ── TAB 4: FLAGGED GAPS ──────────────────────────────────────────────────
    wu = wb.create_sheet("Flagged gaps")
    _header(wu, ["What", "Why"])
    for u in uncertain:
        wu.append([u.get("what"), u.get("why")])
    _autosize(wu)

    # ── TAB 5: COMPONENTS ────────────────────────────────────────────────────
    wc = wb.create_sheet("Components")
    if detected_components:
        _header(wc, ["Designator", "Symbol Name", "Category", "Sheet", "Node Ref", "Source Type", "Evidence"])
        for dc in detected_components:
            wc.append([
                dc.get("designator"),
                dc.get("symbol_name"),
                dc.get("category"),
                dc.get("sheet"),
                dc.get("node_ref"),
                dc.get("source_type"),
                dc.get("evidence"),
            ])
    else:
        _header(wc, ["Component", "Scope"])
        for c in sorted(index.known):
            wc.append([c, "in scope" if c in index.in_scope else "known (not re-verified)"])
    _autosize(wc)

    # ── TAB 6 & 7 (optional): HIERARCHICAL SEGMENTATION & LINE-BY-LINE TRACE ──
    if segmentation_pipeline:
        wms = wb.create_sheet("Module Segmentation")
        _header(wms, [
            "Module #", "Module Title", "Pages", "Input Sheet Codes",
            "Output Matched Sheets", "Components", "Wires",
            "Confirmed FINE", "Issues Found", "Score", "Status"
        ])
        for m in segmentation_pipeline.get("module_segments") or []:
            wms.append([
                f"Module {m.get('module_number', '?')}",
                m.get("module_title", ""),
                ", ".join(str(p) for p in (m.get("pages") or [])),
                ", ".join(m.get("sheet_codes") or []),
                ", ".join(m.get("output_sheets") or []),
                m.get("component_count", 0),
                m.get("wire_count", 0),
                m.get("confirmed_fine", 0),
                m.get("wrong_count", 0),
                m.get("score", 0),
                m.get("status", "UNVERIFIED"),
            ])
        _autosize(wms)

        wll = wb.create_sheet("Line-by-Line Trace")
        _header(wll, [
            "Line #", "Module #", "Sheet Code", "Page", "Functional Zone",
            "Wire No", "Colour", "Gauge (mm2)", "From Node", "To Node",
            "Cross-Sheet Path", "Status", "Verdict", "Remediation", "Evidence"
        ])
        for lt in segmentation_pipeline.get("line_by_line_validation") or []:
            wll.append([
                lt.get("line_no"),
                lt.get("module_number"),
                lt.get("sheet_code"),
                lt.get("page"),
                lt.get("functional_segment"),
                lt.get("wire_no"),
                lt.get("colour"),
                lt.get("size_mm2"),
                lt.get("from_node"),
                lt.get("to_node"),
                lt.get("cross_sheet_path") or "-",
                lt.get("validation_status"),
                lt.get("verdict"),
                lt.get("remediation"),
                lt.get("evidence"),
            ])
        _autosize(wll)

    out = Path(path)
    wb.save(out)
    return out


def export_csv_report(
    findings: Sequence[dict],
    document: str,
    project_name: str = "Hyundai VDH Heavy Equipment Series",
    applicable_standard: str = "ISO 6722 / SAE J1939 / Hyundai Tech Pub",
    quality_score: int = 78,
    overall_outcome: str = "FAIL"
) -> str:
    """Generate exact CSV string matching Screenshot 1 + Root Cause & Node Reference columns."""
    output = io.StringIO()
    writer = csv.writer(output)

    inspection_dt = datetime.now(timezone.utc).strftime("%m/%d/%Y %I:%M:%S %p")

    writer.writerow(["SPANQC ENGINEERING QC INSPECTION REPORT (CSV EXCEL COMPATIBLE)"])
    writer.writerow(["Document Name", document])
    writer.writerow(["Project", project_name])
    writer.writerow(["Applicable Standard", applicable_standard])
    writer.writerow(["SHA-256 Hash", "N/A"])
    writer.writerow(["Quality Score", f"{quality_score} / 100"])
    writer.writerow(["Overall Result", overall_outcome])
    writer.writerow(["Inspection Date", inspection_dt])
    writer.writerow([])
    writer.writerow([
        "Finding ID", "Rule Code", "Severity", "Title", "Description",
        "Standard Reference", "Observed Fact / Evidence", "Standard Requirement",
        "Location (Sheet/Zone)", "Confidence", "Review Status",
        "Reviewer Sign-off", "Reviewer Comment",
        "Component / Symbol", "Input Node Ref (OEM)", "Output Node Ref (SVG/JPG)",
        "Will Circuit Work?", "Circuit Consequence", "Root Cause Origin",
        "Future Operational Problem", "How to Fix (Remediation)"
    ])

    for f in findings:
        conf_pct = f"{int(round(f.get('confidence', 0.95) * 100))}%" if isinstance(f.get('confidence'), (int, float)) else "95%"
        ci = f.get("circuit_impact") or {}
        will_work_str = "YES - OPERATIVE" if ci.get("will_work", True) else "NO - WILL NOT WORK"
        writer.writerow([
            f.get("finding_id", "D-001"),
            f.get("rule_code", f.get("rule_id", "RULE-NET-001")),
            f.get("severity", "MAJOR"),
            f.get("title", ""),
            f.get("description", f.get("reason", "")),
            f.get("standard_reference", "SPANQC Heavy Vehicle Standard"),
            f.get("observed_fact", f.get("detected_value", f.get("evidence_text", ""))),
            f.get("standard_requirement", f.get("expected_value", "")),
            f.get("location", f"Sheet {f.get('page_number', 1)}"),
            conf_pct,
            f.get("review_status", "OPEN"),
            f.get("reviewer_signoff", "Unassigned"),
            f.get("reviewer_comment", ""),
            f.get("component_symbol") or f.get("component_category") or "Wiring / Terminal",
            f.get("node_reference_oem", f.get("expected_value", "")),
            f.get("node_reference_redraw", f.get("detected_value", "")),
            will_work_str,
            ci.get("circuit_consequence", f.get("reason", "")),
            f.get("root_cause", ""),
            f.get("future_problem", ""),
            f.get("remediation_required", ci.get("remediation_required", ""))
        ])

    return output.getvalue()


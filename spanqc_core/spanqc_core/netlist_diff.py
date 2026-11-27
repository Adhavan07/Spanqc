"""Generic Deterministic Netlist Diff Engine: Input OEM vs. Output Redraw.

Performs strictly data-driven topological graph diffing between:
- Graph A: Input OEM Wiring Diagram wires & endpoints
- Graph B: Output Redraw Work wires, endpoints, & SVG vector findings

Generic Discrepancy Checks (zero project-specific or hardcoded wire names):
1. Missing conductors in Output (LMS-01)
2. Wire colour code mismatches (LMS-06, normalized across IEC & OEM abbreviations)
3. Wire cross-section / gauge deviations > 25% (LMS-05)
4. Undirected endpoint / pin-level mismatches & bidirectional pin swaps (LMS-03 / LMS-04)
5. Malformed wire label syntax flagged by SVG parser (LMS-06)
6. Font standard violations flagged by font checker (LMS-11)
7. Unused / unconnected terminal stubs flagged by geometry analyzer (LMS-09)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .rules import FAIL, REVIEW, _finding
from .symbols import enrich_finding_diagnostics
from .viability import CircuitImpact, ViabilityStatus, assess_circuit_viability
from .wirecodes import norm_colour, norm_size, norm_terminal, norm_wire_no, to_iec_colour


@dataclass
class NetlistDiffResult:
    total_oem_wires: int
    total_human_wires: int
    matched_count: int
    findings: List[dict]
    circuit_impacts: List[CircuitImpact]
    will_work_count: int
    will_not_work_count: int
    documentation_error_count: int


def _attach_impact(finding: Dict[str, Any], sheet_name: str = "Output SVG/JPG") -> CircuitImpact:
    impact = assess_circuit_viability(
        str(finding.get("rule_id") or finding.get("code") or ""),
        str(finding.get("title") or ""),
        str(finding.get("expected_value") or finding.get("expected") or ""),
        str(finding.get("detected_value") or finding.get("detected") or ""),
    )
    will_work = impact.status != ViabilityStatus.WILL_NOT_WORK
    finding["circuit_impact"] = {
        "status": impact.status.value,
        "will_work": will_work,
        "circuit_consequence": impact.circuit_consequence,
        "safety_hazard": impact.safety_hazard,
        "remediation_required": finding.get("remediation_required") or impact.remediation_required,
        "severity": impact.severity if impact.severity != "WARNING" else "MEDIUM",
    }
    if not finding.get("remediation_required"):
        finding["remediation_required"] = impact.remediation_required
    enrich_finding_diagnostics(finding, sheet_name=sheet_name)
    return impact


def _canonical_colour(col: Optional[str]) -> str:
    norm = norm_colour(col)
    if not norm:
        return ""
    return to_iec_colour(norm) or norm


def _wire_endpoints(w: Dict[str, Any]) -> Tuple[str, str]:
    src = norm_terminal(str(w.get("source_comp") or w.get("source") or ""))
    dst = norm_terminal(str(w.get("dest_pin") or w.get("dest_comp") or w.get("destination") or ""))
    return src, dst


def diff_oem_vs_human_netlists(
    oem_wires: List[Dict[str, Any]],
    human_wires: List[Dict[str, Any]],
    document_name: str = "Drawing Comparison",
) -> NetlistDiffResult:
    """Generically compare Input OEM netlist against Output redrawn wires & pins."""
    findings: List[dict] = []
    impacts: List[CircuitImpact] = []

    oem_by_wire: Dict[str, Dict[str, Any]] = {}
    for w in oem_wires:
        wn = norm_wire_no(w.get("wire_no"))
        if wn:
            oem_by_wire[wn] = w

    human_by_wire: Dict[str, List[Dict[str, Any]]] = {}
    for w in human_wires:
        wn = norm_wire_no(w.get("wire_no"))
        if wn:
            human_by_wire.setdefault(wn, []).append(w)

    matched = 0
    verified_working_wires = 0
    swapped_wire_pairs_seen: set[frozenset[str]] = set()

    # 1. Generic Input OEM vs. Output Redraw Wire & Pin Comparison
    for wn, oem_w in oem_by_wire.items():
        h_matches = human_by_wire.get(wn)
        oem_col = _canonical_colour(oem_w.get("colour"))
        oem_sz = norm_size(str(oem_w.get("size_mm2") or oem_w.get("size") or ""))
        oem_page = oem_w.get("page", 1)
        oem_src = str(oem_w.get("source_comp") or oem_w.get("source") or f"Input Page {oem_page}")
        oem_dst = str(oem_w.get("dest_pin") or oem_w.get("dest_comp") or oem_w.get("destination") or "")
        oem_node = f"Input OEM (Page {oem_page}): Wire {wn} ({oem_col} {oem_sz or '?'}mm²) [{oem_src} -> {oem_dst or 'Pin'}]"

        if not h_matches:
            if human_by_wire:  # Only flag missing when output wires exist
                f = _finding(
                    "LMS-01", "Netlist Conductor Continuity", FAIL,
                    f"Missing Conductor Net [{wn}] in Output",
                    f"Wire {wn} ({oem_col} {oem_sz or '?'}mm²) exists in Input OEM schematic but is missing from all Output SVG/JPG sheets.",
                    expected=f"{wn} {oem_col} {oem_sz or ''}".strip(),
                    detected="ABSENT in Output SVGs/JPGs",
                    evidence=oem_w.get("evidence_text") or oem_node,
                    page=oem_page,
                    confidence=0.96,
                )
                f["node_reference_oem"] = oem_node
                f["node_reference_redraw"] = f"Output SVG/JPG Package: Wire [{wn}] missing"
                f["root_cause"] = f"Conductor net [{wn}] documented at [{oem_src} -> {oem_dst or 'Pin'}] in Input PDF was dropped during redrawing into Output sheets."
                f["future_problem"] = f"Circuit branch powered or signaled by wire {wn} remains open; downstream component will fail to operate during testing and field use."
                f["remediation_required"] = f"Add wire label '{wn} {oem_col} {oem_sz or ''}' and restore conductor path from {oem_src} to {oem_dst or 'destination'} in Output SVG."
                findings.append(f)
                impacts.append(_attach_impact(f, "Output SVG/JPG"))
            continue

        matched += 1
        h_w = h_matches[0]
        h_col = _canonical_colour(h_w.get("colour"))
        h_sz = norm_size(str(h_w.get("size_mm2") or h_w.get("size") or ""))
        h_sheet = str(h_w.get("source") or h_w.get("sheet") or f"Sheet {h_w.get('page', 1)}")
        h_src = str(h_w.get("source_comp") or h_w.get("source") or h_sheet)
        h_dst = str(h_w.get("dest_pin") or h_w.get("dest_comp") or h_w.get("destination") or "")
        h_node = f"Output ({h_sheet}): Wire {wn} ({h_col} {h_sz or '?'}mm²) [{h_src} -> {h_dst or 'Pin'}]"

        wire_is_healthy = True

        # 1A. Colour mismatch check
        if oem_col and h_col and oem_col != h_col:
            wire_is_healthy = False
            critical_col = (
                ("RD" in oem_col and "BK" in h_col)
                or ("BK" in oem_col and "RD" in h_col)
                or ("GN/YE" in (oem_col, h_col))
            )
            f = _finding(
                "LMS-06", "Wire Colour Code Mismatch", FAIL if critical_col else REVIEW,
                f"Colour Mismatch on Wire [{wn}]: {h_col} vs OEM {oem_col}",
                f"Input OEM specifies colour '{oem_col}' for wire {wn}, but Output SVG sheet [{h_sheet}] shows '{h_col}'.",
                expected=f"{wn} {oem_col} {oem_sz or ''}".strip(),
                detected=f"{wn} {h_col} {h_sz or ''}".strip(),
                evidence=f"OEM: {oem_col} | Output ({h_sheet}): {h_col}",
                page=h_w.get("page", oem_page),
                confidence=0.97,
            )
            f["node_reference_oem"] = oem_node
            f["node_reference_redraw"] = h_node
            f["root_cause"] = f"Drafting colour code error on SVG sheet [{h_sheet}]: '{h_col}' drawn instead of OEM '{oem_col}'."
            f["future_problem"] = "Technicians and harness builders will route wrong colour conductors, risking polarity swap or misdiagnosis."
            f["remediation_required"] = f"Change wire {wn} colour callout on SVG [{h_sheet}] from '{h_col}' to '{oem_col}' and re-export JPG."
            findings.append(f)
            impacts.append(_attach_impact(f, h_sheet))

        # 1B. Cross-section / gauge mismatch check (>25% deviation)
        if oem_sz and h_sz and oem_sz != h_sz:
            try:
                ratio = abs(float(oem_sz) - float(h_sz)) / max(float(oem_sz), 0.01)
            except ValueError:
                ratio = 1.0
            if ratio > 0.25:
                undersized = float(h_sz) < float(oem_sz) * 0.75
                if undersized:
                    wire_is_healthy = False
                f = _finding(
                    "LMS-05", "Wire Gauge Deviation", FAIL if undersized else REVIEW,
                    f"Gauge Size Deviation on Wire [{wn}]: {h_sz}mm² vs OEM {oem_sz}mm²",
                    f"Input OEM specifies {oem_sz}mm² for wire {wn}, but Output sheet [{h_sheet}] specifies {h_sz}mm².",
                    expected=f"{wn} {oem_col} {oem_sz}mm²",
                    detected=f"{wn} {h_col} {h_sz}mm²",
                    evidence=f"OEM: {oem_sz}mm² | Output ({h_sheet}): {h_sz}mm²",
                    page=h_w.get("page", oem_page),
                    confidence=0.97,
                )
                f["node_reference_oem"] = oem_node
                f["node_reference_redraw"] = h_node
                f["root_cause"] = f"Cross-section attribute on wire {wn} in SVG [{h_sheet}] set to {h_sz}mm² instead of {oem_sz}mm²."
                f["future_problem"] = (
                    f"Undersized {h_sz}mm² conductor can overheat and melt insulation under rated current load."
                    if undersized
                    else f"Incorrect wire gauge {h_sz}mm² causes BOM mismatch and wrong terminal crimp sizing."
                )
                f["remediation_required"] = f"Update wire {wn} cross-section from {h_sz} to {oem_sz} mm² on SVG [{h_sheet}]."
                findings.append(f)
                impacts.append(_attach_impact(f, h_sheet))

        # 1C. Generic Undirected Endpoint / Pin Swap & Mismatch Check
        oem_ends = _wire_endpoints(oem_w)
        h_ends = _wire_endpoints(h_w)
        if oem_ends[1] and h_ends[1] and set(oem_ends) != set(h_ends):
            if oem_ends[1] not in h_ends[1] and h_ends[1] not in oem_ends[1]:
                wire_is_healthy = False
                swapped_partner = None
                for other_wn, other_oem in oem_by_wire.items():
                    if other_wn == wn:
                        continue
                    other_h_list = human_by_wire.get(other_wn)
                    if not other_h_list:
                        continue
                    o_oem_ends = _wire_endpoints(other_oem)
                    o_h_ends = _wire_endpoints(other_h_list[0])
                    if o_oem_ends[1] == h_ends[1] and oem_ends[1] == o_h_ends[1]:
                        swapped_partner = other_wn
                        break

                if swapped_partner:
                    pair_key = frozenset({wn, swapped_partner})
                    if pair_key not in swapped_wire_pairs_seen:
                        swapped_wire_pairs_seen.add(pair_key)
                        f = _finding(
                            "LMS-03", "Reversed Pinout / Endpoint Swap", FAIL,
                            f"Swapped pinout detected between wires {wn} and {swapped_partner}",
                            f"Wire {wn} terminates at {h_dst or h_ends[1]} (OEM expects {oem_dst or oem_ends[1]}) while {swapped_partner} took {oem_dst or oem_ends[1]}.",
                            expected=f"{wn}->{oem_dst or oem_ends[1]}",
                            detected=f"{wn}->{h_dst or h_ends[1]} (Swapped with {swapped_partner})",
                            evidence=f"{wn}: {h_dst} | {swapped_partner} swapped",
                            page=h_w.get("page", oem_page),
                            confidence=0.98,
                        )
                        f["node_reference_oem"] = oem_node
                        f["node_reference_redraw"] = h_node
                        f["root_cause"] = f"Terminal assignments for {wn} and {swapped_partner} were transposed during schematic redrawing on {h_sheet}."
                        f["future_problem"] = "Swapped pinout cross-energizes the wrong load/signal path and prevents intended circuit operation."
                        f["remediation_required"] = f"Swap terminal connections for {wn} and {swapped_partner} on SVG [{h_sheet}] to match OEM."
                        findings.append(f)
                        impacts.append(_attach_impact(f, h_sheet))
                else:
                    f = _finding(
                        "LMS-03", "Endpoint / Pin Mismatch", FAIL,
                        f"Endpoint mismatch on wire {wn}: Output [{h_dst or h_ends[1]}] vs OEM [{oem_dst or oem_ends[1]}]",
                        f"Wire {wn} connects to '{h_dst or h_ends[1]}' in Output [{h_sheet}], whereas Input OEM connects to '{oem_dst or oem_ends[1]}'.",
                        expected=f"{wn} -> {oem_dst or oem_ends[1]}",
                        detected=f"{wn} -> {h_dst or h_ends[1]}",
                        evidence=f"OEM: {oem_dst} | Output: {h_dst}",
                        page=h_w.get("page", oem_page),
                        confidence=0.95,
                    )
                    f["node_reference_oem"] = oem_node
                    f["node_reference_redraw"] = h_node
                    f["root_cause"] = f"Wire {wn} routed to wrong destination node '{h_dst or h_ends[1]}' on sheet [{h_sheet}]."
                    f["future_problem"] = "Signal or supply fails to reach its intended OEM destination node."
                    f["remediation_required"] = f"Re-route wire {wn} destination on SVG [{h_sheet}] from '{h_dst or h_ends[1]}' to '{oem_dst or oem_ends[1]}'."
                    findings.append(f)
                    impacts.append(_attach_impact(f, h_sheet))

        if wire_is_healthy:
            verified_working_wires += 1

    # 2. Generic Data-Driven Output Quality Flags (malformed labels, font violations, unused stubs)
    seen_malformed: set[str] = set()
    seen_fonts: set[Tuple[str, str]] = set()
    seen_stubs: set[str] = set()

    for w in human_wires:
        sheet_n = str(w.get("source") or f"Sheet {w.get('page', 1)}")

        if w.get("is_malformed"):
            ev = str(w.get("evidence_text") or "").strip()
            if ev and ev not in seen_malformed:
                seen_malformed.add(ev)
                f = _finding(
                    "LMS-06", "Malformed Wire Code Syntax", REVIEW,
                    f"Malformed wire code '{ev}' printed on sheet",
                    f"Printed wire label '{ev}' failed syntax parser ({w.get('malformed_reason') or 'invalid colour/format'}). Transcribed verbatim per LMS Rule 8.",
                    expected="Valid wire syntax (WireNo Colour Size)",
                    detected=ev,
                    evidence=ev,
                    page=w.get("page", 1),
                    confidence=0.96,
                )
                f["node_reference_oem"] = "Input OEM Standard: Slash-delimited wire code syntax"
                f["node_reference_redraw"] = f"Output SVG/JPG ({sheet_n}): Printed literal '{ev}'"
                f["root_cause"] = f"Wire callout '{ev}' mistyped without valid delimiter or colour code on {sheet_n}."
                f["future_problem"] = "Harness assembly technicians may misinterpret conductor colour or wire ID."
                f["remediation_required"] = f"Correct wire label '{ev}' syntax on SVG [{sheet_n}] and re-export JPG."
                findings.append(f)
                impacts.append(_attach_impact(f, sheet_n))

        if w.get("font_violation"):
            fv = w["font_violation"]
            fv_key = (sheet_n, str(fv.get("text", "")))
            if fv_key not in seen_fonts:
                seen_fonts.add(fv_key)
                f = _finding(
                    "LMS-11", "CAD Font Standard Deviation", REVIEW,
                    f"Font size deviation in text element: '{fv.get('text', '')}'",
                    f"Drafting standard requires {fv.get('expected_px', 10.0)}px, but found {fv.get('found_px', 8.0)}px on sheet '{sheet_n}'.",
                    expected=f"{fv.get('expected_px', 10.0)}px",
                    detected=f"{fv.get('found_px', 8.0)}px",
                    evidence=str(fv.get("text", "")),
                    page=w.get("page", 1),
                    confidence=0.99,
                )
                f["node_reference_oem"] = f"Tech Pub Standard: {fv.get('expected_px', 10.0)}px"
                f["node_reference_redraw"] = f"Output SVG ({sheet_n}): '{fv.get('text', '')}' rendered at {fv.get('found_px', 8.0)}px"
                findings.append(f)
                impacts.append(_attach_impact(f, sheet_n))

        for stub in w.get("unused_stubs") or []:
            s_id = str(stub)
            if s_id and s_id not in seen_stubs:
                seen_stubs.add(s_id)
                f = _finding(
                    "LMS-09", "Unused Terminal / Fuse Stub", REVIEW,
                    f"Fuse/Terminal {s_id} has no outgoing wire drawn",
                    f"Terminal stub {s_id} has no outgoing wire drawn on sheet {sheet_n}. Destination must remain NULL unless connected in OEM.",
                    expected="Unused stub with NULL destination or valid connection",
                    detected=f"{s_id} (No wire drawn)",
                    evidence=s_id,
                    page=w.get("page", 1),
                    confidence=0.95,
                )
                findings.append(f)
                impacts.append(_attach_impact(f, sheet_n))

    will_not_work = sum(1 for imp in impacts if imp.status == ViabilityStatus.WILL_NOT_WORK)
    doc_errors = sum(
        1 for imp in impacts
        if imp.status in (ViabilityStatus.DEFECTIVE_DOCUMENTATION, ViabilityStatus.DRAFTING_NONCONFORMANCE)
    )

    return NetlistDiffResult(
        total_oem_wires=len(oem_wires),
        total_human_wires=len(human_wires),
        matched_count=matched,
        findings=findings,
        circuit_impacts=impacts,
        will_work_count=verified_working_wires,
        will_not_work_count=will_not_work,
        documentation_error_count=doc_errors,
    )

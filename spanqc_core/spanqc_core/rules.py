"""Deterministic rule engine: reconciles AI-extracted observations against reference netlists and international standards.

Safety invariants (each has a regression test):
  * A wrong or ambiguous reading never yields PASS.
  * Conflicting duplicate observations of one wire -> REVIEW, regardless of order (no last-write-wins).
  * Wire ends are undirected (A->B == B->A). Sizes compare numerically; colours compare exactly.
  * A missing / unreadable value is REVIEW (null + flag), never silently accepted and never guessed.
  * Partial page coverage, an uncertified specification or an empty extraction can never PASS.
  * A machine PASS only means 'no discrepancy found'; a human reviewer still signs off.
  * Non-negotiable: Never invent a standard, never invent a clause number, fail closed.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from .standards.registry import Discipline, get_standard
    from .wirecodes import colour_is_valid, norm_colour, norm_size, norm_terminal, norm_wire_no
except (ImportError, ValueError):
    from spanqc_core.standards.registry import Discipline, get_standard
    from spanqc_core.wirecodes import colour_is_valid, norm_colour, norm_size, norm_terminal, norm_wire_no

PASS, FAIL, REVIEW = "PASS", "FAIL", "REVIEW"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    MINOR = "MINOR"
    WARNING = "WARNING"
    INFORMATIONAL = "INFORMATIONAL"
    MANUAL_REVIEW = "MANUAL REVIEW"


@dataclass
class Observation:
    wire_no: Optional[str]
    colour: Optional[str] = None
    size: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    confidence: float = 1.0
    evidence: str = ""
    page: int = 1
    zone: Optional[str] = None


@dataclass
class Expected:
    wire_no: str
    colour: Optional[str] = None
    size: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None


@dataclass
class RuleDefinition:
    rule_id: str
    rule_code: str
    title: str
    discipline: Discipline
    standard_id: str
    standard_name: str
    edition: str
    clause: str
    severity: Severity
    validation_type: str = "deterministic"
    required_inputs: List[str] = field(default_factory=list)
    applicability: str = "mandatory"
    standard_requirement: str = ""
    remediation: str = ""
    evidence_required: bool = True
    manual_review_required: bool = False


# Structured Rule Registry covering the 6 disciplines
STRUCTURED_RULES: Dict[str, RuleDefinition] = {
    "LMS-01": RuleDefinition(
        rule_id="LMS-01",
        rule_code="RULE-NET-001",
        title="Missing Reference Wire in Drawing",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="ISO-6722",
        standard_name="ISO 6722-1 / Hyundai Tech Pub",
        edition="2011",
        clause="5.2",
        severity=Severity.CRITICAL,
        standard_requirement="Every circuit conductor specified in reference netlist must be present in drawing.",
        remediation="Verify missing conductor path or update drawing harness revision."
    ),
    "LMS-02": RuleDefinition(
        rule_id="LMS-02",
        rule_code="RULE-NET-002",
        title="Conflicting Duplicate Observations",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="IEC-61082-1",
        standard_name="IEC 61082-1",
        edition="2014",
        clause="4.3",
        severity=Severity.MAJOR,
        standard_requirement="Circuit documentation must be unambiguous and free from conflicting duplicate references.",
        remediation="Human inspector must verify conflicting sheet callouts and align netlist."
    ),
    "LMS-03": RuleDefinition(
        rule_id="LMS-03",
        rule_code="RULE-CR-001",
        title="Endpoint / Pin Terminal Mismatch",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="SAE-J1939",
        standard_name="SAE J1939-13 / ISO 6722",
        edition="2021",
        clause="13",
        severity=Severity.CRITICAL,
        standard_requirement="Terminal pins and connector designations must strictly match harness schematic.",
        remediation="Correct terminal pin assignments to prevent cross-connection or reversed pinout."
    ),
    "LMS-04": RuleDefinition(
        rule_id="LMS-04",
        rule_code="RULE-CC-001",
        title="Conductor Colour Mismatch",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="IEC-60445",
        standard_name="IEC 60445 / ISO 6722",
        edition="2021",
        clause="6.2",
        severity=Severity.CRITICAL,
        standard_requirement="Conductor insulation colour must conform to specified circuit schematic.",
        remediation="Align drawn wire colour with reference wire schedule."
    ),
    "LMS-05": RuleDefinition(
        rule_id="LMS-05",
        rule_code="RULE-WG-001",
        title="Conductor Gauge / Cross-Section Mismatch",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="ISO-6722",
        standard_name="ISO 6722-1 / SAE J1128",
        edition="2011",
        clause="5.2",
        severity=Severity.CRITICAL,
        standard_requirement="Conductor cross-sectional area (mm² / AWG) must meet minimum ampacity.",
        remediation="Update conductor size to match rated circuit load."
    ),
    "LMS-06": RuleDefinition(
        rule_id="LMS-06",
        rule_code="RULE-CC-003",
        title="Invalid / Malformed Wire Code Syntax",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="ISO-6722",
        standard_name="ISO 6722-1 / Hyundai LMS Rule 8",
        edition="2011",
        clause="5.3",
        severity=Severity.MAJOR,
        standard_requirement="Bi-colour conductors must use standard slash separator (e.g. BK/WH, never BKWH).",
        remediation="Correct typographic error in sheet label. Transcribe as printed and flag for review."
    ),
    "LMS-07": RuleDefinition(
        rule_id="LMS-07",
        rule_code="RULE-QA-001",
        title="Low Confidence / Ambiguous Character Reading",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="ISO-7200",
        standard_name="ISO 7200",
        edition="2004",
        clause="5.2",
        severity=Severity.WARNING,
        standard_requirement="Engineering text callouts must be crisp and legible.",
        remediation="Human inspector sign-off required to confirm blurry or compressed label."
    ),
    "LMS-08": RuleDefinition(
        rule_id="LMS-08",
        rule_code="RULE-NET-008",
        title="Unlisted Wire in Drawing",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="IEC-61082-1",
        standard_name="IEC 61082-1",
        edition="2014",
        clause="5.1",
        severity=Severity.WARNING,
        standard_requirement="All physical conductors must be accounted for in circuit schedule.",
        remediation="Confirm whether unlisted wire is an uncertified design modification or scope addition."
    ),
    "LMS-09": RuleDefinition(
        rule_id="LMS-09",
        rule_code="RULE-TB-001",
        title="Unreadable Attribute / Unused Component Stub",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="IEC-60204-1",
        standard_name="IEC 60204-1 / LMS §8.3",
        edition="2016",
        clause="13.1",
        severity=Severity.WARNING,
        standard_requirement="Unused fuse cavities or stubs must have null destination recorded; missing values never guessed.",
        remediation="Record component as unused/spare; never infer or fabricate non-existent wires."
    ),
    "LMS-10": RuleDefinition(
        rule_id="LMS-10",
        rule_code="RULE-QA-002",
        title="Incomplete Page / Sheet Coverage",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="ISO-7200",
        standard_name="ISO 7200",
        edition="2004",
        clause="5.2",
        severity=Severity.CRITICAL,
        standard_requirement="All sheets in drawing set must be verified. A partial read can never pass.",
        remediation="Re-upload complete drawing package or missing sheets."
    ),
    "LMS-11": RuleDefinition(
        rule_id="LMS-11",
        rule_code="RULE-FONT-001",
        title="CAD Font Size Standard Violation",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="IEC-61082-1",
        standard_name="IEC 61082-1 / Hyundai VDH §4.5",
        edition="2014",
        clause="6.2",
        severity=Severity.MINOR,
        standard_requirement="Component codes require 10px, power rails 8px, wire labels 7px.",
        remediation="Adjust CAD text layer font-size attribute to standard drawing specification."
    ),
    "LMS-12": RuleDefinition(
        rule_id="LMS-12",
        rule_code="RULE-QA-003",
        title="Empty Extraction",
        discipline=Discipline.HEAVY_VEHICLE,
        standard_id="ISO-7200",
        standard_name="ISO 7200",
        edition="2004",
        clause="5.2",
        severity=Severity.CRITICAL,
        standard_requirement="Drawing must contain readable engineering vector or raster elements.",
        remediation="Verify drawing format and resolution."
    ),
}


def _sig(o: Observation) -> tuple:
    ends = tuple(sorted((norm_terminal(o.source), norm_terminal(o.destination))))
    return (ends, norm_colour(o.colour), norm_size(o.size))


def _finding(
    rule_id: str,
    name: str,
    outcome: str,
    title: str,
    reason: str,
    expected: str = "",
    detected: str = "",
    evidence: str = "",
    page: Optional[int] = None,
    zone: Optional[str] = None,
    confidence: float = 0.95,
) -> dict:
    """Build a rich, standardized QC finding compatible with professional audit reports."""
    rule_def = STRUCTURED_RULES.get(rule_id)
    rule_code = rule_def.rule_code if rule_def else rule_id
    std_ref = f"{rule_def.standard_name} §{rule_def.clause}" if rule_def else "SPANQC Tech Pub validation (LMS)"
    std_req = rule_def.standard_requirement if rule_def else (expected or "Requirement specified in standard")

    sev = "CRITICAL" if outcome == FAIL else ("MINOR" if rule_id == "LMS-11" else "MAJOR")

    loc_str = f"Sheet {page}" if page else "General"
    if zone:
        loc_str += f", Zone {zone}"

    return {
        "finding_id": f"D-{uuid.uuid4().hex[:4].upper()}",
        "rule_id": rule_id,
        "rule_code": rule_code,
        "rule_name": name,
        "severity": sev,
        "outcome": outcome,
        "title": title,
        "description": reason,
        "reason": reason,
        "standard_reference": std_ref,
        "observed_fact": detected or evidence or reason,
        "standard_requirement": std_req,
        "location": loc_str,
        "confidence": confidence,
        "review_status": "OPEN",
        "reviewer_signoff": "Unassigned",
        "reviewer_comment": "",
        "expected_value": expected,
        "detected_value": detected,
        "evidence_text": evidence,
        "page_number": page,
        "human_review_required": outcome != PASS,
    }


def _fmt(o: Observation) -> str:
    return f"{o.source}->{o.destination} [{o.colour}, {o.size} mm2] (p{o.page})"


def evaluate(
    observations: Sequence[Observation],
    expected: Sequence[Expected],
    *,
    specification_is_complete: bool = False,
    total_pages: int = 1,
    processed_pages: int = 1,
    failed_pages: Sequence[int] = (),
    min_confidence: float = 0.6,
    discipline: Discipline = Discipline.HEAVY_VEHICLE,
) -> Tuple[str, List[dict]]:
    findings: List[dict] = []

    exp_by_wire: Dict[str, Expected] = {}
    for e in expected:
        key = norm_wire_no(e.wire_no)
        if not key:
            raise ValueError("Expected wire without a wire_no")
        if key in exp_by_wire:
            raise ValueError(f"Duplicate wire '{key}' in the reference specification")
        exp_by_wire[key] = e

    groups: Dict[str, List[Observation]] = {}
    for o in observations:
        key = norm_wire_no(o.wire_no)
        if key:
            groups.setdefault(key, []).append(o)
        else:
            findings.append(_finding(
                "LMS-09", "Unidentified Observation", REVIEW,
                "Observation without a wire number",
                "An extracted item has no readable wire number and cannot be matched.",
                detected=_fmt(o), evidence=o.evidence, page=o.page, zone=o.zone
            ))

    coverage_gap = bool(failed_pages) or processed_pages < total_pages
    if coverage_gap:
        findings.append(_finding(
            "LMS-10", "Incomplete Page Coverage", REVIEW,
            "Not every page was processed",
            f"{processed_pages}/{total_pages} pages processed; failed pages: {list(failed_pages)}. A partial read can never pass."
        ))

    if not observations and exp_by_wire:
        findings.append(_finding(
            "LMS-12", "Empty Extraction", REVIEW,
            "No observations were extracted",
            "The extraction returned nothing; this is treated as an extraction failure, not as missing wires."
        ))
    else:
        for key, e in exp_by_wire.items():
            group = groups.get(key)
            if not group:
                findings.append(_finding(
                    "LMS-01", "Missing Wire", FAIL,
                    f"Wire '{e.wire_no}' not found in the drawing",
                    f"Reference wire '{e.wire_no}' has no matching observation.",
                    expected=f"{e.wire_no}: {e.source}->{e.destination} [{e.colour}, {e.size} mm2]"
                ))
                continue
            if len({_sig(o) for o in group}) > 1:
                findings.append(_finding(
                    "LMS-02", "Conflicting Duplicate Observations", REVIEW,
                    f"Wire '{e.wire_no}' read {len(group)} times with conflicting values",
                    "The readings disagree on ends, colour or size; a human must decide which is correct.",
                    expected=f"{e.wire_no}: {e.source}->{e.destination} [{e.colour}, {e.size} mm2]",
                    detected=" | ".join(_fmt(o) for o in group),
                    evidence=group[0].evidence, page=group[0].page, zone=group[0].zone
                ))
                continue
            o = max(group, key=lambda x: x.confidence)

            if o.confidence < min_confidence:
                findings.append(_finding(
                    "LMS-07", "Low Confidence Reading", REVIEW,
                    f"Wire '{e.wire_no}' read with low confidence ({o.confidence:.2f})",
                    f"Confidence is below the {min_confidence:.2f} threshold; a human must confirm.",
                    detected=_fmt(o), evidence=o.evidence, page=o.page, zone=o.zone
                ))
                continue

            # colour
            if e.colour is not None:
                oc = norm_colour(o.colour)
                if oc is None:
                    findings.append(_finding(
                        "LMS-09", "Unreadable Attribute", REVIEW,
                        f"Wire '{e.wire_no}': colour not read",
                        "Colour was not extracted (null); not guessed.",
                        expected=e.colour, evidence=o.evidence, page=o.page, zone=o.zone
                    ))
                elif not colour_is_valid(oc):
                    findings.append(_finding(
                        "LMS-06", "Invalid Colour Code", REVIEW,
                        f"Wire '{e.wire_no}': unrecognised colour '{o.colour}'",
                        "Not a known colour code; possible misread.",
                        expected=e.colour, detected=str(o.colour),
                        evidence=o.evidence, page=o.page, zone=o.zone
                    ))
                elif oc != norm_colour(e.colour):
                    findings.append(_finding(
                        "LMS-04", "Colour Mismatch", FAIL,
                        f"Wire '{e.wire_no}': colour differs from reference",
                        f"Reference colour {e.colour}, drawing shows {oc}.",
                        expected=e.colour, detected=oc,
                        evidence=o.evidence, page=o.page, zone=o.zone
                    ))

            # size (numeric)
            if e.size is not None:
                osz, esz = norm_size(o.size), norm_size(e.size)
                if osz is None:
                    findings.append(_finding(
                        "LMS-09", "Unreadable Attribute", REVIEW,
                        f"Wire '{e.wire_no}': size not read",
                        "Size was not extracted (null) or is not a number; not guessed.",
                        expected=str(e.size), detected=str(o.size),
                        evidence=o.evidence, page=o.page, zone=o.zone
                    ))
                elif osz != esz:
                    findings.append(_finding(
                        "LMS-05", "Size Mismatch", FAIL,
                        f"Wire '{e.wire_no}': size differs from reference",
                        f"Reference {esz} mm2, drawing shows {osz} mm2.",
                        expected=esz, detected=osz,
                        evidence=o.evidence, page=o.page, zone=o.zone
                    ))

            # ends (undirected)
            if e.source is not None or e.destination is not None:
                want = tuple(sorted((norm_terminal(e.source), norm_terminal(e.destination))))
                got = tuple(sorted((norm_terminal(o.source), norm_terminal(o.destination))))
                if "" in got and "" not in want:
                    findings.append(_finding(
                        "LMS-09", "Unreadable Attribute", REVIEW,
                        f"Wire '{e.wire_no}': an endpoint was not read",
                        "An endpoint is null; not guessed.",
                        expected=f"{e.source}<->{e.destination}", detected=f"{o.source}<->{o.destination}",
                        evidence=o.evidence, page=o.page, zone=o.zone
                    ))
                elif want != got:
                    findings.append(_finding(
                        "LMS-03", "Endpoint Mismatch", FAIL,
                        f"Wire '{e.wire_no}': endpoints differ from reference",
                        "The terminals at the two ends do not match the reference.",
                        expected=f"{e.source}<->{e.destination}", detected=f"{o.source}<->{o.destination}",
                        evidence=o.evidence, page=o.page, zone=o.zone
                    ))

        for key, group in groups.items():
            if key not in exp_by_wire:
                findings.append(_finding(
                    "LMS-08", "Unlisted Wire", REVIEW,
                    f"Wire '{key}' is in the drawing but not in the reference",
                    "May be an addition, or the specification is incomplete.",
                    detected=_fmt(group[0]), evidence=group[0].evidence, page=group[0].page, zone=group[0].zone
                ))

    # Evaluate overall status
    if any(f["outcome"] == FAIL for f in findings):
        overall = FAIL
    elif findings or not specification_is_complete or coverage_gap:
        overall = REVIEW
    else:
        overall = PASS

    return overall, findings

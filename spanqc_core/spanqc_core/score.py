"""Golden-set scoring and multi-category compliance scorecard.

Safety invariants:
  * Fabricated entries must stay at zero.
  * Compliance score is calculated strictly from verified rule results and transparent weighting.
  * A drawing with a CRITICAL safety finding MUST NEVER receive a passing grade, regardless of average score.
"""
from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

from .wirecodes import WireLabel, norm_colour, norm_size, norm_terminal, norm_wire_no


@dataclass
class SheetScore:
    sheet: str
    truth: int
    observed: int
    matched: int
    fabricated: List[str]
    missed: List[str]

    @property
    def precision(self) -> float:
        return self.matched / self.observed if self.observed else 1.0

    @property
    def recall(self) -> float:
        return self.matched / self.truth if self.truth else 1.0


@dataclass
class ComplianceScorecard:
    """Comprehensive, transparent engineering QC compliance scorecard."""
    documentation_score: float      # Title blocks, revisions, drawing formats (0-100)
    symbol_compliance_score: float  # Graphic symbols, junction dots, terminal orientations (0-100)
    connectivity_score: float       # Net continuity, pin matching, no broken traces (0-100)
    identification_score: float     # Conductor colors, gauges, component IDs (0-100)
    electrical_safety_score: float  # Grounding, fuse ratings, overcurrent protection (0-100)
    standards_compliance_score: float # Adherence to cited standard clauses (0-100)
    quality_score: int              # Overall composite score (0-100)
    overall_outcome: str            # PASS | REVIEW | FAIL
    applicable_rules_count: int
    passed_rules_count: int
    failed_rules_count: int
    warning_count: int
    unverified_count: int
    critical_violations_present: bool
    summary_notes: str = ""


def _label(item) -> WireLabel | None:
    if isinstance(item, WireLabel):
        return item
    if isinstance(item, str):
        return WireLabel.parse(item)
    col = norm_colour(item.get("colour"))
    return WireLabel(norm_wire_no(item.get("wire_no")), col, norm_size(item.get("size"))) if col else None


def score_sheet(sheet: str, truth: Iterable[WireLabel], observed: Iterable, anomalies: Iterable[str] = ()) -> SheetScore:
    """Score one sheet against ground truth labels."""
    t, o = Counter(truth), Counter()
    anomaly_left = Counter(norm_terminal(a) for a in anomalies)
    anomaly_total = sum(anomaly_left.values())
    faithful = unparsable = 0
    for item in observed:
        lab = _label(item)
        if lab is None and isinstance(item, str) and anomaly_left[norm_terminal(item)] > 0:
            anomaly_left[norm_terminal(item)] -= 1
            faithful += 1
        elif lab is None:
            unparsable += 1
        else:
            o[lab] += 1
    t_total = sum(t.values()) + anomaly_total
    matched = sum(min(t[k], o[k]) for k in o) + faithful
    fabricated = [f"{k.text} x{o[k] - t[k]}" for k in o if o[k] > t[k]]
    missed = [f"{k.text} x{t[k] - o[k]}" for k in t if t[k] > o[k]]
    fabricated += [f"<unparsable item> x{unparsable}"] if unparsable else []
    missed += [f"<anomaly as printed> x{n}" for n in anomaly_left.values() if n > 0]
    return SheetScore(sheet, t_total, sum(o.values()) + unparsable + faithful, matched, sorted(fabricated), sorted(missed))


def aggregate(scores: List[SheetScore]) -> dict:
    truth, obs, matched = (sum(getattr(s, k) for s in scores) for k in ("truth", "observed", "matched"))
    return {
        "sheets": len(scores),
        "truth_labels": truth,
        "observed_labels": obs,
        "matched": matched,
        "precision": round(matched / obs, 4) if obs else 1.0,
        "recall": round(matched / truth, 4) if truth else 1.0,
        "fabricated_count": sum(len(s.fabricated) for s in scores),
    }


def write_run_log(path: str | Path, *, prompt_version: str, model: str, change_note: str, scores: List[SheetScore]) -> dict:
    """Append one prompt-iteration record."""
    record = {
        "when": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "prompt_version": prompt_version,
        "model": model,
        "change_note": change_note,
        "aggregate": aggregate(scores),
        "per_sheet": [{**asdict(s), "precision": round(s.precision, 4), "recall": round(s.recall, 4)} for s in scores],
    }
    p = Path(path)
    log = json.loads(p.read_text()) if p.exists() else []
    log.append(record)
    p.write_text(json.dumps(log, indent=2))
    return record


def calculate_compliance_score(
    findings: Sequence[dict],
    total_observations: int = 1,
    overall_outcome: str = "REVIEW"
) -> ComplianceScorecard:
    """Calculate transparent compliance scorecard from verified findings.
    Adheres strictly to Rule: No critical failure is masked by high average score.
    """
    critical_findings = [f for f in findings if f.get("severity") == "CRITICAL" or f.get("outcome") == "FAIL"]
    major_findings = [f for f in findings if f.get("severity") == "MAJOR"]
    minor_findings = [f for f in findings if f.get("severity") == "MINOR"]
    warning_findings = [f for f in findings if f.get("severity") == "WARNING"]
    manual_review_findings = [f for f in findings if f.get("human_review_required") is True]

    # Category deductions based on specific rule types
    doc_deductions = sum(15 for f in findings if f.get("rule_id") in {"LMS-10", "LMS-11", "RULE-TB-005"})
    sym_deductions = sum(20 for f in findings if f.get("rule_id") in {"RULE-NET-007"})
    conn_deductions = sum(25 for f in findings if f.get("rule_id") in {"LMS-01", "LMS-03", "RULE-CR-001"})
    ident_deductions = sum(15 for f in findings if f.get("rule_id") in {"LMS-04", "LMS-05", "LMS-06", "LMS-08", "RULE-WG-001", "RULE-CC-001", "RULE-CC-003"})
    safety_deductions = sum(30 for f in critical_findings)

    doc_score = max(0.0, min(100.0, 100.0 - doc_deductions))
    sym_score = max(0.0, min(100.0, 100.0 - sym_deductions))
    conn_score = max(0.0, min(100.0, 100.0 - conn_deductions))
    ident_score = max(0.0, min(100.0, 100.0 - ident_deductions))
    safety_score = max(0.0, min(100.0, 100.0 - safety_deductions))
    standards_score = round((doc_score + sym_score + conn_score + ident_score + safety_score) / 5.0, 1)

    # Composite quality score (0-100)
    raw_composite = (conn_score * 0.35) + (safety_score * 0.25) + (ident_score * 0.20) + (sym_score * 0.10) + (doc_score * 0.10)
    quality_score = int(round(raw_composite))

    has_critical = len(critical_findings) > 0

    if has_critical:
        # Critical safety invariant: If a critical violation exists, result MUST be FAIL
        final_outcome = "FAIL"
        # Cap score so it visually reflects failure
        quality_score = min(quality_score, 78)
        summary = f"CRITICAL NON-CONFORMITY: {len(critical_findings)} critical safety violations detected. Immediate engineering review required."
    elif len(findings) > 0 or overall_outcome == "REVIEW":
        final_outcome = "REVIEW"
        summary = f"REVIEW REQUIRED: {len(major_findings)} major and {len(minor_findings)} minor findings require human inspector sign-off."
    else:
        final_outcome = "PASS"
        summary = "PASS: All verified engineering rules conform to drawing standard. Ready for reviewer sign-off."

    total_applicable = 12  # Base LMS & electrical rules
    passed_rules = max(0, total_applicable - len({f.get("rule_id") for f in findings}))

    return ComplianceScorecard(
        documentation_score=doc_score,
        symbol_compliance_score=sym_score,
        connectivity_score=conn_score,
        identification_score=ident_score,
        electrical_safety_score=safety_score,
        standards_compliance_score=standards_score,
        quality_score=quality_score,
        overall_outcome=final_outcome,
        applicable_rules_count=total_applicable,
        passed_rules_count=passed_rules,
        failed_rules_count=len(critical_findings),
        warning_count=len(warning_findings) + len(major_findings),
        unverified_count=len(manual_review_findings),
        critical_violations_present=has_critical,
        summary_notes=summary
    )

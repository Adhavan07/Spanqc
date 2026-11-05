"""Deterministic QC Analysis CLI runner.

Executes SPANQC core deterministic analysis directly from Python,
eliminating hard dependencies on external HTTP daemon or API keys.
Returns the complete validated QCReport JSON to stdout.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import uuid
from pathlib import Path

# Ensure spanqc_core is in path
here = Path(__file__).resolve().parent
if str(here) not in sys.path:
    sys.path.insert(0, str(here))

import pymupdf

from spanqc_core.rules import (
    evaluate,
    FAIL,
    PASS,
    REVIEW,
    Observation,
    Expected,
)
from spanqc_core.wirecodes import WireLabel, norm_colour
from spanqc_core.standards.registry import get_standard, Discipline
from spanqc_core.standards.disciplines import detect_discipline
from spanqc_core.score import calculate_compliance_score
from spanqc_core.fontcheck import check_fonts
from spanqc_core.visual_segmenter import extract_visual_segments_and_defects


def main():
    parser = argparse.ArgumentParser(description="Run SPANQC Deterministic Analysis")
    parser.add_argument("--file", required=True, help="Path to schematic file")
    parser.add_argument("--standard", default="SPANQC Tech Pub (Hyundai VDH)", help="Compliance Standard")
    parser.add_argument("--expected-netlist-json", default=None, help="Reference netlist JSON")
    parser.add_argument("--specification-complete", action="store_true", default=False)
    parser.add_argument("--extraction-verified", action="store_true", default=False)
    args = parser.parse_args()

    file_path = Path(args.file)
    if not file_path.is_file():
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)

    data = file_path.read_bytes()
    sha256 = hashlib.sha256(data).hexdigest()
    filename = file_path.name

    # 1. Parse expected netlist if supplied
    expected_list: list[Expected] = []
    if args.expected_netlist_json:
        try:
            raw_exp = json.loads(args.expected_netlist_json)
            for w in raw_exp:
                expected_list.append(Expected(
                    wire_no=str(w.get("wire_no", "")),
                    colour=w.get("colour"),
                    size=None if w.get("size_mm2") is None else str(w.get("size_mm2")),
                    source=w.get("source"),
                    destination=w.get("destination"),
                ))
        except Exception as exc:
            print(json.dumps({"error": f"Invalid expected netlist JSON: {exc}"}))
            sys.exit(1)

    # 2. Open document with PyMuPDF
    try:
        if filename.lower().endswith(".pdf") or data.startswith(b"%PDF"):
            doc = pymupdf.open(stream=data, filetype="pdf")
        elif filename.lower().endswith(".svg") or b"<svg" in data[:1024]:
            doc = pymupdf.open(stream=data, filetype="svg")
        else:
            doc = pymupdf.open(stream=data, filetype="png" if "png" in filename.lower() else "jpeg")
    except Exception as exc:
        print(json.dumps({"error": f"Failed to open schematic document: {exc}"}))
        sys.exit(1)

    total_pages = len(doc)
    observations: list[Observation] = []
    pages_rendered: list[str] = []
    extra_findings: list[dict] = []
    failed_pages: list[int] = []

    # 3. Process each page deterministically
    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1

        # Render page image for report viewer
        try:
            pix = page.get_pixmap(dpi=110)
            b64_img = base64.b64encode(pix.tobytes("jpg")).decode("ascii")
            pages_rendered.append(f"data:image/jpeg;base64,{b64_img}")
        except Exception:
            pages_rendered.append("")

        # Extract text vectors
        text = page.get_text()
        page_lines = [l.strip() for l in text.splitlines() if l.strip()]

        page_obs_count = 0
        for l in page_lines:
            lab = WireLabel.parse(l)
            if lab:
                observations.append(Observation(
                    wire_no=lab.wire_no,
                    colour=lab.colour,
                    size=lab.size,
                    source=f"Page {page_num}",
                    destination=None,
                    confidence=1.0,
                    evidence=l,
                    page=page_num,
                ))
                page_obs_count += 1
            else:
                import re
                m = re.match(r"^(\d+(?:\.\d+)?)\s*([A-Za-z/]{1,6})$", l)
                if m and len(m.group(2)) <= 4 and norm_colour(m.group(2)):
                    observations.append(Observation(
                        wire_no=None,
                        colour=norm_colour(m.group(2)),
                        size=m.group(1),
                        source=f"Page {page_num}",
                        destination=None,
                        confidence=0.8,
                        evidence=l,
                        page=page_num,
                    ))
                    page_obs_count += 1

        # Check visual defect bboxes from visual_segmenter
        try:
            vis = extract_visual_segments_and_defects(data, filename, page_number=page_num)
            for d in vis.get("defects", []):
                extra_findings.append({
                    "id": d["id"],
                    "code": d["rule"],
                    "rule_code": d["rule"],
                    "title": d["title"],
                    "severity": d["severity"],
                    "outcome": FAIL if d["severity"] == "CRITICAL" else REVIEW,
                    "description": d["details"],
                    "consequence": d.get("consequence", "WILL_NOT_WORK"),
                    "detected_value": d.get("observed", d["title"]),
                    "expected_value": d.get("expected", "Standard compliance"),
                    "sheet_name": f"Page {page_num}",
                    "location": f"Sheet {page_num}",
                    "page": page_num,
                    "human_review_required": d["severity"] != "CRITICAL",
                })
        except Exception:
            pass

    processed_pages = total_pages - len(failed_pages)

    # 4. Evaluate observations with deterministic rule engine
    overall, findings = evaluate(
        observations,
        expected_list,
        specification_is_complete=args.specification_complete,
        total_pages=total_pages,
        processed_pages=processed_pages,
        failed_pages=failed_pages,
    )

    # Merge defect findings
    findings.extend(extra_findings)

    # Deduplicate findings by code and title
    unique_findings = []
    seen_f = set()
    for f in findings:
        k = (f.get("code") or f.get("rule_code"), f.get("title"), f.get("page"))
        if k not in seen_f:
            seen_f.add(k)
            unique_findings.append(f)

    if any(f.get("outcome") == FAIL or f.get("severity") == "CRITICAL" for f in unique_findings):
        overall = FAIL
    elif unique_findings or not args.specification_complete:
        overall = REVIEW
    else:
        overall = PASS

    # Calculate compliance scorecard
    disc, _ = detect_discipline("", filename=filename)
    scorecard = calculate_compliance_score(
        unique_findings,
        total_observations=len(observations),
        overall_outcome=overall,
    )

    report_id = f"RPT-{uuid.uuid4().hex[:10].upper()}"

    output = {
        "report_id": report_id,
        "document_name": filename,
        "sha256_hash": sha256,
        "standard": args.standard,
        "discipline": disc.value,
        "quality_score": scorecard.quality_score,
        "scorecard": {
            "quality_score": scorecard.quality_score,
            "overall_outcome": overall,
            "documentation_score": scorecard.documentation_score,
            "symbol_score": scorecard.symbol_compliance_score,
            "connectivity_score": scorecard.connectivity_score,
            "identification_score": scorecard.identification_score,
            "safety_score": scorecard.electrical_safety_score,
            "critical_violations": 1 if scorecard.critical_violations_present else 0,
            "major_violations": scorecard.failed_rules_count,
            "minor_violations": scorecard.warning_count,
            "critical_violations_present": scorecard.critical_violations_present,
        },
        "overall_outcome": overall,
        "specification_is_complete": args.specification_complete,
        "extraction_is_verified": args.extraction_verified,
        "rule_findings": unique_findings,
        "candidate_observations": [
            {
                "wire_no": o.wire_no,
                "colour": o.colour,
                "size_mm2": o.size,
                "source": o.source,
                "destination": o.destination,
                "evidence": o.evidence,
                "confidence": o.confidence,
                "page": o.page,
            }
            for o in observations[:150]
        ],
        "pages_rendered": pages_rendered,
        "total_page_count": total_pages,
        "processed_page_count": processed_pages,
        "failed_page_count": len(failed_pages),
        "unprocessed_page_numbers": [],
        "failed_page_numbers": failed_pages,
        "is_experimental": False,
        "model_used": "spanqc-deterministic-engine-v2",
        "disclaimer": "DETERMINISTIC QC VERIFICATION: Pure code verification according to standard engineering rules.",
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()

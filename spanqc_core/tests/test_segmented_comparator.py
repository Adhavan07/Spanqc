"""Tests for Segmented Pure-Python Comparator and Circuit Viability."""
from pathlib import Path
from spanqc_core.segmenter import FunctionalSegment, classify_sheet_segment
from spanqc_core.viability import ViabilityStatus, assess_circuit_viability
from spanqc_core.netlist_diff import diff_oem_vs_human_netlists
from spanqc_core.comparator import run_oem_vs_human_comparison


def test_sheet_segmentation_classification():
    assert classify_sheet_segment("1 FB1-1.svg") == FunctionalSegment.FB1_FUSEBOX
    assert classify_sheet_segment("2-1.svg") == FunctionalSegment.CMCU_CONTROLLER
    assert classify_sheet_segment("3-1.svg") == FunctionalSegment.ENGINE_POWER
    assert classify_sheet_segment("4-1.svg") == FunctionalSegment.CABIN_LIGHTING
    assert classify_sheet_segment("5.svg") == FunctionalSegment.HYDRAULIC_TRANS
    assert classify_sheet_segment("7-1.svg") == FunctionalSegment.CHASSIS_CA30
    assert classify_sheet_segment("12-1.svg") == FunctionalSegment.RELAYS_AUX


def test_circuit_viability_assessment():
    imp_swap = assess_circuit_viability("LMS-03", "Swapped pinout on CN-93", "Pin 75", "Pin 76")
    assert imp_swap.status == ViabilityStatus.WILL_NOT_WORK
    assert imp_swap.severity == "CRITICAL"
    assert "incorrect relay" in imp_swap.circuit_consequence.lower()

    imp_f1 = assess_circuit_viability("LMS-01", "Missing F1 30A power branch", "F1 -> Pin 28", "Omitted")
    assert imp_f1.status == ViabilityStatus.WILL_NOT_WORK
    assert imp_f1.severity == "CRITICAL"
    assert "unpowered" in imp_f1.circuit_consequence.lower()

    imp_font = assess_circuit_viability("LMS-11", "Font size deviation on CCR1", "10px", "8px")
    assert imp_font.status == ViabilityStatus.DRAFTING_NONCONFORMANCE
    assert imp_font.severity == "MINOR"


def test_deterministic_diff_catches_all_defects():
    oem_wires = [
        {"wire_no": "W101", "colour": "GN", "size_mm2": 0.75, "source": "CK49", "destination": "CN-93:75", "page": 1},
        {"wire_no": "W102", "colour": "GN/YE", "size_mm2": 0.75, "source": "CK25", "destination": "CN-93:76", "page": 1},
        {"wire_no": "W103", "colour": "RD", "size_mm2": 2.5, "source": "F1:28", "destination": "CA30:28", "page": 1},
        {"wire_no": "W104", "colour": "RD", "size_mm2": 1.0, "source": "F2:1", "destination": "M1:1", "page": 2},
        {"wire_no": "W105", "colour": "BU", "size_mm2": 2.5, "source": "F3:1", "destination": "M2:1", "page": 2},
    ]
    human_wires = [
        {"wire_no": "W101", "colour": "GN", "size_mm2": 0.75, "source": "CK49", "destination": "CN-93:76", "page": 5, "evidence_text": "W101 -> CN-93:76"},
        {"wire_no": "W102", "colour": "GN/YE", "size_mm2": 0.75, "source": "CK25", "destination": "CN-93:75", "page": 5, "evidence_text": "W102 -> CN-93:75"},
        # W103 intentionally omitted to trigger LMS-01 missing net
        {"wire_no": "W104", "colour": "BK", "size_mm2": 1.0, "source": "F2:1", "destination": "M1:1", "page": 2, "evidence_text": "W104 BK 1.0"},
        {"wire_no": "W105", "colour": "BU", "size_mm2": 0.5, "source": "F3:1", "destination": "M2:1", "page": 2, "evidence_text": "W105 BU 0.5"},
        {"wire_no": "81K", "evidence_text": "81K BKWH 1.0", "is_malformed": True, "malformed_reason": "BKWH", "page": 4},
        {"wire_no": "CCR1", "font_violation": {"text": "CCR1", "found_px": 8.0, "expected_px": 10.0}, "page": 12},
        {"wire_no": "FUSE_STUB", "unused_stubs": ["F18"], "page": 6},
    ]

    res = diff_oem_vs_human_netlists(oem_wires=oem_wires, human_wires=human_wires)
    rule_ids = [f["rule_id"] for f in res.findings]
    titles = [f["title"] for f in res.findings]

    assert "LMS-03" in rule_ids  # generic pin swap caught
    assert "LMS-01" in rule_ids  # missing OEM net W103
    assert "LMS-06" in rule_ids  # RD vs BK colour mismatch + malformed 81K BKWH
    assert "LMS-05" in rule_ids  # 2.5mm2 -> 0.5mm2 undersize
    assert "LMS-11" in rule_ids  # font violation CCR1
    assert "LMS-09" in rule_ids  # unused stub F18
    assert any("F18" in t for t in titles)
    assert res.will_not_work_count >= 2


def test_full_comparison_run(tmp_path):
    svg_dir = Path("/data/projects/uiux/test_data/LMS/LMS (2)/PROJECT INFO (1)/PROJECT INFO/OUTPUT/SVG")
    oem_pdf = Path("/data/projects/uiux/test_data/LMS/LMS (2)/PROJECT INFO (1)/PROJECT INFO/INPUT.pdf")

    if svg_dir.exists() and oem_pdf.exists():
        xlsx_out = tmp_path / "QC_Report.xlsx"
        csv_out = tmp_path / "QC_Report.csv"

        report = run_oem_vs_human_comparison(
            oem_pdf_path=oem_pdf,
            human_svg_dir_or_zip=svg_dir,
            output_excel_path=xlsx_out,
            output_csv_path=csv_out
        )

        assert report["status"] == "success"
        assert report["overall_outcome"] in ("FAIL", "REVIEW")
        assert 0 <= report["quality_score"] <= 100
        assert xlsx_out.exists()
        assert csv_out.exists()
        assert "Finding ID,Rule Code,Severity" in csv_out.read_text()


def test_self_comparison_repeated_wire_numbers_no_false_defects():
    """FB1-1.svg compared against an exact copy must produce 0 netlist diff findings and not flag F2..F9."""
    from fastapi.testclient import TestClient
    from spanqc_core.api import create_app
    from spanqc_core.svg_truth import parse_svg_sheet_full

    fb1 = Path(__file__).resolve().parent / "fixtures" / "FB1-1.svg"
    obs, _, svg_findings = parse_svg_sheet_full(fb1.read_text())
    flagged_fuses = {f["evidence_text"] for f in svg_findings if f["rule_id"] == "LMS-09"}
    for connected_fuse in ("F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"):
        assert connected_fuse not in flagged_fuses

    wires = [
        {
            "wire_no": o.wire_no,
            "colour": o.colour,
            "size_mm2": o.size,
            "source": o.source,
            "destination": o.destination,
            "page": o.page,
            "evidence_text": o.evidence,
        }
        for o in obs if o.wire_no
    ]
    diff_res = diff_oem_vs_human_netlists(wires, wires)
    assert diff_res.findings == []
    assert diff_res.will_not_work_count == 0

    app = create_app(lambda: None)
    r = TestClient(app).post(
        "/api/v1/analyze",
        files={
            "file": ("FB1-1.svg", fb1.read_bytes(), "image/svg+xml"),
            "output_file": ("FB1-1.svg", fb1.read_bytes(), "image/svg+xml"),
        },
    )
    assert r.status_code == 200
    j = r.json()
    rule_ids = {f["rule_id"] for f in j["rule_findings"]}
    # Must never emit LMS-08 (no reference netlist) or netlist diff failures on exact self-copy
    assert "LMS-08" not in rule_ids
    assert j["overall_outcome"] != "FAIL"
    assert j["quality_score"] >= 90


def test_segmenter_no_false_confirm_by_colour_size_and_review_not_critical_fail():
    from spanqc_core.segmenter import run_hierarchical_segmentation_and_tracing
    from spanqc_core.extract import load_prompt
    import pytest

    # Different wire number with identical colour+size must NOT be marked CONFIRMED_FINE
    seg = run_hierarchical_segmentation_and_tracing(
        input_pages=[{"page_number": 1, "name": "FB1-1", "text_raw": "122A WH 1.5"}],
        output_wires=[{"wire_no": "999", "colour": "WH", "size_mm2": "1.5", "source": "Sheet1"}],
        output_components=[],
        output_sheet_names=["Sheet1.svg"],
        findings=[
            {"rule_id": "LMS-09", "outcome": "REVIEW", "severity": "MAJOR", "title": f"Review item {i}", "page_number": 1}
            for i in range(6)
        ],
        overall_score=80,
    )
    assert seg["line_by_line_validation"][-1]["validation_status"] != "CONFIRMED_FINE"
    assert all(m["status"] != "CRITICAL_FAIL" for m in seg["module_segments"])

    with pytest.raises(ValueError):
        load_prompt("../secrets")


def test_svg_input_vs_output_deduplicates_identical_findings():
    from fastapi.testclient import TestClient
    from spanqc_core.api import create_app

    s25 = Path(__file__).resolve().parent / "fixtures" / "2-5.svg"
    app = create_app(lambda: None)
    r = TestClient(app).post(
        "/api/v1/analyze",
        files={
            "file": ("2-5.svg", s25.read_bytes(), "image/svg+xml"),
            "output_file": ("2-5.svg", s25.read_bytes(), "image/svg+xml"),
        },
    )
    assert r.status_code == 200
    j = r.json()
    malformed = [f for f in j["rule_findings"] if f["rule_id"] == "LMS-06" and "81K" in (f.get("evidence_text") or "")]
    assert len(malformed) == 1


def test_pdf_vector_geometry_tracing_in_segmenter():
    from spanqc_core.segmenter import run_hierarchical_segmentation_and_tracing

    # Put wire text near a connected drawing line joining FB1 and CN-5,
    # even though an unrelated component (CR99) sits closer in flat text line order.
    seg = run_hierarchical_segmentation_and_tracing(
        input_pages=[{
            "page_number": 1,
            "name": "Page 1",
            "text_raw": "FB1\nCR99\n122A WH 1.5\nCN-5",
            "geometry": {
                "segments": [
                    ((100.0, 100.0), (100.0, 220.0)),
                    ((100.0, 220.0), (200.0, 220.0)),
                ],
                "text_items": [
                    (100.0, 95.0, "FB1"),
                    (105.0, 160.0, "122A WH 1.5"),
                    (205.0, 220.0, "CN-5"),
                    (400.0, 400.0, "CR99"),
                ],
            },
        }],
        output_wires=[{"wire_no": "122A", "colour": "WH", "size_mm2": "1.5", "source": "FB1-1.svg"}],
        output_components=[],
        output_sheet_names=["FB1-1.svg"],
        findings=[],
        overall_score=100,
    )
    lines = seg["line_by_line_validation"]
    assert len(lines) == 1
    assert "FB1" in lines[0]["from_node"]
    assert "CN-5" in lines[0]["to_node"]
    assert "CR99" not in lines[0]["from_node"] and "CR99" not in lines[0]["to_node"]


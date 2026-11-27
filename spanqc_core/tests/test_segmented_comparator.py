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


"""Tests for Global Standards Registry, 6 Disciplines, and Compliance Scorecard."""
from pathlib import Path
from spanqc_core.standards.registry import (
    Discipline,
    Jurisdiction,
    StandardFamily,
    STANDARDS_REGISTRY,
    get_standard,
    list_standards_for_discipline,
)
from spanqc_core.standards.disciplines import detect_discipline, resolve_applicable_standards
from spanqc_core.rules import _finding, FAIL, REVIEW, PASS
from spanqc_core.score import calculate_compliance_score
from spanqc_core.report import export_csv_report, build_report
from spanqc_core.classify import ComponentIndex


def test_standards_registry_contains_mandatory_families():
    assert "ISO-6722" in STANDARDS_REGISTRY
    assert "SAE-J1939" in STANDARDS_REGISTRY
    assert "IEC-60204-1" in STANDARDS_REGISTRY
    assert "IEC-60445" in STANDARDS_REGISTRY
    assert "UL-508A" in STANDARDS_REGISTRY
    assert "IS-732" in STANDARDS_REGISTRY

    iso6722 = get_standard("ISO-6722")
    assert iso6722 is not None
    assert iso6722.family == StandardFamily.ISO
    assert Discipline.HEAVY_VEHICLE in iso6722.disciplines
    assert "5.2" in iso6722.clauses


def test_discipline_detection():
    disc_heavy, conf1 = detect_discipline("Hyundai Wheel Loader Chassis Harness J1939", filename="VDH19_A.pdf")
    assert disc_heavy == Discipline.HEAVY_VEHICLE
    assert conf1 >= 0.7

    disc_panel, conf2 = detect_discipline("Main Distribution MCC Panel VFD starter", filename="MCC_Panel.dwg")
    assert disc_panel == Discipline.CONTROL_PANEL

    disc_pid, conf3 = detect_discipline("Piping & Instrumentation Diagram with Pressure Transmitter PT-101", filename="Loop.pdf")
    assert disc_pid == Discipline.PID_INSTRUMENTATION


def test_applicable_standards_resolution():
    stds = resolve_applicable_standards(Discipline.HEAVY_VEHICLE)
    codes = [s.standard_id for s in stds]
    assert "ISO-6722" in codes
    assert "SAE-J1939" in codes
    assert "IEC-60445" in codes


def test_compliance_scorecard_fail_closed_on_critical_failure():
    # If there is a CRITICAL / FAIL finding, scorecard MUST fail closed (overall_outcome = FAIL)
    critical_finding = _finding("LMS-01", "Missing Wire", FAIL, "Wire 143 missing", "Reference wire not found")
    assert critical_finding["severity"] == "CRITICAL"

    card = calculate_compliance_score([critical_finding], total_observations=10, overall_outcome=FAIL)
    assert card.overall_outcome == "FAIL"
    assert card.critical_violations_present is True
    assert card.failed_rules_count >= 1
    # Quality score must not present a high passing percentage
    assert card.quality_score <= 78


def test_compliance_scorecard_passes_when_clean():
    card = calculate_compliance_score([], total_observations=50, overall_outcome=PASS)
    assert card.overall_outcome == "PASS"
    assert card.critical_violations_present is False
    assert card.quality_score == 100
    assert card.failed_rules_count == 0


def test_csv_export_matches_screenshot_schema():
    findings = [
        _finding("LMS-05", "Size Mismatch", FAIL, "Wire W102 lacks nominal AWG gauge",
                 "Conductor W102 callout does not specify wire gauge",
                 expected="Nominal AWG", detected="Callout: 'W102 6' - wire gauge omitted",
                 page=1, zone="B2", confidence=0.98),
        _finding("LMS-06", "Invalid Wire Code", REVIEW, "Wire W103 missing required color coding",
                 "Conductor W103 callout specifies only gauge and terminal",
                 expected="Standard color coding", detected="Callout: 'W103 22 AWG (TB1-P3)' - color omitted",
                 page=1, zone="C4", confidence=0.94),
    ]

    csv_text = export_csv_report(findings, document="WH-402_Avionics_Wiring_Manual_RevC.pdf", quality_score=78, overall_outcome="FAIL")
    assert "SPANQC ENGINEERING QC INSPECTION REPORT" in csv_text
    assert "Finding ID,Rule Code,Severity,Title,Description,Standard Reference" in csv_text
    assert "Wire W102 lacks nominal AWG gauge" in csv_text
    assert "RULE-WG-001" in csv_text
    assert "RULE-CC-003" in csv_text
    assert "Sheet 1, Zone B2" in csv_text
    assert "98%" in csv_text


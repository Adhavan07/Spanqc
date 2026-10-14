from app.models import (
    CandidateObservation,
    DeterministicRuleFinding,
    EvaluationOutcome,
    EvaluationSeverity,
    EvidenceCoordinates,
    QCReport,
)

def test_qc_report_structure_and_disclaimer():
    coords = EvidenceCoordinates(ymin=0.2, xmin=0.15, ymax=0.35, xmax=0.45)
    obs = CandidateObservation(
        observation_id="OBS-1",
        page_number=1,
        wire_id="W101",
        wire_gauge="20 AWG",
        wire_color="RED",
        source_terminal="J1:1",
        destination_terminal="TB1:1",
        coordinates=coords,
        observed_text="W101 J1:1 -> TB1:1 20AWG RED",
        confidence_score=0.95,
    )

    finding = DeterministicRuleFinding(
        finding_id="FND-1",
        rule_id="RULE-WIRE-ATTR-02",
        rule_name="Conductor Specification Validation",
        standard_reference="IPC/WHMA-A-620D §13.2",
        severity=EvaluationSeverity.INFO,
        outcome=EvaluationOutcome.PASS,
        title="Valid Wire",
        reason="Conductor attributes match standards.",
        coordinates=coords,
    )

    report = QCReport(
        report_id="EXP-QC-TEST-01",
        document_name="benchmark_wd01.pdf",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        standard="IPC/WHMA-A-620D",
        created_at="2026-10-11T20:00:00Z",
        model_used="gemma3:4b",
        overall_outcome=EvaluationOutcome.PASS,
        rule_findings=[finding],
        candidate_observations=[obs],
        pages_rendered=["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."],
    )

    assert report.is_experimental is True
    assert "EXPERIMENTAL PROOF OF CONCEPT" in report.disclaimer
    assert report.specification_is_complete is False
    assert report.extraction_is_verified is False
    assert report.trusted_verification is None
    assert report.candidate_observations[0].coordinates.ymin == 0.2
    assert report.rule_findings[0].coordinates.xmax == 0.45

    # Check JSON export capability
    exported_json = report.model_dump_json()
    assert "EXP-QC-TEST-01" in exported_json
    assert "W101" in exported_json
    assert "trusted_verification" in exported_json

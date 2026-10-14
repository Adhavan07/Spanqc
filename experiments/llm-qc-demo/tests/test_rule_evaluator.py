import pytest
from app.models import (
    CandidateObservation,
    ConfidenceLevel,
    EvaluationOutcome,
    ExpectedWireConnection,
    TrustedExtractionVerification,
    VerificationMethod,
)
from app.rule_evaluator import DeterministicRuleEvaluator

evaluator = DeterministicRuleEvaluator()

def test_empty_observations_cannot_pass():
    outcome, findings = evaluator.evaluate([])
    assert outcome == EvaluationOutcome.REVIEW
    assert len(findings) == 1
    assert findings[0].rule_id == "RULE-INGESTION-00"
    assert findings[0].human_review_required is True

def test_rule_wire_id_missing():
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id=None,  # Missing wire identifier
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="J1:1 to TB1:1 20 AWG RED",
            confidence_score=0.9,
        )
    ]
    outcome, findings = evaluator.evaluate(obs)
    assert outcome == EvaluationOutcome.FAIL
    wire_id_finding = next((f for f in findings if f.rule_id == "RULE-WIRE-ID-01"), None)
    assert wire_id_finding is not None
    assert wire_id_finding.outcome == EvaluationOutcome.FAIL

def test_rule_missing_attributes():
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge=None,  # Missing gauge
            wire_color=None,  # Missing color
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1",
            confidence_score=0.88,
        )
    ]
    outcome, findings = evaluator.evaluate(obs)
    assert outcome == EvaluationOutcome.FAIL
    attr_finding = next((f for f in findings if f.rule_id == "RULE-WIRE-ATTR-02"), None)
    assert attr_finding is not None
    assert "gauge (AWG)" in attr_finding.detected_value
    assert "insulation color" in attr_finding.detected_value

def test_netlist_omission_and_terminal_mismatch():
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
        ExpectedWireConnection(
            wire_id="W102",
            expected_source="J1:2",
            expected_destination="TB1:2",
            expected_gauge="20 AWG",
            expected_color="BLU",
        ),
    ]

    # Candidate has W101 destination routed to TB1:2 (mismatch!) and W102 is missing entirely
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:2",  # Mismatch! Expected TB1:1
            observed_text="W101 J1:1 to TB1:2 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist)
    assert outcome == EvaluationOutcome.FAIL

    dst_mismatch = next((f for f in findings if f.rule_id == "RULE-NETLIST-05"), None)
    assert dst_mismatch is not None
    assert dst_mismatch.expected_value == "TB1:1"
    assert dst_mismatch.detected_value == "TB1:2"

    wire_omission = next((f for f in findings if f.rule_id == "RULE-NETLIST-03"), None)
    assert wire_omission is not None
    assert "W102" in wire_omission.title

def test_ambiguity_triggers_review():
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 to TB1:1 20AWG RED [blurry label]",
            confidence_score=0.55,  # Low confidence
            confidence_level=ConfidenceLevel.LOW,
            ambiguity_reasons=["Partially smudged wire ID callout"],
            requires_human_review=True,
        )
    ]
    outcome, findings = evaluator.evaluate(obs)
    assert outcome == EvaluationOutcome.REVIEW
    amb_finding = next((f for f in findings if f.rule_id == "RULE-AMBIGUITY-08"), None)
    assert amb_finding is not None
    assert amb_finding.human_review_required is True

def test_fully_conforming_netlist_passes():
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
        ExpectedWireConnection(
            wire_id="W102",
            expected_source="J1:2",
            expected_destination="TB1:2",
            expected_gauge="20 AWG",
            expected_color="BLU",
        ),
    ]

    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 to TB1:1 20AWG RED",
            confidence_score=0.95,
            confidence_level=ConfidenceLevel.HIGH,
        ),
        CandidateObservation(
            observation_id="OBS-2",
            page_number=1,
            wire_id="W102",
            wire_gauge="20 AWG",
            wire_color="BLU",
            source_terminal="J1:2",
            destination_terminal="TB1:2",
            observed_text="W102 J1:2 to TB1:2 20AWG BLU",
            confidence_score=0.92,
            confidence_level=ConfidenceLevel.HIGH,
        ),
    ]

    trusted_ver = TrustedExtractionVerification(
        verifier_id="INSP-ENG-01",
        verification_method=VerificationMethod.INDEPENDENT_HUMAN_INSPECTION,
        verified_scope="Sheet 1 Netlist",
        verified_at="2026-10-12T16:00:00Z",
    )
    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        scope_description="Sheet 1 Netlist",
        trusted_verification=trusted_ver,
    )
    assert outcome == EvaluationOutcome.PASS
    pass_finding = next((f for f in findings if f.rule_id == "RULE-PASS-00"), None)
    assert pass_finding is not None
    assert pass_finding.outcome == EvaluationOutcome.PASS
    assert "INSP-ENG-01" in pass_finding.reason

def test_netlist_gauge_and_color_mismatch():
    # Case 4: Gauge and color mismatch against authoritative expected netlist
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="18 AWG",  # Expected 18 AWG
            expected_color="BLU",     # Expected BLU
        ),
    ]

    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="24 AWG",      # Detected 24 AWG (mismatch!)
            wire_color="RED",         # Detected RED (mismatch!)
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 24AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist)
    assert outcome == EvaluationOutcome.FAIL

    gauge_fnd = next((f for f in findings if f.rule_id == "RULE-NETLIST-06"), None)
    assert gauge_fnd is not None
    assert gauge_fnd.expected_value == "18 AWG"
    assert gauge_fnd.detected_value == "24 AWG"

    color_fnd = next((f for f in findings if f.rule_id == "RULE-NETLIST-07"), None)
    assert color_fnd is not None
    assert color_fnd.expected_value == "BLU"
    assert color_fnd.detected_value == "RED"

def test_missing_expected_netlist_produces_review_and_never_passes():
    # Invariant: Missing expected netlist (None) must produce REVIEW with RULE-SPEC-00 and NEVER PASS
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=None)
    assert outcome == EvaluationOutcome.REVIEW
    spec_fnd = next((f for f in findings if f.rule_id == "RULE-SPEC-00"), None)
    assert spec_fnd is not None
    assert spec_fnd.outcome == EvaluationOutcome.REVIEW
    assert spec_fnd.human_review_required is True
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_empty_expected_netlist_produces_review_and_never_passes():
    # Invariant: Empty expected netlist ([]) must produce REVIEW with RULE-SPEC-01 and NEVER PASS
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=[])
    assert outcome == EvaluationOutcome.REVIEW
    spec_fnd = next((f for f in findings if f.rule_id == "RULE-SPEC-01"), None)
    assert spec_fnd is not None
    assert spec_fnd.outcome == EvaluationOutcome.REVIEW
    assert spec_fnd.human_review_required is True
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_explicit_distinction_between_missing_and_empty_netlist():
    # Explicitly test that missing (None) produces RULE-SPEC-00, whereas empty ([]) produces RULE-SPEC-01
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome_none, findings_none = evaluator.evaluate(obs, expected_netlist=None)
    outcome_empty, findings_empty = evaluator.evaluate(obs, expected_netlist=[])

    assert outcome_none == EvaluationOutcome.REVIEW
    assert outcome_empty == EvaluationOutcome.REVIEW

    rule_ids_none = {f.rule_id for f in findings_none}
    rule_ids_empty = {f.rule_id for f in findings_empty}

    assert "RULE-SPEC-00" in rule_ids_none
    assert "RULE-SPEC-01" not in rule_ids_none

    assert "RULE-SPEC-01" in rule_ids_empty
    assert "RULE-SPEC-00" not in rule_ids_empty

def test_single_wire_without_netlist_cannot_pass_and_fails_with_authoritative_netlist():
    # Candidate observation alone cannot PASS (produces REVIEW due to missing netlist),
    # and when evaluated against an authoritative 3-wire netlist, fails with omissions.
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    # Without netlist: cannot PASS, produces REVIEW
    outcome_no_netlist, findings_no_netlist = evaluator.evaluate(obs, expected_netlist=None)
    assert outcome_no_netlist == EvaluationOutcome.REVIEW
    assert any(f.rule_id == "RULE-SPEC-00" for f in findings_no_netlist)

    # With authoritative 3-wire netlist: fails due to omissions
    authoritative_netlist = [
        ExpectedWireConnection(wire_id="W101", expected_source="J1:1", expected_destination="TB1:1"),
        ExpectedWireConnection(wire_id="W102", expected_source="J1:2", expected_destination="TB1:2"),
        ExpectedWireConnection(wire_id="W103", expected_source="J1:3", expected_destination="TB1:3"),
    ]
    outcome_with_netlist, findings_with_netlist = evaluator.evaluate(obs, expected_netlist=authoritative_netlist)
    assert outcome_with_netlist == EvaluationOutcome.FAIL
    omissions = [f for f in findings_with_netlist if f.rule_id == "RULE-NETLIST-03"]
    assert len(omissions) == 2  # W102 and W103 missing

def test_ambiguity_produces_review_unless_confirmed_violation_requires_fail():
    # Case A: Ambiguity alone with conforming netlist -> REVIEW
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]

    obs_ambiguous = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED [blurry]",
            confidence_score=0.55,  # Low confidence triggers REVIEW
            requires_human_review=True,
        )
    ]

    outcome_amb, findings_amb = evaluator.evaluate(obs_ambiguous, expected_netlist=expected_netlist)
    assert outcome_amb == EvaluationOutcome.REVIEW
    assert any(f.rule_id == "RULE-AMBIGUITY-08" for f in findings_amb)

    # Case B: Ambiguity PLUS a confirmed rule violation (destination terminal mismatch) -> FAIL
    obs_ambiguous_and_mismatch = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:99",  # Confirmed mismatch!
            observed_text="W101 J1:1 -> TB1:99 20AWG RED [blurry]",
            confidence_score=0.55,  # Ambiguous
            requires_human_review=True,
        )
    ]

    outcome_fail, findings_fail = evaluator.evaluate(obs_ambiguous_and_mismatch, expected_netlist=expected_netlist)
    assert outcome_fail == EvaluationOutcome.FAIL
    # Both findings must be present, but overall outcome must be FAIL
    assert any(f.rule_id == "RULE-AMBIGUITY-08" for f in findings_fail)
    assert any(f.rule_id == "RULE-NETLIST-05" for f in findings_fail)

def test_missing_wire_id_with_missing_netlist_produces_fail():
    # Confirmed defect (missing wire ID) takes precedence over missing netlist REVIEW
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id=None,  # Missing wire ID -> FAIL
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=None)
    assert outcome == EvaluationOutcome.FAIL
    assert any(f.rule_id == "RULE-WIRE-ID-01" for f in findings)
    assert any(f.rule_id == "RULE-SPEC-00" for f in findings)

def test_netlist_missing_completeness_certification_produces_review():
    # Calling evaluate with expected netlist but without specification_is_complete must fail closed to REVIEW
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    # specification_is_complete is None (missing completeness metadata)
    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist, specification_is_complete=None)
    assert outcome == EvaluationOutcome.REVIEW
    spec_fnd = next((f for f in findings if f.rule_id == "RULE-SPEC-02"), None)
    assert spec_fnd is not None
    assert spec_fnd.outcome == EvaluationOutcome.REVIEW
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_explicitly_incomplete_netlist_produces_review():
    # Calling evaluate with specification_is_complete=False must produce REVIEW
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist, specification_is_complete=False)
    assert outcome == EvaluationOutcome.REVIEW
    spec_fnd = next((f for f in findings if f.rule_id == "RULE-SPEC-02"), None)
    assert spec_fnd is not None
    assert "partial" in spec_fnd.reason.lower()
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_extra_unlisted_candidate_wire_triggers_review():
    # When specification is certified complete, any extra wire in diagram not in netlist triggers REVIEW (discrepancy)
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-EXTRA",
            page_number=1,
            wire_id="W999",  # Extra wire on diagram, NOT in expected netlist!
            wire_gauge="22 AWG",
            wire_color="BLU",
            source_terminal="J2:1",
            destination_terminal="TB2:1",
            observed_text="W999 J2:1 -> TB2:1 22AWG BLU",
            confidence_score=0.95,
        ),
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist, specification_is_complete=True)
    assert outcome == EvaluationOutcome.REVIEW
    unlisted_fnd = next((f for f in findings if f.rule_id == "RULE-NETLIST-09"), None)
    assert unlisted_fnd is not None
    assert "W999" in unlisted_fnd.title
    assert unlisted_fnd.outcome == EvaluationOutcome.REVIEW
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_extra_unlisted_wire_with_confirmed_defect_produces_fail():
    # If there is both an unlisted wire (REVIEW) AND a destination terminal mismatch on W101 (FAIL), outcome is FAIL
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:99",  # Mismatch! Expected TB1:1
            observed_text="W101 J1:1 -> TB1:99 20AWG RED",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-EXTRA",
            page_number=1,
            wire_id="W999",  # Extra unlisted wire!
            wire_gauge="22 AWG",
            wire_color="BLU",
            source_terminal="J2:1",
            destination_terminal="TB2:1",
            observed_text="W999 J2:1 -> TB2:1 22AWG BLU",
            confidence_score=0.95,
        ),
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist, specification_is_complete=True)
    assert outcome == EvaluationOutcome.FAIL
    assert any(f.rule_id == "RULE-NETLIST-05" for f in findings)
    assert any(f.rule_id == "RULE-NETLIST-09" for f in findings)

def test_duplicate_expected_wire_identifier_produces_fail():
    # Conflicting or duplicate wire IDs in the expected netlist specification must produce FAIL
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
        ExpectedWireConnection(
            wire_id="W101",  # Duplicate wire ID!
            expected_source="J1:2",
            expected_destination="TB1:2",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist, specification_is_complete=True)
    assert outcome == EvaluationOutcome.FAIL
    dup_fnd = next((f for f in findings if f.rule_id == "RULE-SPEC-03"), None)
    assert dup_fnd is not None
    assert dup_fnd.outcome == EvaluationOutcome.FAIL
    assert "W101" in dup_fnd.title

def test_missing_completeness_with_confirmed_defect_produces_fail():
    # Missing completeness metadata (REVIEW) + missing wire identifier (FAIL) -> FAIL
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
        )
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id=None,  # Missing wire identifier -> FAIL
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(obs, expected_netlist=expected_netlist, specification_is_complete=None)
    assert outcome == EvaluationOutcome.FAIL
    assert any(f.rule_id == "RULE-WIRE-ID-01" for f in findings)
    assert any(f.rule_id == "RULE-SPEC-02" for f in findings)

def test_conforming_netlist_without_extraction_verification_produces_review():
    # Even if specification is certified complete and all observed wires match,
    # unverified extraction coverage cannot authorize PASS and must produce REVIEW (RULE-EXTRACT-00)
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    # extraction_is_verified omitted (defaults to None / unverified)
    outcome, findings = evaluator.evaluate(
        obs, expected_netlist=expected_netlist, specification_is_complete=True
    )
    assert outcome == EvaluationOutcome.REVIEW
    extract_fnd = next((f for f in findings if f.rule_id == "RULE-EXTRACT-00"), None)
    assert extract_fnd is not None
    assert extract_fnd.outcome == EvaluationOutcome.REVIEW
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_complete_specification_with_partial_observations_fails():
    # Specification has W101 and W102, but observations only contains W101
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
        ExpectedWireConnection(
            wire_id="W102",
            expected_source="J1:2",
            expected_destination="TB1:2",
            expected_gauge="20 AWG",
            expected_color="BLU",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        extraction_is_verified=True,
    )
    assert outcome == EvaluationOutcome.FAIL
    omission = next((f for f in findings if f.rule_id == "RULE-NETLIST-03"), None)
    assert omission is not None
    assert "W102" in omission.title
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_extraction_unverified_with_confirmed_defect_produces_fail():
    # Unverified extraction coverage (REVIEW) + terminal mismatch on W101 (FAIL) -> outcome must be FAIL
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:99",  # Mismatch!
            observed_text="W101 J1:1 -> TB1:99 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        extraction_is_verified=False,
    )
    assert outcome == EvaluationOutcome.FAIL
    assert any(f.rule_id == "RULE-NETLIST-05" for f in findings)
    assert any(f.rule_id == "RULE-EXTRACT-00" for f in findings)
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_client_supplied_extraction_is_verified_true_alone_cannot_authorize_pass():
    # A caller-supplied boolean alone must NEVER authorize PASS.
    # Without trusted verification evidence, it must fail closed to REVIEW (RULE-EXTRACT-00).
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        extraction_is_verified=True,  # Caller-supplied boolean
        trusted_verification=None,    # No trusted evidence
    )
    assert outcome == EvaluationOutcome.REVIEW
    extract_fnd = next((f for f in findings if f.rule_id == "RULE-EXTRACT-00"), None)
    assert extract_fnd is not None
    assert extract_fnd.outcome == EvaluationOutcome.REVIEW
    assert "untrusted client metadata" in extract_fnd.reason
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_specification_is_complete_true_alone_cannot_authorize_pass():
    # Having a certified complete specification without extraction verification must fail closed to REVIEW.
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        extraction_is_verified=None,
        trusted_verification=None,
    )
    assert outcome == EvaluationOutcome.REVIEW
    assert any(f.rule_id == "RULE-EXTRACT-00" for f in findings)
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_model_self_attestation_rejected_as_untrusted_verification():
    # A model cannot prove its own negative. MODEL_SELF_ATTESTATION must be rejected.
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]
    self_attested = TrustedExtractionVerification(
        verifier_id="gemma3:4b-model",
        verification_method=VerificationMethod.MODEL_SELF_ATTESTATION,
        verified_scope="Sheet 1",
        verified_at="2026-10-12T16:00:00Z",
    )

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        scope_description="Sheet 1",
        trusted_verification=self_attested,
    )
    assert outcome == EvaluationOutcome.REVIEW
    fnd = next((f for f in findings if f.rule_id == "RULE-EXTRACT-00"), None)
    assert fnd is not None
    assert "MODEL_SELF_ATTESTATION" in fnd.detected_value
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_verification_evidence_unauthenticated_identity_fails_closed():
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]
    invalid_ver = TrustedExtractionVerification(
        verifier_id="   ",  # Blank verifier
        verification_method=VerificationMethod.INDEPENDENT_HUMAN_INSPECTION,
        verified_scope="Sheet 1",
        verified_at="2026-10-12T16:00:00Z",
    )

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        scope_description="Sheet 1",
        trusted_verification=invalid_ver,
    )
    assert outcome == EvaluationOutcome.REVIEW
    assert any(f.rule_id == "RULE-EXTRACT-00" for f in findings)
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_verification_evidence_digest_mismatch_fails_closed():
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]
    ver_mismatch = TrustedExtractionVerification(
        verifier_id="INSP-01",
        verification_method=VerificationMethod.INDEPENDENT_HUMAN_INSPECTION,
        verified_scope="Sheet 1",
        document_sha256="b" * 64,  # Different digest
        verified_at="2026-10-12T16:00:00Z",
    )

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        scope_description="Sheet 1",
        document_sha256="a" * 64,
        trusted_verification=ver_mismatch,
    )
    assert outcome == EvaluationOutcome.REVIEW
    fnd = next((f for f in findings if f.rule_id == "RULE-EXTRACT-00"), None)
    assert fnd is not None
    assert "Verification Document Digest Mismatch" in fnd.rule_name
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)

def test_verification_evidence_scope_mismatch_fails_closed():
    expected_netlist = [
        ExpectedWireConnection(
            wire_id="W101",
            expected_source="J1:1",
            expected_destination="TB1:1",
            expected_gauge="20 AWG",
            expected_color="RED",
        ),
    ]
    obs = [
        CandidateObservation(
            observation_id="OBS-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 J1:1 -> TB1:1 20AWG RED",
            confidence_score=0.95,
        )
    ]
    ver_scope_mismatch = TrustedExtractionVerification(
        verifier_id="INSP-01",
        verification_method=VerificationMethod.INDEPENDENT_HUMAN_INSPECTION,
        verified_scope="Sheet 99 Different Subsystem",  # Scope mismatch
        verified_at="2026-10-12T16:00:00Z",
    )

    outcome, findings = evaluator.evaluate(
        obs,
        expected_netlist=expected_netlist,
        specification_is_complete=True,
        scope_description="Sheet 1 Main Harness",
        trusted_verification=ver_scope_mismatch,
    )
    assert outcome == EvaluationOutcome.REVIEW
    fnd = next((f for f in findings if f.rule_id == "RULE-EXTRACT-00"), None)
    assert fnd is not None
    assert "Verification Scope Mismatch" in fnd.rule_name
    assert not any(f.rule_id == "RULE-PASS-00" for f in findings)



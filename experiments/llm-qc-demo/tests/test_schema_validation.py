import pytest
from pydantic import ValidationError
from app.models import CandidateObservation, ConfidenceLevel, EvidenceCoordinates

def test_valid_candidate_observation():
    obs = CandidateObservation(
        observation_id="OBS-1",
        page_number=1,
        component_id="J1",
        connector_id="CON-01",
        pin_id="4",
        wire_id="W101",
        wire_gauge="20 AWG",
        wire_color="RED",
        source_terminal="J1:4",
        destination_terminal="TB1:12",
        coordinates=EvidenceCoordinates(ymin=0.1, xmin=0.2, ymax=0.3, xmax=0.4),
        observed_text="J1:4 to TB1:12 W101 20AWG RED",
        confidence_score=0.92,
        confidence_level=ConfidenceLevel.HIGH,
    )
    assert obs.wire_id == "W101"
    assert obs.confidence_score == 0.92
    assert obs.coordinates.ymin == 0.1
    assert obs.coordinates.xmax == 0.4

def test_evidence_coordinates_bounds_validation():
    # Valid bounds
    coords = EvidenceCoordinates(ymin=0.0, xmin=0.0, ymax=1.0, xmax=1.0)
    assert coords.ymin == 0.0
    assert coords.xmax == 1.0

    # Inverted Y bounds (ymax < ymin)
    with pytest.raises(ValidationError, match="cannot be less than ymin"):
        EvidenceCoordinates(ymin=0.6, xmin=0.1, ymax=0.4, xmax=0.8)

    # Inverted X bounds (xmax < xmin)
    with pytest.raises(ValidationError, match="cannot be less than xmin"):
        EvidenceCoordinates(ymin=0.1, xmin=0.7, ymax=0.5, xmax=0.3)

    # Out of range (> 1.0)
    with pytest.raises(ValidationError):
        EvidenceCoordinates(ymin=0.1, xmin=0.1, ymax=1.5, xmax=0.8)

    # Out of range (< 0.0)
    with pytest.raises(ValidationError):
        EvidenceCoordinates(ymin=-0.1, xmin=0.1, ymax=0.5, xmax=0.8)

def test_reject_empty_observed_text():
    with pytest.raises(ValidationError):
        CandidateObservation(
            observation_id="OBS-ERR",
            page_number=1,
            observed_text="",  # Must be non-empty
            confidence_score=0.8,
        )

def test_reject_invalid_confidence_score():
    # Out of bounds (> 1.0)
    with pytest.raises(ValidationError):
        CandidateObservation(
            observation_id="OBS-ERR",
            page_number=1,
            observed_text="Valid text",
            confidence_score=1.5,
        )

    # Out of bounds (< 0.0)
    with pytest.raises(ValidationError):
        CandidateObservation(
            observation_id="OBS-ERR",
            page_number=1,
            observed_text="Valid text",
            confidence_score=-0.2,
        )

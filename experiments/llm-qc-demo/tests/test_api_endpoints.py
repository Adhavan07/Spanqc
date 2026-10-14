import json
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.config import settings
from app.main import app
from app.models import (
    CandidateObservation,
    EvidenceCoordinates,
)

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures")

TEST_AUTH_SECRET = "staging-internal-service-secret-at-least-16-bytes"
settings.internal_service_secret = TEST_AUTH_SECRET

client = TestClient(app, headers={"Authorization": f"Bearer {TEST_AUTH_SECRET}"})

CONFORMING_RAW_OBSERVATIONS = [
    {
        "observation_id": "OBS-01",
        "page_number": 1,
        "wire_id": "W101",
        "wire_gauge": "20 AWG",
        "wire_color": "RED",
        "source_terminal": "J1:1",
        "destination_terminal": "TB1:1",
        "coordinates": {"ymin": 0.2, "xmin": 0.2, "ymax": 0.3, "xmax": 0.4},
        "observed_text": "W101 20AWG RED J1:1 -> TB1:1",
        "confidence_score": 0.95,
    },
    {
        "observation_id": "OBS-02",
        "page_number": 1,
        "wire_id": "W102",
        "wire_gauge": "20 AWG",
        "wire_color": "BLU",
        "source_terminal": "J1:2",
        "destination_terminal": "TB1:2",
        "coordinates": {"ymin": 0.4, "xmin": 0.2, "ymax": 0.5, "xmax": 0.4},
        "observed_text": "W102 20AWG BLU J1:2 -> TB1:2",
        "confidence_score": 0.95,
    },
    {
        "observation_id": "OBS-03",
        "page_number": 1,
        "wire_id": "W103",
        "wire_gauge": "22 AWG",
        "wire_color": "WHT",
        "source_terminal": "J1:3",
        "destination_terminal": "TB1:3",
        "coordinates": {"ymin": 0.6, "xmin": 0.2, "ymax": 0.7, "xmax": 0.4},
        "observed_text": "W103 22AWG WHT J1:3 -> TB1:3",
        "confidence_score": 0.95,
    },
]

CONFORMING_CANDIDATE_OBSERVATIONS = [
    CandidateObservation(
        observation_id="OBS-01",
        page_number=1,
        wire_id="W101",
        wire_gauge="20 AWG",
        wire_color="RED",
        source_terminal="J1:1",
        destination_terminal="TB1:1",
        coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
        observed_text="W101 20AWG RED J1:1 -> TB1:1",
        confidence_score=0.95,
    ),
    CandidateObservation(
        observation_id="OBS-02",
        page_number=1,
        wire_id="W102",
        wire_gauge="20 AWG",
        wire_color="BLU",
        source_terminal="J1:2",
        destination_terminal="TB1:2",
        coordinates=EvidenceCoordinates(ymin=0.4, xmin=0.2, ymax=0.5, xmax=0.4),
        observed_text="W102 20AWG BLU J1:2 -> TB1:2",
        confidence_score=0.95,
    ),
    CandidateObservation(
        observation_id="OBS-03",
        page_number=1,
        wire_id="W103",
        wire_gauge="22 AWG",
        wire_color="WHT",
        source_terminal="J1:3",
        destination_terminal="TB1:3",
        coordinates=EvidenceCoordinates(ymin=0.6, xmin=0.2, ymax=0.7, xmax=0.4),
        observed_text="W103 22AWG WHT J1:3 -> TB1:3",
        confidence_score=0.95,
    ),
]

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "config" in data
    assert data["config"]["model"] is not None
    # SEC-33C-04: Internal dependency URLs/hostnames must not be disclosed in health responses
    assert "ollama_host" not in data.get("config", {})

def test_evaluate_endpoint_client_supplied_verification_fails_closed_to_review():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    # An untrusted HTTP client supplying extraction_is_verified=True alone cannot authorize PASS
    payload = {
        "document_name": "pass_test.png",
        "sha256_hash": "a" * 64,
        "observations": CONFORMING_RAW_OBSERVATIONS,
        "expected_netlist": netlist_data,
        "specification_is_complete": True,
        "extraction_is_verified": True,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert report["specification_is_complete"] is True
    assert report["extraction_is_verified"] is False
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in report["findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in report["findings"])
    assert "experimental_disclaimer" in report

def test_evaluate_endpoint_missing_extraction_verification_produces_review():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    # Even with specification_is_complete=True, unverified extraction coverage must fail closed to REVIEW
    payload = {
        "document_name": "pass_test.png",
        "sha256_hash": "a" * 64,
        "observations": CONFORMING_RAW_OBSERVATIONS,
        "expected_netlist": netlist_data,
        "specification_is_complete": True,
        # extraction_is_verified omitted
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in report["findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in report["findings"])

def test_evaluate_endpoint_missing_completeness_produces_review():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    # Netlist provided without specification_is_complete must fail closed to REVIEW
    payload = {
        "document_name": "pass_test.png",
        "sha256_hash": "a" * 64,
        "observations": CONFORMING_RAW_OBSERVATIONS,
        "expected_netlist": netlist_data,
        # specification_is_complete omitted
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-02" for f in report["findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in report["findings"])

def test_evaluate_endpoint_explicitly_incomplete_produces_review():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    payload = {
        "document_name": "pass_test.png",
        "sha256_hash": "a" * 64,
        "observations": CONFORMING_RAW_OBSERVATIONS,
        "expected_netlist": netlist_data,
        "specification_is_complete": False,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-02" for f in report["findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in report["findings"])

def test_evaluate_endpoint_missing_completeness_with_defect_produces_fail():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    # Observations have terminal mismatch on W101 AND completeness is omitted -> outcome must be FAIL (defect precedence)
    defect_obs = [
        {
            "observation_id": "OBS-01",
            "page_number": 1,
            "wire_id": "W101",
            "wire_gauge": "20 AWG",
            "wire_color": "RED",
            "source_terminal": "J1:1",
            "destination_terminal": "TB1:99",  # Mismatch!
            "observed_text": "W101 20AWG RED J1:1 -> TB1:99",
            "confidence_score": 0.95,
        },
        CONFORMING_RAW_OBSERVATIONS[1],
        CONFORMING_RAW_OBSERVATIONS[2],
    ]
    payload = {
        "document_name": "defect_test.png",
        "sha256_hash": "a" * 64,
        "observations": defect_obs,
        "expected_netlist": netlist_data,
        # specification_is_complete omitted
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "FAIL"
    assert any(f["rule_id"] == "RULE-NETLIST-05" for f in report["findings"])
    assert any(f["rule_id"] == "RULE-SPEC-02" for f in report["findings"])

def test_evaluate_endpoint_extra_unlisted_candidate_wire_triggers_review():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    extra_obs = list(CONFORMING_RAW_OBSERVATIONS) + [
        {
            "observation_id": "OBS-EXTRA",
            "page_number": 1,
            "wire_id": "W999",
            "wire_gauge": "22 AWG",
            "wire_color": "GRN",
            "source_terminal": "J1:4",
            "destination_terminal": "TB1:4",
            "observed_text": "W999 22AWG GRN J1:4 -> TB1:4",
            "confidence_score": 0.95,
        }
    ]
    payload = {
        "document_name": "extra_wire_test.png",
        "sha256_hash": "a" * 64,
        "observations": extra_obs,
        "expected_netlist": netlist_data,
        "specification_is_complete": True,
        "extraction_is_verified": True,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-NETLIST-09" for f in report["findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in report["findings"])

def test_evaluate_endpoint_duplicate_expected_wire_produces_fail():
    dup_netlist = [
        {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1"},
        {"wire_id": "W101", "expected_source": "J1:2", "expected_destination": "TB1:2"},
    ]
    payload = {
        "document_name": "dup_test.png",
        "sha256_hash": "a" * 64,
        "observations": [CONFORMING_RAW_OBSERVATIONS[0]],
        "expected_netlist": dup_netlist,
        "specification_is_complete": True,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "FAIL"
    assert any(f["rule_id"] == "RULE-SPEC-03" for f in report["findings"])

def test_evaluate_endpoint_fail():
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)

    payload = {
        "document_name": "fail_test.png",
        "sha256_hash": "b" * 64,
        "observations": [
            {
                "observation_id": "OBS-01",
                "page_number": 1,
                "wire_id": "W101",
                "wire_gauge": "20 AWG",
                "wire_color": "RED",
                "source_terminal": "J1:1",
                "destination_terminal": "TB1:99", # Mismatch!
                "coordinates": {"ymin": 0.2, "xmin": 0.2, "ymax": 0.3, "xmax": 0.4},
                "observed_text": "W101 20AWG RED J1:1 -> TB1:99",
                "confidence_score": 0.95,
            }
        ],
        "expected_netlist": netlist_data,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "FAIL"

def test_evaluate_endpoint_missing_netlist_produces_review():
    # Calling /api/v1/evaluate without expected netlist must produce REVIEW, never PASS
    payload = {
        "document_name": "review_test.png",
        "sha256_hash": "c" * 64,
        "observations": [
            {
                "observation_id": "OBS-01",
                "page_number": 1,
                "wire_id": "W101",
                "wire_gauge": "20 AWG",
                "wire_color": "RED",
                "source_terminal": "J1:1",
                "destination_terminal": "TB1:1",
                "observed_text": "W101 20AWG RED J1:1 -> TB1:1",
                "confidence_score": 0.95,
            }
        ],
        "expected_netlist": None,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-00" for f in report["findings"])

def test_evaluate_endpoint_empty_netlist_produces_review():
    # Calling /api/v1/evaluate with empty expected netlist ([]) must produce REVIEW, never PASS
    payload = {
        "document_name": "review_empty_test.png",
        "sha256_hash": "d" * 64,
        "observations": [
            {
                "observation_id": "OBS-01",
                "page_number": 1,
                "wire_id": "W101",
                "wire_gauge": "20 AWG",
                "wire_color": "RED",
                "source_terminal": "J1:1",
                "destination_terminal": "TB1:1",
                "observed_text": "W101 20AWG RED J1:1 -> TB1:1",
                "confidence_score": 0.95,
            }
        ],
        "expected_netlist": [],
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-01" for f in report["findings"])

def test_evaluate_endpoint_malformed_netlist_returns_422():
    # Calling /api/v1/evaluate with malformed expected netlist must return HTTP 422 client error
    payload = {
        "document_name": "malformed_test.png",
        "sha256_hash": "e" * 64,
        "observations": [],
        "expected_netlist": "not-a-valid-list",
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 422

def test_extract_endpoint_file_validation_error():
    # Empty file upload
    response = client.post(
        "/api/v1/extract",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_complete_matching_netlist_passes(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-02",
            page_number=1,
            wire_id="W102",
            wire_gauge="20 AWG",
            wire_color="BLU",
            source_terminal="J1:2",
            destination_terminal="TB1:2",
            coordinates=EvidenceCoordinates(ymin=0.4, xmin=0.2, ymax=0.5, xmax=0.4),
            observed_text="W102 20AWG BLU J1:2 -> TB1:2",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-03",
            page_number=1,
            wire_id="W103",
            wire_gauge="22 AWG",
            wire_color="WHT",
            source_terminal="J1:3",
            destination_terminal="TB1:3",
            coordinates=EvidenceCoordinates(ymin=0.6, xmin=0.2, ymax=0.7, xmax=0.4),
            observed_text="W103 22AWG WHT J1:3 -> TB1:3",
            confidence_score=0.95,
        ),
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={
            "expected_netlist_json": netlist_json_str,
            "specification_is_complete": "true",
            "extraction_is_verified": "true",
        },
    )
    assert response.status_code == 200
    data = response.json()
    # Untrusted client-supplied extraction_is_verified in form data fails closed to REVIEW
    assert data["overall_outcome"] == "REVIEW"
    assert data["specification_is_complete"] is True
    assert data["extraction_is_verified"] is False
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_missing_extraction_verification_produces_review(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    mock_extract.return_value = CONFORMING_CANDIDATE_OBSERVATIONS

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    # Even with specification_is_complete=True, unverified extraction coverage fails closed to REVIEW
    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": netlist_json_str, "specification_is_complete": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert data["extraction_is_verified"] is False
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_netlist_without_completeness_produces_review(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    mock_extract.return_value = CONFORMING_CANDIDATE_OBSERVATIONS

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    # Netlist supplied without specification_is_complete fails closed to REVIEW
    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": netlist_json_str},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-02" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_explicitly_incomplete_netlist_produces_review(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    mock_extract.return_value = CONFORMING_CANDIDATE_OBSERVATIONS

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": netlist_json_str, "specification_is_complete": "false"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-02" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_structured_netlist_specification_passes(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        wires_data = json.load(f)

    structured_spec = {
        "wires": wires_data,
        "is_complete": True,
        "extraction_is_verified": True,
        "scope_description": "Sheet 1 Harness Power & Signals",
    }

    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-02",
            page_number=1,
            wire_id="W102",
            wire_gauge="20 AWG",
            wire_color="BLU",
            source_terminal="J1:2",
            destination_terminal="TB1:2",
            coordinates=EvidenceCoordinates(ymin=0.4, xmin=0.2, ymax=0.5, xmax=0.4),
            observed_text="W102 20AWG BLU J1:2 -> TB1:2",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-03",
            page_number=1,
            wire_id="W103",
            wire_gauge="22 AWG",
            wire_color="WHT",
            source_terminal="J1:3",
            destination_terminal="TB1:3",
            coordinates=EvidenceCoordinates(ymin=0.6, xmin=0.2, ymax=0.7, xmax=0.4),
            observed_text="W103 22AWG WHT J1:3 -> TB1:3",
            confidence_score=0.95,
        ),
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": json.dumps(structured_spec)},
    )
    assert response.status_code == 200
    data = response.json()
    # Structured netlist with extraction_is_verified=True is untrusted caller metadata -> REVIEW
    assert data["overall_outcome"] == "REVIEW"
    assert data["specification_is_complete"] is True
    assert data["extraction_is_verified"] is False
    assert data["scope_description"] == "Sheet 1 Harness Power & Signals"
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_unlisted_candidate_wire_triggers_review(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    # Model extracts all 3 expected wires PLUS an extra unlisted wire W999
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-02",
            page_number=1,
            wire_id="W102",
            wire_gauge="20 AWG",
            wire_color="BLU",
            source_terminal="J1:2",
            destination_terminal="TB1:2",
            coordinates=EvidenceCoordinates(ymin=0.4, xmin=0.2, ymax=0.5, xmax=0.4),
            observed_text="W102 20AWG BLU J1:2 -> TB1:2",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-03",
            page_number=1,
            wire_id="W103",
            wire_gauge="22 AWG",
            wire_color="WHT",
            source_terminal="J1:3",
            destination_terminal="TB1:3",
            coordinates=EvidenceCoordinates(ymin=0.6, xmin=0.2, ymax=0.7, xmax=0.4),
            observed_text="W103 22AWG WHT J1:3 -> TB1:3",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-EXTRA",
            page_number=1,
            wire_id="W999",  # Extra unlisted wire!
            wire_gauge="22 AWG",
            wire_color="GRN",
            source_terminal="J1:4",
            destination_terminal="TB1:4",
            coordinates=EvidenceCoordinates(ymin=0.8, xmin=0.2, ymax=0.9, xmax=0.4),
            observed_text="W999 22AWG GRN J1:4 -> TB1:4",
            confidence_score=0.95,
        ),
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={
            "expected_netlist_json": netlist_json_str,
            "specification_is_complete": "true",
            "extraction_is_verified": "true",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-NETLIST-09" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_duplicate_expected_wire_produces_fail(mock_extract):
    dup_netlist = [
        {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1"},
        {"wire_id": "W101", "expected_source": "J1:2", "expected_destination": "TB1:2"},
    ]
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        )
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": json.dumps(dup_netlist), "specification_is_complete": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "FAIL"
    assert any(f["rule_id"] == "RULE-SPEC-03" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_missing_netlist_produces_review(mock_extract):
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-MOCK",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        )
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        # No expected_netlist_json provided
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-00" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_empty_netlist_produces_review(mock_extract):
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-MOCK",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        )
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": "[]"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-01" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

def test_analyze_endpoint_malformed_json_returns_400():
    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": "this is not json {"},
    )
    assert response.status_code == 400
    assert "invalid expected_netlist_json" in response.json()["detail"].lower()

def test_analyze_endpoint_non_list_json_returns_400():
    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": json.dumps({"wire_id": "W101"})},
    )
    assert response.status_code == 400
    assert "list" in response.json()["detail"].lower()

def test_analyze_endpoint_invalid_item_schema_returns_400():
    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": json.dumps([{"wire_id": "W101"}])},  # missing expected_source & expected_destination
    )
    assert response.status_code == 400
    assert "invalid expected_netlist_json" in response.json()["detail"].lower()

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_wire_omission_fails(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    # Model only extracts 1 wire out of 3 expected
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        )
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": netlist_json_str},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "FAIL"
    omissions = [f for f in data["rule_findings"] if f["rule_id"] == "RULE-NETLIST-03"]
    assert len(omissions) == 2  # W102, W103 missing

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_mismatched_attributes_fail(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    # Destination terminal mismatch on W101
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:99",  # Expected TB1:1
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:99",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-02",
            page_number=1,
            wire_id="W102",
            wire_gauge="20 AWG",
            wire_color="RED",  # Expected BLU
            source_terminal="J1:2",
            destination_terminal="TB1:2",
            coordinates=EvidenceCoordinates(ymin=0.4, xmin=0.2, ymax=0.5, xmax=0.4),
            observed_text="W102 20AWG RED J1:2 -> TB1:2",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-03",
            page_number=1,
            wire_id="W103",
            wire_gauge="14 AWG",  # Expected 22 AWG
            wire_color="WHT",
            source_terminal="J1:3",
            destination_terminal="TB1:3",
            coordinates=EvidenceCoordinates(ymin=0.6, xmin=0.2, ymax=0.7, xmax=0.4),
            observed_text="W103 14AWG WHT J1:3 -> TB1:3",
            confidence_score=0.95,
        ),
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": netlist_json_str},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "FAIL"
    rule_ids = {f["rule_id"] for f in data["rule_findings"]}
    assert "RULE-NETLIST-05" in rule_ids  # destination terminal mismatch
    assert "RULE-NETLIST-06" in rule_ids  # gauge mismatch
    assert "RULE-NETLIST-07" in rule_ids  # color mismatch

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_ambiguity_triggers_review(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_json_str = f.read()

    # All connections match, but one has low confidence / ambiguity flag
    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-01",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            coordinates=EvidenceCoordinates(ymin=0.2, xmin=0.2, ymax=0.3, xmax=0.4),
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.55,  # Low confidence
            requires_human_review=True,
            ambiguity_reasons=["Partially smudged wire ID callout"],
        ),
        CandidateObservation(
            observation_id="OBS-02",
            page_number=1,
            wire_id="W102",
            wire_gauge="20 AWG",
            wire_color="BLU",
            source_terminal="J1:2",
            destination_terminal="TB1:2",
            coordinates=EvidenceCoordinates(ymin=0.4, xmin=0.2, ymax=0.5, xmax=0.4),
            observed_text="W102 20AWG BLU J1:2 -> TB1:2",
            confidence_score=0.95,
        ),
        CandidateObservation(
            observation_id="OBS-03",
            page_number=1,
            wire_id="W103",
            wire_gauge="22 AWG",
            wire_color="WHT",
            source_terminal="J1:3",
            destination_terminal="TB1:3",
            coordinates=EvidenceCoordinates(ymin=0.6, xmin=0.2, ymax=0.7, xmax=0.4),
            observed_text="W103 22AWG WHT J1:3 -> TB1:3",
            confidence_score=0.95,
        ),
    ]

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={"expected_netlist_json": netlist_json_str},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-AMBIGUITY-08" for f in data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in data["rule_findings"])

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_invalid_output_never_produces_pass(mock_extract):
    from app.inference_client import OllamaInvalidOutputError
    mock_extract.side_effect = OllamaInvalidOutputError("Model returned empty response or invalid schema: {}")

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
    )
    # Must reject with HTTP 422, NEVER convert malformed output into PASS
    assert response.status_code == 422
    assert "overall_outcome" not in response.json()

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_ollama_unreachable_never_produces_pass(mock_extract):
    from app.inference_client import OllamaConnectionError
    mock_extract.side_effect = OllamaConnectionError("Connection refused on http://localhost:11434")

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
    )
    # Must reject with HTTP 503, NEVER convert error into PASS
    assert response.status_code == 503
    assert "overall_outcome" not in response.json()

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_analyze_endpoint_timeout_never_produces_pass(mock_extract):
    from app.inference_client import OllamaTimeoutError
    mock_extract.side_effect = OllamaTimeoutError("Timed out after 180s")

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
    )
    # Must reject with HTTP 504, NEVER convert error into PASS
    assert response.status_code == 504
    assert "overall_outcome" not in response.json()

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_both_api_endpoints_enforce_identical_trust_boundary(mock_extract):
    with open(os.path.join(FIXTURES_DIR, "expected_netlist_pass.json"), "r") as f:
        netlist_data = json.load(f)
        netlist_json_str = json.dumps(netlist_data)

    mock_extract.return_value = CONFORMING_CANDIDATE_OBSERVATIONS

    with open(os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png"), "rb") as f:
        file_bytes = f.read()

    # 1. Test /api/v1/evaluate
    eval_resp = client.post(
        "/api/v1/evaluate",
        json={
            "observations": CONFORMING_RAW_OBSERVATIONS,
            "expected_netlist": netlist_data,
            "specification_is_complete": True,
            "extraction_is_verified": True,
        },
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()

    # 2. Test /api/v1/analyze
    analyze_resp = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_pass_schematic.png", file_bytes, "image/png")},
        data={
            "expected_netlist_json": netlist_json_str,
            "specification_is_complete": "true",
            "extraction_is_verified": "true",
        },
    )
    assert analyze_resp.status_code == 200
    analyze_data = analyze_resp.json()

    # Both must enforce identical trust boundary: fail closed to REVIEW, extraction_is_verified=False
    assert eval_data["overall_outcome"] == "REVIEW"
    assert analyze_data["overall_outcome"] == "REVIEW"
    assert eval_data["extraction_is_verified"] is False
    assert analyze_data["extraction_is_verified"] is False
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in eval_data["findings"])
    assert any(f["rule_id"] == "RULE-EXTRACT-00" for f in analyze_data["rule_findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in eval_data["findings"])
    assert not any(f["rule_id"] == "RULE-PASS-00" for f in analyze_data["rule_findings"])



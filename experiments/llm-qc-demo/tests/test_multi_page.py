import json
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
import pymupdf

from app.document_processor import DocumentProcessor
from app.inference_client import (
    OllamaConnectionError,
    OllamaInvalidOutputError,
    OllamaTimeoutError,
)
from app.main import app
from app.models import (
    CandidateObservation,
    EvaluationOutcome,
    EvaluationSeverity,
    EvidenceCoordinates,
    ExpectedWireConnection,
    NetlistSpecification,
    TrustedExtractionVerification,
    VerificationMethod,
)
from app.config import settings
from app.rule_evaluator import DeterministicRuleEvaluator

TEST_AUTH_SECRET = "staging-internal-service-secret-at-least-16-bytes"
settings.internal_service_secret = TEST_AUTH_SECRET

client = TestClient(app, headers={"Authorization": f"Bearer {TEST_AUTH_SECRET}"})

def create_synthetic_pdf(pages_content: list[str]) -> bytes:
    """Creates a multi-page PDF in memory with distinct content on each page."""
    doc = pymupdf.open()
    for text in pages_content:
        page = doc.new_page(width=600, height=400)
        page.insert_text((50, 50), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

# --------------------------------------------------------------------------
# Test 1: Single-page PDF baseline
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_single_page_pdf_processing(mock_extract):
    pdf_bytes = create_synthetic_pdf(["Sheet 1: W101 20AWG RED J1:1 -> TB1:1"])

    mock_extract.return_value = [
        CandidateObservation(
            observation_id="OBS-1",
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

    response = client.post(
        "/api/v1/extract",
        files={"file": ("single_sheet.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["total_page_count"] == 1
    assert data["processed_page_count"] == 1
    assert data["failed_page_count"] == 0
    assert data["unprocessed_page_numbers"] == []
    assert len(data["observations"]) == 1
    assert data["observations"][0]["page_number"] == 1
    assert mock_extract.call_count == 1

# --------------------------------------------------------------------------
# Test 2 & 3: Two-page PDF with distinct wires and preserved page numbers
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_two_page_pdf_aggregates_observations_with_correct_pages(mock_extract):
    pdf_bytes = create_synthetic_pdf([
        "Sheet 1: W101 20AWG RED J1:1 -> TB1:1",
        "Sheet 2: W102 20AWG BLU J1:2 -> TB1:2",
    ])

    # Return page 1 observations for first call, page 2 observations for second call
    mock_extract.side_effect = [
        [
            CandidateObservation(
                observation_id="OBS-1",
                page_number=1,
                wire_id="W101",
                wire_gauge="20 AWG",
                wire_color="RED",
                source_terminal="J1:1",
                destination_terminal="TB1:1",
                observed_text="W101 20AWG RED J1:1 -> TB1:1",
                confidence_score=0.95,
            )
        ],
        [
            CandidateObservation(
                observation_id="OBS-1",  # Same local ID to verify deduplication
                page_number=2,
                wire_id="W102",
                wire_gauge="20 AWG",
                wire_color="BLU",
                source_terminal="J1:2",
                destination_terminal="TB1:2",
                observed_text="W102 20AWG BLU J1:2 -> TB1:2",
                confidence_score=0.92,
            )
        ],
    ]

    response = client.post(
        "/api/v1/extract",
        files={"file": ("two_sheet_harness.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["total_page_count"] == 2
    assert data["processed_page_count"] == 2
    assert data["failed_page_count"] == 0
    assert len(data["observations"]) == 2

    obs_p1 = data["observations"][0]
    obs_p2 = data["observations"][1]

    # Verify page numbers are preserved
    assert obs_p1["wire_id"] == "W101"
    assert obs_p1["page_number"] == 1

    assert obs_p2["wire_id"] == "W102"
    assert obs_p2["page_number"] == 2

    # Verify observation IDs do not collide
    assert obs_p1["observation_id"] != obs_p2["observation_id"]

# --------------------------------------------------------------------------
# Test 4: Verify every page passed to extraction function
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_all_pages_passed_to_inference_client(mock_extract):
    pdf_bytes = create_synthetic_pdf([
        "Page 1 content",
        "Page 2 content",
        "Page 3 content",
    ])
    mock_extract.return_value = []

    response = client.post(
        "/api/v1/extract",
        files={"file": ("three_sheet.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    assert mock_extract.call_count == 3

    # Check page_number kwargs on each invocation
    assert mock_extract.call_args_list[0].kwargs["page_number"] == 1
    assert mock_extract.call_args_list[1].kwargs["page_number"] == 2
    assert mock_extract.call_args_list[2].kwargs["page_number"] == 3

# --------------------------------------------------------------------------
# Test 5 & 8: Inference failure on one page blocks PASS and reports failure
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_inference_failure_on_one_page_triggers_review(mock_extract):
    pdf_bytes = create_synthetic_pdf([
        "Page 1: W101 20AWG RED J1:1 -> TB1:1",
        "Page 2: W102 (corrupt / timed out rendering)",
    ])

    # Page 1 succeeds, Page 2 fails with timeout
    mock_extract.side_effect = [
        [
            CandidateObservation(
                observation_id="OBS-1",
                page_number=1,
                wire_id="W101",
                wire_gauge="20 AWG",
                wire_color="RED",
                source_terminal="J1:1",
                destination_terminal="TB1:1",
                observed_text="W101 20AWG RED J1:1 -> TB1:1",
                confidence_score=0.95,
            )
        ],
        OllamaTimeoutError("Model timed out on Page 2"),
    ]

    expected_netlist = [
        {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1", "expected_gauge": "20 AWG", "expected_color": "RED"}
    ]

    response = client.post(
        "/api/v1/analyze",
        data={
            "standard": "IPC/WHMA-A-620D",
            "expected_netlist_json": json.dumps(expected_netlist),
            "specification_is_complete": True,
        },
        files={"file": ("multipage_partial_fail.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    report = response.json()

    assert report["total_page_count"] == 2
    assert report["processed_page_count"] == 1
    assert report["failed_page_count"] == 1
    assert report["failed_page_numbers"] == [2]

    # Partial page failure blocks scope-level PASS
    assert report["overall_outcome"] == "REVIEW"

    # Explicit rule finding must cite page failure
    coverage_finding = next((f for f in report["rule_findings"] if f["rule_id"] == "RULE-PAGE-COVERAGE-02"), None)
    assert coverage_finding is not None
    assert "Page Candidate Extraction Failure" in coverage_finding["rule_name"]
    assert "2" in coverage_finding["detected_value"]

# --------------------------------------------------------------------------
# Test 6: Malformed or empty document safely rejected
# --------------------------------------------------------------------------
def test_malformed_and_empty_documents_safely_rejected():
    # 0-byte document
    resp_empty = client.post(
        "/api/v1/extract",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert resp_empty.status_code == 400
    assert "empty" in resp_empty.json()["detail"].lower()

    # Corrupt PDF header
    resp_corrupt = client.post(
        "/api/v1/analyze",
        files={"file": ("corrupt.pdf", b"NOT_A_REAL_PDF_DATA", "application/pdf")},
    )
    assert resp_corrupt.status_code == 400
    assert "invalid file format" in resp_corrupt.json()["detail"].lower()

# --------------------------------------------------------------------------
# Test 7 & 8: Page limit violation blocks scope-level PASS
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_pages_within_staging_limit_5_and_6_and_10_pages(mock_extract):
    """Verifies documents with 5, 6, and 10 pages are fully processed within the 10-page staging limit."""
    expected_netlist = [
        {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1", "expected_gauge": "20 AWG", "expected_color": "RED"}
    ]
    evaluator_instance = DeterministicRuleEvaluator()
    trusted_ver = TrustedExtractionVerification(
        verifier_id="INSP-ENG-01",
        verification_method=VerificationMethod.INDEPENDENT_HUMAN_INSPECTION,
        verified_scope="Wiring Diagram",
        verified_at="2026-10-13T10:00:00Z",
    )

    for page_count in [5, 6, 10]:
        mock_extract.reset_mock()
        obs_p1 = CandidateObservation(
            observation_id="OBS-P1-1",
            page_number=1,
            wire_id="W101",
            wire_gauge="20 AWG",
            wire_color="RED",
            source_terminal="J1:1",
            destination_terminal="TB1:1",
            observed_text="W101 20AWG RED J1:1 -> TB1:1",
            confidence_score=0.95,
        )
        mock_extract.side_effect = [[obs_p1]] + [[] for _ in range(page_count - 1)]

        pdf_bytes = create_synthetic_pdf([f"Sheet {i+1} content" for i in range(page_count)])

        response = client.post(
            "/api/v1/analyze",
            data={
                "standard": "IPC/WHMA-A-620D",
                "expected_netlist_json": json.dumps(expected_netlist),
                "specification_is_complete": True,
            },
            files={"file": (f"{page_count}_page_doc.pdf", pdf_bytes, "application/pdf")},
        )
        assert response.status_code == 200
        report = response.json()

        assert report["total_page_count"] == page_count
        assert report["processed_page_count"] == page_count
        assert report["unprocessed_page_numbers"] == []
        assert report["failed_page_count"] == 0
        assert mock_extract.call_count == page_count

        # Ensure no page coverage limit violation rule is emitted
        assert not any(f["rule_id"] == "RULE-PAGE-COVERAGE-01" for f in report["rule_findings"])

        # With trusted extraction verification, the fully processed document receives PASS
        outcome, findings = evaluator_instance.evaluate(
            observations=[obs_p1],
            expected_netlist=[ExpectedWireConnection.model_validate(w) for w in expected_netlist],
            specification_is_complete=True,
            trusted_verification=trusted_ver,
            scope_description="Wiring Diagram",
            total_page_count=page_count,
            processed_page_count=page_count,
            unprocessed_page_numbers=[],
            failed_page_numbers=[],
        )
        assert outcome == EvaluationOutcome.PASS
        assert any(f.rule_id == "RULE-PASS-00" for f in findings)

@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_page_limit_violation_11_pages_triggers_review(mock_extract):
    """Verifies that an 11-page document with a 10-page limit records page 11 as unprocessed and forces REVIEW."""
    pdf_bytes = create_synthetic_pdf([f"Sheet {i+1} content" for i in range(11)])
    mock_extract.side_effect = [
        [
            CandidateObservation(
                observation_id="OBS-P1-1",
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
    ] + [[] for _ in range(9)]  # Pages 2 through 10 processed, page 11 unrendered/unprocessed

    expected_netlist = [
        {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1", "expected_gauge": "20 AWG", "expected_color": "RED"}
    ]

    response = client.post(
        "/api/v1/analyze",
        data={
            "standard": "IPC/WHMA-A-620D",
            "expected_netlist_json": json.dumps(expected_netlist),
            "specification_is_complete": True,
        },
        files={"file": ("11_pages_oversized.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    report = response.json()

    assert report["total_page_count"] == 11
    assert report["processed_page_count"] == 10
    assert report["unprocessed_page_numbers"] == [11]
    assert mock_extract.call_count == 10

    # Unprocessed page strictly blocks PASS and forces REVIEW
    assert report["overall_outcome"] == "REVIEW"
    limit_finding = next((f for f in report["rule_findings"] if f["rule_id"] == "RULE-PAGE-COVERAGE-01"), None)
    assert limit_finding is not None
    assert "Document Page Limit Exceeded" in limit_finding["rule_name"]
    assert "11" in limit_finding["detected_value"]

# --------------------------------------------------------------------------
# Test 9: Incomplete or unverified specifications block PASS on multi-page
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_multipage_with_uncertified_spec_blocks_pass(mock_extract):
    pdf_bytes = create_synthetic_pdf([
        "Sheet 1: W101 20AWG RED J1:1 -> TB1:1",
        "Sheet 2: W102 20AWG BLU J1:2 -> TB1:2",
    ])
    mock_extract.side_effect = [
        [CandidateObservation(observation_id="OBS-1", page_number=1, wire_id="W101", wire_gauge="20 AWG", wire_color="RED", source_terminal="J1:1", destination_terminal="TB1:1", observed_text="W101", confidence_score=0.95)],
        [CandidateObservation(observation_id="OBS-2", page_number=2, wire_id="W102", wire_gauge="20 AWG", wire_color="BLU", source_terminal="J1:2", destination_terminal="TB1:2", observed_text="W102", confidence_score=0.95)],
    ]

    # Explicitly incomplete spec (is_complete = False)
    spec_json = json.dumps({
        "wires": [
            {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1", "expected_gauge": "20 AWG", "expected_color": "RED"},
            {"wire_id": "W102", "expected_source": "J1:2", "expected_destination": "TB1:2", "expected_gauge": "20 AWG", "expected_color": "BLU"},
        ],
        "is_complete": False,
    })

    response = client.post(
        "/api/v1/analyze",
        data={"standard": "IPC/WHMA-A-620D", "expected_netlist_json": spec_json},
        files={"file": ("multipage_harness.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    report = response.json()
    assert report["overall_outcome"] == "REVIEW"
    assert any(f["rule_id"] == "RULE-SPEC-02" for f in report["rule_findings"])

# --------------------------------------------------------------------------
# Test 10: Confirmed defects retain precedence over REVIEW on multi-page
# --------------------------------------------------------------------------
@patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock)
def test_confirmed_defect_overrides_page_coverage_review(mock_extract):
    pdf_bytes = create_synthetic_pdf([
        "Sheet 1: W101 20AWG RED J1:1 -> TB1:1",
        "Sheet 2: (failed page)",
    ])

    # Sheet 1 has defect: destination terminal TB1:99 instead of TB1:1
    mock_extract.side_effect = [
        [
            CandidateObservation(
                observation_id="OBS-1",
                page_number=1,
                wire_id="W101",
                wire_gauge="20 AWG",
                wire_color="RED",
                source_terminal="J1:1",
                destination_terminal="TB1:99",
                observed_text="W101 20AWG RED J1:1 -> TB1:99",
                confidence_score=0.95,
            )
        ],
        OllamaTimeoutError("Page 2 timed out"),
    ]

    expected_netlist = [
        {"wire_id": "W101", "expected_source": "J1:1", "expected_destination": "TB1:1", "expected_gauge": "20 AWG", "expected_color": "RED"}
    ]

    response = client.post(
        "/api/v1/analyze",
        data={
            "standard": "IPC/WHMA-A-620D",
            "expected_netlist_json": json.dumps(expected_netlist),
            "specification_is_complete": True,
        },
        files={"file": ("defect_with_timeout.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    report = response.json()

    # Precedence: FAIL > REVIEW > PASS. Confirmed terminal mismatch forces FAIL!
    assert report["overall_outcome"] == "FAIL"
    assert any(f["rule_id"] == "RULE-NETLIST-05" and f["outcome"] == "FAIL" for f in report["rule_findings"])
    assert any(f["rule_id"] == "RULE-PAGE-COVERAGE-02" and f["outcome"] == "REVIEW" for f in report["rule_findings"])

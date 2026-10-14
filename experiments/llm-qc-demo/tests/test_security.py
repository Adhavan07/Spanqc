import asyncio
import io
import json
import logging
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from PIL import Image

from app.config import settings
from app.main import app, analysis_semaphore, create_app
from app.document_processor import DocumentValidationError, read_bounded_upload
from app.models import CandidateObservation, EvidenceCoordinates

VALID_SECRET = "staging-internal-service-secret-at-least-16-bytes"

@pytest.fixture(autouse=True)
def reset_settings_auth():
    """Ensure settings has a clean valid secret for each test by default."""
    original_secret = settings.internal_service_secret
    original_min_len = settings.min_secret_length
    settings.internal_service_secret = VALID_SECRET
    settings.min_secret_length = 16
    yield
    settings.internal_service_secret = original_secret
    settings.min_secret_length = original_min_len

def create_sample_pdf_bytes() -> bytes:
    return b"%PDF-1.4\n%mock valid pdf content stream\n%%EOF"

# ---------------------------------------------------------------------------
# 1. Authentication Tests: Missing, Invalid, and Valid Credentials
# ---------------------------------------------------------------------------

def test_endpoints_reject_missing_credentials():
    unauth_client = TestClient(app)
    
    # /api/v1/evaluate
    res_eval = unauth_client.post("/api/v1/evaluate", json={"observations": []})
    assert res_eval.status_code == 401
    assert "Missing required internal service credentials" in res_eval.json()["detail"]["message"]

    # /api/v1/extract
    res_ext = unauth_client.post(
        "/api/v1/extract",
        files={"file": ("test.pdf", create_sample_pdf_bytes(), "application/pdf")},
    )
    assert res_ext.status_code == 401
    assert "Missing required internal service credentials" in res_ext.json()["detail"]["message"]

    # /api/v1/analyze
    res_ana = unauth_client.post(
        "/api/v1/analyze",
        files={"file": ("test.pdf", create_sample_pdf_bytes(), "application/pdf")},
    )
    assert res_ana.status_code == 401
    assert "Missing required internal service credentials" in res_ana.json()["detail"]["message"]

def test_endpoints_reject_invalid_bearer_token():
    bad_client = TestClient(app, headers={"Authorization": "Bearer wrong-invalid-secret-key"})
    
    res = bad_client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 401
    assert "Invalid internal service credentials" in res.json()["detail"]["message"]

def test_endpoints_reject_invalid_custom_header():
    bad_client = TestClient(app, headers={"X-SpanQC-Internal-Key": "wrong-custom-header-key"})
    
    res = bad_client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 401
    assert "Invalid internal service credentials" in res.json()["detail"]["message"]

def test_endpoints_accept_valid_bearer_token():
    auth_client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})
    
    res = auth_client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 200
    assert res.json()["overall_outcome"] == "REVIEW"

def test_endpoints_accept_valid_custom_header():
    auth_client = TestClient(app, headers={"X-SpanQC-Internal-Key": VALID_SECRET})
    
    res = auth_client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 200
    assert res.json()["overall_outcome"] == "REVIEW"

# ---------------------------------------------------------------------------
# 2. Server Secret Policy & Failsafe Tests
# ---------------------------------------------------------------------------

def test_endpoints_fail_closed_when_server_secret_unset():
    settings.internal_service_secret = ""
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})

    res = client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 503
    assert "internal service secret is missing or too weak" in res.json()["detail"]["message"]

def test_endpoints_fail_closed_when_server_secret_too_weak():
    settings.internal_service_secret = "weak8chars"
    settings.min_secret_length = 16
    client = TestClient(app, headers={"Authorization": "Bearer weak8chars"})

    res = client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 503
    assert "internal service secret is missing or too weak" in res.json()["detail"]["message"]

def test_secret_is_never_leaked_in_error_responses_or_logs(caplog):
    caplog.set_level(logging.DEBUG)
    canary_token = "SUPER_SECRET_CANARY_VALUE_XYZ_999"
    bad_client = TestClient(app, headers={"Authorization": f"Bearer {canary_token}"})

    res = bad_client.post("/api/v1/evaluate", json={"observations": []})
    assert res.status_code == 401

    # Verify secret is not in response body
    assert canary_token not in res.text
    assert VALID_SECRET not in res.text

    # Verify secret is not in captured logger messages
    for record in caplog.records:
        assert canary_token not in record.getMessage()
        assert VALID_SECRET not in record.getMessage()

# ---------------------------------------------------------------------------
# 3. Health (Liveness) & Readiness Separation Tests
# ---------------------------------------------------------------------------

def test_health_liveness_always_returns_200_without_secrets():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "internal_service_secret" not in data
    assert VALID_SECRET not in res.text

def test_health_endpoint_does_not_disclose_internal_hosts_or_private_paths():
    """SEC-33C-04: /health must not reveal internal dependency URLs, hostnames, credentials, or paths."""
    client = TestClient(app)
    with patch("app.main.inference_client.check_health", new_callable=AsyncMock) as mock_health:
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()

        # 1. Independent of upstream Ollama: check_health must not have been called
        assert not mock_health.called, "/health must be lightweight and independent of Ollama"

        # 2. ollama_host removed from config
        config = data.get("config", {})
        assert "ollama_host" not in config
        assert settings.ollama_host not in res.text

        # 3. No URLs or credentials present
        assert "http://" not in res.text
        assert "https://" not in res.text
        assert VALID_SECRET not in res.text

@pytest.mark.asyncio
async def test_ready_returns_200_when_all_dependencies_healthy():
    client = TestClient(app)
    with patch("app.main.inference_client.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {
            "available": True,
            "host": "http://localhost:11434",
            "target_model": "gemma3:4b",
            "model_installed": True,
        }
        res = client.get("/ready")
        assert res.status_code == 200
        data = res.json()
        assert data["ready"] is True
        assert data["checks"]["auth_configured"] is True
        assert data["checks"]["ollama_available"] is True
        assert data["checks"]["model_installed"] is True
        assert VALID_SECRET not in res.text

def test_ready_returns_503_when_secret_unconfigured():
    settings.internal_service_secret = ""
    client = TestClient(app)
    with patch("app.main.inference_client.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {"available": True, "model_installed": True}
        res = client.get("/ready")
        assert res.status_code == 503
        data = res.json()
        assert data["ready"] is False
        assert data["checks"]["auth_configured"] is False
        assert any("Internal service secret is unconfigured" in err for err in data.get("errors", []))

def test_ready_returns_503_when_ollama_unreachable():
    client = TestClient(app)
    with patch("app.main.inference_client.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {"available": False, "model_installed": False}
        res = client.get("/ready")
        assert res.status_code == 503
        data = res.json()
        assert data["ready"] is False
        assert data["checks"]["ollama_available"] is False
        assert any("Ollama" in err for err in data.get("errors", []))

def test_ready_returns_503_when_model_not_installed():
    client = TestClient(app)
    with patch("app.main.inference_client.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {"available": True, "model_installed": False}
        res = client.get("/ready")
        assert res.status_code == 503
        data = res.json()
        assert data["ready"] is False
        assert data["checks"]["model_installed"] is False
        assert any("model" in err.lower() for err in data.get("errors", []))

# ---------------------------------------------------------------------------
# 4. Resource & Concurrency Controls
# ---------------------------------------------------------------------------

def create_minimal_png_bytes() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (1, 1), color="blue")
    img.save(buf, format="PNG")
    return buf.getvalue()

@pytest.mark.asyncio
async def test_concurrency_limiter_rejects_overloaded_requests():
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})

    # Exhaust the semaphore completely to simulate concurrent saturation
    acquired_locks = []
    try:
        for _ in range(settings.max_concurrent_analysis):
            await analysis_semaphore.acquire()
            acquired_locks.append(True)

        # Immediate next request should fail with 503 Service Overloaded
        res = client.post(
            "/api/v1/extract",
            files={"file": ("test.pdf", create_sample_pdf_bytes(), "application/pdf")},
        )
        assert res.status_code == 503
        data = res.json()
        assert data["detail"]["error_type"] == "SERVICE_OVERLOADED"
        assert "saturated" in data["detail"]["message"]
    finally:
        for _ in acquired_locks:
            analysis_semaphore.release()

@pytest.mark.asyncio
async def test_semaphore_restored_on_upload_read_exception():
    """SEC-33C-01: Unexpected exception during upload read must release semaphore permit."""
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})
    initial_permits = analysis_semaphore._value

    # 1. Simulate unexpected upload-read crash
    with patch("app.main.read_bounded_upload", side_effect=RuntimeError("Simulated disk read crash")):
        try:
            res = client.post(
                "/api/v1/extract",
                files={"file": ("test.png", create_minimal_png_bytes(), "image/png")},
            )
            assert res.status_code == 500
        except RuntimeError:
            pass

    # 2. Verify permit is restored
    assert analysis_semaphore._value == initial_permits, "Semaphore permit leaked on upload-read crash"

    # 3. Verify a subsequent request can acquire capacity and succeed
    with patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock) as mock_inf:
        mock_inf.return_value = []
        res2 = client.post(
            "/api/v1/extract",
            files={"file": ("test.png", create_minimal_png_bytes(), "image/png")},
        )
        assert res2.status_code == 200
        assert analysis_semaphore._value == initial_permits

@pytest.mark.asyncio
async def test_semaphore_restored_on_validation_failure():
    """SEC-33C-01: Document validation failure must release semaphore permit without leak."""
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})
    initial_permits = analysis_semaphore._value

    # Empty file
    res_empty = client.post(
        "/api/v1/extract",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert res_empty.status_code == 400
    assert analysis_semaphore._value == initial_permits

    # Corrupt / invalid magic bytes
    res_bad = client.post(
        "/api/v1/extract",
        files={"file": ("corrupt.png", b"NOT_A_VALID_IMAGE_OR_PDF", "image/png")},
    )
    assert res_bad.status_code == 400
    assert analysis_semaphore._value == initial_permits

    # Subsequent request acquires capacity normally
    with patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock) as mock_inf:
        mock_inf.return_value = []
        res_ok = client.post(
            "/api/v1/extract",
            files={"file": ("test.png", create_minimal_png_bytes(), "image/png")},
        )
        assert res_ok.status_code == 200
        assert analysis_semaphore._value == initial_permits

@pytest.mark.asyncio
async def test_semaphore_restored_on_cancellation():
    """SEC-33C-01: Asyncio cancellation during analysis must release semaphore permit."""
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})
    initial_permits = analysis_semaphore._value

    with patch("app.main.inference_client.extract_candidate_observations", side_effect=asyncio.CancelledError()):
        try:
            client.post(
                "/api/v1/extract",
                files={"file": ("test.png", create_minimal_png_bytes(), "image/png")},
            )
        except (asyncio.CancelledError, Exception):
            pass

    assert analysis_semaphore._value == initial_permits

    # Subsequent request succeeds
    with patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock) as mock_inf:
        mock_inf.return_value = []
        res_ok = client.post(
            "/api/v1/extract",
            files={"file": ("test.png", create_minimal_png_bytes(), "image/png")},
        )
        assert res_ok.status_code == 200
        assert analysis_semaphore._value == initial_permits

@pytest.mark.asyncio
async def test_semaphore_not_double_released_on_normal_success():
    """SEC-33C-01: Successful analysis must release permit exactly once (never exceed max)."""
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})
    initial_permits = analysis_semaphore._value

    with patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock) as mock_inf:
        mock_inf.return_value = []
        for _ in range(3):
            res = client.post(
                "/api/v1/extract",
                files={"file": ("test.png", create_minimal_png_bytes(), "image/png")},
            )
            assert res.status_code == 200
            assert analysis_semaphore._value == initial_permits

# ---------------------------------------------------------------------------
# SEC-33C-02: Bounded Upload Handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_read_bounded_upload_unit_exact_limits():
    """SEC-33C-02: Unit tests for bounded upload reader at below, exact, and exceeding limits."""
    from fastapi import UploadFile

    # 1. Below limit (50 bytes with limit 100)
    f_below = UploadFile(file=io.BytesIO(b"A" * 50), filename="below.bin")
    data_below = await read_bounded_upload(f_below, max_bytes=100)
    assert len(data_below) == 50

    # 2. Exactly at limit (100 bytes with limit 100)
    f_at = UploadFile(file=io.BytesIO(b"A" * 100), filename="at.bin")
    data_at = await read_bounded_upload(f_at, max_bytes=100)
    assert len(data_at) == 100

    # 3. Exceeding limit by 1 byte (101 bytes with limit 100)
    f_above = UploadFile(file=io.BytesIO(b"A" * 101), filename="above.bin")
    with pytest.raises(DocumentValidationError, match="exceeds maximum limit of 100 bytes"):
        await read_bounded_upload(f_above, max_bytes=100)
    assert f_above.file.closed

@pytest.mark.asyncio
async def test_read_bounded_upload_stops_at_max_bytes_plus_one_without_buffering_entire_stream():
    """SEC-33C-02: Stream reader stops reading immediately at max_bytes + 1 rather than buffering gigabytes."""
    from fastapi import UploadFile

    class CountingBytesIO(io.BytesIO):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.bytes_read = 0
        def read(self, size=-1):
            data = super().read(size)
            self.bytes_read += len(data)
            return data

    huge_payload = CountingBytesIO(b"X" * 100_000)
    upload = UploadFile(file=huge_payload, filename="huge.bin")

    with pytest.raises(DocumentValidationError, match="exceeds maximum limit"):
        await read_bounded_upload(upload, max_bytes=100, chunk_size=32)

    assert upload.file.closed
    # Reader stopped immediately at 101 bytes
    assert huge_payload.bytes_read <= 101

def test_bounded_upload_endpoint_enforcement_and_capacity_restored():
    """SEC-33C-02: Endpoint rejects oversized upload with 400 and restores concurrency capacity."""
    client = TestClient(app, headers={"Authorization": f"Bearer {VALID_SECRET}"})
    original_limit = settings.max_file_size_bytes
    initial_permits = analysis_semaphore._value
    png_bytes = create_minimal_png_bytes()
    png_len = len(png_bytes)

    try:
        # Limit set smaller than PNG
        settings.max_file_size_bytes = png_len - 1

        res_oversized = client.post(
            "/api/v1/extract",
            files={"file": ("test.png", png_bytes, "image/png")},
        )
        assert res_oversized.status_code == 400
        assert "exceeds maximum limit" in res_oversized.json()["detail"]
        assert analysis_semaphore._value == initial_permits

        # Limit set equal to PNG
        settings.max_file_size_bytes = png_len
        with patch("app.main.inference_client.extract_candidate_observations", new_callable=AsyncMock) as mock_inf:
            mock_inf.return_value = []
            res_at_limit = client.post(
                "/api/v1/extract",
                files={"file": ("test.png", png_bytes, "image/png")},
            )
            assert res_at_limit.status_code == 200
            assert analysis_semaphore._value == initial_permits
    finally:
        settings.max_file_size_bytes = original_limit

# ---------------------------------------------------------------------------
# 5. UI and Exposure Protection
# ---------------------------------------------------------------------------

def test_demo_ui_is_not_mounted_when_disabled_by_default():
    client = TestClient(app)
    res_ui = client.get("/ui/")
    assert res_ui.status_code == 404

    res_fixtures = client.get("/fixtures/")
    assert res_fixtures.status_code == 404

def test_api_documentation_disabled_by_default_in_staging_config():
    """SEC-33C-05: /docs, /redoc, and /openapi.json return 404 by default."""
    client = TestClient(app)
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404

def test_api_documentation_available_when_explicitly_opted_in():
    """SEC-33C-05: Interactive documentation is available when enable_docs=True."""
    app_with_docs = create_app(enable_docs=True)
    client = TestClient(app_with_docs)
    res_docs = client.get("/docs")
    assert res_docs.status_code == 200
    res_openapi = client.get("/openapi.json")
    assert res_openapi.status_code == 200
    assert "openapi" in res_openapi.json()

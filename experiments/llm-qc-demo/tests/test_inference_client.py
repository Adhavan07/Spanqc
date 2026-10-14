import json
import pytest
from unittest.mock import AsyncMock, patch
import httpx
from app.inference_client import (
    OllamaConnectionError,
    OllamaInferenceClient,
    OllamaInvalidOutputError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
)

@pytest.mark.asyncio
async def test_inference_connection_failure():
    # Attempting to call an unreachable host raises OllamaConnectionError, NEVER canned data
    client = OllamaInferenceClient(host="http://127.0.0.1:9999", timeout=1.0)
    with pytest.raises(OllamaConnectionError):
        await client.extract_candidate_observations(b"fake_image_bytes", page_number=1)

@pytest.mark.asyncio
async def test_inference_model_not_found():
    client = OllamaInferenceClient(host="http://localhost:11434")

    mock_response = httpx.Response(
        status_code=404,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        text="model not found",
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaModelNotFoundError, match="is not installed"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_timeout():
    client = OllamaInferenceClient(host="http://localhost:11434", timeout=0.01)

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timed out")):
        with pytest.raises(OllamaTimeoutError, match="timed out"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_invalid_json():
    client = OllamaInferenceClient(host="http://localhost:11434")

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": "This is non-JSON model babble"}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="not valid JSON"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_valid_response_parsing():
    client = OllamaInferenceClient(host="http://localhost:11434")

    valid_payload = {
        "observations": [
            {
                "observation_id": "OBS-1",
                "page_number": 1,
                "wire_id": "W101",
                "wire_gauge": "20 AWG",
                "wire_color": "RED",
                "source_terminal": "J1:1",
                "destination_terminal": "TB1:1",
                "observed_text": "J1:1 to TB1:1 W101 20AWG RED",
                "confidence_score": 0.9,
            }
        ]
    }

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": json.dumps(valid_payload)}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        observations = await client.extract_candidate_observations(b"fake_image_bytes")
        assert len(observations) == 1
        assert observations[0].wire_id == "W101"
        assert observations[0].confidence_score == 0.9

@pytest.mark.asyncio
async def test_inference_empty_dict_output():
    # Empty JSON object {} returned by Ollama must raise OllamaInvalidOutputError, NEVER pass or synthesize
    client = OllamaInferenceClient(host="http://localhost:11434")

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": "{}"}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="does not contain an 'observations' list"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_empty_content_output():
    client = OllamaInferenceClient(host="http://localhost:11434")

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": ""}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="empty response content"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_missing_required_fields():
    # Missing required observation fields (e.g. observed_text, confidence_score)
    client = OllamaInferenceClient(host="http://localhost:11434")

    bad_payload = {
        "observations": [
            {
                "observation_id": "OBS-1",
                # missing page_number, observed_text, confidence_score, requires_human_review
            }
        ]
    }

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": json.dumps(bad_payload)}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="failed schema validation"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_invalid_coordinates():
    # Inverted bounding box coordinates (ymax < ymin) must be rejected strictly without auto-fixing
    client = OllamaInferenceClient(host="http://localhost:11434")

    bad_coords_payload = {
        "observations": [
            {
                "observation_id": "OBS-1",
                "page_number": 1,
                "observed_text": "Sample text",
                "confidence_score": 0.9,
                "requires_human_review": False,
                "coordinates": {
                    "ymin": 0.8,
                    "xmin": 0.1,
                    "ymax": 0.2,  # Invalid: ymax < ymin
                    "xmax": 0.5,
                },
            }
        ]
    }

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": json.dumps(bad_coords_payload)}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="failed schema validation"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_invalid_confidence_score():
    # Out-of-bounds confidence score (> 1.0) must be rejected strictly
    client = OllamaInferenceClient(host="http://localhost:11434")

    bad_conf_payload = {
        "observations": [
            {
                "observation_id": "OBS-1",
                "page_number": 1,
                "observed_text": "Sample text",
                "confidence_score": 1.99,  # Invalid: > 1.0
                "requires_human_review": False,
            }
        ]
    }

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": json.dumps(bad_conf_payload)}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="failed schema validation"):
            await client.extract_candidate_observations(b"fake_image_bytes")

@pytest.mark.asyncio
async def test_inference_observations_not_a_list():
    client = OllamaInferenceClient(host="http://localhost:11434")

    bad_structure_payload = {
        "observations": "invalid_string_not_list"
    }

    mock_response = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        json={"message": {"content": json.dumps(bad_structure_payload)}},
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(OllamaInvalidOutputError, match="is not a list"):
            await client.extract_candidate_observations(b"fake_image_bytes")


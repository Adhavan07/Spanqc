import base64
import json
import time
from typing import List, Optional
import httpx
from pydantic import ValidationError

from .config import settings
from .models import CandidateObservation, ConfidenceLevel, EvidenceCoordinates

class OllamaInferenceError(Exception):
    pass

class OllamaConnectionError(OllamaInferenceError):
    pass

class OllamaModelNotFoundError(OllamaInferenceError):
    pass

class OllamaTimeoutError(OllamaInferenceError):
    pass

class OllamaInvalidOutputError(OllamaInferenceError):
    pass

EXTRACTION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "observations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "observation_id": {"type": "string"},
                    "page_number": {"type": "integer"},
                    "component_id": {"type": ["string", "null"]},
                    "connector_id": {"type": ["string", "null"]},
                    "pin_id": {"type": ["string", "null"]},
                    "wire_id": {"type": ["string", "null"]},
                    "wire_gauge": {"type": ["string", "null"]},
                    "wire_color": {"type": ["string", "null"]},
                    "source_terminal": {"type": ["string", "null"]},
                    "destination_terminal": {"type": ["string", "null"]},
                    "coordinates": {
                        "type": "object",
                        "properties": {
                            "ymin": {"type": "number"},
                            "xmin": {"type": "number"},
                            "ymax": {"type": "number"},
                            "xmax": {"type": "number"},
                        },
                        "required": ["ymin", "xmin", "ymax", "xmax"],
                    },
                    "observed_text": {"type": "string"},
                    "confidence_score": {"type": "number"},
                    "confidence_level": {
                        "type": "string",
                        "enum": ["HIGH", "MEDIUM", "LOW", "UNCERTAIN"],
                    },
                    "ambiguity_reasons": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "requires_human_review": {"type": "boolean"},
                    "review_fields": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": [
                    "observation_id",
                    "page_number",
                    "wire_id",
                    "wire_gauge",
                    "wire_color",
                    "source_terminal",
                    "destination_terminal",
                    "observed_text",
                    "confidence_score",
                    "requires_human_review",
                ],
            },
        }
    },
    "required": ["observations"],
}

EXTRACTION_SYSTEM_PROMPT = """You are a specialized aerospace and electrical wiring diagram quality-control assistant.
Your task is to analyze wiring schematic imagery and extract candidate wiring observations with high fidelity.
You must output ONLY valid JSON matching the exact schema requested."""

EXTRACTION_USER_PROMPT_TEMPLATE = """Analyze Sheet / Page {page_number} of this wiring schematic.
Extract all candidate wiring connections, wire callouts, and terminal connections in strict JSON matching the requested schema.

CRITICAL GROUNDING RULES:
1. Report ONLY visually supported observations visible in the image.
2. DO NOT invent, guess, or extrapolate connections, terminal identifiers, wire numbers, or coordinates that are not clearly illustrated.
3. For each candidate connection visible in the schematic (e.g. "W101 J1:1 -> TB1:1 20AWG RED"), you MUST extract:
   - "observation_id": unique identifier (e.g. "OBS-P{page_number}-1")
   - "page_number": {page_number}
   - "wire_id": wire name/identifier (e.g. "W101")
   - "wire_gauge": conductor gauge (e.g. "20AWG" or "20 AWG")
   - "wire_color": conductor insulation color (e.g. "RED", "BLU")
   - "source_terminal": candidate source terminal (e.g. "J1:1")
   - "destination_terminal": candidate destination terminal (e.g. "TB1:1")
   - "observed_text": verbatim callout text legible on the drawing
   - "confidence_score": numeric confidence between 0.0 and 1.0
   - "requires_human_review": true if any attribute is incomplete, cut off, or ambiguous, else false
   - "ambiguity_reasons": list of strings explaining any ambiguity
4. If an attribute (wire identifier, gauge, color, terminal) is not visible, unstated, or partially cut off, set its value to null and flag "requires_human_review": true.
5. Provide the output strictly in the "observations" array according to the requested JSON schema.
"""

class OllamaInferenceClient:
    """
    Client connecting directly to local Ollama runtime for vision-language inference.
    Never returns canned/mocked results on failure.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        num_gpu: Optional[int] = None,
    ):
        self.host = (host or settings.ollama_host).rstrip("/")
        self.model = model or settings.ollama_model
        self.timeout = timeout or settings.ollama_timeout_seconds
        self.num_gpu = num_gpu if num_gpu is not None else getattr(settings, "ollama_num_gpu", 0)

    async def check_health(self) -> dict:
        """Verify Ollama service availability and check if target model is loaded."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.host}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    model_found = any(self.model in m for m in models)
                    return {
                        "available": True,
                        "host": self.host,
                        "target_model": self.model,
                        "model_installed": model_found,
                        "installed_models": models,
                    }
                return {
                    "available": False,
                    "host": self.host,
                    "target_model": self.model,
                    "error": f"Ollama returned HTTP {res.status_code}",
                }
        except httpx.ConnectError:
            return {
                "available": False,
                "host": self.host,
                "target_model": self.model,
                "error": f"Connection refused on {self.host}. Ollama daemon is not running.",
            }
        except Exception as e:
            return {
                "available": False,
                "host": self.host,
                "target_model": self.model,
                "error": str(e),
            }

    async def extract_candidate_observations(
        self, page_image_bytes: bytes, page_number: int = 1
    ) -> List[CandidateObservation]:
        """
        Executes real multimodal vision inference on the page image via Ollama.
        Enforces schema validation and rejects malformed outputs.
        """
        image_b64 = base64.b64encode(page_image_bytes).decode("utf-8")

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": EXTRACTION_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": EXTRACTION_USER_PROMPT_TEMPLATE.format(page_number=page_number),
                    "images": [image_b64],
                },
            ],
            "format": EXTRACTION_JSON_SCHEMA,
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic extraction
                "num_predict": 1024,
                "num_gpu": self.num_gpu,
            },
        }

        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.host}/api/chat",
                    json=payload,
                )
        except httpx.ConnectError:
            raise OllamaConnectionError(
                f"Ollama daemon is unreachable at {self.host}. "
                f"Please ensure Ollama is installed and running (`ollama serve`)."
            )
        except httpx.TimeoutException:
            raise OllamaTimeoutError(
                f"Ollama vision inference timed out after {self.timeout}s on model '{self.model}'."
            )
        except Exception as e:
            raise OllamaInferenceError(f"HTTP request to Ollama failed: {str(e)}")

        if response.status_code == 404:
            raise OllamaModelNotFoundError(
                f"Model '{self.model}' is not installed in local Ollama repository. "
                f"Run `ollama pull {self.model}` to download model weights."
            )

        if response.status_code != 200:
            raise OllamaInferenceError(
                f"Ollama returned error HTTP {response.status_code}: {response.text}"
            )

        # Parse and validate response JSON
        body = response.json()
        raw_content = body.get("message", {}).get("content", "")
        if not raw_content or not raw_content.strip():
            raise OllamaInvalidOutputError("Model returned empty response content.")

        try:
            parsed_json = json.loads(raw_content)
        except json.JSONDecodeError as err:
            raise OllamaInvalidOutputError(
                f"Model output is not valid JSON: {str(err)}. Raw output: {raw_content[:200]}"
            )

        if not isinstance(parsed_json, dict) or "observations" not in parsed_json:
            raise OllamaInvalidOutputError(
                "Model output JSON does not contain an 'observations' list. "
                f"Raw output: {raw_content[:200]}"
            )

        observations_data = parsed_json.get("observations")
        if not isinstance(observations_data, list):
            raise OllamaInvalidOutputError(
                "Model output 'observations' field is not a list. "
                f"Received: {type(observations_data).__name__}"
            )

        validated_observations: List[CandidateObservation] = []
        for idx, obs_raw in enumerate(observations_data):
            if not isinstance(obs_raw, dict):
                raise OllamaInvalidOutputError(
                    f"Observation {idx+1} is not a valid JSON object: {obs_raw}"
                )
            try:
                # Strictly validate schema without synthesizing missing fields or coordinates
                observation = CandidateObservation.model_validate(obs_raw)
                validated_observations.append(observation)
            except ValidationError as val_err:
                raise OllamaInvalidOutputError(
                    f"Observation {idx+1} failed schema validation: {val_err}"
                )

        return validated_observations

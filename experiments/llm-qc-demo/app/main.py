import asyncio
import json
import time
import uuid
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from pydantic import BaseModel
from .config import settings
from .auth import verify_internal_auth
from .document_processor import DocumentProcessor, DocumentValidationError, read_bounded_upload
from .inference_client import (
    OllamaConnectionError,
    OllamaInferenceClient,
    OllamaInferenceError,
    OllamaInvalidOutputError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
)
from .models import (
    CandidateObservation,
    DeterministicRuleFinding,
    EvaluationOutcome,
    ExpectedWireConnection,
    NetlistSpecification,
    QCReport,
)
from .rule_evaluator import DeterministicRuleEvaluator
from .audit_logger import audit_logger

class EvaluateRequest(BaseModel):
    model_config = {"extra": "allow"}
    observations: List[CandidateObservation]
    expected_netlist: Optional[Union[List[ExpectedWireConnection], NetlistSpecification]] = None
    specification_is_complete: Optional[bool] = None
    extraction_is_verified: Optional[bool] = None
    standard: str = "IPC/WHMA-A-620D"

router = APIRouter()

# Bounded analysis concurrency semaphore to protect against memory exhaustion from high-DPI rasterization
analysis_semaphore = asyncio.Semaphore(settings.max_concurrent_analysis)

processor = DocumentProcessor(
    max_file_size_bytes=settings.max_file_size_bytes,
    render_dpi=settings.render_dpi,
    max_pages=settings.max_pages_to_process,
)

inference_client = OllamaInferenceClient()
evaluator = DeterministicRuleEvaluator()

@router.get("/health")
async def health_check():
    """Fast, non-blocking liveness probe without dependency calls or internal infrastructure disclosure."""
    return {
        "status": "healthy",
        "service": "SpanQC LLM Wiring QC Experiment",
        "version": "0.1.0-experiment",
        "config": {
            "model": settings.ollama_model,
            "render_dpi": settings.render_dpi,
            "max_file_size_bytes": settings.max_file_size_bytes,
        },
    }

@router.get("/ready")
async def readiness_check():
    """
    Readiness probe verifying secret policy, upstream Ollama reachability,
    and model availability.
    Returns HTTP 200 when ready to serve traffic, HTTP 503 when blocked.
    Avoids leaking secrets, private paths, or internal hostnames.
    """
    errors: List[str] = []

    # 1. Secret policy check
    auth_configured = settings.is_secret_valid()
    if not auth_configured:
        errors.append("Internal service secret is unconfigured or fails minimum length policy.")

    # 2. Upstream Ollama & model check
    ollama_status = await inference_client.check_health()
    ollama_available = bool(ollama_status.get("available", False))
    model_installed = bool(ollama_status.get("model_installed", False))

    if not ollama_available:
        errors.append("Upstream vision model runtime (Ollama) is unreachable.")
    elif not model_installed:
        errors.append(f"Target model '{settings.ollama_model}' is not available in local model repository.")

    is_ready = auth_configured and ollama_available and model_installed

    response_data = {
        "ready": is_ready,
        "service": "SpanQC LLM Wiring QC Experiment",
        "target_model": settings.ollama_model,
        "checks": {
            "auth_configured": auth_configured,
            "ollama_available": ollama_available,
            "model_installed": model_installed,
        },
    }
    if not is_ready:
        response_data["errors"] = errors
        return JSONResponse(status_code=503, content=response_data)

    return response_data

@router.post("/api/v1/extract", dependencies=[Depends(verify_internal_auth)])
async def extract_observations(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Ingests document (PDF/PNG/JPEG), renders pages, and runs real vision model inference across all supported pages.
    Never returns mock/canned results on failure.
    Protected by service-to-service internal authentication and bounded concurrency limiter.
    Note: Upstream reverse proxy must still enforce maximum request body size in staging (Phase 3.4).
    """
    try:
        await asyncio.wait_for(analysis_semaphore.acquire(), timeout=0.01)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "SERVICE_OVERLOADED",
                "message": f"Server concurrent analysis capacity limit ({settings.max_concurrent_analysis}) saturated. Please retry shortly.",
            },
        )
    try:
        try:
            processor.max_file_size_bytes = settings.max_file_size_bytes
            content = await read_bounded_upload(file, max_bytes=settings.max_file_size_bytes)
            proc_res = processor.process_document(content, file.filename or "uploaded_doc")
            sha256_hash, fmt, page_images = proc_res
            total_pages = proc_res.total_pages
            unprocessed_pages = proc_res.unprocessed_pages
        except DocumentValidationError as err:
            raise HTTPException(status_code=400, detail=str(err))

        rendered_data_urls = [
            processor.bytes_to_base64_data_url(img, "image/png") for img in page_images
        ]

        all_observations: List[CandidateObservation] = []
        processed_pages: List[int] = []
        failed_pages: List[int] = []
        seen_obs_ids: set = set()
        start_time = time.time()

        if not page_images:
            raise HTTPException(status_code=400, detail="No readable pages found in document.")

        for idx, page_img in enumerate(page_images):
            # Abort immediately if client disconnected or timed out to prevent unbounded duplicate inference
            if await request.is_disconnected():
                raise HTTPException(status_code=499, detail="Client closed request before completion.")

            page_num = idx + 1
            try:
                page_obs = await inference_client.extract_candidate_observations(
                    page_img, page_number=page_num
                )
                for obs in page_obs:
                    obs.page_number = page_num
                    if obs.observation_id in seen_obs_ids:
                        obs.observation_id = f"P{page_num}-{obs.observation_id}"
                    seen_obs_ids.add(obs.observation_id)
                    all_observations.append(obs)
                processed_pages.append(page_num)
            except (OllamaConnectionError, OllamaModelNotFoundError, OllamaTimeoutError, OllamaInvalidOutputError) as conn_err:
                if len(page_images) == 1:
                    if isinstance(conn_err, OllamaConnectionError):
                        raise HTTPException(
                            status_code=503,
                            detail={
                                "error_type": "OLLAMA_UNREACHABLE",
                                "message": str(conn_err),
                                "suggestion": "Start the Ollama daemon with 'ollama serve' and ensure port 11434 is listening.",
                            },
                        )
                    elif isinstance(conn_err, OllamaModelNotFoundError):
                        raise HTTPException(
                            status_code=404,
                            detail={
                                "error_type": "MODEL_NOT_FOUND",
                                "message": str(conn_err),
                                "suggestion": f"Download model weights using: 'ollama pull {settings.ollama_model}'",
                            },
                        )
                    elif isinstance(conn_err, OllamaTimeoutError):
                        raise HTTPException(
                            status_code=504,
                            detail={
                                "error_type": "INFERENCE_TIMEOUT",
                                "message": str(conn_err),
                            },
                        )
                    elif isinstance(conn_err, OllamaInvalidOutputError):
                        raise HTTPException(
                            status_code=422,
                            detail={
                                "error_type": "INVALID_MODEL_OUTPUT",
                                "message": str(conn_err),
                            },
                        )
                failed_pages.append(page_num)
            except Exception as e:
                if len(page_images) == 1:
                    raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
                failed_pages.append(page_num)

        duration_ms = (time.time() - start_time) * 1000

        return {
            "filename": file.filename,
            "sha256_hash": sha256_hash,
            "format": fmt,
            "total_page_count": total_pages,
            "page_count": len(page_images),
            "processed_page_count": len(processed_pages),
            "failed_page_count": len(failed_pages),
            "unprocessed_page_numbers": unprocessed_pages,
            "failed_page_numbers": failed_pages,
            "model_used": settings.ollama_model,
            "inference_duration_ms": round(duration_ms, 2),
            "observations": all_observations,
            "rendered_pages": rendered_data_urls,
        }
    finally:
        analysis_semaphore.release()

@router.post("/api/v1/evaluate", dependencies=[Depends(verify_internal_auth)])
async def evaluate_observations(
    request: EvaluateRequest,
):
    """
    Evaluates candidate observations against deterministic electrical standards.
    Returns PASS, FAIL, or REVIEW with cited rule findings.
    Protected by service-to-service internal authentication.
    """
    observations = request.observations
    expected_netlist = request.expected_netlist
    specification_is_complete = request.specification_is_complete
    extraction_is_verified = request.extraction_is_verified
    standard = request.standard

    netlist_wires: Optional[List[ExpectedWireConnection]] = None
    if isinstance(expected_netlist, NetlistSpecification):
        netlist_wires = expected_netlist.wires
        if specification_is_complete is None:
            specification_is_complete = expected_netlist.is_complete
        if extraction_is_verified is None:
            extraction_is_verified = expected_netlist.extraction_is_verified
    elif isinstance(expected_netlist, list):
        netlist_wires = expected_netlist

    outcome, findings = evaluator.evaluate(
        observations=observations,
        expected_netlist=netlist_wires,
        specification_is_complete=specification_is_complete,
        standard=standard,
        extraction_is_verified=extraction_is_verified,
        trusted_verification=None,  # Unauthenticated HTTP callers cannot self-attest trusted verification
    )
    return {
        "overall_outcome": outcome,
        "specification_is_complete": bool(specification_is_complete) if specification_is_complete is not None else False,
        "extraction_is_verified": False,  # Unauthenticated caller claims are untrusted metadata
        "standard": standard,
        "findings_count": len(findings),
        "findings": findings,
        "experimental_disclaimer": (
            "PROOF OF CONCEPT ONLY - Findings generated by experimental vision model and deterministic rule engine. "
            "A caller-supplied boolean cannot authorize PASS. Genuine PASS requires certified complete specification and trusted extraction verification evidence. "
            "Independent engineering signoff required."
        ),
    }

@router.post("/api/v1/analyze", response_model=QCReport, dependencies=[Depends(verify_internal_auth)])
async def analyze_document(
    request: Request,
    file: UploadFile = File(...),
    standard: str = Form("IPC/WHMA-A-620D"),
    expected_netlist_json: Optional[str] = Form(None),
    specification_is_complete: Optional[bool] = Form(None),
    extraction_is_verified: Optional[bool] = Form(None),
    scope_description: Optional[str] = Form(None),
):
    """
    Complete end-to-end QC analysis:
    1. Cryptographic hashing & document rasterization
    2. Real multimodal vision model candidate extraction
    3. Deterministic rule evaluation
    4. Production of structured, evidence-grounded QCReport
    Protected by service-to-service internal authentication and bounded concurrency limiter.
    Note: Upstream reverse proxy must still enforce maximum request body size in staging (Phase 3.4).
    """
    try:
        await asyncio.wait_for(analysis_semaphore.acquire(), timeout=0.01)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "SERVICE_OVERLOADED",
                "message": f"Server concurrent analysis capacity limit ({settings.max_concurrent_analysis}) saturated. Please retry shortly.",
            },
        )
    try:
        try:
            processor.max_file_size_bytes = settings.max_file_size_bytes
            content = await read_bounded_upload(file, max_bytes=settings.max_file_size_bytes)
            proc_res = processor.process_document(content, file.filename or "uploaded_doc")
            sha256_hash, fmt, page_images = proc_res
            total_pages = proc_res.total_pages
            unprocessed_pages = proc_res.unprocessed_pages
        except DocumentValidationError as err:
            raise HTTPException(status_code=400, detail=str(err))

        rendered_data_urls = [
            processor.bytes_to_base64_data_url(img, "image/png") for img in page_images
        ]

        expected_netlist: Optional[List[ExpectedWireConnection]] = None
        if expected_netlist_json is not None:
            trimmed = expected_netlist_json.strip()
            if not trimmed:
                expected_netlist = None
            else:
                try:
                    parsed_raw = json.loads(trimmed)
                    if isinstance(parsed_raw, list):
                        expected_netlist = [ExpectedWireConnection.model_validate(item) for item in parsed_raw]
                    elif isinstance(parsed_raw, dict):
                        spec = NetlistSpecification.model_validate(parsed_raw)
                        expected_netlist = spec.wires
                        if specification_is_complete is None and spec.is_complete is not None:
                            specification_is_complete = spec.is_complete
                        if extraction_is_verified is None and spec.extraction_is_verified is not None:
                            extraction_is_verified = spec.extraction_is_verified
                        if scope_description is None and spec.scope_description is not None:
                            scope_description = spec.scope_description
                    else:
                        raise ValueError("Expected netlist JSON must be a list of wire objects or a NetlistSpecification object")
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid expected_netlist_json: {e}")

        # Real inference execution across all rendered pages
        all_candidate_obs: List[CandidateObservation] = []
        processed_pages: List[int] = []
        failed_pages: List[int] = []
        seen_obs_ids: set = set()
        start_time = time.time()

        for idx, page_img in enumerate(page_images):
            # Abort immediately if client disconnected or timed out to prevent unbounded duplicate inference
            if await request.is_disconnected():
                raise HTTPException(status_code=499, detail="Client closed request before completion.")

            page_num = idx + 1
            try:
                page_obs = await inference_client.extract_candidate_observations(
                    page_img, page_number=page_num
                )
                for obs in page_obs:
                    obs.page_number = page_num
                    if obs.observation_id in seen_obs_ids:
                        obs.observation_id = f"P{page_num}-{obs.observation_id}"
                    seen_obs_ids.add(obs.observation_id)
                    all_candidate_obs.append(obs)
                processed_pages.append(page_num)
            except (OllamaConnectionError, OllamaModelNotFoundError, OllamaTimeoutError, OllamaInvalidOutputError) as err:
                if len(page_images) == 1:
                    if isinstance(err, OllamaConnectionError):
                        raise HTTPException(
                            status_code=503,
                            detail={
                                "error_type": "OLLAMA_UNREACHABLE",
                                "message": str(err),
                                "suggestion": "Start the Ollama daemon with 'ollama serve'.",
                            },
                        )
                    elif isinstance(err, OllamaModelNotFoundError):
                        raise HTTPException(
                            status_code=404,
                            detail={
                                "error_type": "MODEL_NOT_FOUND",
                                "message": str(err),
                                "suggestion": f"Run 'ollama pull {settings.ollama_model}'.",
                            },
                        )
                    elif isinstance(err, OllamaTimeoutError):
                        raise HTTPException(status_code=504, detail=str(err))
                    elif isinstance(err, OllamaInvalidOutputError):
                        raise HTTPException(status_code=422, detail=str(err))
                failed_pages.append(page_num)
            except Exception as e:
                if len(page_images) == 1:
                    raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
                failed_pages.append(page_num)

        duration_ms = (time.time() - start_time) * 1000

        # Deterministic rule evaluation
        overall_outcome, findings = evaluator.evaluate(
            observations=all_candidate_obs,
            expected_netlist=expected_netlist,
            specification_is_complete=specification_is_complete,
            standard=standard,
            extraction_is_verified=extraction_is_verified,
            trusted_verification=None,  # Unauthenticated HTTP callers cannot self-attest trusted verification
            document_sha256=sha256_hash,
            scope_description=scope_description,
            total_page_count=total_pages,
            processed_page_count=len(processed_pages),
            unprocessed_page_numbers=unprocessed_pages,
            failed_page_numbers=failed_pages,
        )

        report_id = f"EXP-QC-{uuid.uuid4().hex[:8].upper()}"

        report = QCReport(
            report_id=report_id,
            document_name=file.filename or "uploaded_doc",
            sha256_hash=sha256_hash,
            standard=standard,
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            model_used=settings.ollama_model,
            overall_outcome=overall_outcome,
            specification_is_complete=bool(specification_is_complete) if specification_is_complete is not None else False,
            extraction_is_verified=False,  # Unauthenticated caller claims are untrusted metadata
            trusted_verification=None,
            scope_description=scope_description,
            rule_findings=findings,
            candidate_observations=all_candidate_obs,
            pages_rendered=rendered_data_urls,
            total_page_count=total_pages,
            processed_page_count=len(processed_pages),
            failed_page_count=len(failed_pages),
            unprocessed_page_numbers=unprocessed_pages,
            failed_page_numbers=failed_pages,
            is_experimental=True,
        )

        audit_logger.log_analysis_event(
            report_id=report_id,
            document_name=file.filename or "uploaded_doc",
            sha256_hash=sha256_hash,
            total_pages=total_pages,
            processed_pages=len(processed_pages),
            failed_pages=failed_pages,
            unprocessed_pages=unprocessed_pages,
            model_used=settings.ollama_model,
            duration_ms=duration_ms,
            overall_outcome=overall_outcome.value,
            findings_count=len(findings),
        )

        return report
    finally:
        analysis_semaphore.release()

def create_app(enable_docs: Optional[bool] = None) -> FastAPI:
    """
    Application factory for SpanQC LLM Wiring QC Service.
    Configures CORS, documentation endpoints, route handlers, and static files.
    Disables /docs, /redoc, and /openapi.json by default unless ENABLE_API_DOCS=true.
    """
    docs_enabled = settings.enable_api_docs if enable_docs is None else enable_docs
    app_instance = FastAPI(
        title="SpanQC Open-Weight Vision Model QC Service",
        description="Isolated experimental service analyzing wiring diagrams with local vision-language models and deterministic rules.",
        version="0.1.0-experiment",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    # Strictly configured CORS: disabled by default for internal-only container security
    if settings.cors_origins:
        allowed_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        if allowed_origins:
            app_instance.add_middleware(
                CORSMiddleware,
                allow_origins=allowed_origins,
                allow_credentials=True,
                allow_methods=["GET", "POST", "OPTIONS"],
                allow_headers=["Authorization", "X-SpanQC-Internal-Key", "Content-Type"],
            )

    app_instance.include_router(router)

    # Mount static demo UI and fixtures only if explicitly enabled in configuration
    if settings.enable_demo_ui:
        static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
        if os.path.isdir(static_dir):
            app_instance.mount("/ui", StaticFiles(directory=static_dir, html=True), name="static_ui")

        fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures")
        if os.path.isdir(fixtures_dir):
            app_instance.mount("/fixtures", StaticFiles(directory=fixtures_dir), name="fixtures")

    return app_instance

app = create_app()


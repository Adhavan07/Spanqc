"""FastAPI service. Drop-in for the old Python service: POST /api/v1/analyze (multipart) returns the
report shape the Next.js job-bridge already validates. Fails CLOSED: no key / model error -> page failed
-> never PASS. Nothing is ever simulated."""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Callable, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from . import __version__
from .classify import ComponentIndex, classify_destination
from .extract import AnthropicClient, ExtractionClient, extract_sheet
from .rules import Expected, Observation, evaluate

MAX_BYTES = 25 * 1024 * 1024
MAX_PAGES = 40


def _pages(data: bytes, filename: str) -> List[tuple[bytes, str]]:
    head = data[:8]
    if head.startswith(b"%PDF"):
        import pymupdf
        try:
            doc = pymupdf.open(stream=data, filetype="pdf")
            if doc.page_count > MAX_PAGES:
                raise HTTPException(413, f"PDF has {doc.page_count} pages; the limit is {MAX_PAGES}.")
            return [(p.get_pixmap(dpi=200).tobytes("png"), "image/png") for p in doc]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(422, f"PDF document could not be opened: {exc}")
    if head.startswith(b"\x89PNG"):
        return [(data, "image/png")]
    if head[:3] == b"\xff\xd8\xff":
        return [(data, "image/jpeg")]
    if head.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return [(data, "image/webp")]
    raise HTTPException(415, "Unsupported file type. Upload a PDF, PNG, JPG, or WEBP.")


def _parse_expected(raw: Optional[str]) -> List[Expected]:
    if not raw:
        return []
    try:
        return [Expected(wire_no=str(w["wire_no"]), colour=w.get("colour"), size=None if w.get("size_mm2") is None else str(w["size_mm2"]),
                         source=w.get("source"), destination=w.get("destination")) for w in json.loads(raw)]
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, f"expected_netlist_json is invalid: {exc}")


def create_app(client_factory: Optional[Callable[[], ExtractionClient]] = None) -> FastAPI:
    app = FastAPI(title="SPANQC core", version=__version__)
    make_client = client_factory or (lambda: AnthropicClient())

    @app.get("/health")
    def health():
        return {"status": "ok", "version": __version__}

    @app.post("/api/v1/analyze")
    async def analyze(file: UploadFile = File(...), standard: str = Form("SPANQC Tech Pub (Hyundai VDH)"),
                      expected_netlist_json: Optional[str] = Form(None), specification_is_complete: bool = Form(False),
                      extraction_is_verified: bool = Form(False), scope_description: Optional[str] = Form(None),
                      prompt_version: str = Form("extract_v1")):
        data = await file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "File too large.")
        expected = _parse_expected(expected_netlist_json)
        pages = _pages(data, file.filename or "document")
        try:
            client = make_client()
        except RuntimeError as exc:
            raise HTTPException(503, str(exc))  # fail closed: never fabricate a result

        observations: List[Observation] = []
        uncertain: List[dict] = []
        failed: List[int] = []
        errors: List[str] = []
        version = prompt_version
        for n, (img, mt) in enumerate(pages, start=1):
            res = extract_sheet(client, img, mt, page=n, prompt_version=prompt_version)
            version = res.prompt_version
            if res.ok:
                observations += res.observations
                uncertain += [{**u, "page": n} for u in res.uncertain]
            else:
                failed.append(n)
                errors.append(f"page {n}: {res.error}")

        processed = len(pages) - len(failed)
        overall, findings = evaluate(observations, expected, specification_is_complete=specification_is_complete,
                                     total_pages=len(pages), processed_pages=processed, failed_pages=failed)
        index = ComponentIndex()
        return {
            "report_id": f"RPT-{uuid.uuid4().hex[:10].upper()}",
            "document_name": file.filename or "document",
            "sha256_hash": hashlib.sha256(data).hexdigest(),
            "standard": standard,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "model_used": getattr(client, "model", "unknown"),
            "prompt_version": version,
            "overall_outcome": overall,
            "specification_is_complete": specification_is_complete,
            "extraction_is_verified": False,  # only a human reviewer can set this
            "trusted_verification": None,
            "scope_description": scope_description,
            "rule_findings": findings,
            "candidate_observations": [
                {**o.__dict__, "destination_class": classify_destination(o.destination, index).value} for o in observations],
            "flagged_gaps": uncertain,
            "page_errors": errors,
            "pages_rendered": [],
            "total_page_count": len(pages),
            "processed_page_count": processed,
            "failed_page_count": len(failed),
            "unprocessed_page_numbers": [],
            "failed_page_numbers": failed,
            "disclaimer": "Machine result only: candidate AI transcription checked by deterministic rules. A human reviewer must sign off.",
        }

    return app


app = create_app()

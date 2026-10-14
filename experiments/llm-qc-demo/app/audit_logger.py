import logging
import os
import time
from typing import List, Optional

logger = logging.getLogger("spanqc.audit")

class SafeAuditLogger:
    """
    Lightweight, privacy-preserving diagnostic audit logger.
    Strictly avoids recording raw document bytes, base64 images, or sensitive tokens.
    Records only operational metadata: report ID, SHA-256 digest, page counts, durations, and outcomes.
    """

    @staticmethod
    def log_analysis_event(
        report_id: str,
        document_name: str,
        sha256_hash: str,
        total_pages: int,
        processed_pages: int,
        failed_pages: List[int],
        unprocessed_pages: List[int],
        model_used: str,
        duration_ms: float,
        overall_outcome: str,
        findings_count: int,
    ) -> dict:
        event = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "report_id": report_id,
            "document_name": os.path.basename(document_name),
            "sha256_hash": sha256_hash,
            "total_pages": total_pages,
            "processed_pages": processed_pages,
            "failed_pages": failed_pages,
            "unprocessed_pages": unprocessed_pages,
            "model_used": model_used,
            "duration_ms": round(duration_ms, 2),
            "overall_outcome": overall_outcome,
            "findings_count": findings_count,
        }
        logger.info("QC_ANALYSIS_COMPLETED: %s", event)
        return event

audit_logger = SafeAuditLogger()

import hmac
import logging
from typing import Optional
from fastapi import HTTPException, Request
from .config import settings

logger = logging.getLogger("spanqc.auth")

def verify_internal_auth(request: Request) -> bool:
    """
    Enforces service-to-service authentication for internal analysis endpoints.
    Accepts:
      - Authorization: Bearer <token>
      - X-SpanQC-Internal-Key: <token>
    
    Security controls:
      - Fails closed with HTTP 503 if internal secret is missing or fails length policy.
      - Fails closed with HTTP 401 if credentials are missing or invalid.
      - Uses hmac.compare_digest for constant-time comparison to prevent timing attacks.
      - Strictly avoids logging or reflecting supplied credentials in logs or responses.
    """
    # 1. Enforce server configuration policy
    if not settings.is_secret_valid():
        logger.error("[AUTH_CONFIG_ERROR] Internal service secret is not configured or fails minimum length policy.")
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "AUTH_CONFIG_ERROR",
                "message": "Service authentication configuration error: internal service secret is missing or too weak.",
            },
        )

    # 2. Extract credential from Authorization or X-SpanQC-Internal-Key header
    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif not token:
        custom_header = request.headers.get("X-SpanQC-Internal-Key")
        if custom_header:
            token = custom_header.strip()

    if not token:
        logger.warning("[AUTH_UNAUTHORIZED] Request rejected: missing internal service credentials.")
        raise HTTPException(
            status_code=401,
            detail={
                "error_type": "UNAUTHORIZED",
                "message": "Missing required internal service credentials.",
            },
        )

    expected = settings.internal_service_secret.encode("utf-8")
    actual = token.encode("utf-8")

    # 3. Constant-time comparison
    if not hmac.compare_digest(actual, expected):
        logger.warning("[AUTH_INVALID] Request rejected: invalid internal service credentials.")
        raise HTTPException(
            status_code=401,
            detail={
                "error_type": "UNAUTHORIZED",
                "message": "Invalid internal service credentials.",
            },
        )

    return True

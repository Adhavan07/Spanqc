import base64
import hashlib
import io
import os
from typing import List, Optional, Tuple
from fastapi import UploadFile
from PIL import Image
import pymupdf

DEFAULT_MAX_PAGES = int(os.getenv("MAX_PAGES_TO_PROCESS", "10"))
CHUNK_SIZE = 64 * 1024  # 64 KB

class DocumentValidationError(Exception):
    pass

async def read_bounded_upload(
    file: UploadFile,
    max_bytes: int,
    chunk_size: int = CHUNK_SIZE,
) -> bytes:
    """
    Reads an UploadFile asynchronously in streaming chunks up to max_bytes.

    If the uploaded payload exceeds max_bytes, reading halts immediately
    without buffering the remainder of the payload into memory, closes
    the underlying file descriptor/spool, and raises DocumentValidationError.

    Guarantees reliable upload cleanup on error and normal completion.
    Note: Upstream reverse proxy (e.g. Nginx client_max_body_size) must still
    enforce body limits in staging (Phase 3.4) to protect web server worker socket buffers.
    """
    buffer = bytearray()
    total_bytes = 0

    try:
        while True:
            remaining_to_read = min(chunk_size, (max_bytes + 1) - total_bytes)
            if remaining_to_read <= 0:
                raise DocumentValidationError(
                    f"File size exceeds maximum limit of {max_bytes} bytes."
                )

            chunk = await file.read(remaining_to_read)
            if not chunk:
                break

            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                raise DocumentValidationError(
                    f"File size exceeds maximum limit of {max_bytes} bytes."
                )

            buffer.extend(chunk)

        if total_bytes == 0:
            raise DocumentValidationError("Document is empty (0 bytes).")

        return bytes(buffer)
    finally:
        try:
            await file.close()
        except Exception:
            pass

class ProcessedDocument(tuple):
    """
    Backwards-compatible tuple (sha256_hash, detected_format, page_images)
    that also exposes total_pages and unprocessed_pages metadata.
    """
    def __new__(cls, sha256_hash: str, detected_format: str, page_images: List[bytes], total_pages: int = 1, unprocessed_pages: Optional[List[int]] = None):
        return super().__new__(cls, (sha256_hash, detected_format, page_images))

    def __init__(self, sha256_hash: str, detected_format: str, page_images: List[bytes], total_pages: int = 1, unprocessed_pages: Optional[List[int]] = None):
        self.sha256_hash = sha256_hash
        self.detected_format = detected_format
        self.page_images = page_images
        self.total_pages = total_pages
        self.unprocessed_pages = unprocessed_pages or []

class DocumentProcessor:
    """
    Ingests and validates wiring diagram documents (PDF, PNG, JPEG),
    validates magic bytes, computes cryptographic SHA-256 hashes,
    and rasterizes document pages into high-DPI imagery for vision inference.
    """

    MAGIC_SIGNATURES = {
        "pdf": b"%PDF-",
        "png": b"\x89PNG\r\n\x1a\n",
        "jpeg": b"\xff\xd8\xff",
    }

    def __init__(self, max_file_size_bytes: int = 50 * 1024 * 1024, render_dpi: int = 150, max_pages: Optional[int] = None):
        self.max_file_size_bytes = max_file_size_bytes
        self.render_dpi = render_dpi
        self.max_pages = max_pages if max_pages is not None else DEFAULT_MAX_PAGES

    def compute_sha256(self, content: bytes) -> str:
        """Compute authoritative SHA-256 digest of original input bytes."""
        hasher = hashlib.sha256()
        hasher.update(content)
        return hasher.hexdigest()

    def detect_and_validate_format(self, content: bytes, filename: str) -> str:
        """
        Validates content size and magic byte signatures.
        Ensures file content matches expected format regardless of extension.
        """
        if not content or len(content) == 0:
            raise DocumentValidationError("Document is empty (0 bytes).")

        if len(content) > self.max_file_size_bytes:
            raise DocumentValidationError(
                f"File size ({len(content)} bytes) exceeds maximum limit of {self.max_file_size_bytes} bytes."
            )

        # Check PDF signature
        if content.startswith(self.MAGIC_SIGNATURES["pdf"]):
            return "pdf"

        # Check PNG signature
        if content.startswith(self.MAGIC_SIGNATURES["png"]):
            try:
                img = Image.open(io.BytesIO(content))
                img.verify()
                return "png"
            except Exception as e:
                raise DocumentValidationError(f"Corrupted PNG image content: {e}")

        # Check JPEG signature
        if content.startswith(self.MAGIC_SIGNATURES["jpeg"]):
            try:
                img = Image.open(io.BytesIO(content))
                img.verify()
                return "jpeg"
            except Exception as e:
                raise DocumentValidationError(f"Corrupted JPEG image content: {e}")

        raise DocumentValidationError(
            f"Unsupported or invalid file format for '{filename}'. Allowed formats: PDF, PNG, JPEG with valid magic headers."
        )

    def process_document(self, content: bytes, filename: str) -> ProcessedDocument:
        """
        Validates document, calculates SHA-256, and renders pages into PNG images.
        Returns:
            ProcessedDocument: tuple of (sha256_hash, detected_format, page_images)
            with attributes total_pages and unprocessed_pages.
        """
        detected_format = self.detect_and_validate_format(content, filename)
        sha256_hash = self.compute_sha256(content)

        page_images: List[bytes] = []
        total_pages = 1
        unprocessed_pages: List[int] = []

        if detected_format == "pdf":
            try:
                doc = pymupdf.open(stream=content, filetype="pdf")
                total_pages = len(doc)
                if total_pages == 0:
                    raise DocumentValidationError("PDF contains 0 pages.")

                pages_to_render = min(total_pages, self.max_pages)
                if total_pages > self.max_pages:
                    unprocessed_pages = list(range(self.max_pages + 1, total_pages + 1))

                for page_idx in range(pages_to_render):
                    page = doc.load_page(page_idx)
                    # Render page at configurable DPI
                    pix = page.get_pixmap(dpi=self.render_dpi)
                    png_bytes = pix.tobytes("png")
                    page_images.append(png_bytes)

                doc.close()
            except DocumentValidationError:
                raise
            except Exception as e:
                raise DocumentValidationError(f"Failed to rasterize PDF: {str(e)}")

        elif detected_format in ("png", "jpeg"):
            # Ensure image is valid, normalize to PNG byte stream
            try:
                img = Image.open(io.BytesIO(content))
                if img.mode != "RGB":
                    img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                page_images.append(buf.getvalue())
                total_pages = 1
            except Exception as e:
                raise DocumentValidationError(f"Failed to process image: {str(e)}")

        return ProcessedDocument(
            sha256_hash=sha256_hash,
            detected_format=detected_format,
            page_images=page_images,
            total_pages=total_pages,
            unprocessed_pages=unprocessed_pages,
        )

    @staticmethod
    def bytes_to_base64_data_url(image_bytes: bytes, mime_type: str = "image/png") -> str:
        """Convert raw image bytes to browser-renderable base64 Data URL."""
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        return f"data:{mime_type};base64,{b64}"

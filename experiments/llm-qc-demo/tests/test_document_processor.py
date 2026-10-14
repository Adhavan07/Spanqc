import hashlib
import os
import pytest
from app.document_processor import DocumentProcessor, DocumentValidationError

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures")

def test_document_processor_sha256():
    processor = DocumentProcessor()
    content = b"TEST WIRING DIAGRAM CONTENT"
    digest = processor.compute_sha256(content)
    assert len(digest) == 64
    assert digest == hashlib.sha256(content).hexdigest()

def test_reject_empty_file():
    processor = DocumentProcessor()
    with pytest.raises(DocumentValidationError, match="empty"):
        processor.detect_and_validate_format(b"", "empty.pdf")

def test_reject_oversized_file():
    processor = DocumentProcessor(max_file_size_bytes=100)
    oversized = b"X" * 101
    with pytest.raises(DocumentValidationError, match="exceeds maximum limit"):
        processor.detect_and_validate_format(oversized, "huge.pdf")

def test_reject_fake_extension_content():
    processor = DocumentProcessor()
    fake_pdf = b"THIS IS NOT A REAL PDF FILE"
    with pytest.raises(DocumentValidationError, match="Unsupported or invalid file format"):
        processor.detect_and_validate_format(fake_pdf, "fake.pdf")

def test_process_valid_pdf_rasterization():
    processor = DocumentProcessor(render_dpi=100, max_pages=2)
    pdf_path = os.path.join(FIXTURES_DIR, "synthetic_sample_schematic.pdf")
    assert os.path.exists(pdf_path), "Synthetic PDF fixture must exist"

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    sha256_hash, detected_format, page_images = processor.process_document(pdf_bytes, "sample.pdf")

    assert detected_format == "pdf"
    assert len(sha256_hash) == 64
    assert len(page_images) == 1
    # Check PNG magic bytes of rendered page
    assert page_images[0].startswith(b"\x89PNG\r\n\x1a\n")

def test_process_png_image():
    processor = DocumentProcessor()
    png_path = os.path.join(FIXTURES_DIR, "synthetic_pass_schematic.png")
    assert os.path.exists(png_path), "Synthetic PNG fixture must exist"

    with open(png_path, "rb") as f:
        png_bytes = f.read()

    sha256_hash, detected_format, page_images = processor.process_document(png_bytes, "pass.png")

    assert detected_format == "png"
    assert len(sha256_hash) == 64
    assert len(page_images) == 1
    assert page_images[0].startswith(b"\x89PNG\r\n\x1a\n")

def test_base64_data_url_encoding():
    processor = DocumentProcessor()
    dummy_png = b"\x89PNG\r\n\x1a\nTESTDATA"
    data_url = processor.bytes_to_base64_data_url(dummy_png, "image/png")
    assert data_url.startswith("data:image/png;base64,")

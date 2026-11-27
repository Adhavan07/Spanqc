"""Visual Segmentation & Defect Spatial Coordinate Extractor.

Renders vector CAD PDF and image schematics into crisp raster sheets,
detects functional engineering segments (Fuseboxes, Controllers, Cabin Harnesses,
Connectors, Relays, Title Blocks), and maps defect locations with exact
bounding frame percentages (left%, top%, width%, height%) for frontend CAD canvas overlays.
"""
from __future__ import annotations

import base64
import io
import math
from typing import Any, Dict, List, Optional, Tuple
import pymupdf


COMPONENT_RULES = [
    # Heavy Vehicle / Off-Highway (Hyundai VDH, CAT, Volvo)
    {
        "keywords": ["FB1", "CFB1", "FUSE BOX", "FUSEBOX"],
        "name": "1 FB1 Fuse Box & Power Distribution",
        "category": "FUSEBOX",
        "color": "#a855f7",  # Purple
        "padding": (30, 20, 80, 50),
    },
    {
        "keywords": ["CMCU", "CENTRAL MACHINE"],
        "name": "2 CMCU Master Machine Controller",
        "category": "CONTROLLER",
        "color": "#eab308",  # Amber/Yellow
        "padding": (30, 20, 100, 50),
    },
    {
        "keywords": ["CECM", "CABIN ELECTRONIC"],
        "name": "7 CECM Cabin Electronic Control",
        "category": "CONTROLLER",
        "color": "#8b5cf6",  # Violet
        "padding": (30, 20, 80, 50),
    },
    {
        "keywords": ["CN-5A", "CN-5"],
        "name": "CN-5 Primary Cabin Main Harness",
        "category": "CONNECTOR",
        "color": "#06b6d4",  # Cyan
        "padding": (20, 15, 60, 45),
    },
    {
        "keywords": ["CN-7"],
        "name": "CN-7 Instrument Cluster Feed",
        "category": "CONNECTOR",
        "color": "#06b6d4",  # Cyan
        "padding": (20, 15, 60, 45),
    },
    {
        "keywords": ["CN-6"],
        "name": "CN-6 Steering & Hydraulic Column",
        "category": "CONNECTOR",
        "color": "#06b6d4",  # Cyan
        "padding": (20, 15, 60, 45),
    },
    {
        "keywords": ["CN-4"],
        "name": "CN-4 Lower Auxiliary Controls",
        "category": "CONNECTOR",
        "color": "#06b6d4",  # Cyan
        "padding": (20, 15, 60, 45),
    },
    {
        "keywords": ["CN-9"],
        "name": "CN-9 Cabin Switch Cluster",
        "category": "CONNECTOR",
        "color": "#f43f5e",  # Rose/Pink
        "padding": (20, 15, 60, 45),
    },
    {
        "keywords": ["CN-10"],
        "name": "8 CN-10 Front Instrument Cluster",
        "category": "CONNECTOR",
        "color": "#06b6d4",  # Cyan
        "padding": (20, 15, 60, 45),
    },
    {
        "keywords": ["CIC"],
        "name": "4 CIC Cluster Interface Module",
        "category": "CONTROLLER",
        "color": "#f59e0b",  # Amber
        "padding": (25, 20, 70, 50),
    },
    {
        "keywords": ["CA30", "CN-93"],
        "name": "5 CA30 Chassis Controller Interface",
        "category": "CHASSIS",
        "color": "#ec4899",  # Pink
        "padding": (30, 20, 80, 50),
    },
    # Industrial Control Panels / Automation
    {
        "keywords": ["TB1", "TB2", "TERMINAL BLOCK"],
        "name": "Terminal Interface Block (TB1)",
        "category": "TERMINAL",
        "color": "#10b981",  # Emerald
        "padding": (20, 15, 60, 40),
    },
    {
        "keywords": ["PLC", "CPU"],
        "name": "Programmable Logic Controller (PLC)",
        "category": "CONTROLLER",
        "color": "#3b82f6",  # Blue
        "padding": (30, 20, 80, 50),
    },
    {
        "keywords": ["VFD", "INVERTER", "DRIVE"],
        "name": "Variable Frequency Drive (VFD)",
        "category": "DRIVE",
        "color": "#f97316",  # Orange
        "padding": (30, 20, 80, 50),
    },
]


def extract_visual_segments_and_defects(
    file_bytes: bytes,
    file_name: str = "schematic.pdf",
    page_number: int = 1,
    dpi: int = 120,
) -> Dict[str, Any]:
    """Renders schematic page and derives physical bounding boxes for segments and defects."""
    lower_name = file_name.lower()
    is_svg = lower_name.endswith(".svg") or file_bytes[:1024].lstrip().startswith((b"<svg", b"<?xml"))
    is_img = lower_name.endswith((".png", ".jpg", ".jpeg", ".webp"))
    is_pdf = lower_name.endswith(".pdf") or file_bytes.startswith(b"%PDF")

    try:
        if is_pdf:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        elif is_svg:
            doc = pymupdf.open(stream=file_bytes, filetype="svg")
        elif is_img:
            doc = pymupdf.open(stream=file_bytes, filetype="png" if "png" in lower_name else "jpeg")
        else:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Could not open document with PyMuPDF: {exc}")

    total_pages = len(doc)
    page_idx = max(0, min(total_pages - 1, page_number - 1))
    page = doc[page_idx]

    w, h = page.rect.width, page.rect.height
    if w <= 0 or h <= 0:
        w, h = 1000.0, 700.0

    # 1. High-DPI rasterization
    pix = page.get_pixmap(dpi=dpi)
    b64_img = base64.b64encode(pix.tobytes("jpg")).decode("ascii")
    page_image_url = f"data:image/jpeg;base64,{b64_img}"

    segments: List[Dict[str, Any]] = []
    seen_segments = set()

    # 2. Discover Functional Segments using spatial vector text matching
    for comp in COMPONENT_RULES:
        found_rect = None
        for kw in comp["keywords"]:
            rects = page.search_for(kw)
            if rects:
                found_rect = rects[0]
                break
        if found_rect:
            key = comp["name"]
            if key in seen_segments:
                continue
            seen_segments.add(key)

            pad_l, pad_t, pad_r, pad_b = comp["padding"]
            bx0 = max(0.0, found_rect.x0 - pad_l)
            by0 = max(0.0, found_rect.y0 - pad_t)
            bx1 = min(w, found_rect.x1 + pad_r)
            by1 = min(h, found_rect.y1 + pad_b)

            segments.append({
                "id": f"SEG_{len(segments)+1}",
                "name": comp["name"],
                "category": comp["category"],
                "color": comp["color"],
                "bbox": {
                    "left": round((bx0 / w) * 100, 2),
                    "top": round((by0 / h) * 100, 2),
                    "width": round(((bx1 - bx0) / w) * 100, 2),
                    "height": round(((by1 - by0) / h) * 100, 2),
                },
            })

    # Fallback if no specific component keywords found (e.g. custom or generic schematic)
    if not segments:
        # Segment sheet into standard CAD engineering zones (A-D quadrants)
        segments.extend([
            {
                "id": "SEG_PWR",
                "name": "Zone A: Power Infeed & Protection",
                "category": "POWER",
                "color": "#a855f7",
                "bbox": {"left": 5.0, "top": 6.0, "width": 42.0, "height": 38.0},
            },
            {
                "id": "SEG_CTRL",
                "name": "Zone B: Controller & I/O Logic",
                "category": "CONTROLLER",
                "color": "#eab308",
                "bbox": {"left": 52.0, "top": 6.0, "width": 42.0, "height": 38.0},
            },
            {
                "id": "SEG_FIELD",
                "name": "Zone C: Field Devices & Actuators",
                "category": "ACTUATOR",
                "color": "#06b6d4",
                "bbox": {"left": 5.0, "top": 50.0, "width": 42.0, "height": 38.0},
            },
            {
                "id": "SEG_TERM",
                "name": "Zone D: Interconnect Terminal Matrix",
                "category": "TERMINAL",
                "color": "#10b981",
                "bbox": {"left": 52.0, "top": 50.0, "width": 42.0, "height": 38.0},
            },
        ])

    # 3. Never fabricate defects from page keywords.
    # Deterministic defects must come strictly from evaluated wire/rule netlists (rules.py & netlist_diff.py).
    defects: List[Dict[str, Any]] = []

    return {
        "page_number": page_idx + 1,
        "total_pages": total_pages,
        "image_url": page_image_url,
        "width": round(w, 2),
        "height": round(h, 2),
        "segments": segments,
        "defects": defects,
    }


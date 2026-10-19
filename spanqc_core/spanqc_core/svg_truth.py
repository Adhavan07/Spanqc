"""Read the Tech Pub output SVGs. Their <text> nodes are the machine-readable ground truth of what
each sheet's JPG shows, so they double as a golden set for scoring the AI reader."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import List

from .wirecodes import WireLabel, norm_terminal

_COMPONENT_RE = re.compile(r"^C[A-Z]{1,3}\d{0,3}[a-z]?$")
_RAIL_RE = re.compile(r"^KL\d+[A-Z]?$")
_XREF_RE = re.compile(r"^(?P<comp>C[A-Z]{1,3}\d{0,3}[a-z]?):(?P<conn>[A-Z]{1,3}-?\d+[A-Za-z]?)\((?P<pin>[^)]+)\)$")


@dataclass(frozen=True)
class TextItem:
    text: str
    font_px: float | None


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def svg_texts(path: str | Path) -> List[TextItem]:
    root = ET.parse(str(path)).getroot()
    items: List[TextItem] = []
    for el in root.iter():
        if _local(el.tag) != "text":
            continue
        text = "".join("".join(t.itertext()) for t in el if _local(t.tag) == "tspan").strip()
        if not text:
            continue
        fs = el.attrib.get("font-size", "")
        m = re.match(r"([\d.]+)", fs)
        items.append(TextItem(text, float(m.group(1)) if m else None))
    return items


def truth_labels(path: str | Path) -> List[WireLabel]:
    """All wire labels printed on the sheet (one entry per printed occurrence)."""
    return [lab for it in svg_texts(path) if (lab := WireLabel.parse(it.text))]


def component_codes(texts: List[TextItem]) -> set[str]:
    codes = set()
    for it in texts:
        if _COMPONENT_RE.match(it.text):
            codes.add(it.text)
        elif (m := _XREF_RE.match(it.text)):
            codes.add(m.group("comp"))
    return codes


def rail_labels(texts: List[TextItem]) -> set[str]:
    return {it.text for it in texts if _RAIL_RE.match(it.text)}


def cross_references(texts: List[TextItem]) -> List[str]:
    return [it.text for it in texts if _XREF_RE.match(it.text)]


_LABEL_LIKE = re.compile(r"^[A-Z]?\d{1,4}[A-Z]?\s+[A-Z/]{2,6}(?:\s+\d+(?:\.\d+)?)?$")
_NOT_WIRE = re.compile(r"^[A-Z]?\d{1,4}[A-Z]?\s+(CN|CA|CB|CC|CS|CD|CR|CL|KL)")


def malformed_labels(path: str | Path) -> List[str]:
    """Printed texts that look like wire labels but are not valid (e.g. '81K BKWH 1.0': missing slash).
    These are candidate drawing defects. An extractor must transcribe them AS PRINTED, never repair them."""
    return [it.text for it in svg_texts(path)
            if _LABEL_LIKE.match(it.text) and WireLabel.parse(it.text) is None and not _NOT_WIRE.match(it.text)]


def anomaly_key(text: str) -> str:
    return norm_terminal(text)

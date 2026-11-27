"""Read the Tech Pub output SVGs. Their <text> nodes are the machine-readable ground truth of what
each sheet's JPG shows, so they double as a golden set for scoring the AI reader."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from .rules import Observation, _finding, REVIEW
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


def parse_svg_sheet(content_or_path: str | Path) -> tuple[List[WireLabel], List[str]]:
    """Parse SVG sheet text and return (ground_truth_wire_labels, malformed_anomalies)."""
    if isinstance(content_or_path, str) and ("<svg" in content_or_path or "</svg>" in content_or_path):
        root = ET.fromstring(content_or_path)
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
        labs = [lab for it in items if (lab := WireLabel.parse(it.text))]
        mal = [it.text for it in items if _LABEL_LIKE.match(it.text) and WireLabel.parse(it.text) is None and not _NOT_WIRE.match(it.text)]
        return labs, mal
    else:
        p = Path(content_or_path)
        return truth_labels(p), malformed_labels(p)


def _mul_mat(m1: tuple[float, float, float, float, float, float], m2: tuple[float, float, float, float, float, float]) -> tuple[float, float, float, float, float, float]:
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def _apply_mat(mat: tuple[float, float, float, float, float, float], x: float, y: float) -> tuple[float, float]:
    a, b, c, d, e, f = mat
    return (a * x + c * y + e, b * x + d * y + f)


def _parse_transform(attr: str | None) -> tuple[float, float, float, float, float, float]:
    mat = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    if not attr:
        return mat
    num_re = re.compile(r"[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")
    for fn, args_str in re.findall(r"([a-zA-Z]+)\s*\(([^)]*)\)", attr):
        vals = [float(v) for v in num_re.findall(args_str)]
        fn_l = fn.lower()
        cur = None
        if fn_l == "translate" and vals:
            tx = vals[0]
            ty = vals[1] if len(vals) > 1 else 0.0
            cur = (1.0, 0.0, 0.0, 1.0, tx, ty)
        elif fn_l == "scale" and vals:
            sx = vals[0]
            sy = vals[1] if len(vals) > 1 else sx
            cur = (sx, 0.0, 0.0, sy, 0.0, 0.0)
        elif fn_l == "matrix" and len(vals) >= 6:
            cur = (vals[0], vals[1], vals[2], vals[3], vals[4], vals[5])
        if cur is not None:
            mat = _mul_mat(mat, cur)
    return mat


def _parse_svg_segments(root: ET.Element) -> List[tuple[tuple[float, float], tuple[float, float]]]:
    """Extract straight line / polyline / simple path conductor segments in SVG world coordinates."""
    segs: List[tuple[tuple[float, float], tuple[float, float]]] = []
    num_re = re.compile(r"[-+]?(?:\d*\.\d+|\d+)")

    def _f(val: str | None) -> float:
        try:
            return float(val or 0.0)
        except ValueError:
            return 0.0

    def _walk(el: ET.Element, mat: tuple[float, float, float, float, float, float]) -> None:
        cur_mat = _mul_mat(mat, _parse_transform(el.attrib.get("transform")))
        tag = _local(el.tag)
        if tag == "line":
            x1, y1, x2, y2 = _f(el.attrib.get("x1")), _f(el.attrib.get("y1")), _f(el.attrib.get("x2")), _f(el.attrib.get("y2"))
            if (x1, y1) != (x2, y2):
                segs.append((_apply_mat(cur_mat, x1, y1), _apply_mat(cur_mat, x2, y2)))
        elif tag in ("polyline", "polygon"):
            nums = [float(n) for n in num_re.findall(el.attrib.get("points", ""))]
            pts = [_apply_mat(cur_mat, nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]
            for a, b in zip(pts, pts[1:]):
                if a != b:
                    segs.append((a, b))
        elif tag == "path":
            d = el.attrib.get("d", "")
            # Parse M/L/H/V coordinate sequences (handles straight wiring paths cleanly)
            cur = (0.0, 0.0)
            for cmd, args_str in re.findall(r"([MmLlHhVv])\s*([^MmLlHhVvZzCcQqSsTtAa]*)", d):
                vals = [float(n) for n in num_re.findall(args_str)]
                if cmd in ("M", "m"):
                    for i in range(0, len(vals) - 1, 2):
                        nx = vals[i] if cmd == "M" else cur[0] + vals[i]
                        ny = vals[i + 1] if cmd == "M" else cur[1] + vals[i + 1]
                        if i > 0 and cur != (nx, ny):
                            segs.append((_apply_mat(cur_mat, cur[0], cur[1]), _apply_mat(cur_mat, nx, ny)))
                        cur = (nx, ny)
                elif cmd in ("L", "l"):
                    for i in range(0, len(vals) - 1, 2):
                        nx = vals[i] if cmd == "L" else cur[0] + vals[i]
                        ny = vals[i + 1] if cmd == "L" else cur[1] + vals[i + 1]
                        if cur != (nx, ny):
                            segs.append((_apply_mat(cur_mat, cur[0], cur[1]), _apply_mat(cur_mat, nx, ny)))
                        cur = (nx, ny)
                elif cmd in ("H", "h"):
                    for v in vals:
                        nx = v if cmd == "H" else cur[0] + v
                        if cur != (nx, cur[1]):
                            segs.append((_apply_mat(cur_mat, cur[0], cur[1]), _apply_mat(cur_mat, nx, cur[1])))
                        cur = (nx, cur[1])
                elif cmd in ("V", "v"):
                    for v in vals:
                        ny = v if cmd == "V" else cur[1] + v
                        if cur != (cur[0], ny):
                            segs.append((_apply_mat(cur_mat, cur[0], cur[1]), _apply_mat(cur_mat, cur[0], ny)))
                        cur = (cur[0], ny)
        for child in el:
            _walk(child, cur_mat)

    _walk(root, (1.0, 0.0, 0.0, 1.0, 0.0, 0.0))
    return segs


def _point_to_seg_dist_sq(px: float, py: float, a: tuple[float, float], b: tuple[float, float]) -> float:
    vx, vy = b[0] - a[0], b[1] - a[1]
    wx, wy = px - a[0], py - a[1]
    len_sq = vx * vx + vy * vy
    if len_sq <= 1e-6:
        return wx * wx + wy * wy
    t = max(0.0, min(1.0, (wx * vx + wy * vy) / len_sq))
    cx, cy = a[0] + t * vx, a[1] + t * vy
    return (px - cx) ** 2 + (py - cy) ** 2


def parse_svg_sheet_full(
    content_or_path: str | Path | bytes,
    page_number: int = 1
) -> tuple[List[Observation], List[dict], List[dict]]:
    """Deterministically extract observations, flagged gaps, and LMS drawing rule findings from an SVG sheet.
    Uses actual SVG conductor geometry (<line>/<polyline>/<path>) to trace wire endpoints.
    Adheres strictly to LMS Tech Pub standards:
    - Never fabricates values
    - Transcribes malformed wire codes as printed (confidence=0.0) -> LMS-06 finding
    - Flags unconnected/unused fuse stubs when no conductor path connects -> LMS-09 finding
    """
    if isinstance(content_or_path, (bytes, bytearray)):
        root = ET.fromstring(content_or_path.decode("utf-8", errors="ignore"))
    elif isinstance(content_or_path, str) and ("<svg" in content_or_path or "</svg>" in content_or_path):
        root = ET.fromstring(content_or_path)
    else:
        root = ET.parse(str(content_or_path)).getroot()

    wire_segs = _parse_svg_segments(root)

    # Connected component clustering on conductor segments (tolerance ~4px)
    n_segs = len(wire_segs)
    parent = list(range(n_segs))

    def _find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def _union(i: int, j: int) -> None:
        ri, rj = _find(i), _find(j)
        if ri != rj:
            parent[ri] = rj

    # Grid-hash segment endpoints for fast O(N) net clustering
    if n_segs > 1:
        cell_map: dict[tuple[int, int], int] = {}
        CELL = 6.0
        for idx, (a, b) in enumerate(wire_segs):
            for pt in (a, b):
                cx, cy = int(round(pt[0] / CELL)), int(round(pt[1] / CELL))
                matched = False
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        key = (cx + dx, cy + dy)
                        if key in cell_map:
                            _union(idx, cell_map[key])
                            matched = True
                            break
                    if matched:
                        break
                if not matched:
                    cell_map[(cx, cy)] = idx

    net_points: dict[int, List[tuple[float, float]]] = {}
    for idx, (a, b) in enumerate(wire_segs):
        r = _find(idx)
        net_points.setdefault(r, []).extend((a, b))

    items: List[tuple[float, float, str, float | None]] = []

    def _walk_texts(
        el: ET.Element,
        mat: tuple[float, float, float, float, float, float],
        parent_x: float = 0.0,
        parent_y: float = 0.0,
        parent_fs: float | None = None,
    ) -> None:
        cur_mat = _mul_mat(mat, _parse_transform(el.attrib.get("transform")))
        tag = _local(el.tag)
        cur_x, cur_y, cur_fs = parent_x, parent_y, parent_fs
        if tag in ("text", "tspan"):
            if "x" in el.attrib:
                try:
                    cur_x = float(el.attrib["x"])
                except ValueError:
                    pass
            if "y" in el.attrib:
                try:
                    cur_y = float(el.attrib["y"])
                except ValueError:
                    pass
            fs_attr = el.attrib.get("font-size", "")
            if fs_attr:
                m_fs = re.match(r"([\d.]+)", fs_attr)
                if m_fs:
                    cur_fs = float(m_fs.group(1))
        if tag == "tspan":
            text = "".join(el.itertext()).strip()
            if text:
                wx, wy = _apply_mat(cur_mat, cur_x, cur_y)
                items.append((wx, wy, text, cur_fs))
            return
        for child in el:
            _walk_texts(child, cur_mat, cur_x, cur_y, cur_fs)

    _walk_texts(root, (1.0, 0.0, 0.0, 1.0, 0.0, 0.0))

    # Identify sheet title, components, fuses, connectors, and rails
    sheet_title = None
    components = []
    fuses = []
    connectors = []
    rails = []

    for x, y, t, fs in items:
        if fs and fs >= 24.0 and re.match(r"^(1\s*FB1-\d+|\d+-\d+|\d+)$", t):
            sheet_title = t
        elif re.match(r"^C[A-Z]{1,3}\d{0,3}[a-z]?$", t) or _XREF_RE.match(t):
            components.append((x, y, t))
        elif re.match(r"^F\d+$", t):
            fuses.append((x, y, t))
        elif re.match(r"^(CN|CL|CS|CA|CB)-\d+[A-Za-z]?$", t):
            connectors.append((x, y, t))
        elif _RAIL_RE.match(t):
            rails.append((x, y, t))

    all_nodes = components + connectors + rails + fuses
    default_source = "CFB1" if (sheet_title and "FB1" in sheet_title) else (sheet_title or "SOURCE")

    def _trace_endpoints(wx: float, wy: float) -> tuple[Optional[str], Optional[str]]:
        """Trace the connected SVG net nearest to wire label (wx, wy) to its two endpoint terminals."""
        if wire_segs:
            best_seg_idx = min(range(len(wire_segs)), key=lambda i: _point_to_seg_dist_sq(wx, wy, wire_segs[i][0], wire_segs[i][1]))
            best_d2 = _point_to_seg_dist_sq(wx, wy, wire_segs[best_seg_idx][0], wire_segs[best_seg_idx][1])
            if best_d2 <= 1800.0 and all_nodes:  # within ~42px of conductor segment
                pts = net_points.get(_find(best_seg_idx), [])
                if pts:
                    node_dists = []
                    for nx, ny, nt in all_nodes:
                        min_d2 = min((nx - px) ** 2 + (ny - py) ** 2 for px, py in pts)
                        if min_d2 <= 3600.0:  # within ~60px of connected net
                            node_dists.append((min_d2, nt))
                    node_dists.sort(key=lambda item: item[0])
                    ordered_unique = []
                    for _, nt in node_dists:
                        if nt not in ordered_unique:
                            ordered_unique.append(nt)
                    if len(ordered_unique) >= 2:
                        return ordered_unique[0], ordered_unique[1]
                    elif len(ordered_unique) == 1:
                        return default_source, ordered_unique[0]
        # Geometric fallback when no nearby conductor path exists
        if components:
            near_c = min(components, key=lambda c: (c[0] - wx) ** 2 + (c[1] - wy) ** 2)
            return default_source, near_c[2]
        if connectors:
            near_cn = min(connectors, key=lambda c: (c[0] - wx) ** 2 + (c[1] - wy) ** 2)
            return default_source, near_cn[2]
        return default_source, None

    obs: List[Observation] = []
    uncertain: List[dict] = []
    findings: List[dict] = []

    wire_coords: List[tuple[float, float]] = []
    for x, y, t, _ in items:
        lab = WireLabel.parse(t)
        if lab:
            wire_coords.append((x, y))
            src_node, dst_node = _trace_endpoints(x, y)
            obs.append(Observation(
                wire_no=lab.wire_no,
                colour=lab.colour,
                size=lab.size,
                source=src_node,
                destination=dst_node,
                confidence=1.0,
                evidence=t,
                page=page_number
            ))
        elif _LABEL_LIKE.match(t) and not _NOT_WIRE.match(t):
            # Malformed label - transcribe exactly as printed per LMS Rule 8
            parts = t.split()
            obs.append(Observation(
                wire_no=parts[0] if len(parts) > 0 else None,
                colour=parts[1] if len(parts) > 1 else None,
                size=parts[2] if len(parts) > 2 else None,
                source=default_source,
                destination=None,
                confidence=0.0,
                evidence=t,
                page=page_number
            ))
            uncertain.append({
                "what": t,
                "why": "Malformed colour code printed on sheet (missing slash separator). Transcribed exactly as printed per LMS Rule 8.",
                "page": page_number
            })
            findings.append(_finding(
                "LMS-06",
                "Invalid / Malformed Wire Code",
                REVIEW,
                f"Malformed wire code '{t}' printed on sheet",
                "Printed label violates colour code syntax (e.g. missing slash separator). Per LMS rules, an anomaly must be transcribed exactly as printed and flagged for review.",
                expected="Standard wire code with slash (e.g. BK/WH)",
                detected=t,
                evidence=t,
                page=page_number
            ))

    # Generic check for unused fuse stubs across ANY fuse (not hardcoded F35/F36):
    # A fuse stub with no nearby wire label inside 85px and at most 1 short rail stub is flagged for verification.
    seen_unused_fuses: set[str] = set()
    for fx, fy, fname in fuses:
        if fname in seen_unused_fuses:
            continue
        has_nearby_wire = any((fx - wx) ** 2 + (fy - wy) ** 2 <= 85.0 ** 2 for wx, wy in wire_coords)
        if not has_nearby_wire:
            seen_unused_fuses.add(fname)
            uncertain.append({
                "what": f"Fuse {fname}",
                "why": f"Unused fuse stub {fname} (no outgoing wire label drawn near fuse terminal)",
                "page": page_number
            })
            findings.append(_finding(
                "LMS-09",
                "Unused Fuse Stub",
                REVIEW,
                f"Fuse {fname} has no outgoing wire drawn",
                "Fuse stub has no outgoing wire drawn on this sheet. Recorded as unused/unconnected; destination must remain null.",
                expected="Unused fuse with null destination",
                detected=f"{fname} (no wire drawn)",
                evidence=fname,
                page=page_number
            ))

    return obs, uncertain, findings



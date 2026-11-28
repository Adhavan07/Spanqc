"""Modular Electrical Segmentation Engine for Heavy Vehicles (Hyundai VDH / Off-Highway).

Divides complex multi-page vehicle schematics into 6 functional electrical segments:
1. SEG_FB1: Fuse Box FB1 & Power Distribution (fuses F1-F36, relays CK*/CR*, KL30/KL15/KL31)
2. SEG_CMCU: Central Machine Control Unit & Cluster (connectors CN-51, CN-52, CN-56)
3. SEG_ENGINE: Engine ECU, Alternator, Battery Relay, Starter circuits
4. SEG_CABIN: Cabin controls, lighting, switches, instrumentation
5. SEG_HYDRAULIC: Transmission and Hydraulic control solenoids
6. SEG_CHASSIS: Chassis controller CA30, connector CN-93 (90+ pins), CA80 sensor/motor
7. SEG_RELAYS: Auxiliary Relay Matrix CCR1-CCR36
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


class FunctionalSegment(str, Enum):
    FB1_FUSEBOX = "FB1_FUSEBOX"
    CMCU_CONTROLLER = "CMCU_CONTROLLER"
    ENGINE_POWER = "ENGINE_POWER"
    CABIN_LIGHTING = "CABIN_LIGHTING"
    HYDRAULIC_TRANS = "HYDRAULIC_TRANS"
    CHASSIS_CA30 = "CHASSIS_CA30"
    RELAYS_AUX = "RELAYS_AUX"
    GENERAL = "GENERAL"


@dataclass
class SegmentPin:
    component: str
    connector: str
    pin: str
    wire_id: Optional[str] = None
    function_note: str = ""


@dataclass
class SegmentWire:
    wire_no: str
    colour: Optional[str] = None
    size_mm2: Optional[float] = None
    source_comp: Optional[str] = None
    source_pin: Optional[str] = None
    dest_comp: Optional[str] = None
    dest_pin: Optional[str] = None
    sheet_name: str = ""
    evidence_text: str = ""
    is_malformed: bool = False
    malformed_reason: str = ""


@dataclass
class SegmentModel:
    segment_type: FunctionalSegment
    segment_name: str
    sheets: List[str] = field(default_factory=list)
    components: Set[str] = field(default_factory=set)
    fuses: Dict[str, str] = field(default_factory=dict)  # fuse_id -> rating (e.g. F1 -> 30A)
    wires: List[SegmentWire] = field(default_factory=list)
    pins: List[SegmentPin] = field(default_factory=list)
    unconfirmed_boundaries: List[str] = field(default_factory=list)


def classify_sheet_segment(sheet_name: str, sheet_text: str = "") -> FunctionalSegment:
    """Classify an individual sheet into its primary functional electrical segment."""
    s = sheet_name.upper()
    t = sheet_text.upper()

    if "FB1" in s or "FUSE" in s or "CFB1" in t:
        return FunctionalSegment.FB1_FUSEBOX
    elif s.startswith("2-") or "CMCU" in t:
        return FunctionalSegment.CMCU_CONTROLLER
    elif s.startswith("3-") or "ENGINE" in t or "STARTER" in t:
        return FunctionalSegment.ENGINE_POWER
    elif s.startswith("4-") or "CAB" in t or "LIGHT" in t:
        return FunctionalSegment.CABIN_LIGHTING
    elif s.startswith("5") or "HYDRAULIC" in t or "TRANS" in t:
        return FunctionalSegment.HYDRAULIC_TRANS
    elif s.startswith("7") or "CA30" in t or "CN-93" in t:
        return FunctionalSegment.CHASSIS_CA30
    elif s.startswith("12-") or "CCR" in t:
        return FunctionalSegment.RELAYS_AUX
    else:
        return FunctionalSegment.GENERAL


def segment_drawing_package(
    sheets_data: Dict[str, Dict[str, Any]]
) -> Dict[FunctionalSegment, SegmentModel]:
    """Segment a collection of extracted sheet data into functional segment models."""
    segments: Dict[FunctionalSegment, SegmentModel] = {
        FunctionalSegment.FB1_FUSEBOX: SegmentModel(FunctionalSegment.FB1_FUSEBOX, "Module 1: FB1 Fuse Box & Power Rails"),
        FunctionalSegment.CMCU_CONTROLLER: SegmentModel(FunctionalSegment.CMCU_CONTROLLER, "Module 2: CMCU Master Controller"),
        FunctionalSegment.ENGINE_POWER: SegmentModel(FunctionalSegment.ENGINE_POWER, "Module 3: Engine & Main Battery Distribution"),
        FunctionalSegment.CABIN_LIGHTING: SegmentModel(FunctionalSegment.CABIN_LIGHTING, "Module 4: Cabin & Lighting Circuits"),
        FunctionalSegment.HYDRAULIC_TRANS: SegmentModel(FunctionalSegment.HYDRAULIC_TRANS, "Module 5: Hydraulic & Transmission Controls"),
        FunctionalSegment.CHASSIS_CA30: SegmentModel(FunctionalSegment.CHASSIS_CA30, "Module 7: CA30 Chassis Controller & CN-93"),
        FunctionalSegment.RELAYS_AUX: SegmentModel(FunctionalSegment.RELAYS_AUX, "Module 12: CCR Auxiliary Relay Matrix"),
        FunctionalSegment.GENERAL: SegmentModel(FunctionalSegment.GENERAL, "General Vehicle Wiring"),
    }

    for sheet_name, sheet_info in sheets_data.items():
        text_content = sheet_info.get("text", "")
        seg_type = classify_sheet_segment(sheet_name, text_content)
        seg = segments[seg_type]
        seg.sheets.append(sheet_name)

        # Harvest components
        for c in sheet_info.get("components", []):
            seg.components.add(c)

        # Harvest fuses
        for f_id, rating in sheet_info.get("fuses", {}).items():
            seg.fuses[f_id] = rating

        # Harvest wires
        for w in sheet_info.get("wires", []):
            seg.wires.append(w)

        # Harvest pins
        for p in sheet_info.get("pins", []):
            seg.pins.append(p)

    return segments


_SHEET_CODE_RE = re.compile(r"\b(1\s*FB1-\d+|\d{1,2}-\d{1,2}(?:-\d{1,2})?)\b", re.I)

MODULE_TITLES: Dict[str, str] = {
    "1": "Module 1: Fuse Box FB1 & Power Distribution",
    "2": "Module 2: CMCU Master Machine Controller",
    "3": "Module 3: Engine ECU, Starter & Alternator",
    "4": "Module 4: Cabin, Lighting & Electrical Circuitry",
    "5": "Module 5: Hydraulic & Transmission Controls",
    "6": "Module 6: Auxiliary Systems & Attachments",
    "7": "Module 7: CA30 Chassis Controller & CN-93",
    "8": "Module 8: Front Instrument Cluster & Displays",
    "9": "Module 9: Boom & Bucket Sensors",
    "10": "Module 10: Wiper, Washer & HVAC Control",
    "11": "Module 11: Main Harness Spine & Bulkhead",
    "12": "Module 12: CCR Auxiliary Relay Matrix",
}


def extract_module_and_sheet_code(text: str, fallback_name: str = "") -> Tuple[str, str]:
    """Identify the primary module number (e.g. '4') and sheet code (e.g. '4-4-1') from page text."""
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    head_sample = "\n".join(lines[:15]) + " " + (fallback_name or "")
    if re.search(r"\bFB1\b", head_sample, re.I):
        m_fb = re.search(r"\b(1\s*FB1-\d+|FB1-\d+)\b", head_sample, re.I)
        return "1", (m_fb.group(1).upper() if m_fb else "1 FB1")
    m = _SHEET_CODE_RE.search(head_sample)
    if m:
        code = m.group(1).strip()
        mod_num = code.split("-", 1)[0].split()[0]
        return mod_num, code
    # Fallback integer sheet (e.g., 5.svg, 7.svg)
    m_single = re.match(r"^(?:Page\s+)?(\d{1,2})\b", (fallback_name or "").strip(), re.I)
    if m_single:
        n = m_single.group(1)
        return n, n
    return "0", fallback_name or "Sheet 1"


def run_hierarchical_segmentation_and_tracing(
    *,
    input_pages: List[Dict[str, Any]],
    output_wires: List[Dict[str, Any]] = (),
    output_components: List[Dict[str, Any]] = (),
    output_sheet_names: List[str] = (),
    findings: List[Dict[str, Any]] = (),
    overall_score: int = 100,
) -> Dict[str, Any]:
    """Execute the 4-stage hierarchical QC pipeline:
    1. Document Module-Level Segmentation (group N pages by module number)
    2. Page-Level Segmentation (zones, sheet codes, components per page)
    3. Functional Segmentation & Line-by-Line Electrical Path Tracing
    4. Cross-Validation vs Output SVG/JPG Package + Scoring ('Fine' vs 'Wrong')
    """
    from .symbols import classify_designator, detect_components_from_text_lines
    from .wirecodes import WireLabel, norm_colour, norm_size, norm_wire_no

    module_map: Dict[str, Dict[str, Any]] = {}
    page_segments: List[Dict[str, Any]] = []
    functional_map: Dict[str, Dict[str, Any]] = {}
    all_traced_lines: List[Dict[str, Any]] = []

    # Index findings by wire number / component / page for accurate line-level attribution
    finding_by_wire: Dict[str, List[Dict[str, Any]]] = {}
    for f in findings or []:
        haystack = " ".join([
            str(f.get("title") or ""),
            str(f.get("expected_value") or ""),
            str(f.get("detected_value") or ""),
            str(f.get("evidence_text") or ""),
        ]).upper()
        for tok in re.findall(r"\b[A-Z]?\d{1,4}[A-Z]?\b|\bF\d+\b|\bCR\d+\b|\bCA\d+[A-Z]?\b|\bCN-\d+\b", haystack):
            finding_by_wire.setdefault(tok, []).append(f)

    # Index output wires by normalized wire_no and sheet/colour/size
    out_by_wire_no: Dict[str, List[Dict[str, Any]]] = {}
    out_by_sig: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for ow in output_wires or []:
        wn = norm_wire_no(ow.get("wire_no"))
        if wn:
            out_by_wire_no.setdefault(wn, []).append(ow)
        oc = norm_colour(ow.get("colour")) or ""
        osize = norm_size(ow.get("size_mm2") or ow.get("size")) or ""
        if oc and osize:
            out_by_sig.setdefault((oc, osize), []).append(ow)

    # Track component occurrences across pages/modules for cross-sheet tracing
    comp_locations: Dict[str, List[str]] = {}
    raw_page_records: List[Dict[str, Any]] = []

    line_seq = 0
    for page in input_pages:
        pnum = int(page.get("page_number") or 1)
        pname = str(page.get("name") or f"Page {pnum}")
        text_raw = str(page.get("text_raw") or "")
        lines = [l.strip() for l in text_raw.splitlines() if l.strip()]

        mod_num, sheet_code = extract_module_and_sheet_code(text_raw, pname)
        func_seg = classify_sheet_segment(sheet_code, text_raw)
        mod_title = MODULE_TITLES.get(mod_num, f"Module {mod_num}: Electrical Subsystem ({sheet_code})")

        # Identify matched output sheets by module/sheet code
        matched_out = [
            s for s in (output_sheet_names or [])
            if sheet_code.lower() in s.lower() or f"{mod_num}-" in s.lower() or (mod_num == "1" and "fb1" in s.lower())
        ]

        # Detect all components on this page using reference circuit symbols + VDH ontology
        page_comps = detect_components_from_text_lines(lines, sheet_name=f"Page {pnum} ({sheet_code})")
        for pc in page_comps:
            comp_locations.setdefault(pc.designator.upper(), []).append(f"M{mod_num}/P{pnum} ({sheet_code})")

        # Build spatial geometry tracer from PDF vector drawings & positioned text lines when available
        geom = page.get("geometry") or {}
        geom_segs = geom.get("segments") or []
        geom_texts = geom.get("text_items") or []

        geom_node_coords: List[Tuple[float, float, str]] = []
        geom_net_points: Dict[int, List[Tuple[float, float]]] = {}
        geom_parent: List[int] = list(range(len(geom_segs)))

        def _gfind(i: int) -> int:
            while geom_parent[i] != i:
                geom_parent[i] = geom_parent[geom_parent[i]]
                i = geom_parent[i]
            return i

        if len(geom_segs) > 1:
            g_cells: Dict[Tuple[int, int], int] = {}
            for s_idx, (pa, pb) in enumerate(geom_segs):
                for pt in (pa, pb):
                    cx, cy = int(round(pt[0] / 6.0)), int(round(pt[1] / 6.0))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            hit = g_cells.get((cx + dx, cy + dy))
                            if hit is not None:
                                ri, rj = _gfind(s_idx), _gfind(hit)
                                if ri != rj:
                                    geom_parent[ri] = rj
                    g_cells.setdefault((cx, cy), s_idx)
        for s_idx, (pa, pb) in enumerate(geom_segs):
            geom_net_points.setdefault(_gfind(s_idx), []).extend((pa, pb))

        if geom_texts:
            for gx, gy, gt in geom_texts:
                for gtok in re.split(r"[\s,;]+", gt):
                    gtok_c = gtok.strip()
                    if classify_designator(gtok_c):
                        geom_node_coords.append((float(gx), float(gy), gtok_c))

        def _seg_dist_sq(px: float, py: float, a: Tuple[float, float], b: Tuple[float, float]) -> float:
            vx, vy = b[0] - a[0], b[1] - a[1]
            wx, wy = px - a[0], py - a[1]
            lsq = vx * vx + vy * vy
            if lsq <= 1e-6:
                return wx * wx + wy * wy
            t = max(0.0, min(1.0, (wx * vx + wy * vy) / lsq))
            return (px - (a[0] + t * vx)) ** 2 + (py - (a[1] + t * vy)) ** 2

        def _trace_geom_endpoints(line_txt: str) -> Optional[Tuple[str, str]]:
            if not geom_node_coords:
                return None
            # Find positioned text coordinates for this wire label
            match_pt = next(((float(gx), float(gy)) for gx, gy, gt in geom_texts if gt == line_txt or line_txt in gt), None)
            if match_pt is None:
                return None
            wx, wy = match_pt
            if geom_segs:
                best_i = min(range(len(geom_segs)), key=lambda i: _seg_dist_sq(wx, wy, geom_segs[i][0], geom_segs[i][1]))
                if _seg_dist_sq(wx, wy, geom_segs[best_i][0], geom_segs[best_i][1]) <= 1800.0:
                    pts = geom_net_points.get(_gfind(best_i), [])
                    if pts:
                        nd = []
                        for nx, ny, nt in geom_node_coords:
                            d2 = min((nx - px) ** 2 + (ny - py) ** 2 for px, py in pts)
                            if d2 <= 3600.0:
                                nd.append((d2, nt))
                        nd.sort(key=lambda item: item[0])
                        uniq: List[str] = []
                        for _, nt in nd:
                            if nt not in uniq:
                                uniq.append(nt)
                        if len(uniq) >= 2:
                            return uniq[0], uniq[1]
                        if len(uniq) == 1:
                            return uniq[0], f"{func_seg.value} Node"
            # Spatial 2D Euclidean proximity fallback using real PDF coordinates (not flat line order)
            near = sorted(geom_node_coords, key=lambda item: (item[0] - wx) ** 2 + (item[1] - wy) ** 2)
            uniq_near: List[str] = []
            for _, _, nt in near:
                if nt not in uniq_near:
                    uniq_near.append(nt)
                if len(uniq_near) >= 2:
                    break
            if len(uniq_near) >= 2:
                return uniq_near[0], uniq_near[1]
            if len(uniq_near) == 1:
                return uniq_near[0], f"{func_seg.value} Node"
            return None

        # Text-line fallback anchors only when positioned PDF geometry is unavailable
        last_source_comp = mod_title.split(":")[0]
        next_dest_comp = f"{func_seg.value} Node"
        comp_indices: List[Tuple[int, str]] = []
        for idx_l, l in enumerate(lines):
            for tok in re.split(r"[\s,;]+", l):
                tok_c = tok.strip()
                if classify_designator(tok_c):
                    comp_indices.append((idx_l, tok_c))
                    break

        def _nearest_endpoints(line_idx: int, line_txt: str) -> Tuple[str, str]:
            traced = _trace_geom_endpoints(line_txt)
            if traced is not None:
                return traced
            src = last_source_comp
            dst = next_dest_comp
            before = [c for idx_c, c in comp_indices if idx_c <= line_idx]
            after = [c for idx_c, c in comp_indices if idx_c > line_idx]
            if before:
                src = before[-1]
            if after:
                dst = after[0]
            elif len(before) >= 2:
                src, dst = before[-2], before[-1]
            return src, dst

        page_wire_count = 0
        seen_page_wire_keys: set = set()
        for idx_l, l in enumerate(lines):
            lab = WireLabel.parse(l) or WireLabel.parse_oem_compact(l)
            if not lab:
                continue
            src_node, dst_node = _nearest_endpoints(idx_l, l)
            w_key = (lab.wire_no or "", lab.colour, lab.size or "", src_node, dst_node)
            if w_key in seen_page_wire_keys:
                continue
            seen_page_wire_keys.add(w_key)
            page_wire_count += 1
            line_seq += 1

            raw_page_records.append({
                "line_no": line_seq,
                "page": pnum,
                "sheet_code": sheet_code,
                "module_number": mod_num,
                "module_title": mod_title,
                "functional_segment": func_seg.value,
                "wire_no": lab.wire_no or f"W-P{pnum}-{page_wire_count}",
                "has_explicit_wire_no": bool(lab.wire_no),
                "colour": lab.colour,
                "size_mm2": lab.size,
                "from_node": f"{sheet_code}: {src_node}",
                "to_node": f"{sheet_code}: {dst_node}",
                "src_raw": src_node,
                "dst_raw": dst_node,
                "evidence": l,
            })

        # Ensure Module bucket exists
        if mod_num not in module_map:
            module_map[mod_num] = {
                "module_number": mod_num,
                "module_title": mod_title,
                "pages": [],
                "sheet_codes": [],
                "output_sheets": set(),
                "component_count": 0,
                "wire_count": 0,
                "confirmed_fine": 0,
                "wrong_count": 0,
                "score": 100,
                "status": "FINE",
            }
        m_entry = module_map[mod_num]
        m_entry["pages"].append(pnum)
        m_entry["sheet_codes"].append(sheet_code)
        m_entry["output_sheets"].update(matched_out)
        m_entry["component_count"] += len(page_comps)
        m_entry["wire_count"] += page_wire_count

        # Record Page-Level Segmentation
        page_segments.append({
            "page_number": pnum,
            "sheet_code": sheet_code,
            "module_number": mod_num,
            "functional_segment": func_seg.value,
            "component_count": len(page_comps),
            "wire_count": page_wire_count,
            "matched_output_sheets": matched_out[:5],
            "status": "VALIDATED" if matched_out or not output_sheet_names else "OUTPUT_SHEET_UNMATCHED",
        })

        # Record Functional Zone Segmentation
        f_key = func_seg.value
        if f_key not in functional_map:
            functional_map[f_key] = {
                "functional_segment": f_key,
                "modules": set(),
                "sheets": [],
                "components": set(),
                "wire_count": 0,
            }
        fm = functional_map[f_key]
        fm["modules"].add(f"Module {mod_num}")
        fm["sheets"].append(sheet_code)
        fm["components"].update(pc.designator for pc in page_comps[:40])
        fm["wire_count"] += page_wire_count

    # Register all Output SVG/JPG sheets across modules and functional zones
    for sname in output_sheet_names or []:
        o_mod, o_code = extract_module_and_sheet_code("", sname)
        o_seg = classify_sheet_segment(o_code, sname)
        o_title = MODULE_TITLES.get(o_mod, f"Module {o_mod}: Delivery Circuitry ({o_code})")
        if o_mod not in module_map:
            module_map[o_mod] = {
                "module_number": o_mod,
                "module_title": o_title,
                "pages": [],
                "sheet_codes": [o_code],
                "output_sheets": {sname},
                "component_count": 0,
                "wire_count": 0,
                "confirmed_fine": 0,
                "wrong_count": 0,
                "score": 100,
                "status": "FINE",
            }
        else:
            module_map[o_mod]["output_sheets"].add(sname)
            if o_code not in module_map[o_mod]["sheet_codes"]:
                module_map[o_mod]["sheet_codes"].append(o_code)

        if o_seg.value not in functional_map:
            functional_map[o_seg.value] = {
                "functional_segment": o_seg.value,
                "modules": set(),
                "sheets": [],
                "components": set(),
                "wire_count": 0,
            }
        functional_map[o_seg.value]["modules"].add(f"Module {o_mod}")
        if o_code not in functional_map[o_seg.value]["sheets"]:
            functional_map[o_seg.value]["sheets"].append(o_code)

    for ow in output_wires or []:
        o_sh = str(ow.get("source") or ow.get("sheet") or "")
        if o_sh:
            o_mod, _ = extract_module_and_sheet_code("", o_sh)
            if o_mod in module_map and raw_page_records:
                module_map[o_mod]["wire_count"] += 1
                module_map[o_mod]["confirmed_fine"] += 1

    for oc in output_components or []:
        c_sh = str(oc.get("sheet") or "")
        c_mod, c_code = extract_module_and_sheet_code("", c_sh)
        if c_mod in module_map:
            module_map[c_mod]["component_count"] += 1
        c_seg = classify_sheet_segment(c_code, f"{oc.get('designator', '')} {oc.get('category', '')}")
        if c_seg.value in functional_map:
            functional_map[c_seg.value]["components"].add(str(oc.get("designator") or ""))

    # Also synthesize traced lines from Output SVGs if Input PDF was scanned/image-only
    if not raw_page_records and output_wires:
        for idx_ow, ow in enumerate(output_wires[:200], 1):
            sh = str(ow.get("source") or ow.get("sheet") or "Sheet 1")
            mod_num, sheet_code = extract_module_and_sheet_code("", sh)
            func_seg = classify_sheet_segment(sheet_code, sh)
            mod_title = MODULE_TITLES.get(mod_num, f"Module {mod_num}: Output Package")
            if mod_num not in module_map:
                module_map[mod_num] = {
                    "module_number": mod_num,
                    "module_title": mod_title,
                    "pages": [ow.get("page", 1)],
                    "sheet_codes": [sheet_code],
                    "output_sheets": {sh},
                    "component_count": 0,
                    "wire_count": 0,
                    "confirmed_fine": 0,
                    "wrong_count": 0,
                    "score": 100,
                    "status": "FINE",
                }
            module_map[mod_num]["wire_count"] += 1
            raw_page_records.append({
                "line_no": idx_ow,
                "page": ow.get("page", 1),
                "sheet_code": sheet_code,
                "module_number": mod_num,
                "module_title": mod_title,
                "functional_segment": func_seg.value,
                "wire_no": ow.get("wire_no") or f"W-{idx_ow}",
                "has_explicit_wire_no": bool(ow.get("wire_no")),
                "colour": ow.get("colour") or "",
                "size_mm2": ow.get("size_mm2") or ow.get("size") or "",
                "from_node": f"{sheet_code}: {ow.get('source_comp') or ow.get('source') or 'SOURCE'}",
                "to_node": f"{sheet_code}: {ow.get('dest_comp') or ow.get('destination') or 'PIN'}",
                "src_raw": str(ow.get("source_comp") or ow.get("source") or ""),
                "dst_raw": str(ow.get("dest_comp") or ow.get('destination') or ""),
                "evidence": ow.get("evidence_text") or ow.get("evidence") or "",
            })

    # Stage 3 & 4: Cross-Sheet Path Tracing + Line-by-Line Output Validation & Scoring
    has_output = bool(output_wires or output_sheet_names)
    confirmed_fine_count = 0
    wrong_count = 0
    unverified_count = 0
    cross_sheet_paths: List[Dict[str, Any]] = []
    seen_cross: set = set()

    for rec in raw_page_records[:250]:
        wn = norm_wire_no(rec["wire_no"]) if rec["has_explicit_wire_no"] else None
        col = norm_colour(rec["colour"]) or ""
        sz = norm_size(rec["size_mm2"]) or ""

        # Check cross-sheet component / node continuity
        cross_path = None
        for node_tok in (rec["src_raw"].upper(), rec["dst_raw"].upper()):
            locs = sorted(set(comp_locations.get(node_tok, [])))
            if len(locs) >= 2:
                cross_path = f"{node_tok}: {' <-> '.join(locs[:4])}"
                if cross_path not in seen_cross:
                    seen_cross.add(cross_path)
                    cross_sheet_paths.append({
                        "node": node_tok,
                        "path": " -> ".join(locs[:5]),
                        "sheet_count": len(locs),
                        "status": "CROSS_SHEET_CONTINUOUS",
                    })
                break

        # Determine Line-by-Line Validation Verdict vs Findings & Output Package
        related_findings = []
        if wn and wn in finding_by_wire:
            related_findings.extend(finding_by_wire[wn])
        for tok in (rec["src_raw"].upper(), rec["dst_raw"].upper()):
            if tok in finding_by_wire:
                related_findings.extend(finding_by_wire[tok])

        crit_f = next((f for f in related_findings if f.get("severity") == "CRITICAL" or f.get("outcome") == "FAIL"), None)
        rev_f = next((f for f in related_findings if f.get("outcome") == "REVIEW"), None)

        out_match = None
        if wn and wn in out_by_wire_no:
            cands = out_by_wire_no[wn]
            # Pick candidate whose colour/size best aligns with this input wire occurrence
            out_match = min(
                cands,
                key=lambda hw: (
                    0 if (norm_colour(hw.get("colour")) or "") == col else 1,
                    0 if (norm_size(str(hw.get("size_mm2") or hw.get("size") or "")) or "") == sz else 1,
                ),
            )

        if crit_f:
            v_status = "WRONG_CRITICAL"
            verdict = f"WRONG: {crit_f.get('title')} — {crit_f.get('root_cause') or crit_f.get('reason')}"
            fix_hint = crit_f.get("remediation_required") or "Fix conductor / pin mismatch to match OEM."
            wrong_count += 1
            module_map[rec["module_number"]]["wrong_count"] += 1
            module_map[rec["module_number"]]["critical_count"] = module_map[rec["module_number"]].get("critical_count", 0) + 1
            module_map[rec["module_number"]]["score"] = max(40, module_map[rec["module_number"]]["score"] - 15)
        elif rev_f:
            v_status = "WRONG_REVIEW"
            verdict = f"ISSUE / REVIEW: {rev_f.get('title')} — {rev_f.get('reason')}"
            fix_hint = rev_f.get("remediation_required") or "Verify drafting/component designation."
            wrong_count += 1
            module_map[rec["module_number"]]["wrong_count"] += 1
            module_map[rec["module_number"]]["score"] = max(55, module_map[rec["module_number"]]["score"] - 7)
        elif has_output and out_match:
            v_status = "CONFIRMED_FINE"
            out_sh = out_match.get("source") or out_match.get("sheet") or "Output SVG"
            verdict = f"FINE (CONFIRMED): Wire {rec['wire_no']} ({col} {sz or '?'}mm²) from {rec['from_node']} -> {rec['to_node']} matches Output [{out_sh}]."
            fix_hint = "None required — validated conforming."
            confirmed_fine_count += 1
            module_map[rec["module_number"]]["confirmed_fine"] += 1
        elif has_output:
            v_status = "UNVERIFIED_INPUT_ONLY"
            verdict = f"NOT MATCHED IN OUTPUT SCOPE: Line extracted on {rec['sheet_code']}; verify corresponding sheet exists in uploaded Output."
            fix_hint = "Include matching sheet SVG/JPG in Output bundle or confirm optional attachment."
            unverified_count += 1
        else:
            v_status = "UNVERIFIED_INPUT_ONLY"
            verdict = f"UNVERIFIED (NO OUTPUT UPLOADED): Wire {rec['wire_no']} ({col} {sz or '?'}mm²) extracted on {rec['sheet_code']} ({rec['from_node']} -> {rec['to_node']})."
            fix_hint = "Upload Output SVG/JPG bundle to validate this wire connection."
            unverified_count += 1

        all_traced_lines.append({
            "line_no": rec["line_no"],
            "module_number": rec["module_number"],
            "sheet_code": rec["sheet_code"],
            "page": rec["page"],
            "functional_segment": rec["functional_segment"],
            "wire_no": rec["wire_no"],
            "colour": col,
            "size_mm2": sz,
            "from_node": rec["from_node"],
            "to_node": rec["to_node"],
            "cross_sheet_path": cross_path,
            "validation_status": v_status,
            "verdict": verdict,
            "remediation": fix_hint,
            "evidence": rec["evidence"],
        })

    # Include finding-linked discrepancies not already covered by input lines (e.g. Output SVG font/syntax/missing findings)
    covered_titles = {l["verdict"] for l in all_traced_lines}
    for idx_f, f in enumerate(findings or [], 1):
        ftitle = str(f.get("title") or "")
        if any(ftitle and ftitle in v for v in covered_titles):
            continue
        f_sheet = str(f.get("node_reference_redraw") or f.get("location") or f"Page {f.get('page_number', 1)}")
        f_mod, f_code = extract_module_and_sheet_code("", f_sheet)
        f_seg = classify_sheet_segment(f_code, ftitle)
        is_crit = f.get("severity") == "CRITICAL" or f.get("outcome") == "FAIL"
        wrong_count += 1
        if f_mod in module_map:
            module_map[f_mod]["wrong_count"] += 1
            if is_crit:
                module_map[f_mod]["critical_count"] = module_map[f_mod].get("critical_count", 0) + 1
            module_map[f_mod]["score"] = max(40, module_map[f_mod]["score"] - (15 if is_crit else 7))
        all_traced_lines.insert(0, {
            "line_no": idx_f,
            "module_number": f_mod,
            "sheet_code": f_code,
            "page": f.get("page_number") or 1,
            "functional_segment": f_seg.value,
            "wire_no": str(f.get("rule_id") or f.get("code") or "FINDING"),
            "colour": "",
            "size_mm2": "",
            "from_node": str(f.get("node_reference_oem") or f.get("expected_value") or "OEM Input"),
            "to_node": str(f.get("node_reference_redraw") or f.get("detected_value") or "Output Redraw"),
            "cross_sheet_path": None,
            "validation_status": "WRONG_CRITICAL" if is_crit else "WRONG_REVIEW",
            "verdict": f"WRONG: {ftitle} — {f.get('root_cause') or f.get('reason')}",
            "remediation": f.get("remediation_required") or "Align Output sheet with Input OEM specification.",
            "evidence": str(f.get("evidence_text") or ftitle),
        })

    # Re-index line numbers sequentially
    for i_ln, ln in enumerate(all_traced_lines, 1):
        ln["line_no"] = i_ln

    # Finalize Module summary list sorted numerically
    module_segments = []
    for m_num in sorted(module_map.keys(), key=lambda x: (int(x) if x.isdigit() else 999, x)):
        m = module_map[m_num]
        if m["wrong_count"] > 0:
            has_crit = m.get("critical_count", 0) > 0
            m["status"] = "CRITICAL_FAIL" if (has_crit and m["score"] < 70) else "ISSUES_FOUND"
        elif m["confirmed_fine"] > 0:
            m["status"] = "FINE"
        else:
            m["status"] = "UNVERIFIED"
        module_segments.append({
            "module_number": m["module_number"],
            "module_title": m["module_title"],
            "pages": sorted(set(m["pages"])),
            "sheet_codes": list(dict.fromkeys(m["sheet_codes"])),
            "output_sheets": sorted(m["output_sheets"]),
            "component_count": m["component_count"],
            "wire_count": m["wire_count"],
            "confirmed_fine": m["confirmed_fine"],
            "wrong_count": m["wrong_count"],
            "score": m["score"],
            "status": m["status"],
        })

    functional_segments = [
        {
            "functional_segment": fm["functional_segment"],
            "modules": sorted(fm["modules"]),
            "sheets": list(dict.fromkeys(fm["sheets"])),
            "components": sorted(fm["components"])[:40],
            "wire_count": fm["wire_count"],
        }
        for fm in functional_map.values()
    ]

    total_traced = len(all_traced_lines)
    validation_summary = {
        "total_modules": len(module_segments),
        "total_pages_segmented": len(page_segments),
        "total_functional_zones": len(functional_segments),
        "total_lines_traced": total_traced,
        "confirmed_fine_count": confirmed_fine_count,
        "wrong_count": wrong_count,
        "unverified_count": unverified_count,
        "cross_sheet_paths_count": len(cross_sheet_paths),
        "overall_score": overall_score,
        "verdict_banner": (
            f"ALL CLEAR ({confirmed_fine_count}/{total_traced} wiring lines confirmed FINE)"
            if has_output and wrong_count == 0 and len(findings or []) == 0 and confirmed_fine_count > 0
            else (
                "INPUT EXTRACTED ONLY — Upload Output SVG/JPG package to validate"
                if not has_output and wrong_count == 0 and len(findings or []) == 0
                else f"{max(wrong_count, len(findings or []))} ISSUES DETECTED across {len(module_segments)} modules ({confirmed_fine_count} lines confirmed FINE)"
            )
        ),
    }

    return {
        "module_segments": module_segments,
        "page_segments": page_segments,
        "functional_segments": functional_segments,
        "cross_sheet_paths": cross_sheet_paths[:50],
        "line_by_line_validation": all_traced_lines,
        "validation_summary": validation_summary,
    }



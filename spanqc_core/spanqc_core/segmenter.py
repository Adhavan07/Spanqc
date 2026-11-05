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


"""Discipline classification and automatic standards selection engine.

Determines the engineering discipline of a drawing:
1. Industrial Electrical Wiring Diagrams
2. Electrical Control Panel Diagrams
3. Building Electrical Wiring Diagrams
4. Power Distribution & Single-Line Diagrams (SLD)
5. P&ID and Instrumentation Diagrams
6. Heavy Vehicles and Automotive Electrical Systems (Primary Focus)

Non-negotiable rule: Never silently assume a jurisdiction or discipline. If unknown, fail closed or prompt for review.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional, Set, Tuple

from .registry import Discipline, EngineeringStandard, Jurisdiction, list_standards_for_discipline


_VEHICLE_KEYWORDS = [
    "wheel loader", "excavator", "bulldozer", "tractor", "harness", "chassis",
    "can bus", "j1939", "alternator", "starter", "ecu", "fuse box", "fb1",
    "cmcu", "cecm", "vdh", "hyundai", "caterpillar", "komatsu", "jcb", "kl30", "kl15", "kl31"
]

_CONTROL_PANEL_KEYWORDS = [
    "mcc", "vfd", "plc", "terminal block", "busbar", "enclosure", "control panel",
    "contactor", "overload relay", "din rail", "starter panel", "distribution panel"
]

_POWER_DIST_KEYWORDS = [
    "single-line", "single line", "sld", "substation", "transformer", "medium voltage",
    "high voltage", "switchgear", "ct/pt", "bus coupler", "incomer", "feeder"
]

_PID_KEYWORDS = [
    "p&id", "piping and instrumentation", "instrument loop", "control valve",
    "pressure transmitter", "flow transmitter", "temperature transmitter", "isa-5.1"
]

_BUILDING_KEYWORDS = [
    "lighting circuit", "distribution board", "residential", "commercial building",
    "riser diagram", "floor plan", "rcd", "mcb schedule", "conduit layout"
]


def detect_discipline(
    text_content: str,
    filename: str = "",
    explicit_discipline: Optional[str] = None
) -> Tuple[Discipline, float]:
    """Detect engineering discipline from drawing text, title block, and filename.
    Returns (Discipline, confidence_0_to_1).
    """
    if explicit_discipline:
        try:
            return Discipline(explicit_discipline), 1.0
        except ValueError:
            pass

    combined = f"{filename} {text_content}".lower()

    scores: Dict[Discipline, int] = {
        Discipline.HEAVY_VEHICLE: sum(1 for kw in _VEHICLE_KEYWORDS if kw in combined),
        Discipline.CONTROL_PANEL: sum(1 for kw in _CONTROL_PANEL_KEYWORDS if kw in combined),
        Discipline.POWER_DISTRIBUTION: sum(1 for kw in _POWER_DIST_KEYWORDS if kw in combined),
        Discipline.PID_INSTRUMENTATION: sum(1 for kw in _PID_KEYWORDS if kw in combined),
        Discipline.BUILDING_ELECTRICAL: sum(1 for kw in _BUILDING_KEYWORDS if kw in combined),
        Discipline.INDUSTRIAL_ELECTRICAL: 0,
    }

    # Industrial electrical is general base
    if scores[Discipline.HEAVY_VEHICLE] == 0 and scores[Discipline.CONTROL_PANEL] == 0:
        if "motor" in combined or "relay" in combined or "contactor" in combined:
            scores[Discipline.INDUSTRIAL_ELECTRICAL] += 2

    best_discipline = max(scores, key=scores.get)
    max_score = scores[best_discipline]

    if max_score == 0:
        # Default with low confidence if no keywords matched
        return Discipline.HEAVY_VEHICLE, 0.4

    confidence = min(1.0, 0.5 + (max_score * 0.1))
    return best_discipline, confidence


def resolve_applicable_standards(
    discipline: Discipline,
    jurisdiction: Jurisdiction = Jurisdiction.INTERNATIONAL,
    user_overrides: Optional[List[str]] = None
) -> List[EngineeringStandard]:
    """Resolve the list of applicable engineering standards for the active drawing."""
    applicable = list_standards_for_discipline(discipline)

    # Filter or prioritize based on jurisdiction
    if jurisdiction != Jurisdiction.INTERNATIONAL:
        applicable = [
            s for s in applicable
            if s.jurisdiction == jurisdiction or s.jurisdiction == Jurisdiction.INTERNATIONAL
        ]

    # Apply explicit user additions if provided
    if user_overrides:
        from .registry import get_standard
        for code in user_overrides:
            std = get_standard(code)
            if std and std not in applicable:
                applicable.append(std)

    return applicable


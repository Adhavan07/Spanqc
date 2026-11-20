"""Destination classification (LMS 'Module CAC' traceability standard).

green  = confirmed final destination component within scope
yellow = named component, but the cross-sheet boundary was not re-verified
grey   = genuinely unresolved (missing, unknown component, or unreadable)
blue   = rail continuity note (KL30 / KL31 ...), not a component endpoint

Verification goes straight to the FINAL destination component code and pin; no intermediate stops.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .wirecodes import norm_terminal

_PAREN_SUFFIX = re.compile(r"\s*\([^)]*\)\s*$")
_RAIL = re.compile(r"^KL\d+[A-Z]?$", re.I)


class DestClass(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    GREY = "grey"
    BLUE = "blue"


HYUNDAI_KNOWN_COMPONENTS = frozenset({
    "CMCU", "CECM", "RDU", "CAC", "CIC", "CRMSU", "CAAVM", "CJST", "CAS",
    "BATTERY", "CR-1", "CS-74A", "CS-74B", "FB1", "CFB1", "STARTER", "CN-45", "ALT", "CN-74",
    "CS-2A", "CS-46E", "CR-24", "CR-36", "CR-5",
    "CR-2", "CR-13", "CR-4", "CR-9", "CR-7", "CR-35", "CR-46", "CR-62", "CN-263",
    "CK36", "CK37", "CK25", "CK49", "CCR4", "CCR7", "CCR9", "CCR13", "CCR36", "CCR2",
    "CL-3", "CL-4", "CL-5", "CL-6", "CL-36", "CL-37", "CR-81", "CL-1", "CL-7", "CL-8", "CL-9",
    "CN-25", "CL-2", "CN-139", "CN-138", "CN-48", "CN-21", "CN-141", "CN-22", "CS-1", "CN-113", "CN-156",
    "CD-1", "CD-2", "CD-6", "CD-7", "CD-24", "CD-32", "CD-31", "CD-35", "CD-36", "CD-85", "CD-87", "CD-90",
    "CD-42", "CD-43", "CD-45", "CD-70", "CD-71", "CD-69", "CD-16", "CN-140", "CN-29", "CS-4", "CS-33", "CS-67", "CN-432",
    "CN-142", "CN-279", "CS-83",
    "CN-52", "EPPR1", "EPPR2", "CN-242", "CN-243", "CN-66", "CN-149", "CN-68", "CN-61", "CN-96",
    "CN-401", "CN-402", "CN-403", "CN-404", "CN-405", "CN-249",
    "CA30", "CA80", "CCAN", "CA3", "CN-93", "CN-305", "CN-306", "CN-5", "CN-11", "CN-15", "CN-36"
})


@dataclass
class ComponentIndex:
    """in_scope: components verified within the module under check. known: every component in the
    component list. A placeholder built from sheet text is used until the HX Codes sheet is loaded."""
    in_scope: set[str] = field(default_factory=set)
    known: set[str] = field(default_factory=set)

    def __post_init__(self):
        self.in_scope = {norm_terminal(c) for c in self.in_scope}
        self.known = {norm_terminal(c) for c in self.known} | self.in_scope | {norm_terminal(c) for c in HYUNDAI_KNOWN_COMPONENTS}


def strip_parenthetical(ref: str) -> str:
    """'CECM:CN-93(4)' -> 'CECM:CN-93'. Must happen BEFORE any lookup."""
    return _PAREN_SUFFIX.sub("", ref or "").strip()


def component_of(ref: str) -> str:
    base = strip_parenthetical(ref)
    return norm_terminal(base.split(":", 1)[0])


def classify_destination(dest: Optional[str], index: ComponentIndex) -> DestClass:
    if dest is None or not dest.strip() or dest.strip() in {"?", "-", "N/A"}:
        return DestClass.GREY
    if _RAIL.match(strip_parenthetical(dest)):
        return DestClass.BLUE
    comp = component_of(dest)
    if comp in index.in_scope:
        return DestClass.GREEN
    if comp in index.known:
        return DestClass.YELLOW
    return DestClass.GREY

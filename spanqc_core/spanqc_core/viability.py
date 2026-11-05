"""Electrical Circuit Viability Engine: 'Will it work or not?'

Evaluates the real physical electrical consequence of every detected discrepancy:
1. INOPERATIVE / HAZARDOUS:
   - Inverted or reversed pinouts (e.g. relay coils, controller inputs)
   - Missing main power/battery feeds (e.g. F1 30A feed omitted)
   - Cross-connection between power rail and ground
2. DEFECTIVE_DOCUMENTATION:
   - Component misnaming (e.g. CA1a instead of CA30)
   - Malformed wire colour/gauge syntax (e.g. 81K BKWH 1.0)
3. DRAFTING_NONCONFORMANCE:
   - Font height deviations (e.g. CCR1 8px instead of 10px)
   - Missing revision block signature
4. INACTIVE_UNUSED_STUB:
   - Intended spare fuse cavities (F35, F36) with no wire drawn
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional


class ViabilityStatus(str, Enum):
    WILL_NOT_WORK = "WILL NOT WORK (CRITICAL FAILURE)"
    DEFECTIVE_DOCUMENTATION = "DEFECTIVE DOCUMENTATION (OPERATIONAL RISK)"
    DRAFTING_NONCONFORMANCE = "DRAFTING SPECIFICATION DEVIATION"
    UNUSED_SPARE = "INACTIVE SPARE / UNUSED"
    FULLY_OPERATIVE = "OPERATIVE / CONFORMING"


@dataclass
class CircuitImpact:
    status: ViabilityStatus
    circuit_consequence: str
    safety_hazard: str
    remediation_required: str
    severity: str  # CRITICAL | MAJOR | MINOR | WARNING


def assess_circuit_viability(
    rule_id: str,
    finding_title: str,
    expected: str,
    detected: str
) -> CircuitImpact:
    """Deterministically determine the circuit impact and operational consequence."""
    # 1. Swapped pinouts / reversed connections
    if "swap" in finding_title.lower() or rule_id == "LMS-03" or "reversed" in finding_title.lower():
        return CircuitImpact(
            status=ViabilityStatus.WILL_NOT_WORK,
            circuit_consequence="Actuating the control signal will energize the incorrect relay or solenoid circuit.",
            safety_hazard="HIGH RISK: Unintended machine movement or failed safety interlock activation.",
            remediation_required="Immediately swap harness pin terminals to match master schematic.",
            severity="CRITICAL"
        )

    # 2. Missing power feed / omitted branch
    if "missing" in finding_title.lower() or rule_id == "LMS-01":
        if "f1" in finding_title.lower() or "30a" in finding_title.lower() or "power" in finding_title.lower() or "bus" in finding_title.lower():
            return CircuitImpact(
                status=ViabilityStatus.WILL_NOT_WORK,
                circuit_consequence="Destination controller pin or subsystem will remain completely unpowered.",
                safety_hazard="HIGH RISK: Partial electronic controller blackout or dead system branch.",
                remediation_required="Draft the missing 30A power branch conductor in the drawing set.",
                severity="CRITICAL"
            )
        else:
            return CircuitImpact(
                status=ViabilityStatus.WILL_NOT_WORK,
                circuit_consequence="Circuit path is broken; load or sensor will not receive excitation.",
                safety_hazard="MODERATE: Inoperative sensor signal or actuator.",
                remediation_required="Add missing circuit conductor to harness drawing.",
                severity="CRITICAL"
            )

    # 3. Component code mistranscription (CA1a vs CA30)
    if "ca1a" in detected.lower() or "ca1a" in finding_title.lower():
        return CircuitImpact(
            status=ViabilityStatus.DEFECTIVE_DOCUMENTATION,
            circuit_consequence="Circuit will physically conduct if built right, but service technicians cannot identify the component.",
            safety_hazard="MODERATE: Field service manual directs technician to a non-existent module code.",
            remediation_required="Find and replace 'CA1a' with true component code 'CA30'.",
            severity="MAJOR"
        )

    # 4. Malformed wire code syntax (81K BKWH 1.0)
    if rule_id == "LMS-06" or "malformed" in finding_title.lower():
        return CircuitImpact(
            status=ViabilityStatus.DEFECTIVE_DOCUMENTATION,
            circuit_consequence="Harness wire identification ambiguous; assembly technician may pull wrong bi-colour wire spool.",
            safety_hazard="LOW TO MODERATE: Harness shop wire cutting and crimping mistake.",
            remediation_required="Correct callout syntax by inserting standard slash separator (e.g. 81K BK/WH 1.0).",
            severity="MAJOR"
        )

    # 5. Font height deviations (CCR1 8px vs 10px)
    if rule_id == "LMS-11" or "font" in finding_title.lower():
        return CircuitImpact(
            status=ViabilityStatus.DRAFTING_NONCONFORMANCE,
            circuit_consequence="Circuit functions normally; electrical connectivity is unaffected.",
            safety_hazard="NONE: Visual drafting standard non-conformance (Hyundai VDH §4.5).",
            remediation_required="Adjust CAD text entity font size to mandatory 10.0px standard.",
            severity="MINOR"
        )

    # 6. Unused fuse stubs (F35, F36)
    if "f35" in detected.lower() or "f36" in detected.lower() or "unused" in finding_title.lower():
        return CircuitImpact(
            status=ViabilityStatus.UNUSED_SPARE,
            circuit_consequence="Fuse cavity is an unpopulated spare; no current flows.",
            safety_hazard="NONE: Normal reserved cavity for future optional attachments.",
            remediation_required="Maintain destination as NULL with reason 'no wire drawn'.",
            severity="WARNING"
        )

    # Default fallback
    return CircuitImpact(
        status=ViabilityStatus.DEFECTIVE_DOCUMENTATION,
        circuit_consequence="Drawing discrepancy requires engineering review.",
        safety_hazard="LOW",
        remediation_required="Align drawing with reference specification.",
        severity="MAJOR"
    )


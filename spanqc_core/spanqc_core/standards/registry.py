"""Structured Standards Registry for SPANQC Core.

Defines authoritative international and jurisdictional engineering standards across 6 engineering disciplines:
1. Industrial Electrical Wiring Diagrams
2. Electrical Control Panel Diagrams
3. Building Electrical Wiring Diagrams
4. Power Distribution & Single-Line Diagrams (SLD)
5. P&ID and Instrumentation Diagrams
6. Heavy Vehicles and Automotive Electrical Systems (Primary Focus)

Non-negotiable rule: Standards, editions, and clause citations are verified engineering references, never invented.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set


class Discipline(str, Enum):
    INDUSTRIAL_ELECTRICAL = "industrial_electrical"
    CONTROL_PANEL = "control_panel"
    BUILDING_ELECTRICAL = "building_electrical"
    POWER_DISTRIBUTION = "power_distribution"
    PID_INSTRUMENTATION = "pid_instrumentation"
    HEAVY_VEHICLE = "heavy_vehicle"


class Jurisdiction(str, Enum):
    INTERNATIONAL = "international"
    INDIA = "india"
    EUROPE = "europe"
    UNITED_STATES = "united_states"
    JAPAN = "japan"
    GERMANY = "germany"


class StandardFamily(str, Enum):
    IEC = "IEC"
    ISO = "ISO"
    SAE = "SAE"
    IEEE = "IEEE"
    ISA = "ISA"
    UL = "UL"
    NFPA = "NFPA"
    BIS = "BIS"  # Bureau of Indian Standards (IS)
    JIS = "JIS"
    UNECE = "UNECE"


@dataclass(frozen=True)
class StandardClause:
    clause: str
    title: str
    requirement: str
    discipline: Discipline
    severity_default: str = "MAJOR"


@dataclass(frozen=True)
class EngineeringStandard:
    standard_id: str
    family: StandardFamily
    code: str
    title: str
    edition: str
    jurisdiction: Jurisdiction
    disciplines: List[Discipline]
    clauses: Dict[str, StandardClause] = field(default_factory=dict)
    is_mandatory: bool = True
    scope_notes: str = ""


# Authoritative Standards Registry
STANDARDS_REGISTRY: Dict[str, EngineeringStandard] = {
    # ── HEAVY VEHICLES & AUTOMOTIVE ───────────────────────────────────────────
    "ISO-6722": EngineeringStandard(
        standard_id="ISO-6722",
        family=StandardFamily.ISO,
        code="ISO 6722-1",
        title="Road vehicles — 60 V and 600 V single-core cables",
        edition="2011",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "5.2": StandardClause("5.2", "Conductor sizing and resistance", "Conductor cross-sectional area (mm²) must meet rated current capacity.", Discipline.HEAVY_VEHICLE, "MAJOR"),
            "5.3": StandardClause("5.3", "Insulation and colour identification", "Conductor insulation must use standard single or bi-colour coding without ambiguous abbreviations.", Discipline.HEAVY_VEHICLE, "MAJOR"),
        },
        scope_notes="Applies to heavy-duty trucks, construction equipment, wheel loaders, excavators, and agricultural machinery."
    ),
    "SAE-J1939": EngineeringStandard(
        standard_id="SAE-J1939",
        family=StandardFamily.SAE,
        code="SAE J1939",
        title="Serial Control and Communications Heavy Duty Vehicle Network",
        edition="2021",
        jurisdiction=Jurisdiction.UNITED_STATES,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "11": StandardClause("11", "Physical Layer (Shielded Twisted Pair)", "CAN_H and CAN_L must be designated as a twisted pair with 120-ohm terminating resistors at bus ends.", Discipline.HEAVY_VEHICLE, "CRITICAL"),
            "13": StandardClause("13", "Diagnostic Connector Pinout", "Standard 9-pin diagnostic connector must adhere to J1939-13 pin mapping (Pin A=GND, B=BATT+, C=CAN_H, D=CAN_L).", Discipline.HEAVY_VEHICLE, "CRITICAL"),
        },
        scope_notes="Mandatory bus network standard for commercial vehicles, off-highway wheel loaders, and heavy excavators."
    ),
    "SAE-J1128": EngineeringStandard(
        standard_id="SAE-J1128",
        family=StandardFamily.SAE,
        code="SAE J1128",
        title="Low Voltage Primary Cable for Automotive Applications",
        edition="2018",
        jurisdiction=Jurisdiction.UNITED_STATES,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "4.1": StandardClause("4.1", "Conductor AWG/Metric specifications", "Nominal conductor size must be explicitly marked in callouts.", Discipline.HEAVY_VEHICLE, "CRITICAL"),
        },
        scope_notes="Automotive and off-highway low voltage cable specification."
    ),
    "ISO-11898": EngineeringStandard(
        standard_id="ISO-11898",
        family=StandardFamily.ISO,
        code="ISO 11898-2",
        title="Road vehicles — Controller area network (CAN) — Part 2: High-speed medium access unit",
        edition="2016",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "7.2": StandardClause("7.2", "Bus termination and topology", "Differential topology requires termination resistors and branch stub limits.", Discipline.HEAVY_VEHICLE, "CRITICAL"),
        },
        scope_notes="Controller area network physical layer for off-highway and road vehicles."
    ),
    "ISO-26262": EngineeringStandard(
        standard_id="ISO-26262",
        family=StandardFamily.ISO,
        code="ISO 26262-5",
        title="Road vehicles — Functional safety — Product development at the hardware level",
        edition="2018",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "6.4": StandardClause("6.4", "Safety-critical signal routing and isolation", "Safety-critical signals (steering, braking, interlock) must be segregated from non-critical loads.", Discipline.HEAVY_VEHICLE, "CRITICAL"),
        },
        scope_notes="Functional safety requirements for automotive and mobile machinery control systems."
    ),
    "UNECE-R10": EngineeringStandard(
        standard_id="UNECE-R10",
        family=StandardFamily.UNECE,
        code="UNECE Regulation 10",
        title="Uniform provisions concerning the approval of vehicles with regard to electromagnetic compatibility",
        edition="Rev.6",
        jurisdiction=Jurisdiction.EUROPE,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "6.3": StandardClause("6.3", "EMC shielding and grounding", "Sensor and communication harness shielding must be bonded to ground.", Discipline.HEAVY_VEHICLE, "MAJOR"),
        },
        scope_notes="Vehicle type-approval for electromagnetic compatibility."
    ),
    "AIS-004": EngineeringStandard(
        standard_id="AIS-004",
        family=StandardFamily.BIS,
        code="AIS-004 (Part 3) / CMVR",
        title="Automotive Industry Standards — Electromagnetic Radiation & Immunity for Vehicles",
        edition="2014",
        jurisdiction=Jurisdiction.INDIA,
        disciplines=[Discipline.HEAVY_VEHICLE],
        clauses={
            "4.2": StandardClause("4.2", "Electrical harness safety under CMVR", "Wiring harnesses in commercial vehicles must have overcurrent protection on all battery feeds.", Discipline.HEAVY_VEHICLE, "CRITICAL"),
        },
        scope_notes="Central Motor Vehicles Rules (CMVR) compliance for India."
    ),

    # ── INDUSTRIAL & CONTROL PANELS ───────────────────────────────────────────
    "IEC-60204-1": EngineeringStandard(
        standard_id="IEC-60204-1",
        family=StandardFamily.IEC,
        code="IEC 60204-1",
        title="Safety of machinery — Electrical equipment of machines — Part 1: General requirements",
        edition="2016",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL],
        clauses={
            "13.2": StandardClause("13.2", "Identification of conductors", "Protective conductor (PE) must be GREEN-AND-YELLOW throughout its length. Neutral conductors must be BLUE.", Discipline.INDUSTRIAL_ELECTRICAL, "CRITICAL"),
            "13.1": StandardClause("13.1", "Wiring practices and terminations", "Terminals must be clearly identified and conductor cross-section must match terminal ratings.", Discipline.INDUSTRIAL_ELECTRICAL, "MAJOR"),
            "9.2": StandardClause("9.2", "Stop functions and Emergency Stop", "Category 0 or 1 stop must be wired with fail-safe hardwired contacts.", Discipline.INDUSTRIAL_ELECTRICAL, "CRITICAL"),
        },
        scope_notes="Primary global standard for electrical equipment of industrial machinery."
    ),
    "IEC-60445": EngineeringStandard(
        standard_id="IEC-60445",
        family=StandardFamily.IEC,
        code="IEC 60445",
        title="Basic and safety principles for man-machine interface, marking and identification",
        edition="2021",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL, Discipline.HEAVY_VEHICLE],
        clauses={
            "6.2": StandardClause("6.2", "Colour identification of conductors", "Permitted colours: BLACK, BROWN, RED, ORANGE, YELLOW, GREEN, BLUE, VIOLET, GREY, WHITE, PINK, TURQUOISE. Bi-colour combination GREEN/YELLOW reserved exclusively for PE.", Discipline.INDUSTRIAL_ELECTRICAL, "CRITICAL"),
            "7.3": StandardClause("7.3", "Alphanumeric terminal designations", "Power rail terminals must use standard designations (L1, L2, L3, N, PE, or KL30, KL15, KL31).", Discipline.INDUSTRIAL_ELECTRICAL, "MAJOR"),
        },
        scope_notes="Defines conductor and terminal identification standards across electrical engineering."
    ),
    "IEC-60617": EngineeringStandard(
        standard_id="IEC-60617",
        family=StandardFamily.IEC,
        code="IEC 60617",
        title="Graphical symbols for diagrams",
        edition="2012",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL, Discipline.POWER_DISTRIBUTION, Discipline.HEAVY_VEHICLE],
        clauses={
            "S0001": StandardClause("S0001", "Connection dot / Junction representation", "Interconnecting lines must show a junction dot; crossing lines without connection must not have a dot.", Discipline.INDUSTRIAL_ELECTRICAL, "MAJOR"),
            "S0020": StandardClause("S0020", "Contact and coil symbols", "Relay contacts must indicate normal state (NO / NC) with standardized orientation.", Discipline.INDUSTRIAL_ELECTRICAL, "MAJOR"),
        },
        scope_notes="Global standard for graphical symbols on electrical engineering diagrams."
    ),
    "IEC-81346": EngineeringStandard(
        standard_id="IEC-81346",
        family=StandardFamily.IEC,
        code="IEC 81346-2",
        title="Industrial systems, installations and equipment and industrial products — Structuring principles and reference designations",
        edition="2019",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL, Discipline.HEAVY_VEHICLE],
        clauses={
            "4.2": StandardClause("4.2", "Uniqueness of reference designations", "Every distinct component symbol must carry a unique alphanumeric reference designation (e.g., K1, K2, not duplicate J1).", Discipline.INDUSTRIAL_ELECTRICAL, "CRITICAL"),
        },
        scope_notes="Reference designation conventions (replaces older IEC 61346)."
    ),
    "UL-508A": EngineeringStandard(
        standard_id="UL-508A",
        family=StandardFamily.UL,
        code="UL 508A",
        title="Standard for Industrial Control Panels",
        edition="3rd Ed. 2018",
        jurisdiction=Jurisdiction.UNITED_STATES,
        disciplines=[Discipline.CONTROL_PANEL],
        clauses={
            "66.5": StandardClause("66.5", "Internal wiring color coding", "Line voltage (black), AC control (red), DC control (blue), grounded neutral (white), equipment grounding (green or green/yellow).", Discipline.CONTROL_PANEL, "CRITICAL"),
            "28.3": StandardClause("28.3", "Overcurrent protection coordination", "Branch circuit protective device rating must not exceed ampacity of the smallest conductor served.", Discipline.CONTROL_PANEL, "CRITICAL"),
        },
        scope_notes="Standard for industrial control panels in the United States and North American export."
    ),
    "NFPA-79": EngineeringStandard(
        standard_id="NFPA-79",
        family=StandardFamily.NFPA,
        code="NFPA 79",
        title="Electrical Standard for Industrial Machinery",
        edition="2021",
        jurisdiction=Jurisdiction.UNITED_STATES,
        disciplines=[Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL],
        clauses={
            "13.2": StandardClause("13.2", "Conductor identification", "Color coding of conductors must comply with specified supply circuit and control circuit rules.", Discipline.INDUSTRIAL_ELECTRICAL, "CRITICAL"),
        },
        scope_notes="North American standard for industrial machine electrical wiring."
    ),
    "IS-732": EngineeringStandard(
        standard_id="IS-732",
        family=StandardFamily.BIS,
        code="IS 732",
        title="Code of practice for electrical wiring installations",
        edition="2019",
        jurisdiction=Jurisdiction.INDIA,
        disciplines=[Discipline.BUILDING_ELECTRICAL, Discipline.INDUSTRIAL_ELECTRICAL],
        clauses={
            "5.3": StandardClause("5.3", "Selection and erection of wiring systems", "Conductor sizing must account for voltage drop, ambient temperature, and installation grouping.", Discipline.BUILDING_ELECTRICAL, "MAJOR"),
        },
        scope_notes="Bureau of Indian Standards code of practice for electrical wiring installations."
    ),
    "IS-3043": EngineeringStandard(
        standard_id="IS-3043",
        family=StandardFamily.BIS,
        code="IS 3043",
        title="Code of practice for earthing",
        edition="2018",
        jurisdiction=Jurisdiction.INDIA,
        disciplines=[Discipline.BUILDING_ELECTRICAL, Discipline.INDUSTRIAL_ELECTRICAL, Discipline.POWER_DISTRIBUTION],
        clauses={
            "7.1": StandardClause("7.1", "Earth continuity conductor", "Every circuit must have continuous earth bonding. Neutral and earth must remain strictly separated past the main link.", Discipline.BUILDING_ELECTRICAL, "CRITICAL"),
        },
        scope_notes="Indian standard for earthing and ground bonding."
    ),
    "ISA-5.1": EngineeringStandard(
        standard_id="ISA-5.1",
        family=StandardFamily.ISA,
        code="ANSI/ISA-5.1",
        title="Instrumentation Symbols and Identification",
        edition="2009",
        jurisdiction=Jurisdiction.UNITED_STATES,
        disciplines=[Discipline.PID_INSTRUMENTATION],
        clauses={
            "4.1": StandardClause("4.1", "Instrument tag identification", "Loop identification must follow standard letter sequence (e.g. PT for Pressure Transmitter, TT for Temperature Transmitter).", Discipline.PID_INSTRUMENTATION, "MAJOR"),
            "5.2": StandardClause("5.2", "Signal line symbols", "Electric signals (dashed), pneumatic (cross-hatched), and software links must use distinct line types.", Discipline.PID_INSTRUMENTATION, "MAJOR"),
        },
        scope_notes="Primary global standard for P&ID and instrument loop diagrams."
    ),
    "ISO-7200": EngineeringStandard(
        standard_id="ISO-7200",
        family=StandardFamily.ISO,
        code="ISO 7200",
        title="Technical product documentation — Data fields in title blocks and document headers",
        edition="2004",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.HEAVY_VEHICLE, Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL, Discipline.BUILDING_ELECTRICAL, Discipline.POWER_DISTRIBUTION, Discipline.PID_INSTRUMENTATION],
        clauses={
            "5.2": StandardClause("5.2", "Title block mandatory data fields", "Title block must contain document title, identification number, revision index, sheet number, creator name, and approval/sign-off status.", Discipline.HEAVY_VEHICLE, "MINOR"),
        },
        scope_notes="Applies across all technical engineering documentation."
    ),
    "IPC-WHMA-A-620": EngineeringStandard(
        standard_id="IPC-WHMA-A-620",
        family=StandardFamily.SAE,
        code="IPC/WHMA-A-620D",
        title="Requirements and Acceptance for Cable and Wire Harness Assemblies",
        edition="Rev. D 2020",
        jurisdiction=Jurisdiction.INTERNATIONAL,
        disciplines=[Discipline.HEAVY_VEHICLE, Discipline.INDUSTRIAL_ELECTRICAL],
        clauses={
            "4.2": StandardClause("4.2", "Wire marking and gauge callouts", "Wire markings and nominal gauge callouts must be legible and present on all harness endpoints.", Discipline.HEAVY_VEHICLE, "CRITICAL"),
            "13.2": StandardClause("13.2", "Connector pin contact ratings", "Current passing through pin contact must not exceed manufacturer maximum rating under continuous load.", Discipline.HEAVY_VEHICLE, "MAJOR"),
        },
        scope_notes="Cable and wire harness manufacturing and inspection standard."
    ),
    "IEEE-315": EngineeringStandard(
        standard_id="IEEE-315",
        family=StandardFamily.IEEE,
        code="IEEE Std 315 / ANSI Y32.2",
        title="Graphic Symbols for Electrical and Electronics Diagrams",
        edition="1975 (R1993)",
        jurisdiction=Jurisdiction.UNITED_STATES,
        disciplines=[Discipline.INDUSTRIAL_ELECTRICAL, Discipline.CONTROL_PANEL, Discipline.HEAVY_VEHICLE],
        clauses={
            "3.1.4": StandardClause("3.1.4", "Junction dot requirement", "A junction dot must mark the connection of intersecting conductors; lack of a dot indicates independent crossing.", Discipline.INDUSTRIAL_ELECTRICAL, "MAJOR"),
        },
        scope_notes="American national standard for electrical graphic symbols."
    ),
}


def get_standard(standard_id: str) -> Optional[EngineeringStandard]:
    """Retrieve an authoritative standard by ID."""
    return STANDARDS_REGISTRY.get(standard_id)


def list_standards_for_discipline(discipline: Discipline) -> List[EngineeringStandard]:
    """Return all standards applicable to a given engineering discipline."""
    return [s for s in STANDARDS_REGISTRY.values() if discipline in s.disciplines]


def list_standards_for_jurisdiction(jurisdiction: Jurisdiction) -> List[EngineeringStandard]:
    """Return all standards applicable to a jurisdiction, plus international standards."""
    return [
        s for s in STANDARDS_REGISTRY.values()
        if s.jurisdiction == jurisdiction or s.jurisdiction == Jurisdiction.INTERNATIONAL
    ]

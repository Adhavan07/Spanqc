"""Electrical & Electronic Circuit Symbols and Component Recognition Registry.

Codifies standard IEC / IEEE / ANSI / Hyundai VDH wiring & electronic circuit symbols
for deterministic identification and root-cause failure analysis across SVG component
sheets, JPG validated output sheets, and OEM Input PDFs.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple


class SymbolCategory(str, Enum):
    CONNECTIVITY = "Connectivity & Wire Junctions"
    POWER_GROUND = "Power Sources & Grounds"
    PROTECTION_SWITCHING = "Protection, Switches & Relays"
    PASSIVE = "Passive Components"
    SEMICONDUCTOR = "Diodes, LEDs & Semiconductors"
    LOGIC_GATE = "Logic Gates & Digital ICs"
    LOAD_METER_ACTUATOR = "Loads, Meters & Actuators"
    CONNECTOR_ECU = "Harness Connectors & ECUs"


@dataclass(frozen=True)
class SymbolSpec:
    code: str
    name: str
    category: SymbolCategory
    designator_prefixes: Tuple[str, ...]
    failure_risk: str
    future_problem_template: str
    remediation_template: str


# Comprehensive Circuit Symbol Registry derived from standard Electrical & Electronic
# Circuit Symbols Charts + Heavy Equipment Tech Pub (VDH) Harness Ontology.
SYMBOL_CATALOG: Dict[str, SymbolSpec] = {
    # 1. Connectivity & Wire Junctions
    "WIRE_CONNECTED": SymbolSpec(
        code="WIRE_CONNECTED",
        name="Connected Wires / Junction Node",
        category=SymbolCategory.CONNECTIVITY,
        designator_prefixes=("J", "ND", "SP", "SPLICE"),
        failure_risk="Missing junction dot turns a connected splice into an open branch.",
        future_problem_template="Downstream branch loses continuity or voltage drops intermittently during vibration.",
        remediation_template="Verify explicit junction dot at intersection node and confirm wire ID continuity.",
    ),
    "WIRE_UNCONNECTED": SymbolSpec(
        code="WIRE_UNCONNECTED",
        name="Unconnected Crossover Wires",
        category=SymbolCategory.CONNECTIVITY,
        designator_prefixes=("CROSS",),
        failure_risk="Accidental junction dot bridges independent nets causing a dead short.",
        future_problem_template="Cross-talk or short circuit between unrelated circuits when energized.",
        remediation_template="Remove false junction marker or draw hop-over bridge where nets cross without connecting.",
    ),
    "BUS_LINE": SymbolSpec(
        code="BUS_LINE",
        name="Input / Output Bus Line & Terminal",
        category=SymbolCategory.CONNECTIVITY,
        designator_prefixes=("BUS", "TB", "CAN", "CCAN"),
        failure_risk="Misrouted bus termination causes communication loss across all nodes on the bus.",
        future_problem_template="CAN/data bus frames drop or controller throws timeout fault codes under load.",
        remediation_template="Verify bus line impedance, differential pair polarity (CAN_H / CAN_L), and terminal ID.",
    ),

    # 2. Power Sources & Grounds
    "DC_AC_SUPPLY": SymbolSpec(
        code="DC_AC_SUPPLY",
        name="DC / AC Power Supply & Battery Cell",
        category=SymbolCategory.POWER_GROUND,
        designator_prefixes=("BAT", "BATTERY", "VCC", "VDD", "KL30", "KL15", "KL58", "KL50", "PWR", "AC", "DC"),
        failure_risk="Reversed supply polarity or missing KL rail breaks downstream power distribution.",
        future_problem_template="Control modules fail to boot or experience reverse-voltage semiconductor damage.",
        remediation_template="Confirm positive rail designation (KL30/KL15/+24V/+12V) and wire cross-section.",
    ),
    "GROUND": SymbolSpec(
        code="GROUND",
        name="Earth / Signal / Chassis Ground",
        category=SymbolCategory.POWER_GROUND,
        designator_prefixes=("GND", "EARTH", "PE", "KL31", "VSS"),
        failure_risk="Omitted ground return floats controller reference voltage causing erratic actuator behavior.",
        future_problem_template="Ground loop noise, floating sensor readings, or total failure of relay coils to energize.",
        remediation_template="Connect return conductor cleanly to designated chassis/signal ground node (KL31/GND).",
    ),

    # 3. Protection, Switches & Relays
    "FUSE": SymbolSpec(
        code="FUSE",
        name="Fuse / Overcurrent Protection",
        category=SymbolCategory.PROTECTION_SWITCHING,
        designator_prefixes=("F", "FU", "FB", "CFB", "CB"),
        failure_risk="Omitted fuse branch leaves circuit dead; bypassed or oversized fuse causes thermal fire hazard.",
        future_problem_template="Dead subsystem if branch omitted, or melted wire harness insulation during overcurrent fault.",
        remediation_template="Verify fuse amperage rating, bus split count, and exact destination pin connection.",
    ),
    "SWITCH": SymbolSpec(
        code="SWITCH",
        name="Switch (SPST / SPDT / DPST / DPDT / Pushbutton / Locking)",
        category=SymbolCategory.PROTECTION_SWITCHING,
        designator_prefixes=("S", "SW", "PB", "CS"),
        failure_risk="NO/NC contact inversion reverses control logic (always-on instead of momentary).",
        future_problem_template="Operator switch actuation yields opposite machine response or failed emergency stop.",
        remediation_template="Confirm NO vs NC contact pole mapping against Master OEM schematic.",
    ),
    "RELAY": SymbolSpec(
        code="RELAY",
        name="Relay Coil & Contact Assembly",
        category=SymbolCategory.PROTECTION_SWITCHING,
        designator_prefixes=("K", "CR", "CK", "CCR", "RLY"),
        failure_risk="Swapped coil/contact pins cross-energize wrong hydraulic or lighting subsystems.",
        future_problem_template="Triggering one switch actuates an unintended solenoid/load during vehicle operation.",
        remediation_template="Reconcile coil pins (85/86) and switched contact pins (30/87/87a) with OEM netlist.",
    ),

    # 4. Passive Components
    "RESISTOR": SymbolSpec(
        code="RESISTOR",
        name="Resistor / Potentiometer / Thermistor / Varistor / LDR",
        category=SymbolCategory.PASSIVE,
        designator_prefixes=("R", "VR", "POT", "RT", "RV", "LDR"),
        failure_risk="Missing pull-up/down or terminating resistor leaves logic/sensor lines floating.",
        future_problem_template="Erratic analog sensor values, CAN reflection errors, or over-current through LEDs.",
        remediation_template="Verify resistor value, tolerance, and node connections across input and output sheets.",
    ),
    "CAPACITOR": SymbolSpec(
        code="CAPACITOR",
        name="Capacitor (Non-Polarized / Polarized / Electrolytic / Variable)",
        category=SymbolCategory.PASSIVE,
        designator_prefixes=("C", "CP", "CE", "VC"),
        failure_risk="Reversed polarity on polarized/electrolytic capacitor causes dielectric breakdown.",
        future_problem_template="Capacitor shorting or venting under sustained DC rail voltage; power ripple instability.",
        remediation_template="Verify +/- polarity markings on polarized capacitors match rail vs ground.",
    ),
    "INDUCTOR_TRANSFORMER": SymbolSpec(
        code="INDUCTOR_TRANSFORMER",
        name="Inductor / Choke / Transformer (Step-Up / Step-Down / Center-Tapped)",
        category=SymbolCategory.PASSIVE,
        designator_prefixes=("L", "T", "TX", "TR"),
        failure_risk="Primary/secondary winding swap or center-tap omission shifts voltage ratio.",
        future_problem_template="Severe over-voltage on secondary stage or saturation heating in magnetic core.",
        remediation_template="Confirm primary vs secondary winding phase dots and center-tap return connection.",
    ),
    "CRYSTAL": SymbolSpec(
        code="CRYSTAL",
        name="Crystal Oscillator",
        category=SymbolCategory.PASSIVE,
        designator_prefixes=("Y", "X", "XTAL", "OSC"),
        failure_risk="Disconnected oscillator pin prevents microcontroller clock startup.",
        future_problem_template="Digital controller stays halted or exhibits timing drift.",
        remediation_template="Verify crystal pins and load capacitor connections to ground.",
    ),

    # 5. Diodes, LEDs & Semiconductors
    "DIODE_LED": SymbolSpec(
        code="DIODE_LED",
        name="Diode / Zener / Schottky / LED / Photodiode / Thyristor",
        category=SymbolCategory.SEMICONDUCTOR,
        designator_prefixes=("D", "DZ", "ZD", "LED", "DS", "SCR", "THY"),
        failure_risk="Anode/cathode reversal blocks forward conduction or destroys reverse-biased Zener/LED.",
        future_problem_template="Flyback spike damages relay driver MOSFETs, or indicator/suppression path fails completely.",
        remediation_template="Check cathode bar orientation against current flow and clamping direction.",
    ),
    "TRANSISTOR_OPAMP": SymbolSpec(
        code="TRANSISTOR_OPAMP",
        name="Transistor (NPN/PNP BJT, MOSFET, JFET, Darlington) / Op-Amp",
        category=SymbolCategory.SEMICONDUCTOR,
        designator_prefixes=("Q", "U", "IC", "TR", "FET", "OP"),
        failure_risk="Gate/Base/Drain/Source/Collector/Emitter pin swap prevents switching or shorts supply.",
        future_problem_template="Thermal runaway, permanent latch-up, or dead amplifier/driver stage.",
        remediation_template="Validate B/C/E or G/D/S terminal assignments against device pinout.",
    ),

    # 6. Logic Gates & Digital ICs
    "LOGIC_GATE": SymbolSpec(
        code="LOGIC_GATE",
        name="Logic Gate (AND / OR / NOT / NAND / NOR / XOR / Flip-Flop / Buffer)",
        category=SymbolCategory.LOGIC_GATE,
        designator_prefixes=("U", "G", "IC", "FF", "BUF", "INV"),
        failure_risk="Inversion bubble omission (AND vs NAND) flips digital interlock truth table.",
        future_problem_template="Digital safety interlock allows operation during fault state or blocks valid start.",
        remediation_template="Verify logic symbol shape, inversion bubbles, and V+/GND supply pins.",
    ),

    # 7. Loads, Meters & Actuators
    "ACTUATOR_LOAD": SymbolSpec(
        code="ACTUATOR_LOAD",
        name="Lamp / Heating Element / Motor / Solenoid / Buzzer / Speaker",
        category=SymbolCategory.LOAD_METER_ACTUATOR,
        designator_prefixes=("M", "MOT", "CY", "SOL", "LAMP", "LP", "H", "HT", "BZ", "SPK", "BELL", "CL", "CD", "ALT", "STARTER"),
        failure_risk="Solenoid or motor pin swap causes wrong directional valve actuation or reverse rotation.",
        future_problem_template="Hydraulic implement moves wrong direction or motor stalls / blows branch fuse.",
        remediation_template="Match actuator positive (+) and negative (-) / return leads directly to controller pinout.",
    ),
    "METER_ANTENNA": SymbolSpec(
        code="METER_ANTENNA",
        name="Voltmeter / Ammeter / Galvanometer / Antenna / Microphone",
        category=SymbolCategory.LOAD_METER_ACTUATOR,
        designator_prefixes=("V", "VM", "A", "AM", "G", "ANT", "MIC"),
        failure_risk="Series ammeter wired in parallel shorts supply; parallel voltmeter in series blocks load.",
        future_problem_template="Dead current measurement path or blown meter shunt fuse upon power-up.",
        remediation_template="Confirm series (Ammeter) vs parallel (Voltmeter) topology and shield grounding.",
    ),

    # 8. Harness Connectors & ECUs
    "CONNECTOR_ECU": SymbolSpec(
        code="CONNECTOR_ECU",
        name="Harness Connector / Master Controller ECU",
        category=SymbolCategory.CONNECTOR_ECU,
        designator_prefixes=("CN", "CA", "CMCU", "CECM", "RDU", "CAC", "CIC", "CRMSU", "CAAVM", "CJST", "CAS", "EPPR"),
        failure_risk="Component aliasing (e.g. CA1a vs CA30) or pin transposition disconnects field diagnostics.",
        future_problem_template="Service technician cannot locate module or harness assembly swaps pins causing machine malfunction.",
        remediation_template="Standardize module designator against Master BOM/OEM and verify every cavity pin number.",
    ),
}


@dataclass
class ComponentMatch:
    designator: str
    symbol_code: str
    symbol_name: str
    category: str
    sheet: str
    node_ref: str
    evidence: str
    source_type: str = "text"  # "svg_text" | "svg_geometry" | "pdf_text"


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def classify_designator(token: str) -> Optional[SymbolSpec]:
    """Match a schematic token (e.g. 'CR7', 'F1', 'CN-93', 'DZ2', 'M1', 'KL30') to a SymbolSpec."""
    clean = token.strip().upper()
    if not clean:
        return None
    # Strip pin suffix like CA30:CN-93(4) -> inspect primary and connector parts
    base = re.sub(r"\([^)]*\)$", "", clean).strip()
    if ":" in base:
        # Connector cross-ref (e.g. CECM:CN-93)
        return SYMBOL_CATALOG["CONNECTOR_ECU"]

    if re.match(r"^KL\d+[A-Z]?$", base):
        return SYMBOL_CATALOG["DC_AC_SUPPLY"]
    if base in {"GND", "EARTH", "PE", "VSS", "CHASSIS GND", "SIGNAL GND"}:
        return SYMBOL_CATALOG["GROUND"]
    if base in {"VCC", "VDD", "+24V", "+12V", "+5V", "BAT", "BATTERY", "AC", "DC"}:
        return SYMBOL_CATALOG["DC_AC_SUPPLY"]
    if base in {"CCAN", "CAN", "CAN_H", "CAN_L"} or base.startswith("BUS"):
        return SYMBOL_CATALOG["BUS_LINE"]
    if base in {"ALT", "STARTER"} or re.match(r"^CY\d+[A-Z]?$", base) or re.match(r"^C[LD]-\d+[A-Z]?$", base):
        return SYMBOL_CATALOG["ACTUATOR_LOAD"]
    if re.match(r"^F\d+$", base) or base in {"FB1", "CFB1"}:
        return SYMBOL_CATALOG["FUSE"]
    if re.match(r"^(CR|CK|CCR)-?\d+[A-Z]?$", base):
        return SYMBOL_CATALOG["RELAY"]
    if re.match(r"^CS-\d+[A-Z]?$", base):
        return SYMBOL_CATALOG["SWITCH"]
    if re.match(r"^(CN|CA)-?\d*[A-Z]?$", base) or base in {"CMCU", "CECM", "CA30", "CA80", "RDU", "CAC", "CIC", "CRMSU", "CAAVM", "CJST", "CAS"}:
        return SYMBOL_CATALOG["CONNECTOR_ECU"]
    if re.match(r"^(R|VR|POT|RT|RV)\d+$", base):
        return SYMBOL_CATALOG["RESISTOR"]
    if re.match(r"^(C|CP|CE)\d+$", base):
        return SYMBOL_CATALOG["CAPACITOR"]
    if re.match(r"^(L|TX|TR|T)\d+$", base):
        return SYMBOL_CATALOG["INDUCTOR_TRANSFORMER"]
    if re.match(r"^(D|DZ|ZD|LED)\d+$", base):
        return SYMBOL_CATALOG["DIODE_LED"]
    if re.match(r"^(Q|FET)\d+$", base):
        return SYMBOL_CATALOG["TRANSISTOR_OPAMP"]
    if re.match(r"^(M|MOT|SOL|BZ|SPK)\d+$", base):
        return SYMBOL_CATALOG["ACTUATOR_LOAD"]
    if re.match(r"^(V|A|G|VM|AM|ANT)\d+$", base):
        return SYMBOL_CATALOG["METER_ANTENNA"]
    if re.match(r"^(S|SW|PB)\d+$", base):
        return SYMBOL_CATALOG["SWITCH"]
    if re.match(r"^(U|IC|FF)\d+$", base):
        return SYMBOL_CATALOG["LOGIC_GATE"]
    if re.match(r"^(Y|X|XTAL)\d+$", base):
        return SYMBOL_CATALOG["CRYSTAL"]

    return None


def detect_components_from_text_lines(lines: Sequence[str], sheet_name: str = "Sheet 1") -> List[ComponentMatch]:
    """Identify electronic and harness components from raw schematic text tokens."""
    matches: List[ComponentMatch] = []
    seen: set[tuple[str, str]] = set()

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        # Extract sheet prefix if present: "[1 FB1-1] token"
        active_sheet = sheet_name
        m_prefix = re.match(r"^\[([^\]]+)\]\s*(.+)$", line)
        if m_prefix:
            active_sheet = m_prefix.group(1).strip()
            line = m_prefix.group(2).strip()

        # Check full line and whitespace-delimited tokens
        candidates = [line] + [t.strip(",;") for t in re.split(r"[\s]+", line) if t.strip(",;")]
        for tok in candidates:
            if len(tok) < 2 or len(tok) > 40:
                continue
            spec = classify_designator(tok)
            if spec:
                key = (active_sheet, tok.upper())
                if key not in seen:
                    seen.add(key)
                    matches.append(ComponentMatch(
                        designator=tok,
                        symbol_code=spec.code,
                        symbol_name=spec.name,
                        category=spec.category.value,
                        sheet=active_sheet,
                        node_ref=f"{active_sheet}:{tok}",
                        evidence=raw_line.strip(),
                        source_type="text",
                    ))
    return matches


def detect_components_from_svg(svg_bytes_or_str: bytes | str, sheet_name: str = "SVG Sheet") -> Dict[str, Any]:
    """Analyze an SVG component drawing for text designators AND vector geometry cues
    (junction dots indicating connected wires, unconnected crossovers, discrete symbols)."""
    if isinstance(svg_bytes_or_str, (bytes, bytearray)):
        svg_str = svg_bytes_or_str.decode("utf-8", errors="ignore")
    else:
        svg_str = svg_bytes_or_str

    components: List[ComponentMatch] = []
    seen: set[tuple[str, str]] = set()
    junction_dots = 0
    wire_paths = 0
    pin_refs: List[str] = []

    try:
        root = ET.fromstring(svg_str)
    except Exception:
        return {
            "sheet": sheet_name,
            "components": [],
            "junction_dots": 0,
            "wire_paths": 0,
            "pin_refs": [],
            "parse_error": True,
        }

    # 1. Scan vector geometry & group IDs
    for el in root.iter():
        tag = _local_tag(el.tag)
        el_id = el.attrib.get("id", "")
        el_cls = el.attrib.get("class", "")
        if tag == "circle":
            try:
                r = float(el.attrib.get("r", "0") or "0")
                # Small filled circles (1 <= r <= 5) are standard wire junction connection dots
                if 0.5 <= r <= 5.5:
                    junction_dots += 1
            except ValueError:
                pass
        elif tag in {"line", "polyline", "path"}:
            wire_paths += 1

        # Check group IDs or symbol IDs (e.g. id="Fuse_F1", id="Relay_CR7", id="Diode_D1")
        for attr_val in (el_id, el_cls):
            if attr_val:
                for tok in re.split(r"[\s_\-]+", attr_val):
                    spec = classify_designator(tok)
                    if spec:
                        key = (sheet_name, tok.upper())
                        if key not in seen:
                            seen.add(key)
                            components.append(ComponentMatch(
                                designator=tok,
                                symbol_code=spec.code,
                                symbol_name=spec.name,
                                category=spec.category.value,
                                sheet=sheet_name,
                                node_ref=f"{sheet_name} <{tag} id='{el_id}'>",
                                evidence=f"SVG symbol element {tag} ({attr_val})",
                                source_type="svg_geometry",
                            ))

    # 2. Scan text / tspan nodes with coordinates for accurate node references
    for el in root.iter():
        if _local_tag(el.tag) in {"text", "tspan"}:
            txt = "".join(el.itertext()).strip()
            if not txt or len(txt) > 80:
                continue
            x = el.attrib.get("x", "?")
            y = el.attrib.get("y", "?")
            if re.search(r":[A-Z0-9-]+\([^)]+\)", txt) or re.match(r"^pin\s*\d+$", txt, re.I):
                pin_refs.append(txt)
            for tok in [txt] + re.split(r"[\s,;]+", txt):
                tok_clean = tok.strip()
                if len(tok_clean) < 2:
                    continue
                spec = classify_designator(tok_clean)
                if spec:
                    key = (sheet_name, tok_clean.upper())
                    if key not in seen:
                        seen.add(key)
                        components.append(ComponentMatch(
                            designator=tok_clean,
                            symbol_code=spec.code,
                            symbol_name=spec.name,
                            category=spec.category.value,
                            sheet=sheet_name,
                            node_ref=f"{sheet_name} @ ({x},{y}) [{tok_clean}]",
                            evidence=txt,
                            source_type="svg_text",
                        ))

    return {
        "sheet": sheet_name,
        "components": components,
        "junction_dots": junction_dots,
        "wire_paths": wire_paths,
        "pin_refs": pin_refs,
        "parse_error": False,
    }


def enrich_finding_diagnostics(finding: Dict[str, Any], sheet_name: str = "Sheet 1") -> Dict[str, Any]:
    """Ensure every finding carries complete 5-part root-cause, node-reference,
    future-problem, consequence, and remediation diagnostics."""
    rule_id = str(finding.get("rule_id") or finding.get("code") or "RULE-01")
    title = str(finding.get("title") or "")
    expected = str(finding.get("expected_value") or finding.get("expected") or "OEM Master Spec")
    detected = str(finding.get("detected_value") or finding.get("detected") or "Output Deviation")
    evidence = str(finding.get("evidence_text") or finding.get("evidence") or "")
    page = finding.get("page") or finding.get("page_number") or 1

    # Match relevant component spec if possible
    spec: Optional[SymbolSpec] = None
    for tok in re.split(r"[\s:/(),]+", f"{title} {detected} {expected} {evidence}"):
        spec = classify_designator(tok)
        if spec:
            break

    if not finding.get("node_reference_oem"):
        finding["node_reference_oem"] = f"Input (OEM Page {page}): {expected}"
    if not finding.get("node_reference_redraw"):
        finding["node_reference_redraw"] = f"Output ({sheet_name}): {detected}"

    if not finding.get("root_cause"):
        if "swap" in title.lower() or rule_id in {"LMS-03", "LMS-04"}:
            finding["root_cause"] = f"Terminal/pin assignments were transposed between Input OEM node [{expected}] and Output sheet [{sheet_name}: {detected}] during CAD redraw or harness capture."
        elif "missing" in title.lower() or rule_id == "LMS-01":
            finding["root_cause"] = f"Conductor branch or component node [{expected}] documented in Input OEM was omitted while drafting Output sheet [{sheet_name}]."
        elif "font" in title.lower() or rule_id == "LMS-11":
            finding["root_cause"] = f"CAD text style override applied incorrect font height ({detected}) instead of mandatory Tech Pub standard ({expected}) on [{sheet_name}]."
        elif "malformed" in title.lower() or rule_id == "LMS-06":
            finding["root_cause"] = f"Wire colour delimiter or code syntax ('{detected}') was mistyped during manual text label entry on [{sheet_name}]."
        elif spec:
            finding["root_cause"] = f"{spec.name} ({spec.category.value}) discrepancy between Input OEM and Output [{sheet_name}]: {spec.failure_risk}"
        else:
            finding["root_cause"] = f"Mismatch originated between Input OEM specification ({expected}) and Output capture ({detected}) at node [{sheet_name}]."

    if not finding.get("future_problem"):
        if "swap" in title.lower() or rule_id in {"LMS-03", "LMS-04"}:
            finding["future_problem"] = "In vehicle/bench testing, actuating this circuit energizes the wrong load/relay or reverses polarity, risking equipment damage or unintended hydraulic/mechanical motion."
        elif "missing" in title.lower() or rule_id == "LMS-01":
            finding["future_problem"] = "Downstream subsystem or actuator remains permanently unpowered or unexcited in production harness builds, causing functional failure during commissioning."
        elif "font" in title.lower() or rule_id == "LMS-11":
            finding["future_problem"] = "Print-scale readability drops on shop-floor laminated manuals, increasing technician misreads during field repair."
        elif "malformed" in title.lower() or rule_id == "LMS-06":
            finding["future_problem"] = "Harness assembly shop may pull the wrong wire colour spool due to ambiguous bi-colour notation, requiring costly harness rework."
        elif spec:
            finding["future_problem"] = spec.future_problem_template
        else:
            finding["future_problem"] = "Discrepancy between Input OEM and Output sheets causes assembly confusion, test failures, or delayed field diagnostics."

    if not finding.get("remediation_required"):
        if spec:
            finding["remediation_required"] = f"{spec.remediation_template} Align Output node [{sheet_name}] with Input OEM ({expected})."
        else:
            finding["remediation_required"] = f"Update Output sheet [{sheet_name}] so node matches Input OEM requirement: {expected}."

    if spec and not finding.get("component_category"):
        finding["component_category"] = spec.category.value
        finding["component_symbol"] = spec.name

    return finding

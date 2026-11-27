import io
import zipfile
from fastapi.testclient import TestClient
from conftest import FakeClient, reply, wire
from spanqc_core.api import create_app
from spanqc_core.symbols import (
    SymbolCategory,
    classify_designator,
    detect_components_from_svg,
    enrich_finding_diagnostics,
)
from spanqc_core.comparator import analyze_output_package


def test_circuit_symbol_classification_covers_reference_charts():
    cases = {
        "R12": ("RESISTOR", SymbolCategory.PASSIVE.value),
        "C104": ("CAPACITOR", SymbolCategory.PASSIVE.value),
        "L3": ("INDUCTOR_TRANSFORMER", SymbolCategory.PASSIVE.value),
        "T1": ("INDUCTOR_TRANSFORMER", SymbolCategory.PASSIVE.value),
        "Y1": ("CRYSTAL", SymbolCategory.PASSIVE.value),
        "DZ2": ("DIODE_LED", SymbolCategory.SEMICONDUCTOR.value),
        "LED5": ("DIODE_LED", SymbolCategory.SEMICONDUCTOR.value),
        "Q1": ("TRANSISTOR_OPAMP", SymbolCategory.SEMICONDUCTOR.value),
        "U3": ("LOGIC_GATE", SymbolCategory.LOGIC_GATE.value),
        "F1": ("FUSE", SymbolCategory.PROTECTION_SWITCHING.value),
        "SW2": ("SWITCH", SymbolCategory.PROTECTION_SWITCHING.value),
        "CR7": ("RELAY", SymbolCategory.PROTECTION_SWITCHING.value),
        "M1": ("ACTUATOR_LOAD", SymbolCategory.LOAD_METER_ACTUATOR.value),
        "CY41": ("ACTUATOR_LOAD", SymbolCategory.LOAD_METER_ACTUATOR.value),
        "VM1": ("METER_ANTENNA", SymbolCategory.LOAD_METER_ACTUATOR.value),
        "GND": ("GROUND", SymbolCategory.POWER_GROUND.value),
        "KL30": ("DC_AC_SUPPLY", SymbolCategory.POWER_GROUND.value),
        "CA30": ("CONNECTOR_ECU", SymbolCategory.CONNECTOR_ECU.value),
        "CECM:CN-93(4)": ("CONNECTOR_ECU", SymbolCategory.CONNECTOR_ECU.value),
    }
    for tok, (expected_code, expected_cat) in cases.items():
        spec = classify_designator(tok)
        assert spec is not None, f"Failed to classify symbol token: {tok}"
        assert spec.code == expected_code
        assert spec.category.value == expected_cat


def test_detect_components_from_svg_geometry_and_text():
    svg = b"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <line x1="10" y1="50" x2="200" y2="50" stroke="black"/>
      <circle cx="100" cy="50" r="2.5" fill="black"/>
      <g id="Relay_CR7">
        <text font-size="10px"><tspan x="120" y="60">CR7</tspan></text>
      </g>
      <text font-size="10px"><tspan x="40" y="40">122A WH 1.5</tspan></text>
      <text font-size="10px"><tspan x="200" y="80">R10</tspan></text>
      <text font-size="10px"><tspan x="250" y="80">DZ1</tspan></text>
      <text font-size="10px"><tspan x="300" y="80">KL30</tspan></text>
    </svg>"""
    res = detect_components_from_svg(svg, sheet_name="sheet1.svg")
    assert res["junction_dots"] == 1
    assert res["wire_paths"] == 1
    designators = {c.designator.upper() for c in res["components"]}
    assert {"CR7", "R10", "DZ1", "KL30"}.issubset(designators)
    cr7 = next(c for c in res["components"] if c.designator.upper() == "CR7")
    assert "sheet1.svg" in cr7.node_ref


def test_analyze_output_package_flags_pairing_diff_and_enriches_diagnostics(png_bytes):
    svg1 = b"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <text font-size="10px"><tspan x="10" y="20">122A BK 1.5</tspan></text>
      <text font-size="10px"><tspan x="10" y="40">CR7</tspan></text>
      <text font-size="8px"><tspan x="10" y="60">CCR1</tspan></text>
    </svg>"""
    svg2 = b"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <text font-size="10px"><tspan x="10" y="20">DZ1</tspan></text>
    </svg>"""

    zb = io.BytesIO()
    with zipfile.ZipFile(zb, "w") as zf:
        zf.writestr("svg/sheet1.svg", svg1)
        zf.writestr("svg/sheet2.svg", svg2)  # Unpaired SVG (missing sheet2.jpg)
        zf.writestr("jpg/sheet1.png", png_bytes)
        zf.writestr("jpg/orphan.png", png_bytes)  # Unpaired JPG (missing orphan.svg)

    oem_wires = [
        {"wire_no": "122A", "colour": "WH", "size_mm2": "1.5", "source": "CFB1", "destination": "CN-36(1)", "page": 1},
        {"wire_no": "130B", "colour": "RD", "size_mm2": "2.5", "source": "F1", "destination": "CA30:28", "page": 1},
    ]

    result = analyze_output_package(
        oem_wires=oem_wires,
        output_bytes=zb.getvalue(),
        output_filename="OUTPUT.zip",
        oem_filename="INPUT.pdf",
    )

    assert result["svg_jpg_pairing"]["svg_count"] == 2
    assert result["svg_jpg_pairing"]["jpg_count"] == 2
    assert result["svg_jpg_pairing"]["matched_pairs"] == 1
    assert "sheet2" in result["svg_jpg_pairing"]["unpaired_svgs"]
    assert "orphan" in result["svg_jpg_pairing"]["unpaired_jpgs"]

    titles = [f["title"] for f in result["findings"]]
    assert any("130B" in t for t in titles)  # Missing conductor
    assert any("122A" in t and "Colour Mismatch" in t for t in titles)  # WH vs BK
    assert any("no matching validated JPG output" in t for t in titles)
    assert any("no matching component SVG" in t for t in titles)

    # Verify EVERY finding has complete 5-part diagnostics
    for f in result["findings"]:
        assert f.get("node_reference_oem"), f"Missing OEM node ref on {f['title']}"
        assert f.get("node_reference_redraw"), f"Missing Redraw node ref on {f['title']}"
        assert f.get("root_cause"), f"Missing root_cause on {f['title']}"
        assert f.get("future_problem"), f"Missing future_problem on {f['title']}"
        assert f.get("remediation_required"), f"Missing remediation_required on {f['title']}"


def test_api_accepts_dual_input_and_output_zip(png_bytes):
    svg1 = b"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <text font-size="10px"><tspan x="10" y="20">122A BK 1.5</tspan></text>
      <text font-size="10px"><tspan x="10" y="40">CA30</tspan></text>
    </svg>"""
    zb = io.BytesIO()
    with zipfile.ZipFile(zb, "w") as zf:
        zf.writestr("svg/sheet1.svg", svg1)
        zf.writestr("jpg/sheet1.png", png_bytes)

    app = create_app(lambda: FakeClient([reply([wire("122A", "WH", 1.5, ev="122A WH 1.5")])]))
    resp = TestClient(app).post(
        "/api/v1/analyze",
        files={
            "file": ("INPUT.png", png_bytes, "image/png"),
            "output_file": ("OUTPUT.zip", zb.getvalue(), "application/zip"),
        },
        data={"specification_is_complete": "true"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["comparison_mode"] is True
    assert body["svg_jpg_pairing"]["matched_pairs"] == 1
    assert any(c["designator"] == "CA30" for c in body["components_detected"])
    assert any("122A" in f["title"] for f in body["rule_findings"])
    for f in body["rule_findings"]:
        assert f.get("root_cause")
        assert f.get("future_problem")
        assert f.get("node_reference_oem")
        assert f.get("node_reference_redraw")
        assert f.get("remediation_required")

import json
import os
from PIL import Image, ImageDraw, ImageFont

def generate_fixtures():
    fixtures_dir = os.path.dirname(__file__)
    os.makedirs(fixtures_dir, exist_ok=True)

    # -------------------------------------------------------------
    # 1. Expected Netlist Definitions
    # -------------------------------------------------------------
    expected_pass = [
        {
            "wire_id": "W101",
            "expected_source": "J1:1",
            "expected_destination": "TB1:1",
            "expected_gauge": "20 AWG",
            "expected_color": "RED",
        },
        {
            "wire_id": "W102",
            "expected_source": "J1:2",
            "expected_destination": "TB1:2",
            "expected_gauge": "20 AWG",
            "expected_color": "BLU",
        },
        {
            "wire_id": "W103",
            "expected_source": "J1:3",
            "expected_destination": "TB1:3",
            "expected_gauge": "22 AWG",
            "expected_color": "WHT",
        },
    ]

    expected_fail = [
        {
            "wire_id": "W101",
            "expected_source": "J1:1",
            "expected_destination": "TB1:1",
            "expected_gauge": "20 AWG",
            "expected_color": "RED",
        },
        {
            "wire_id": "W102",
            "expected_source": "J1:2",
            "expected_destination": "TB1:2",
            "expected_gauge": "20 AWG",
            "expected_color": "BLU",
        },
    ]

    with open(os.path.join(fixtures_dir, "expected_netlist_pass.json"), "w") as f:
        json.dump(expected_pass, f, indent=2)

    with open(os.path.join(fixtures_dir, "expected_netlist_fail.json"), "w") as f:
        json.dump(expected_fail, f, indent=2)

    # -------------------------------------------------------------
    # 2. Draw Synthetic Diagram 1: PASSING
    # -------------------------------------------------------------
    img_pass = Image.new("RGB", (1200, 800), color=(255, 255, 255))
    draw_pass = ImageDraw.Draw(img_pass)

    # Title block
    draw_pass.rectangle([(50, 50), (1150, 100)], outline=(0, 0, 0), width=2)
    draw_pass.text((70, 65), "SYNTHETIC WIRING SCHEMATIC — BENCHMARK HARNESS WD-01 (PASSING)", fill=(0, 0, 0))

    # Connector J1 Box
    draw_pass.rectangle([(100, 200), (300, 600)], outline=(0, 0, 0), width=3)
    draw_pass.text((160, 220), "CONNECTOR J1\n(MS3470L14-19P)", fill=(0, 0, 0))

    # Terminal Block TB1 Box
    draw_pass.rectangle([(900, 200), (1100, 600)], outline=(0, 0, 0), width=3)
    draw_pass.text((950, 220), "TERMINAL BLOCK TB1\n(DIN RAIL)", fill=(0, 0, 0))

    # Pins & Wires
    y_coords = [320, 420, 520]
    wires_pass = [
        ("Pin 1", "J1:1", "W101 (20 AWG, RED)", "Term 1", "TB1:1", (200, 0, 0)),
        ("Pin 2", "J1:2", "W102 (20 AWG, BLU)", "Term 2", "TB1:2", (0, 0, 200)),
        ("Pin 3", "J1:3", "W103 (22 AWG, WHT)", "Term 3", "TB1:3", (100, 100, 100)),
    ]

    for idx, (pin_label, src_t, wire_label, term_label, dst_t, wire_col) in enumerate(wires_pass):
        y = y_coords[idx]
        draw_pass.text((230, y - 10), pin_label, fill=(0, 0, 0))
        draw_pass.line([(300, y), (900, y)], fill=wire_col, width=4)
        draw_pass.text((920, y - 10), term_label, fill=(0, 0, 0))
        # Wire annotation label
        draw_pass.rectangle([(480, y - 25), (720, y - 5)], outline=(150, 150, 150), width=1)
        draw_pass.text((500, y - 22), wire_label, fill=(0, 0, 0))

    img_pass.save(os.path.join(fixtures_dir, "synthetic_pass_schematic.png"))

    # -------------------------------------------------------------
    # 3. Draw Synthetic Diagram 2: FAILING
    # -------------------------------------------------------------
    img_fail = Image.new("RGB", (1200, 800), color=(255, 255, 255))
    draw_fail = ImageDraw.Draw(img_fail)

    draw_fail.rectangle([(50, 50), (1150, 100)], outline=(0, 0, 0), width=2)
    draw_fail.text((70, 65), "SYNTHETIC WIRING SCHEMATIC — BENCHMARK HARNESS WD-02 (DEFECTS)", fill=(0, 0, 0))

    draw_fail.rectangle([(100, 200), (300, 600)], outline=(0, 0, 0), width=3)
    draw_fail.text((160, 220), "CONNECTOR J1", fill=(0, 0, 0))

    draw_fail.rectangle([(900, 200), (1100, 600)], outline=(0, 0, 0), width=3)
    draw_fail.text((950, 220), "TERMINAL BLOCK TB1", fill=(0, 0, 0))

    # Defect 1: W101 routed to TB1:2 instead of TB1:1 (crossed wire)
    draw_fail.text((230, 310), "Pin 1", fill=(0, 0, 0))
    draw_fail.line([(300, 320), (900, 420)], fill=(200, 0, 0), width=4)
    draw_fail.rectangle([(480, 350), (720, 370)], outline=(150, 150, 150), width=1)
    draw_fail.text((500, 352), "W101 (20 AWG, RED)", fill=(0, 0, 0))

    # Defect 2: Unlabeled wire (missing wire ID and missing gauge)
    draw_fail.text((230, 410), "Pin 2", fill=(0, 0, 0))
    draw_fail.line([(300, 420), (900, 320)], fill=(0, 0, 200), width=4)
    draw_fail.text((500, 385), "[UNLABELED CONDUCTOR]", fill=(120, 0, 0))

    img_fail.save(os.path.join(fixtures_dir, "synthetic_fail_schematic.png"))

    # -------------------------------------------------------------
    # 4. Draw Synthetic Diagram 3: AMBIGUOUS
    # -------------------------------------------------------------
    img_amb = Image.new("RGB", (1200, 800), color=(240, 240, 240))
    draw_amb = ImageDraw.Draw(img_amb)

    draw_amb.rectangle([(50, 50), (1150, 100)], outline=(100, 100, 100), width=2)
    draw_amb.text((70, 65), "SYNTHETIC WIRING SCHEMATIC — BENCHMARK HARNESS WD-03 (AMBIGUOUS / UNCLEAR)", fill=(80, 80, 80))

    draw_amb.rectangle([(100, 200), (300, 600)], outline=(100, 100, 100), width=2)
    draw_amb.text((160, 220), "CONNECTOR J1 (BLURRED)", fill=(100, 100, 100))

    # Blurred / illegible callout
    draw_amb.line([(300, 350), (900, 350)], fill=(150, 150, 150), width=3)
    draw_amb.text((500, 335), "W??? (?? AWG, ???)", fill=(120, 120, 120))

    img_amb.save(os.path.join(fixtures_dir, "synthetic_ambiguous_schematic.png"))
    print("Synthetic diagram fixtures generated successfully.")

if __name__ == "__main__":
    generate_fixtures()

"""CLI helper for Next.js to render schematic preview and extract frames synchronously."""
import sys
import json
from pathlib import Path

# Add spanqc_core to path
here = Path(__file__).resolve().parent
if str(here) not in sys.path:
    sys.path.insert(0, str(here))

from spanqc_core.visual_segmenter import extract_visual_segments_and_defects

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing file path"}))
        sys.exit(1)

    file_path = sys.argv[1]
    page_num = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 120

    try:
        with open(file_path, "rb") as f:
            data = f.read()
        res = extract_visual_segments_and_defects(
            data,
            file_name=Path(file_path).name,
            page_number=page_num,
            dpi=dpi,
        )
        print(json.dumps(res))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)

if __name__ == "__main__":
    main()


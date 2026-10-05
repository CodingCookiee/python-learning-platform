"""Regenerate acceptance/test_legacy_pricing.py for the "Test a legacy module" capstone.

The acceptance suite embeds three things: the original starter.py (in plain text), and the fixed
reference/pricing.py and our rules suite reference/test_pricing.py (zlib-compressed and base64-encoded,
so the answers aren't in plain sight for learners who download the suite). Run this whenever
starter.py, reference/pricing.py, reference/test_pricing.py or tools/acceptance_template.py
changes, then check the result with `npm run content:acceptance -- --only test-a-legacy-module`.
Edit the suite's logic in tools/acceptance_template.py, never in the generated file. Run it from
anywhere: `python content/tracks/python/07-testing-pytest/capstone/tools/build_acceptance.py`.
"""

import base64
import textwrap
import zlib
from pathlib import Path

CAPSTONE = Path(__file__).resolve().parent.parent
TEMPLATE = CAPSTONE / "tools" / "acceptance_template.py"
OUTPUT = CAPSTONE / "acceptance" / "test_legacy_pricing.py"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def blob(text: str) -> str:
    """text compressed and base64-encoded, as indented string literals that Python concatenates."""
    data = base64.b64encode(zlib.compress(text.encode("utf-8"), 9)).decode()
    return "\n".join(f'    "{chunk}"' for chunk in textwrap.wrap(data, 92))


def main() -> None:
    starter = read(CAPSTONE / "starter.py")
    if "'''" in starter or "\\" in starter:
        raise SystemExit("starter.py contains ''' or a backslash, so it can't be embedded in a raw ''' string")
    source = (
        read(TEMPLATE)
        .replace("__STARTER__", starter)
        .replace("__FIXED__", blob(read(CAPSTONE / "reference" / "pricing.py")))
        .replace("__RULES__", blob(read(CAPSTONE / "reference" / "test_pricing.py")))
    )
    OUTPUT.write_bytes(source.encode("utf-8"))  # bytes, so the file keeps LF line endings on Windows
    print(f"Wrote {OUTPUT.relative_to(CAPSTONE.parents[4])}")


if __name__ == "__main__":
    main()

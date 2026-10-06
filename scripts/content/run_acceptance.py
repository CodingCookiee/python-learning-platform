"""Run one acceptance suite the way the pylearn GitHub workflow does, on this machine.

Called by scripts/content/acceptance.ts:
    python run_acceptance.py <project dir> <requirements json> <pytest args json>

The project dir holds the project (a capstone's reference/ or an empty folder) with the
suite already written into .pylearn/. Virtual environments are cached per set of
requirements in .cache/acceptance-venvs/, so only the first run of each set installs.
Prints one JSON line: {"ok", "tests": [{"name", "outcome", "message"}], "log"}.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import subprocess
import sys
import tomllib
import venv
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".cache" / "acceptance-venvs"


def project_requirements(project: Path) -> list[str]:
    reqs: list[str] = []
    req_file = project / "requirements.txt"
    if req_file.exists():
        reqs += [l.strip() for l in req_file.read_text().splitlines() if l.strip() and not l.startswith("#")]
    pyproject = project / "pyproject.toml"
    if pyproject.exists():
        data = tomllib.loads(pyproject.read_text())
        reqs += data.get("project", {}).get("dependencies", [])
    return reqs


def venv_python(reqs: list[str]) -> Path:
    key = hashlib.sha1(json.dumps([sys.version_info[:2], sorted(set(reqs))]).encode()).hexdigest()[:16]
    home = CACHE / key
    python = home / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    if not python.exists():
        # Build it beside the cache and move it in, so two runs at once can't share a half-built venv
        CACHE.mkdir(parents=True, exist_ok=True)
        building = Path(tempfile.mkdtemp(prefix=f"{key}-", dir=CACHE))
        venv.create(building, with_pip=True)
        built_python = building / python.relative_to(home)
        subprocess.run(
            [str(built_python), "-m", "pip", "install", "-q", "--disable-pip-version-check", *sorted(set(reqs))],
            check=True,
        )
        try:
            building.rename(home)
        except OSError:
            shutil.rmtree(building, ignore_errors=True)  # another run finished first; use its venv
    return python


def main() -> None:
    project = Path(sys.argv[1])
    reqs = json.loads(sys.argv[2]) + project_requirements(project)
    pytest_args = json.loads(sys.argv[3])
    try:
        python = venv_python(reqs)
    except subprocess.CalledProcessError as exc:
        print(json.dumps({"ok": False, "tests": [], "log": f"pip install failed: {exc}"}))
        return
    # Like `uv pip install -e .` in the workflow, for projects that are packages
    pyproject = project / "pyproject.toml"
    if pyproject.exists() and "build-system" in tomllib.loads(pyproject.read_text()):
        subprocess.run([str(python), "-m", "pip", "install", "-q", "--no-deps", "-e", str(project)], check=False, capture_output=True)

    run = subprocess.run(
        # -P as in the workflow (lib/ci/workflow.ts): the project's own files can't stand in for pytest
        [str(python), "-P", "-m", "pytest", *pytest_args], cwd=project, capture_output=True, text=True, timeout=600
    )
    tests = []
    report = project / ".pylearn" / "report.xml"
    if report.exists():
        for case in ET.parse(report).getroot().iter("testcase"):
            outcome, message = "passed", ""
            for tag in ("failure", "error"):
                node = case.find(tag)
                if node is not None:
                    outcome, message = "failed", (node.get("message") or node.text or "").strip()[:400]
            if case.find("skipped") is not None:
                outcome = "skipped"
            tests.append({"name": case.get("name", ""), "outcome": outcome, "message": message})
    print(json.dumps({"ok": run.returncode == 0, "tests": tests, "log": (run.stdout + run.stderr)[-3000:]}))


if __name__ == "__main__":
    main()

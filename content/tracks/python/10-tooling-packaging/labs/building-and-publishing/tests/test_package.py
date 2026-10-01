"""Checks for the "build the invoicer package" lab, run by GitHub Actions in your repository.

They read pyproject.toml, run your package the two ways the lesson sets up, and build it with
python -m build (which uses the build backend your pyproject.toml names).
"""

import subprocess
import sys
import tomllib
import zipfile
from pathlib import Path

import pytest


def pyproject() -> dict:
    path = Path("pyproject.toml")
    assert path.exists(), "pyproject.toml should be at the top of your repository (uv init --package invoicer)"
    return tomllib.loads(path.read_text())


@pytest.fixture(scope="module")
def dist(tmp_path_factory) -> Path:
    out = tmp_path_factory.mktemp("dist")
    result = subprocess.run(
        [sys.executable, "-m", "build", "--outdir", str(out), "."], capture_output=True, text=True, timeout=600
    )
    assert result.returncode == 0, f"Building the package failed:\n{(result.stdout + result.stderr)[-2500:]}"
    return out


def test_the_distribution_is_renamed():
    name = pyproject().get("project", {}).get("name", "")
    assert name.startswith("invoicer-"), f'Rename the distribution to "invoicer-<your GitHub username>" (it\'s "{name}")'


def test_the_metadata_is_filled_in():
    project = pyproject().get("project", {})
    missing = [key for key in ("version", "description", "requires-python") if not project.get(key)]
    assert not missing, f"Fill in [project] {', '.join(missing)}"


def test_the_invoicer_command_points_at_the_cli():
    scripts = pyproject().get("project", {}).get("scripts", {})
    assert scripts.get("invoicer") == "invoicer.cli:main", '[project.scripts] should have invoicer = "invoicer.cli:main"'


def test_python_m_invoicer_works():
    result = subprocess.run([sys.executable, "-m", "invoicer", "--help"], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, f"python -m invoicer --help failed (add src/invoicer/__main__.py):\n{result.stderr[-1500:]}"
    assert "usage:" in result.stdout


def test_it_builds_a_wheel_and_an_sdist(dist):
    assert list(dist.glob("invoicer_*.whl")), "No wheel was built"
    assert list(dist.glob("invoicer_*.tar.gz")), "No sdist was built"


def test_the_wheel_contains_the_package_and_the_entry_point(dist):
    wheel = next(dist.glob("invoicer_*.whl"))
    with zipfile.ZipFile(wheel) as zf:
        names = zf.namelist()
        assert "invoicer/cli.py" in names, f"The wheel should contain invoicer/cli.py; it has {names[:10]}"
        entry_points = next((n for n in names if n.endswith("entry_points.txt")), None)
        assert entry_points, "The wheel has no entry_points.txt"
        assert "invoicer = invoicer.cli:main" in zf.read(entry_points).decode()

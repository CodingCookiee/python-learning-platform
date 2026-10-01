"""Checks for the "invoicer project" lab, run by GitHub Actions in your repository."""

import re
import tomllib
from pathlib import Path


def pyproject() -> dict:
    path = Path("pyproject.toml")
    assert path.exists(), "pyproject.toml should be at the top of your repository (uv init invoicer makes it)"
    return tomllib.loads(path.read_text())


def names(requirements: list[str]) -> set[str]:
    """Package names from requirement strings like "httpx>=0.28" or "ruff[extra]"."""
    return {re.split(r"[\s<>=!~\[;]", r, maxsplit=1)[0].lower() for r in requirements}


def test_the_project_is_named_invoicer():
    assert pyproject().get("project", {}).get("name") == "invoicer", '[project] name should be "invoicer"'


def test_httpx_is_a_dependency():
    deps = pyproject().get("project", {}).get("dependencies", [])
    assert "httpx" in names(deps), "Run uv add httpx: it should appear under [project] dependencies"


def test_pytest_and_ruff_are_dev_dependencies():
    dev = pyproject().get("dependency-groups", {}).get("dev", [])
    missing = {"pytest", "ruff"} - names(dev)
    assert not missing, f"Run uv add --dev pytest ruff: {', '.join(sorted(missing))} missing from [dependency-groups] dev"


def test_dev_tools_arent_runtime_dependencies():
    deps = names(pyproject().get("project", {}).get("dependencies", []))
    assert not deps & {"pytest", "ruff"}, "pytest and ruff belong in the dev group, not in [project] dependencies"


def test_the_lockfile_is_committed_and_pins_httpx():
    lock = Path("uv.lock")
    assert lock.exists(), "Commit uv.lock: it pins the exact versions everyone installs"
    assert 'name = "httpx"' in lock.read_text(), "uv.lock doesn't mention httpx; run uv lock and commit it"


def test_the_python_version_is_pinned():
    version = Path(".python-version")
    assert version.exists(), "Commit .python-version (uv init writes it)"
    assert re.fullmatch(r"3\.\d+(\.\d+)?", version.read_text().strip()), ".python-version should hold a version like 3.13"


def test_httpx_installs_from_the_project():
    import httpx  # installed from your pyproject.toml by the workflow

    assert httpx.__version__

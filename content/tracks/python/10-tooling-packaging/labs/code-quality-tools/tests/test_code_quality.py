"""Checks for the "clean under ruff and strict mypy" lab, run by GitHub Actions in your repository.

ruff and mypy run with your project's own settings from pyproject.toml.
"""

import subprocess
import sys
import tomllib
from pathlib import Path


def pyproject() -> dict:
    path = Path("pyproject.toml")
    assert path.exists(), "pyproject.toml should be at the top of your repository"
    return tomllib.loads(path.read_text())


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, "-m", *args], capture_output=True, text=True, timeout=240)


def test_ruff_is_configured():
    ruff = pyproject().get("tool", {}).get("ruff", {})
    assert ruff, "Add the [tool.ruff] settings from the lesson to pyproject.toml"
    assert ruff.get("lint", {}).get("select"), "Choose rule families under [tool.ruff.lint] select"


def test_mypy_is_strict():
    assert pyproject().get("tool", {}).get("mypy", {}).get("strict") is True, "Set strict = true under [tool.mypy]"


def test_ruff_check_passes():
    pyproject()
    assert Path("main.py").exists(), "main.py should be at the top of your repository"
    result = run("ruff", "check", "--extend-exclude", ".pylearn", ".")
    assert result.returncode == 0, f"ruff check found problems:\n{result.stdout[-2000:]}"


def test_code_is_formatted():
    pyproject()
    assert Path("main.py").exists(), "main.py should be at the top of your repository"
    result = run("ruff", "format", "--check", "--extend-exclude", ".pylearn", ".")
    assert result.returncode == 0, f"Run ruff format; these files aren't formatted:\n{result.stdout[-1500:]}"


def test_main_passes_strict_mypy():
    assert Path("main.py").exists(), "main.py should be at the top of your repository"
    result = run("mypy", "main.py")
    assert result.returncode == 0, f"mypy (strict) reported:\n{result.stdout[-2000:]}"


def test_pre_commit_runs_ruff():
    config = Path(".pre-commit-config.yaml")
    assert config.exists(), "Commit .pre-commit-config.yaml"
    assert "ruff" in config.read_text(), "Your pre-commit config should include the ruff hooks"

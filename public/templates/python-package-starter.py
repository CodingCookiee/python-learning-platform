# Publish a Python Package - Starter Template

"""Starter scaffold for the Module 7 package publishing project."""

from __future__ import annotations

from pathlib import Path

PACKAGE_NAME = "your_package_name"
VERSION = "0.1.0"


def build_project_structure() -> None:
    """Create the recommended package layout.

    TODO:
    - Add your package modules under src/your_package_name/
    - Add tests under tests/
    - Add README.md and LICENSE
    - Add pyproject.toml or setup.py
    """

    base = Path.cwd()
    (base / "src" / PACKAGE_NAME).mkdir(parents=True, exist_ok=True)
    (base / "tests").mkdir(parents=True, exist_ok=True)

    init_file = base / "src" / PACKAGE_NAME / "__init__.py"
    if not init_file.exists():
        init_file.write_text(
            f'"""{PACKAGE_NAME} package."""\n\n__version__ = "{VERSION}"\n',
            encoding="utf-8",
        )


def print_publish_checklist() -> None:
    """Show the main publishing steps."""

    checklist = [
        "Choose a package name and semantic version.",
        "Create src/ layout with __init__.py files.",
        "Write pyproject.toml or setup.py.",
        "Add README.md and LICENSE.",
        "Run tests locally.",
        "Build distribution artifacts with python -m build.",
        "Upload to TestPyPI first.",
        "Verify install with pip from TestPyPI.",
        "Tag the release and publish to PyPI when ready.",
    ]

    print("=== Python Package Starter ===")
    for step in checklist:
        print(f"- {step}")


def main() -> None:
    """Run the package starter scaffold."""

    build_project_structure()
    print_publish_checklist()


if __name__ == "__main__":
    main()

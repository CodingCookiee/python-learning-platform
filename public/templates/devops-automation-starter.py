# DevOps Automation Suite - Starter Template

"""Starter scaffold for a DevOps and automation focused Python project."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass
class PipelineStep:
    """Represents one step in an automation pipeline."""

    name: str
    command: str
    description: str


class DevOpsAutomationSuite:
    """Simple starter workflow for automation, containerization, and CI/CD."""

    def __init__(self, project_name: str, workspace: str):
        self.project_name = project_name
        self.workspace = Path(workspace)
        self.steps: list[PipelineStep] = []

    def add_step(self, name: str, command: str, description: str) -> None:
        """Register a pipeline step."""

        self.steps.append(PipelineStep(name=name, command=command, description=description))

    def build_default_pipeline(self) -> None:
        """Populate a starter pipeline with common DevOps tasks."""

        self.steps = [
            PipelineStep("Format", "python -m black .", "Format the codebase"),
            PipelineStep("Lint", "python -m ruff check .", "Run linting checks"),
            PipelineStep("Test", "python -m pytest", "Run automated tests"),
            PipelineStep("Build", "docker build -t app .", "Build a container image"),
            PipelineStep("Security", "python -m pip audit", "Check dependencies for issues"),
        ]

    def render_github_actions(self) -> str:
        """Render a basic GitHub Actions workflow file."""

        commands = "\n".join(
            f"      - run: {step.command}" for step in self.steps
        )
        return (
            "name: CI\n"
            "on:\n"
            "  push:\n"
            "  pull_request:\n"
            "jobs:\n"
            "  build:\n"
            "    runs-on: ubuntu-latest\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n"
            f"{commands}\n"
        )

    def write_workflow(self) -> Path:
        """Write the starter workflow file to disk."""

        workflow_dir = self.workspace / ".github" / "workflows"
        workflow_dir.mkdir(parents=True, exist_ok=True)
        workflow_path = workflow_dir / "ci.yml"
        workflow_path.write_text(self.render_github_actions(), encoding="utf-8")
        return workflow_path


def print_plan(steps: Iterable[PipelineStep]) -> None:
    """Display the current automation plan."""

    for index, step in enumerate(steps, start=1):
        print(f"{index}. {step.name} - {step.description}")
        print(f"   {step.command}")


def main() -> None:
    """Run the starter app."""

    print("=== DevOps Automation Suite Starter ===")
    suite = DevOpsAutomationSuite("python-learning-platform", ".")
    suite.build_default_pipeline()
    print_plan(suite.steps)
    workflow_path = suite.write_workflow()
    print(f"Workflow written to: {workflow_path}")
    print("TODO: Replace commands with your preferred tooling and deployment steps.")


if __name__ == "__main__":
    main()

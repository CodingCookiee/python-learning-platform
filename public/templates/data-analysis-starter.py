# Data Analysis Dashboard - Starter Template

"""Starter scaffold for a Pandas-based data analysis dashboard project."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd


@dataclass
class DatasetSummary:
    """Basic summary information for a dataset."""

    rows: int
    columns: int
    missing_values: int


class DataAnalyzer:
    """Load, clean, analyze, and export tabular data."""

    def __init__(self, input_path: str, output_dir: str):
        self.input_path = Path(input_path)
        self.output_dir = Path(output_dir)
        self.frame: pd.DataFrame | None = None

    def load(self) -> pd.DataFrame:
        """Load a CSV or JSON dataset."""

        if not self.input_path.exists():
          raise FileNotFoundError(f"Input file not found: {self.input_path}")

        if self.input_path.suffix.lower() == ".csv":
            self.frame = pd.read_csv(self.input_path)
        elif self.input_path.suffix.lower() == ".json":
            self.frame = pd.read_json(self.input_path)
        else:
            raise ValueError("Supported formats: .csv and .json")

        return self.frame

    def clean(self) -> pd.DataFrame:
        """Remove duplicates and fill in common missing values."""

        if self.frame is None:
            raise RuntimeError("Load data before cleaning it.")

        frame = self.frame.copy()
        frame = frame.drop_duplicates()
        frame = frame.fillna(method="ffill").fillna(method="bfill")
        self.frame = frame
        return frame

    def summarize(self) -> DatasetSummary:
        """Compute a high-level summary for the current dataset."""

        if self.frame is None:
            raise RuntimeError("Load data before summarizing it.")

        return DatasetSummary(
            rows=len(self.frame),
            columns=len(self.frame.columns),
            missing_values=int(self.frame.isna().sum().sum()),
        )

    def numeric_report(self) -> pd.DataFrame:
        """Return descriptive stats for numeric columns."""

        if self.frame is None:
            raise RuntimeError("Load data before generating a report.")

        return self.frame.describe(include="number")

    def export(self, summary: DatasetSummary) -> dict[str, Path]:
        """Write a simple report payload to disk."""

        self.output_dir.mkdir(parents=True, exist_ok=True)
        report_path = self.output_dir / "analysis-report.json"
        summary_path = self.output_dir / "dataset-summary.csv"

        pd.DataFrame([summary.__dict__]).to_json(report_path, orient="records", indent=2)
        pd.DataFrame([summary.__dict__]).to_csv(summary_path, index=False)

        return {"report": report_path, "summary": summary_path}


def build_demo_dataset() -> pd.DataFrame:
    """Create a small in-memory dataset for testing the starter."""

    return pd.DataFrame(
        [
            {"category": "A", "score": 92, "value": 120},
            {"category": "B", "score": 78, "value": 95},
            {"category": "A", "score": 85, "value": 110},
            {"category": "C", "score": None, "value": 140},
        ]
    )


def save_demo_dataset(frame: pd.DataFrame, path: Path) -> None:
    """Persist the demo dataset so the starter can run without external files."""

    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)


def main() -> None:
    """Run the starter app."""

    print("=== Data Analysis Dashboard Starter ===")
    print("TODO: Replace this scaffold with your own analytics workflow and visualizations.")

    base_dir = Path(__file__).resolve().parent
    demo_input = base_dir / "demo-data.csv"
    output_dir = base_dir / "analysis-output"

    save_demo_dataset(build_demo_dataset(), demo_input)

    analyzer = DataAnalyzer(str(demo_input), str(output_dir))
    analyzer.load()
    analyzer.clean()
    summary = analyzer.summarize()
    outputs = analyzer.export(summary)

    print(f"Rows: {summary.rows}")
    print(f"Columns: {summary.columns}")
    print(f"Missing values: {summary.missing_values}")
    print(f"Report written to: {outputs['report']}")
    print(f"Summary written to: {outputs['summary']}")


if __name__ == "__main__":
    main()

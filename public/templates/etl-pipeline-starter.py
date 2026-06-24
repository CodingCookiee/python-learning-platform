# Data ETL Pipeline - Starter Template

"""Starter scaffold for the Module 5 Data ETL Pipeline project."""

from __future__ import annotations

import csv
import json
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable


class ETLPipelineError(Exception):
    """Raised when the ETL pipeline cannot complete successfully."""


@dataclass
class Record:
    """Represents one normalized record in the pipeline."""

    # TODO: Adjust these fields to match your source CSV columns.
    id: str
    name: str
    value: float


class ETLPipeline:
    """Extract, transform, and load CSV data into JSON."""

    def __init__(self, input_path: str, output_path: str):
        self.input_path = Path(input_path)
        self.output_path = Path(output_path)
        self.logger = logging.getLogger(self.__class__.__name__)

    def extract(self) -> list[dict[str, Any]]:
        """Read rows from a CSV file."""
        if not self.input_path.exists():
            raise ETLPipelineError(f"Input file not found: {self.input_path}")

        with self.input_path.open("r", encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)
            rows = list(reader)

        if not rows:
            raise ETLPipelineError("No data found in CSV file.")

        self.logger.info("Extracted %d rows from %s", len(rows), self.input_path)
        return rows

    def transform(self, rows: Iterable[dict[str, Any]]) -> list[Record]:
        """Clean, normalize, and validate source rows."""
        records: list[Record] = []

        for index, row in enumerate(rows, start=1):
            try:
                record = Record(
                    id=str(row.get("id", "")).strip(),
                    name=str(row.get("name", "")).strip().title(),
                    value=float(row.get("value", 0)),
                )
            except (TypeError, ValueError) as exc:
                raise ETLPipelineError(f"Invalid row at line {index}: {row}") from exc

            if not record.id or not record.name:
                raise ETLPipelineError(f"Missing required fields at line {index}: {row}")

            records.append(record)

        self.logger.info("Transformed %d records", len(records))
        return records

    def load(self, records: Iterable[Record]) -> None:
        """Write transformed records to JSON."""
        payload = [asdict(record) for record in records]

        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        with self.output_path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2, ensure_ascii=False)

        self.logger.info("Loaded %d records into %s", len(payload), self.output_path)

    def run(self) -> None:
        """Run the full ETL pipeline."""
        self.logger.info("Starting ETL pipeline")
        rows = self.extract()
        records = self.transform(rows)
        self.load(records)
        self.logger.info("ETL pipeline completed successfully")


def setup_logging() -> None:
    """Configure basic console logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    )


def main() -> None:
    """Run the ETL starter app."""
    setup_logging()
    print("=== Data ETL Pipeline ===")
    print("TODO: Update the Record dataclass and transformation logic for your dataset.")

    input_path = input("Enter CSV input path: ").strip()
    output_path = input("Enter JSON output path: ").strip()

    pipeline = ETLPipeline(input_path=input_path, output_path=output_path)

    try:
        pipeline.run()
        print(f"ETL complete. Output saved to {output_path}")
    except ETLPipelineError as exc:
        print(f"Pipeline failed: {exc}")


if __name__ == "__main__":
    main()

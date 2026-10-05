"""Reading and writing the log file: one JSON object per line."""

import json
import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Entry:
    day: date
    client: str
    hours: Decimal
    note: str = ""


def append(path: Path, entry: Entry) -> None:
    """Add one entry to the end of the log file, creating it if needed."""
    record = {
        "date": entry.day.isoformat(),
        "client": entry.client,
        "hours": f"{entry.hours:.2f}",
        "note": entry.note,
    }
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record) + "\n")
    logger.info("Appended to %s", path)


def load(path: Path) -> list[Entry]:
    """Every readable entry in the log file, in file order. Unreadable lines are skipped."""
    if not path.exists():
        logger.debug("%s doesn't exist yet", path)
        return []
    entries = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
            entries.append(
                Entry(
                    day=date.fromisoformat(record["date"]),
                    client=str(record["client"]),
                    hours=Decimal(record["hours"]),
                    note=str(record.get("note", "")),
                )
            )
        except (ValueError, KeyError, TypeError, InvalidOperation):
            logger.warning("Skipped line %d of %s: it isn't a valid entry", number, path)
    return entries

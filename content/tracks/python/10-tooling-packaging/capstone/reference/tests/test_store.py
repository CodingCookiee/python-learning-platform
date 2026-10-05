from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from worklog.store import Entry, append, load


def test_append_then_load_round_trips(tmp_path: Path) -> None:
    path = tmp_path / "log.jsonl"
    entry = Entry(date(2026, 9, 28), "Kiln Cafe", Decimal("1.25"), "Menu boards")
    append(path, entry)
    append(path, Entry(date(2026, 9, 29), "Harbour Books", Decimal("2.00")))
    assert load(path) == [entry, Entry(date(2026, 9, 29), "Harbour Books", Decimal("2.00"))]


def test_hours_are_stored_as_strings(tmp_path: Path) -> None:
    path = tmp_path / "log.jsonl"
    append(path, Entry(date(2026, 9, 28), "Kiln Cafe", Decimal("2.5")))
    assert '"hours": "2.50"' in path.read_text()


def test_missing_file_is_empty(tmp_path: Path) -> None:
    assert load(tmp_path / "nothing.jsonl") == []


def test_bad_line_is_skipped_with_a_warning(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    path = tmp_path / "log.jsonl"
    append(path, Entry(date(2026, 9, 28), "Kiln Cafe", Decimal("1")))
    with path.open("a") as file:
        file.write("not json\n")
    assert len(load(path)) == 1
    assert "line 2" in caplog.text

import argparse
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from worklog.cli import main, parse_day, parse_hours, parse_week


def run(log: Path, *args: str) -> int:
    return main(["--file", str(log), *args])


@pytest.mark.parametrize(
    "text, hours", [("2.5", Decimal("2.50")), ("1:15", Decimal("1.25")), ("24", Decimal("24.00"))]
)
def test_parse_hours(text: str, hours: Decimal) -> None:
    assert parse_hours(text) == hours


@pytest.mark.parametrize("text", ["0", "30", "lots", "1:75", "-1"])
def test_parse_hours_refuses(text: str) -> None:
    with pytest.raises(argparse.ArgumentTypeError):
        parse_hours(text)


def test_parse_day_and_week() -> None:
    assert parse_day("2026-09-28") == date(2026, 9, 28)
    assert parse_week("2026-W40") == (date(2026, 9, 28), date(2026, 10, 4))
    with pytest.raises(argparse.ArgumentTypeError):
        parse_week("2026-W60")
    with pytest.raises(argparse.ArgumentTypeError):
        parse_day("2026-02-30")


def test_add_and_report(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    log = tmp_path / "log.jsonl"
    assert run(log, "add", "Kiln Cafe", "1:15", "--date", "2026-09-29") == 0
    assert capsys.readouterr().out == "Logged 1.25 h for Kiln Cafe on 2026-09-29\n"
    assert run(log, "report", "--week", "2026-W40", "--format", "csv") == 0
    assert capsys.readouterr().out == "client,hours\nKiln Cafe,1.25\n"


def test_empty_week(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert run(tmp_path / "log.jsonl", "report", "--week", "2026-W40") == 0
    assert capsys.readouterr().out == "Week 2026-W40 (28 Sep - 4 Oct 2026)\n\nNo hours logged.\n"


def test_usage_error_exits_2(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as caught:
        run(tmp_path / "log.jsonl", "add", "Kiln Cafe", "30")
    assert caught.value.code == 2
    assert "isn't between 0 and 24 hours" in capsys.readouterr().err

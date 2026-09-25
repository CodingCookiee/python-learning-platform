from plp import test, hidden
from solution import parse_entry


@test("Splits an entry into date, time, level and message")
def _():
    assert parse_entry("2026-09-25 14:02:11 ERROR Disk almost full on /var") == (
        "2026-09-25",
        "14:02:11",
        "ERROR",
        "Disk almost full on /var",
    )


@test("Keeps a one-word message")
def _():
    assert parse_entry("2026-09-25 14:03:40 INFO Started") == ("2026-09-25", "14:03:40", "INFO", "Started")


@test("Uses an empty message when there isn't one")
def _():
    assert parse_entry("2026-09-25 14:05:00 HEARTBEAT") == ("2026-09-25", "14:05:00", "HEARTBEAT", "")


@hidden("Returns a tuple of four strings")
def _():
    result = parse_entry("2026-09-26 00:00:01 WARN Low memory")
    assert type(result) is tuple, f"parse_entry returned a {type(result).__name__}, expected a tuple"
    assert len(result) == 4


@hidden("Keeps punctuation and numbers in the message")
def _():
    assert parse_entry("2026-09-26 08:15:22 WARN Retry 3/5: timeout after 30s") == (
        "2026-09-26",
        "08:15:22",
        "WARN",
        "Retry 3/5: timeout after 30s",
    )

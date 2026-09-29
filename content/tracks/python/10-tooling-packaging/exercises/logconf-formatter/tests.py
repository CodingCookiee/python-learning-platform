import logging
import time

from plp import test, hidden
from solution import build_formatter


def record(name, level, msg, *args, when=(2026, 9, 29, 14, 5, 0)):
    """A log record created at a fixed local time."""
    made = logging.LogRecord(name, level, "billing.py", 12, msg, args, None)
    made.created = time.mktime((*when, 0, 0, -1))
    made.msecs = 250.0
    return made


def formatted(made):
    formatter = build_formatter()
    assert isinstance(formatter, logging.Formatter), "build_formatter() should return a logging.Formatter"
    return formatter.format(made)


@test("Formats the warning from the example")
def _():
    assert formatted(record("invoicer.billing", logging.WARNING, "Card declined for INV-1042")) == (
        "2026-09-29 14:05:00 WARNING invoicer.billing: Card declined for INV-1042"
    )


@test("Fills in the message's arguments")
def _():
    made = record("invoicer.billing", logging.INFO, "Charging %s for %.2f", "INV-1043", 25.5)
    assert formatted(made) == "2026-09-29 14:05:00 INFO invoicer.billing: Charging INV-1043 for 25.50"


@test("Shows other levels, loggers and times")
def _():
    made = record("invoicer.sync", logging.ERROR, "Upstream returned 503", when=(2026, 1, 5, 7, 3, 9))
    assert formatted(made) == "2026-01-05 07:03:09 ERROR invoicer.sync: Upstream returned 503"


@hidden("Leaves out the milliseconds")
def _():
    assert ",250" not in formatted(record("invoicer", logging.INFO, "Started"))

import contextlib
import io
import logging

from plp import test, hidden, load_module
from solution import charge


class Collect(logging.Handler):
    """A handler that keeps every record it's given."""

    def __init__(self):
        super().__init__(logging.DEBUG)
        self.records = []

    def emit(self, record):
        self.records.append(record)


def reset_logging():
    loggers = [logging.getLogger()]
    loggers += [item for item in logging.Logger.manager.loggerDict.values() if isinstance(item, logging.Logger)]
    for logger in loggers:
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        logger.setLevel(logging.NOTSET)
        logger.propagate = True
        logger.disabled = False
    logging.getLogger().setLevel(logging.WARNING)


def records_from(amount):
    """Load the module as `billing`, call charge() once, and return what was logged."""
    reset_logging()
    billing = load_module("billing")
    collect = Collect()
    root = logging.getLogger()
    root.handlers = [collect]
    root.setLevel(logging.DEBUG)
    try:
        billing.charge("INV-1042", amount)
    finally:
        reset_logging()
    return [(record.name, record.levelname, record.getMessage()) for record in collect.records]


@test("Returns receipts as before")
def _():
    assert charge("INV-1042", 25.5) == "rcpt-inv-1042"
    assert charge("INV-1043", 0) is None


@test("Importing it configures nothing")
def _():
    reset_logging()
    load_module("billing")
    added = logging.getLogger().handlers[:]
    reset_logging()
    assert added == [], "Importing billing added a handler to the root logger. Configuring logging is the application's job"


@test("Logs through the billing logger")
def _():
    assert records_from(25.5) == [("billing", "INFO", "Charging INV-1042 for 25.50")]


@test("Warns through the billing logger about a zero amount")
def _():
    assert records_from(0) == [("billing", "WARNING", "Refusing to charge INV-1042: amount 0.00")]


@test("Never prints")
def _():
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        billing = load_module("billing")
        billing.charge("INV-1042", 25.5)
    reset_logging()
    assert out.getvalue() == "", "A library shouldn't print; its messages go through logging"


@hidden("Doesn't set a level on its own logger")
def _():
    reset_logging()
    load_module("billing")
    level = logging.getLogger("billing").level
    reset_logging()
    assert level == logging.NOTSET, "Leave levels to the application"

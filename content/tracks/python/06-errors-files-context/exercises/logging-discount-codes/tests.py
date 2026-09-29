import contextlib
import io
import logging
from decimal import Decimal

from plp import test, hidden
from solution import apply_discount

CODES = {"SUMMER10": 10, "STAFF25": 25}


class Recorder(logging.Handler):
    def __init__(self):
        super().__init__(logging.DEBUG)
        self.records = []

    def emit(self, record):
        self.records.append(record)


@contextlib.contextmanager
def captured_logs():
    """Collect every log record emitted while the block runs, from any logger."""
    root = logging.getLogger()
    recorder = Recorder()
    old_level = root.level
    logging.getLogger("solution").setLevel(logging.NOTSET)
    root.addHandler(recorder)
    root.setLevel(logging.DEBUG)
    try:
        yield recorder.records
    finally:
        root.removeHandler(recorder)
        root.setLevel(old_level)


def logged(records):
    return [(record.levelname, record.getMessage()) for record in records]


@test("Logs an applied code at INFO")
def _():
    with captured_logs() as records:
        assert apply_discount(Decimal("80.00"), "summer10", CODES) == Decimal("72.00")
    assert logged(records) == [("INFO", "applied SUMMER10: 80.00 -> 72.00")]


@test("Logs an unknown code at WARNING")
def _():
    with captured_logs() as records:
        assert apply_discount(Decimal("80.00"), "summr10", CODES) == Decimal("80.00")
    assert logged(records) == [("WARNING", "unknown discount code 'summr10'")]


@test("Logs nothing when there's no code")
def _():
    with captured_logs() as records:
        assert apply_discount(Decimal("80.00"), None, CODES) == Decimal("80.00")
        assert apply_discount(Decimal("80.00"), "", CODES) == Decimal("80.00")
    assert logged(records) == []


@test("Logs through the module's own logger")
def _():
    with captured_logs() as records:
        apply_discount(Decimal("20.00"), "STAFF25", CODES)
    assert [record.name for record in records] == ["solution"], (
        "Use log = logging.getLogger(__name__), not the root logger"
    )


@hidden("Doesn't print anything")
def _():
    out = io.StringIO()
    with contextlib.redirect_stdout(out), captured_logs():
        apply_discount(Decimal("80.00"), "summer10", CODES)
        apply_discount(Decimal("80.00"), "nope", CODES)
    assert out.getvalue() == "", "Log the messages instead of printing them"


@hidden("Rounds the discounted total to the cent")
def _():
    with captured_logs() as records:
        assert apply_discount(Decimal("19.99"), "Staff25", CODES) == Decimal("14.99")
    assert logged(records) == [("INFO", "applied STAFF25: 19.99 -> 14.99")]

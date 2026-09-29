import contextlib
import io
import logging

from plp import test, hidden, source_avoids
from solution import sync_orders

ORDERS = [{"id": "A1001"}, {"id": "A1002"}, {"id": "A1003"}]


class Shop:
    """A fake marketplace API that can't be reached for some orders."""

    def __init__(self, unreachable=()):
        self.unreachable = set(unreachable)
        self.uploaded = []

    def __repr__(self):
        return "shop"

    def upload(self, order):
        if order["id"] in self.unreachable:
            raise ConnectionError(f"marketplace timed out on {order['id']}")
        self.uploaded.append(order["id"])


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


@test("Logs each step, and the failed upload with its traceback")
def _():
    with captured_logs() as records:
        assert sync_orders(ORDERS, Shop(unreachable={"A1002"})) == 2
    assert logged(records) == [
        ("DEBUG", "syncing 3 orders"),
        ("ERROR", "could not upload order A1002"),
        ("WARNING", "synced 2 of 3 orders"),
    ]
    error = records[1]
    assert error.exc_info is not None, "Attach the traceback: use log.exception inside the except block"
    assert error.exc_info[0] is ConnectionError


@test("Logs INFO when every order is synced")
def _():
    with captured_logs() as records:
        assert sync_orders(ORDERS, Shop()) == 3
    assert logged(records) == [("DEBUG", "syncing 3 orders"), ("INFO", "synced all 3 orders")]


@test("Prints nothing at all")
def _():
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err), captured_logs():
        sync_orders(ORDERS, Shop(unreachable={"A1001"}))
    assert out.getvalue() == "", "Replace the print() calls with logging calls"
    assert err.getvalue() == "", "Replace traceback.print_exc() with log.exception()"


@test("No print() or traceback calls are left")
def _():
    assert source_avoids(call="print"), "Remove the print() calls"
    assert source_avoids(name="traceback"), "log.exception() replaces the traceback module here"


@hidden("Logs through the module's own logger")
def _():
    with captured_logs() as records:
        sync_orders(ORDERS[:1], Shop())
    assert {record.name for record in records} == {"solution"}, "Use log = logging.getLogger(__name__)"


@hidden("Carries on after several failures")
def _():
    with captured_logs() as records:
        assert sync_orders(ORDERS, Shop(unreachable={"A1001", "A1003"})) == 1
    assert logged(records) == [
        ("DEBUG", "syncing 3 orders"),
        ("ERROR", "could not upload order A1001"),
        ("ERROR", "could not upload order A1003"),
        ("WARNING", "synced 1 of 3 orders"),
    ]

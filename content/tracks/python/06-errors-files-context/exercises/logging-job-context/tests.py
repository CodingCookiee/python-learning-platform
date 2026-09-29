import contextlib
import logging

from plp import test, hidden, raises, source_uses
from solution import logged_job


class FakeClock:
    """Returns the given times in turn, then keeps returning the last one."""

    def __init__(self, *times):
        self.times = list(times)
        self.calls = 0

    def __call__(self):
        self.calls += 1
        return self.times.pop(0) if len(self.times) > 1 else self.times[0]


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


@test("Logs the start and the duration of a job that finishes")
def _():
    with captured_logs() as records:
        with logged_job("nightly import", clock=FakeClock(100.0, 102.5)):
            pass
    assert logged(records) == [("INFO", "nightly import started"), ("INFO", "nightly import finished in 2.5s")]


@test("Logs a failure with its traceback, and lets the error through")
def _():
    error = ValueError("row 17: amount 'n/a' isn't a number")
    with captured_logs() as records:
        with raises(ValueError) as caught:
            with logged_job("nightly import", clock=FakeClock(50.0, 50.8)):
                raise error
    assert caught.value is error, "The caller should get the very same exception"
    assert logged(records) == [("INFO", "nightly import started"), ("ERROR", "nightly import failed after 0.8s")]
    assert records[1].exc_info is not None, "Attach the traceback: log.exception inside an except block"
    assert records[1].exc_info[1] is error


@test("Is written with @contextmanager and logs through the module's logger")
def _():
    assert source_uses(name="contextmanager"), "Decorate logged_job with @contextmanager"
    with captured_logs() as records:
        with logged_job("send invoices", clock=FakeClock(0.0, 1.0)):
            pass
    assert {record.name for record in records} == {"solution"}, "Use log = logging.getLogger(__name__)"


@hidden("Reads the clock once at the start and once at the end")
def _():
    clock = FakeClock(10.0, 13.3)
    with captured_logs() as records:
        with logged_job("stock report", clock=clock):
            pass
    assert clock.calls == 2
    assert logged(records)[-1] == ("INFO", "stock report finished in 3.3s")


@hidden("Doesn't log success after a failure")
def _():
    with captured_logs() as records:
        with raises(KeyError):
            with logged_job("send invoices", clock=FakeClock(0.0, 4.0)):
                {}["customer"]
    assert [level for level, message in logged(records)] == ["INFO", "ERROR"]

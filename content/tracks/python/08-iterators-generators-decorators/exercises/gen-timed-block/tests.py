import inspect

from plp import test, hidden, raises
from solution import timed_block


def fake_clock(*readings):
    ticks = iter(readings)
    return lambda: next(ticks)


@test("Times a block and a decorated function")
def _():
    clock = fake_clock(0.0, 1.25, 5.0, 5.5)
    log = []
    with timed_block("export orders", log, clock=clock):
        pass
    assert log == ["export orders: 1.25s"]

    @timed_block("rebuild index", log, clock=clock)
    def rebuild_index():
        return "rebuilt"

    assert rebuild_index() == "rebuilt"
    assert log == ["export orders: 1.25s", "rebuild index: 0.50s"]


@test("Logs a failure, and the error still gets out")
def _():
    log = []
    with raises(ConnectionError, match="warehouse API down"):
        with timed_block("sync stock", log, clock=fake_clock(10.0, 12.0)):
            raise ConnectionError("warehouse API down")
    assert log == ["sync stock: failed after 2.00s"]


@test("Is written with @contextmanager")
def _():
    original = getattr(timed_block, "__wrapped__", None)
    assert original is not None and inspect.isgeneratorfunction(original), (
        "timed_block should be a generator function decorated with @contextmanager"
    )


@hidden("A decorated function is timed on every call")
def _():
    log = []

    @timed_block("send digest", log, clock=fake_clock(0.0, 1.0, 2.0, 2.5, 3.0, 6.0))
    def send_digest(customer):
        if customer == "bounced@example.com":
            raise ValueError("mailbox unavailable")
        return f"sent to {customer}"

    assert send_digest("ada@example.com") == "sent to ada@example.com"
    raises(ValueError, send_digest, "bounced@example.com")
    assert send_digest("grace@example.com") == "sent to grace@example.com"
    assert log == ["send digest: 1.00s", "send digest: failed after 0.50s", "send digest: 3.00s"]


@hidden("Works with the real clock")
def _():
    log = []
    with timed_block("quick job", log):
        sum(range(100))
    assert len(log) == 1 and log[0].startswith("quick job: 0.0")

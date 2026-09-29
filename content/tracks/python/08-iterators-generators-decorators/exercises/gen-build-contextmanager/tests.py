from plp import test, hidden, raises, source_avoids
from solution import my_contextmanager


@my_contextmanager
def connection(dsn, events):
    """Open a connection for the length of a with block."""
    events.append("connect")
    try:
        yield f"conn:{dsn}"
    finally:
        events.append("disconnect")


@test("Runs the setup, hands over the value, then cleans up")
def _():
    events = []
    with connection("orders-db", events) as conn:
        events.append(f"query on {conn}")
    assert events == ["connect", "query on conn:orders-db", "disconnect"]


@test("An exception is thrown in at the yield, and carries on out")
def _():
    events = []
    error = ConnectionError("dropped")
    with raises(ConnectionError) as caught:
        with connection("orders-db", events):
            raise error
    assert caught.value is error, "the caller should see the very exception the block raised"
    assert events == ["connect", "disconnect"]


@test("A generator that handles the exception suppresses it")
def _():
    @my_contextmanager
    def skip_missing(events):
        try:
            yield
        except KeyError as missing:
            events.append(f"skipped {missing}")

    events = []
    with skip_missing(events):
        {}["total"]
    events.append("carried on")
    assert events == ["skipped 'total'", "carried on"]


@test("Keeps the name and docstring, without contextlib")
def _():
    assert connection.__name__ == "connection"
    assert connection.__doc__ == "Open a connection for the length of a with block."
    assert source_avoids(name="contextlib.contextmanager"), "build it yourself, without contextlib.contextmanager"


@hidden("A different exception raised by the generator replaces the original")
def _():
    class ImportFailed(Exception):
        pass

    @my_contextmanager
    def import_step(name):
        try:
            yield
        except ValueError as error:
            raise ImportFailed(f"{name}: {error}")

    with raises(ImportFailed, match="prices: bad row"):
        with import_step("prices"):
            raise ValueError("bad row")


@hidden("A generator that never yields")
def _():
    @my_contextmanager
    def broken():
        if False:
            yield

    with raises(RuntimeError, match="didn't yield"):
        with broken():
            pass


@hidden("A generator that yields twice")
def _():
    @my_contextmanager
    def greedy():
        yield 1
        yield 2

    with raises(RuntimeError, match="didn't stop"):
        with greedy():
            pass

    @my_contextmanager
    def stubborn():
        try:
            yield
        except ValueError:
            yield

    with raises(RuntimeError, match=r"didn't stop after throw\(\)"):
        with stubborn():
            raise ValueError("oops")


@hidden("Each call makes a fresh generator")
def _():
    events = []
    first, second = connection("a", events), connection("b", events)
    with second as conn_b:
        with first as conn_a:
            events.append((conn_a, conn_b))
    assert events == ["connect", "connect", ("conn:a", "conn:b"), "disconnect", "disconnect"]

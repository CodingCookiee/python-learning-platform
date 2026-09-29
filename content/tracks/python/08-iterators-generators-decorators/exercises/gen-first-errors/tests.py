import inspect

from plp import test, hidden
from solution import first_slow_paths, parse_requests, slow


class Log:
    """A one-pass log that counts the lines read from it."""

    def __init__(self, lines):
        self._lines = iter(lines)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = next(self._lines)
        self.read += 1
        return line


def live_log(limit=5_000):
    """A log that's still being written: every fifth request is slow. Refuses to be read to the end."""
    for n in range(limit):
        yield f"/page/{n} 200 {1500 if n % 5 == 4 else 40}"
    raise AssertionError(
        f"Read {limit:,} lines of a live log that never ends: the pipeline should stop once it has n results"
    )


@test("Finds the first slow paths")
def _():
    log = ["/home 200 45", "/pay 200 1840", "garbage", "/cart 200 90", "/search 200 1200", "/pay 502 3000"]
    assert first_slow_paths(log, 1000, 2) == ["/pay", "/search"]


@test("parse_requests yields tuples and skips bad lines")
def _():
    lines = ["/home 200 45", "garbage", "/pay 200 abc", "/cart two 90", "/a b c d", "/cart 404 9"]
    assert list(parse_requests(lines)) == [("/home", 200, 45), ("/cart", 404, 9)]


@test("slow keeps only requests over the threshold")
def _():
    requests = [("/home", 200, 45), ("/pay", 200, 1000), ("/pay", 200, 1001)]
    assert list(slow(requests, 1000)) == [("/pay", 200, 1001)]


@test("Stops reading once it has enough")
def _():
    log = Log(["/a 200 5000", "/b 200 10", "/c 200 5000", "/d 200 5000", "/e 200 5000"])
    assert first_slow_paths(log, 1000, 2) == ["/a", "/c"]
    assert log.read == 3, f"it read {log.read} lines; it only needed 3"


@test("Works on a log that never ends")
def _():
    assert first_slow_paths(live_log(), 1000, 3) == ["/page/4", "/page/9", "/page/14"]


@hidden("parse_requests and slow are lazy")
def _():
    assert inspect.isgenerator(parse_requests(iter([]))), "parse_requests(...) should return a generator"
    requests = slow(iter([]), 10)
    assert iter(requests) is requests, "slow(...) should return an iterator, not a list"


@hidden("Fewer slow requests than asked for")
def _():
    assert first_slow_paths(["/a 200 5", "/b 200 2000"], 1000, 5) == ["/b"]
    assert first_slow_paths([], 1000, 5) == []

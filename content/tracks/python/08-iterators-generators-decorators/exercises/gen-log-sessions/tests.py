from datetime import datetime, timedelta

from plp import test, hidden
from solution import sessions

MORNING = datetime(2026, 9, 28, 9, 0)


def at(minutes, path):
    return (MORNING + timedelta(minutes=minutes), path)


def paths(found):
    return [[path for _, path in session] for session in found]


class Stream:
    """A one-pass click stream that counts the clicks read from it."""

    def __init__(self, clicks):
        self._clicks = iter(clicks)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        click = next(self._clicks)
        self.read += 1
        return click


def endless_clicks(limit=2_000):
    """Three clicks ten minutes apart, then a two-hour break, forever. Refuses to be read to the end."""
    minutes = 0
    for n in range(limit):
        yield at(minutes, f"/page-{n}")
        minutes += 120 if n % 3 == 2 else 10
    raise AssertionError(
        f"sessions() read {limit:,} clicks from an endless stream: it should yield each session as soon as it ends"
    )


@test("Splits the clicks where the gap is over 30 minutes")
def _():
    clicks = [
        (datetime(2026, 9, 28, 9, 0), "/home"),
        (datetime(2026, 9, 28, 9, 5), "/shop"),
        (datetime(2026, 9, 28, 11, 0), "/home"),
        (datetime(2026, 9, 28, 11, 20), "/cart"),
    ]
    assert paths(sessions(clicks)) == [["/home", "/shop"], ["/home", "/cart"]]


@test("Yields the full (timestamp, path) clicks")
def _():
    clicks = [at(0, "/home"), at(40, "/shop")]
    assert list(sessions(clicks)) == [[at(0, "/home")], [at(40, "/shop")]]


@test("A gap of exactly 30 minutes is the same session")
def _():
    clicks = [at(0, "/home"), at(30, "/shop"), at(61, "/cart")]
    assert paths(sessions(clicks)) == [["/home", "/shop"], ["/cart"]]


@test("Yields a session as soon as the next one starts")
def _():
    stream = Stream([at(0, "/a"), at(5, "/b"), at(10, "/c"), at(100, "/d"), at(105, "/e")])
    first = next(sessions(stream))
    assert [path for _, path in first] == ["/a", "/b", "/c"]
    assert stream.read == 4, f"it read {stream.read} clicks to finish the first session; it only needs 4"


@test("Works on an endless stream")
def _():
    found = sessions(endless_clicks())
    assert paths([next(found), next(found)]) == [["/page-0", "/page-1", "/page-2"], ["/page-3", "/page-4", "/page-5"]]


@hidden("A custom gap")
def _():
    clicks = [at(0, "/home"), at(6, "/shop"), at(10, "/cart")]
    assert paths(sessions(clicks, gap=timedelta(minutes=5))) == [["/home"], ["/shop", "/cart"]]


@hidden("No clicks, no sessions; one click, one session")
def _():
    assert list(sessions([])) == []
    assert paths(sessions([at(0, "/home")])) == [["/home"]]


@hidden("Each session is its own list")
def _():
    found = list(sessions([at(0, "/a"), at(60, "/b"), at(120, "/c")]))
    assert paths(found) == [["/a"], ["/b"], ["/c"]]

import inspect
from itertools import islice

from plp import test, hidden, source_uses
from solution import all_lines


class LogFile:
    """A one-pass log file that counts the lines read from it."""

    def __init__(self, lines):
        self._lines = iter(lines)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = next(self._lines)
        self.read += 1
        return line


@test("Joins the logs into one stream")
def _():
    web1 = ["GET /", "POST /pay"]
    web2 = ["GET /cart"]
    assert list(all_lines(web1, web2)) == ["GET /", "POST /pay", "GET /cart"]


@test("Uses yield from")
def _():
    assert inspect.isgeneratorfunction(all_lines), "all_lines should be a generator function"
    assert source_uses(node="YieldFrom"), "delegate to each source with yield from"


@test("Reads lazily, only as far as needed")
def _():
    web1, web2 = LogFile(["GET /", "POST /pay"]), LogFile(["GET /cart", "GET /faq"])
    lines = all_lines(web1, web2)
    assert (web1.read, web2.read) == (0, 0), "all_lines(...) shouldn't read anything until asked"
    assert list(islice(lines, 3)) == ["GET /", "POST /pay", "GET /cart"]
    assert (web1.read, web2.read) == (2, 1)


@hidden("Skips empty sources, and no sources yields nothing")
def _():
    assert list(all_lines([], ["GET /"], [])) == ["GET /"]
    assert list(all_lines()) == []

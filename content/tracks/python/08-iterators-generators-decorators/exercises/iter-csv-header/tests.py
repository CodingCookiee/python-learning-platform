from plp import test, hidden, raises
from solution import split_header


class Stream:
    """A one-pass stream of lines that counts how many have been read."""

    def __init__(self, lines):
        self._lines = iter(lines)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = next(self._lines)
        self.read += 1
        return line


@test("Splits the header from the rows")
def _():
    header, rest = split_header(["id,total", "A1,12.50", "A2,8.00"])
    assert header == "id,total"
    assert list(rest) == ["A1,12.50", "A2,8.00"]


@test("Works on a stream that can only be read once")
def _():
    header, rest = split_header(Stream(["sku,qty", "MUG,2", "V60,1"]))
    assert header == "sku,qty"
    assert list(rest) == ["MUG,2", "V60,1"]


@test("Reads only the header line")
def _():
    stream = Stream(["id,total", "A1,12.50", "A2,8.00", "A3,1.00"])
    split_header(stream)
    assert stream.read == 1, f"split_header read {stream.read} lines from the stream; it should read only the header"


@test("An empty stream has no header")
def _():
    with raises(ValueError, match="no header row"):
        split_header([])


@hidden("rest is an iterator, not a list")
def _():
    _, rest = split_header(["id", "A1"])
    assert iter(rest) is rest, "rest should be an iterator (iter(rest) is rest), not a list or other container"


@hidden("A header with no rows leaves an empty rest")
def _():
    header, rest = split_header(iter(["id,total"]))
    assert header == "id,total"
    assert list(rest) == []

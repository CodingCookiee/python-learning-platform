from plp import test, hidden
from solution import parse_price


@test("Parses an ordinary price")
def _():
    assert parse_price("12.50") == 12.5


@test("Returns None for malformed numbers instead of crashing")
def _():
    assert parse_price("1.2.3") is None


@test("Accepts negative prices (refunds)")
def _():
    assert parse_price("-4.50") == -4.5


@test("Accepts spaces around the number")
def _():
    assert parse_price(" 9.99 ") == 9.99


@hidden("Returns None for words, empty text and superscript digits")
def _():
    assert parse_price("free") is None
    assert parse_price("") is None
    assert parse_price("²") is None


@hidden("Accepts whole numbers")
def _():
    assert parse_price("20") == 20.0

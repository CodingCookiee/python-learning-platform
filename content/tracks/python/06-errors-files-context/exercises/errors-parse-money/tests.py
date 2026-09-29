from decimal import Decimal

from plp import test, hidden, raises
from solution import parse_money


def refused(text):
    """Check parse_money(text) raises the right ValueError, and return it."""
    error = raises(ValueError, parse_money, text).value
    assert str(error) == f"not a money amount: {text!r}"
    return error


@test("Parses an amount and a currency")
def _():
    assert parse_money("12.50 EUR") == (Decimal("12.50"), "EUR")
    assert str(parse_money("12.50 EUR")[0]) == "12.50"


@test("Ignores surrounding whitespace")
def _():
    assert parse_money("  1200 JPY ") == (Decimal("1200"), "JPY")


@test("Refuses text with no currency, and hides the unpacking error")
def _():
    error = refused("12.50")
    assert error.__suppress_context__ is True, "Raise it from None, so the unpacking error isn't shown"


@test("Refuses an amount that isn't a number, and hides Decimal's error")
def _():
    error = refused("twelve EUR")
    assert error.__suppress_context__ is True, "Raise it from None, so InvalidOperation isn't shown"


@test("Refuses a currency that isn't three capital letters")
def _():
    refused("12.50 euro")
    refused("12.50 EU")


@hidden("Refuses NaN and Infinity")
def _():
    refused("NaN EUR")
    refused("Infinity GBP")


@hidden("Refuses extra words and empty text")
def _():
    refused("12.50 EUR today")
    refused("")


@hidden("Accepts negative and fractional amounts")
def _():
    assert parse_money("-3.99 GBP") == (Decimal("-3.99"), "GBP")
    assert parse_money("0.001 BTC") == (Decimal("0.001"), "BTC")

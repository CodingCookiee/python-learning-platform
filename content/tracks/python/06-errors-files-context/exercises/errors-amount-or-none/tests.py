from plp import test, hidden, raises
from solution import to_amount


class GatewayAmount:
    """An amount object whose conversion fails with an unrelated error."""

    def __float__(self):
        raise RuntimeError("gateway connection lost")

    def __repr__(self):
        return "GatewayAmount()"


@test("Converts strings and numbers")
def _():
    assert to_amount("12.50") == 12.5
    assert to_amount(3) == 3.0


@test("Returns None for text that isn't a number")
def _():
    assert to_amount("twelve") is None


@test("Returns None for None")
def _():
    assert to_amount(None) is None


@hidden("Returns None for other values float() refuses")
def _():
    assert to_amount("") is None
    assert to_amount(["12.50"]) is None


@hidden("Lets unrelated errors through")
def _():
    raises(RuntimeError, to_amount, GatewayAmount())

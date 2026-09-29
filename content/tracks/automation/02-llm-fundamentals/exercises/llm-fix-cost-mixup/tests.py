from decimal import Decimal

from plp import hidden, test
from solution import Usage, call_cost

# EXAMPLE prices, invented for practice
SMALL = {"input": Decimal("0.50"), "output": Decimal("2.00")}
LARGE = {"input": Decimal("12.00"), "output": Decimal("48.00")}


@test("Prices a summary call, like the example")
def _():
    assert call_cost(Usage(input_tokens=1_800, output_tokens=120), SMALL) == Decimal("0.00114")


@test("Input tokens pay the input price")
def _():
    assert call_cost(Usage(input_tokens=1_000_000, output_tokens=0), LARGE) == Decimal("12")


@test("Output tokens pay the output price")
def _():
    assert call_cost(Usage(input_tokens=0, output_tokens=1_000_000), LARGE) == Decimal("48")


@hidden("Returns an exact Decimal")
def _():
    cost = call_cost(Usage(input_tokens=3, output_tokens=7), SMALL)
    assert isinstance(cost, Decimal)
    assert cost == Decimal("0.0000155")

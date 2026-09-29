from decimal import Decimal

from plp import hidden, raises, test
from solution import projected_cost, steps_within_budget

PRICE = {"input": Decimal("3.00"), "output": Decimal("15.00")}
SIZES = {"first_input": 350, "growth_per_step": 200, "output_per_step": 100}


@test("Prices the example: four steps cost $0.0138")
def _():
    assert projected_cost(4, **SIZES, price=PRICE) == Decimal("0.0138")
    assert steps_within_budget(Decimal("0.0138"), **SIZES, price=PRICE) == 4


@test("Returns a Decimal, and zero steps cost nothing")
def _():
    assert isinstance(projected_cost(4, **SIZES, price=PRICE), Decimal)
    assert projected_cost(0, **SIZES, price=PRICE) == Decimal("0")


@test("Cost grows faster than the number of steps")
def _():
    ten = projected_cost(10, first_input=1_280, growth_per_step=600, output_per_step=150, price=PRICE)
    twenty = projected_cost(20, first_input=1_280, growth_per_step=600, output_per_step=150, price=PRICE)
    assert ten == Decimal("0.1419")
    assert twenty == Decimal("0.4638")


@test("A budget just under a step's cost allows one step fewer")
def _():
    assert steps_within_budget(Decimal("0.0137"), **SIZES, price=PRICE) == 3
    assert steps_within_budget(Decimal("0.001"), **SIZES, price=PRICE) == 0


@hidden("Refuses a negative number of steps")
def _():
    raises(ValueError, projected_cost, -1, **SIZES, price=PRICE)


@hidden("Works with other prices and sizes")
def _():
    cheap = {"input": Decimal("0.25"), "output": Decimal("1.25")}
    assert projected_cost(3, first_input=1_000, growth_per_step=0, output_per_step=200, price=cheap) == Decimal("0.0015")
    assert steps_within_budget(Decimal("0.01"), first_input=1_000, growth_per_step=0, output_per_step=200, price=cheap) == 20

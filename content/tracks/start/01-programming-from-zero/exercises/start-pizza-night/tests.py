import re

from plp import test, hidden, run_program, solution_source


def with_values(**values):
    """The learner's program with some of the starting amounts changed."""
    source = solution_source()
    for name, value in values.items():
        pattern = rf"^(\s*{name}\s*=\s*)\d+\b"
        assert re.search(pattern, source, re.M), f"Keep the line from the starter that sets {name}"
        source = re.sub(pattern, rf"\g<1>{value}", source, count=1, flags=re.M)
    return source


@test("Prints the cost of the pizzas")
def _():
    assert run_program().lines[:1] == ["Pizzas: 27"]


@test("Prints all three lines")
def _():
    assert run_program().lines == ["Pizzas: 27", "Drinks: 10", "Total: 37"]


@hidden("Follows a change of prices")
def _():
    assert run_program(source=with_values(pizza_price=10, drink_price=3)).lines == [
        "Pizzas: 30",
        "Drinks: 15",
        "Total: 45",
    ], "When a pizza costs 10 and a drink 3, the totals should change too: work them out from the names"


@hidden("Follows a change in how many you order")
def _():
    assert run_program(source=with_values(pizzas=2, drinks=4)).lines == [
        "Pizzas: 18",
        "Drinks: 8",
        "Total: 26",
    ], "When you order 2 pizzas and 4 drinks, the totals should change too: work them out from the names"

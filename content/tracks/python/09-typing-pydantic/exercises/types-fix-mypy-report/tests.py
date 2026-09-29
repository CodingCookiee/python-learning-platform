from plp import hidden, test, typecheck
from solution import line_label, parse_quantity, shipping_band


@test("Parses, labels and bands like the example")
def _():
    assert parse_quantity(" 3 ") == 3
    assert line_label("MUG-01", 3) == "MUG-01 x3"
    assert shipping_band(25_000) == "large"


@test("mypy --strict passes", timeout=None)
def _():
    problems = typecheck(strict=True).errors
    assert problems == [], "mypy --strict reports:\n" + "\n".join(problems)


@test("Bands at the edges")
def _():
    assert shipping_band(2000) == "small"
    assert shipping_band(2001) == "medium"
    assert shipping_band(10000) == "medium"
    assert shipping_band(10001) == "large"


@hidden("Handles other quantities")
def _():
    assert parse_quantity("12\n") == 12
    assert type(parse_quantity("7")) is int
    assert line_label("BEANS-1KG", 10) == "BEANS-1KG x10"

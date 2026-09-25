from plp import test, hidden
from solution import customer_changes


@test("Splits customers into returning, new and lapsed")
def _():
    last_month = ["ada", "grace", "linus", "grace"]
    this_month = ["grace", "ken", "linus", "ken", "barbara"]
    assert customer_changes(last_month, this_month) == ({"grace", "linus"}, {"ken", "barbara"}, {"ada"})


@test("Returns three sets")
def _():
    result = customer_changes(["ada"], ["ada"])
    assert type(result) is tuple and len(result) == 3, "customer_changes should return a tuple of three sets"
    for part in result:
        assert type(part) is set, f"Expected each part to be a set, but got a {type(part).__name__}"


@test("Everyone is new when last month was empty")
def _():
    assert customer_changes([], ["ada", "grace"]) == (set(), {"ada", "grace"}, set())


@hidden("Everyone has lapsed when this month is empty")
def _():
    assert customer_changes(["ada", "ada"], []) == (set(), set(), {"ada"})


@hidden("Leaves both lists unchanged")
def _():
    last_month, this_month = ["ada", "grace"], ["grace"]
    customer_changes(last_month, this_month)
    assert last_month == ["ada", "grace"]
    assert this_month == ["grace"]

from plp import test, hidden
from solution import orders_by_customer


@test("Collects every order for each customer")
def _():
    orders = [
        ("ORD-1040", "ada"),
        ("ORD-1041", "grace"),
        ("ORD-1042", "ada"),
        ("ORD-1043", "ada"),
    ]
    assert orders_by_customer(orders) == {
        "ada": ["ORD-1040", "ORD-1042", "ORD-1043"],
        "grace": ["ORD-1041"],
    }


@test("Returns an empty dict for no orders")
def _():
    assert orders_by_customer([]) == {}


@test("Keeps a customer with a single order")
def _():
    assert orders_by_customer([("ORD-2001", "linus")]) == {"linus": ["ORD-2001"]}


@hidden("Lists customers in the order they first ordered")
def _():
    orders = [("ORD-1", "grace"), ("ORD-2", "ada"), ("ORD-3", "grace"), ("ORD-4", "linus")]
    assert list(orders_by_customer(orders)) == ["grace", "ada", "linus"]


@hidden("Gives each customer their own list")
def _():
    groups = orders_by_customer([("ORD-1", "grace"), ("ORD-2", "ada")])
    groups["grace"].append("ORD-99")
    assert groups["ada"] == ["ORD-2"], "Adding to one customer's list changed another customer's list"

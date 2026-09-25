from plp import test, hidden
from solution import revenue_by_customer

ORDERS = [
    {"id": "A1", "customer": "ada", "total": 20.0},
    {"id": "A2", "customer": "grace", "total": 12.0},
    {"id": "A3", "customer": "ada", "total": 22.5},
]


@test("Counts every order, even when a customer's orders aren't together")
def _():
    assert revenue_by_customer(ORDERS) == {"ada": 42.5, "grace": 12.0}


@test("Still works when the orders are already grouped")
def _():
    orders = [ORDERS[0], ORDERS[2], ORDERS[1]]
    assert revenue_by_customer(orders) == {"ada": 42.5, "grace": 12.0}


@test("Leaves the caller's list in its original order")
def _():
    orders = list(ORDERS)
    revenue_by_customer(orders)
    assert [o["id"] for o in orders] == ["A1", "A2", "A3"]


@hidden("Handles many customers in a shuffled order")
def _():
    orders = [
        {"id": "B1", "customer": "linus", "total": 5},
        {"id": "B2", "customer": "ada", "total": 1},
        {"id": "B3", "customer": "grace", "total": 2},
        {"id": "B4", "customer": "linus", "total": 5},
        {"id": "B5", "customer": "ada", "total": 3},
        {"id": "B6", "customer": "linus", "total": 10},
    ]
    assert revenue_by_customer(orders) == {"ada": 4, "grace": 2, "linus": 20}


@hidden("Returns an empty dict for no orders")
def _():
    assert revenue_by_customer([]) == {}

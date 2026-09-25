from plp import test, hidden, source_uses
from solution import status_counts, orders_by_customer

ORDERS = [
    {"id": "A1", "customer": "ada", "status": "paid"},
    {"id": "A2", "customer": "grace", "status": "refunded"},
    {"id": "A3", "customer": "ada", "status": "paid"},
]


@test("Still gives the same answers")
def _():
    assert status_counts(ORDERS) == {"paid": 2, "refunded": 1}
    assert orders_by_customer(ORDERS) == {"ada": ["A1", "A3"], "grace": ["A2"]}


@test("status_counts uses Counter")
def _():
    assert source_uses(call="Counter"), "Build the counts with Counter(...)"


@test("orders_by_customer uses defaultdict")
def _():
    assert source_uses(call="defaultdict"), "Build the groups with defaultdict(list)"


@hidden("Handles an empty list of orders")
def _():
    assert status_counts([]) == {}
    assert orders_by_customer([]) == {}


@hidden("Keeps each customer's orders in input order")
def _():
    orders = [
        {"id": "B9", "customer": "linus", "status": "pending"},
        {"id": "B2", "customer": "linus", "status": "paid"},
        {"id": "B5", "customer": "linus", "status": "paid"},
    ]
    assert orders_by_customer(orders) == {"linus": ["B9", "B2", "B5"]}
    assert status_counts(orders) == {"pending": 1, "paid": 2}

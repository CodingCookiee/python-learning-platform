import json

from plp import test, hidden
from solution import customer_totals

PAYLOAD = json.dumps({"orders": [
    {"id": "A1", "customer": "grace", "total": 20.0, "status": "paid"},
    {"id": "A2", "customer": "ada", "total": 12.5, "status": "paid"},
    {"id": "A3", "customer": "grace", "total": 7.25, "status": "refunded"},
    {"id": "A4", "customer": "grace", "total": 5.1, "status": "paid"},
]})


@test("Totals each customer's paid orders")
def _():
    assert json.loads(customer_totals(PAYLOAD)) == {"ada": 12.5, "grace": 25.1}


@test("Returns JSON text with the keys in alphabetical order")
def _():
    result = customer_totals(PAYLOAD)
    assert isinstance(result, str), "Return JSON text (a str), not a dict"
    assert list(json.loads(result)) == ["ada", "grace"]


@test("Leaves out customers with no paid orders")
def _():
    payload = json.dumps({"orders": [
        {"id": "B1", "customer": "linus", "total": 9.99, "status": "refunded"},
        {"id": "B2", "customer": "ada", "total": 3.0, "status": "paid"},
    ]})
    assert json.loads(customer_totals(payload)) == {"ada": 3.0}


@hidden("Rounds totals to cents")
def _():
    payload = json.dumps({"orders": [
        {"id": "C1", "customer": "guido", "total": 0.1, "status": "paid"},
        {"id": "C2", "customer": "guido", "total": 0.2, "status": "paid"},
    ]})
    assert json.loads(customer_totals(payload)) == {"guido": 0.3}


@hidden("An export with no orders gives an empty object")
def _():
    assert json.loads(customer_totals('{"orders": []}')) == {}


@hidden("Raises ValueError for text that isn't JSON")
def _():
    try:
        customer_totals("{'orders': []}")
    except ValueError:
        return
    raise AssertionError("customer_totals should raise ValueError for invalid JSON")

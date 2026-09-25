from plp import test, hidden, source_avoids, source_uses
from solution import overdue_ids, paid_totals

INVOICES = [
    {"id": "INV-7", "net": 100.0, "status": "paid", "due_day": 3},
    {"id": "INV-8", "net": 45.5, "status": "sent", "due_day": 10},
    {"id": "INV-9", "net": 20.0, "status": "sent", "due_day": 30},
]


@test("The results are unchanged")
def _():
    assert paid_totals(INVOICES) == [120.0]
    assert overdue_ids(INVOICES, 14) == ["INV-8"]


@test("No map() or filter() calls are left")
def _():
    assert source_avoids(call="map"), "Replace map() with a list comprehension"
    assert source_avoids(call="filter"), "Replace filter() with the if part of a comprehension"


@test("No lambdas are left")
def _():
    assert source_avoids(node="Lambda"), "A comprehension doesn't need a lambda: put the expression in directly"


@test("Uses list comprehensions")
def _():
    assert source_uses(node="ListComp"), "Write each function as a list comprehension"


@hidden("Handles several paid invoices, and none")
def _():
    invoices = [
        {"id": "A", "net": 10.0, "status": "paid", "due_day": 1},
        {"id": "B", "net": 0.1, "status": "paid", "due_day": 1},
    ]
    assert paid_totals(invoices) == [12.0, 0.12]
    assert paid_totals([]) == []
    assert overdue_ids(invoices, 99) == []


@hidden("Returns lists, not iterators")
def _():
    assert type(paid_totals(INVOICES)) is list
    assert type(overdue_ids(INVOICES, 14)) is list

from decimal import Decimal

from plp import test, hidden
from solution import import_payments

ROWS = [
    {"id": "P-1", "amount": "12.50", "currency": "EUR"},
    {"id": "P-2", "amount": "n/a", "currency": "EUR"},
    {"id": "P-3", "amount": "7.25", "currency": "GBP"},
    {"id": "P-4", "amount": "3.00"},
    {"id": "P-5", "amount": "-2.50", "currency": "EUR"},
]


@test("Totals the good rows and reports the two bad ones")
def _():
    assert import_payments(ROWS) == {
        "totals": {"EUR": Decimal("10.00"), "GBP": Decimal("7.25")},
        "rejected": [(2, "bad amount 'n/a'"), (4, "missing currency")],
    }


@test("A row without an amount is reported as missing amount")
def _():
    rows = [{"id": "P-9", "currency": "EUR"}, {"id": "P-10"}]
    assert import_payments(rows)["rejected"] == [(1, "missing amount"), (2, "missing amount")]


@test("A clean file has no rejects")
def _():
    rows = [{"id": "P-1", "amount": "5", "currency": "USD"}, {"id": "P-2", "amount": "0.99", "currency": "USD"}]
    assert import_payments(rows) == {"totals": {"USD": Decimal("5.99")}, "rejected": []}


@hidden("Keeps currencies in the order they first appear")
def _():
    rows = [
        {"amount": "1", "currency": "JPY"},
        {"amount": "2", "currency": "EUR"},
        {"amount": "3", "currency": "JPY"},
    ]
    assert list(import_payments(rows)["totals"].items()) == [("JPY", Decimal("4")), ("EUR", Decimal("2"))]


@hidden("An empty file gives empty results")
def _():
    assert import_payments([]) == {"totals": {}, "rejected": []}


@hidden("Every bad row is reported, not just the first")
def _():
    rows = [{"amount": "abc", "currency": "EUR"}, {"amount": "", "currency": "EUR"}, {"currency": "EUR"}]
    assert import_payments(rows)["rejected"] == [(1, "bad amount 'abc'"), (2, "bad amount ''"), (3, "missing amount")]

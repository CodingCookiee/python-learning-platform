import inspect

import solution
from plp import test, hidden, raises
from solution import audited, refund, void


@test("Refunds with a reason, and records the call")
def _():
    solution.AUDIT_TRAIL.clear()
    assert refund("A1", 12.5, reason="damaged") == "refunded 12.50 on A1"
    assert solution.AUDIT_TRAIL == [("refund", ("A1", 12.5), {"reason": "damaged"})]


@test("Returns what the function returns")
def _():
    solution.AUDIT_TRAIL.clear()
    assert void("A2") == "voided A2"
    assert refund("A3", 8) == "refunded 8.00 on A3"
    assert solution.AUDIT_TRAIL == [("void", ("A2",), {}), ("refund", ("A3", 8), {})]


@test("Keeps each function's name and docstring")
def _():
    assert (refund.__name__, void.__name__) == ("refund", "void")
    assert refund.__doc__ == "Refund part or all of an order."
    assert str(inspect.signature(refund)) == "(order_id, amount, *, reason='')"


@hidden("Works on any function, with any arguments")
def _():
    solution.AUDIT_TRAIL.clear()

    @audited
    def credit(customer_id, *amounts, currency="GBP", **notes):
        return (customer_id, sum(amounts), currency, notes)

    assert credit("C1", 5, 10, currency="EUR", ticket="T-9") == ("C1", 15, "EUR", {"ticket": "T-9"})
    assert solution.AUDIT_TRAIL == [("credit", ("C1", 5, 10), {"currency": "EUR", "ticket": "T-9"})]


@hidden("A call that fails is still recorded, and still fails")
def _():
    solution.AUDIT_TRAIL.clear()
    raises(TypeError, refund, "A1")
    assert len(solution.AUDIT_TRAIL) == 1

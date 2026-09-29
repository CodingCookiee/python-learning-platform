from decimal import Decimal

from plp import hidden, test
from solution import retainer_invoice


@test("Invoices the clinic's month: fee, extra time and usage")
def _():
    assert retainer_invoice(fee=400, included_hours=5, hours_used=Decimal("6.2"), overage_rate=60,
                            ai_cost=Decimal("52.40")) == {
        "lines": [("Maintenance retainer (5 hours included)", Decimal("400.00")),
                  ("Extra support: 1.5 hours at 60", Decimal("90.00")),
                  ("AI and API usage, passed through", Decimal("65.50"))],
        "total": Decimal("555.50")}


@test("A quiet month is just the fee: unused hours don't carry over")
def _():
    assert retainer_invoice(fee=400, included_hours=5, hours_used=2, overage_rate=60) == {
        "lines": [("Maintenance retainer (5 hours included)", Decimal("400.00"))],
        "total": Decimal("400.00")}


@test("Using exactly the included hours bills no extra")
def _():
    invoice = retainer_invoice(fee=400, included_hours=5, hours_used=5, overage_rate=60, ai_cost=Decimal("8"))
    assert [description for description, _ in invoice["lines"]] == [
        "Maintenance retainer (5 hours included)", "AI and API usage, passed through"]
    assert invoice["total"] == Decimal("410.00")


@test("Extra time rounds up to the billing increment")
def _():
    lines = retainer_invoice(fee=300, included_hours=4, hours_used=Decimal("4.1"), overage_rate=50,
                             increment=Decimal("0.25"))["lines"]
    assert lines[1] == ("Extra support: 0.25 hours at 50", Decimal("12.50"))


@hidden("Whole extra hours stay whole")
def _():
    lines = retainer_invoice(fee=300, included_hours=4, hours_used=7, overage_rate=50, increment=1)["lines"]
    assert lines[1] == ("Extra support: 3 hours at 50", Decimal("150.00"))


@hidden("The AI line rounds half up to the cent")
def _():
    # 10.01 / 0.8 = 12.5125
    invoice = retainer_invoice(fee=250, included_hours=3, hours_used=0, overage_rate=60, ai_cost=Decimal("10.01"))
    assert invoice["lines"][-1] == ("AI and API usage, passed through", Decimal("12.51"))
    assert invoice["total"] == Decimal("262.51")

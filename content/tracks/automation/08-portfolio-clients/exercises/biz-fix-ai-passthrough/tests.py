from decimal import Decimal

from plp import hidden, test
from solution import monthly_invoice


@test("The agency's invoice includes the AI usage in the total")
def _():
    assert monthly_invoice(support_hours=4, hourly_rate=60, ai_calls=9000,
                           cost_per_call=Decimal("0.004"), ai_margin=Decimal("0.2")) == {
        "lines": [("Support and monitoring", Decimal("240.00")),
                  ("AI usage (passed through)", Decimal("45.00"))],
        "total": Decimal("285.00")}


@test("The total is the sum of every line")
def _():
    invoice = monthly_invoice(support_hours=2, hourly_rate=50, ai_calls=20000,
                              cost_per_call=Decimal("0.002"), ai_margin=Decimal("0.2"))
    assert invoice["total"] == sum(amount for _, amount in invoice["lines"])


@test("The AI line is priced at a margin: a quarter of 48 is 12")
def _():
    invoice = monthly_invoice(support_hours=0, hourly_rate=60, ai_calls=12000,
                              cost_per_call=Decimal("0.003"), ai_margin=Decimal("0.25"))
    assert invoice["lines"][1] == ("AI usage (passed through)", Decimal("48.00"))


@hidden("A zero margin passes the usage through at cost")
def _():
    invoice = monthly_invoice(support_hours=3, hourly_rate=40, ai_calls=5000,
                              cost_per_call=Decimal("0.01"), ai_margin=0)
    assert invoice["total"] == Decimal("170.00")


@hidden("The AI line is rounded to the cent")
def _():
    # 1,234 calls at 0.0037 = 4.5658; / 0.8 = 5.70725
    invoice = monthly_invoice(support_hours=1, hourly_rate=60, ai_calls=1234,
                              cost_per_call=Decimal("0.0037"), ai_margin=Decimal("0.2"))
    assert invoice["lines"][1][1] == Decimal("5.71")
    assert invoice["total"] == Decimal("65.71")

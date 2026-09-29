from decimal import Decimal

from plp import hidden, raises, test
from solution import quote


@test("Quotes the agency's report automation")
def _():
    assert quote(hours=40, hourly_rate=60, risk_buffer=Decimal("0.2"), ai_cost_per_month=120) == {
        "build": Decimal("2900"), "ai_per_month": Decimal("150.00"), "first_year": Decimal("4700.00")}


@test("A build price that's already a multiple isn't rounded further")
def _():
    # 40 h + 25% = 50 h at 48 = 2400
    assert quote(hours=40, hourly_rate=48, risk_buffer=Decimal("0.25"))["build"] == Decimal("2400")


@test("The AI line is priced at a margin, not a markup")
def _():
    # 90 / (1 - 0.25) = 120, where a 25% markup would give 112.50
    result = quote(hours=10, hourly_rate=50, risk_buffer=0, ai_cost_per_month=90, ai_margin=Decimal("0.25"))
    assert result["ai_per_month"] == Decimal("120.00")
    assert result["first_year"] == Decimal("1940.00")


@test("round_to sets the step")
def _():
    # 12 h + 10% = 13.2 h at 55 = 726
    assert quote(hours=12, hourly_rate=55, risk_buffer=Decimal("0.1"), round_to=100)["build"] == Decimal("800")
    assert quote(hours=12, hourly_rate=55, risk_buffer=Decimal("0.1"), round_to=1)["build"] == Decimal("726")


@hidden("No AI usage means no AI line")
def _():
    assert quote(hours=20, hourly_rate=45, risk_buffer=Decimal("0.15")) == {
        "build": Decimal("1050"), "ai_per_month": Decimal("0.00"), "first_year": Decimal("1050.00")}


@hidden("The AI line rounds half up to the cent")
def _():
    # 100 / 0.7 = 142.857...
    assert quote(hours=1, hourly_rate=50, risk_buffer=0, ai_cost_per_month=100,
                 ai_margin=Decimal("0.3"))["ai_per_month"] == Decimal("142.86")


@hidden("Refuses impossible margins and negative buffers")
def _():
    raises(ValueError, quote, hours=10, hourly_rate=50, risk_buffer=0, ai_margin=1)
    raises(ValueError, quote, hours=10, hourly_rate=50, risk_buffer=0, ai_margin=Decimal("-0.1"))
    raises(ValueError, quote, hours=10, hourly_rate=50, risk_buffer=Decimal("-0.1"))

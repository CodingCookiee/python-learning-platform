from decimal import Decimal

from plp import hidden, test
from solution import plan_backlog

# EXAMPLE numbers, invented for practice
EXCEPTIONS = {"name": "Delivery exception emails", "runs_per_month": 650, "minutes_per_run": 4,
              "error_rate": Decimal("0.02"), "cost_per_error": 40, "strategic": "high", "build_days": 6}
TIMESHEETS = {"name": "Driver timesheets", "runs_per_month": 80, "minutes_per_run": 10,
              "strategic": "low", "build_days": 3}
ROUTES = {"name": "Route planning", "runs_per_month": 22, "minutes_per_run": 90,
          "error_rate": Decimal("0.1"), "cost_per_error": 300, "strategic": "high", "build_days": 30}
CUSTOMS = {"name": "Customs paperwork", "runs_per_month": 12, "minutes_per_run": 45, "build_days": 15}
RATE = Decimal("25")


@test("Sorts the logistics backlog into the four boxes")
def _():
    assert plan_backlog([EXCEPTIONS, TIMESHEETS, ROUTES, CUSTOMS],
                        hourly_rate=RATE, value_bar=2000, effort_bar=10) == {
        "quick wins": ["Delivery exception emails"],
        "big bets": ["Route planning"],
        "fill-ins": ["Driver timesheets"],
        "money pits": ["Customs paperwork"],
    }


@test("Every box is there, even when it's empty")
def _():
    assert plan_backlog([], hourly_rate=RATE, value_bar=2000, effort_bar=10) == {
        "quick wins": [], "big bets": [], "fill-ins": [], "money pits": []}


@test("The strategic weight can move an opportunity into a better box")
def _():
    # 22 x 90 min at 25 plus 660 of errors is 1485 a month: 2970 at medium, 1485 at low
    medium = {**ROUTES, "strategic": "medium"}
    low = {**ROUTES, "strategic": "low"}
    assert plan_backlog([medium], hourly_rate=RATE, value_bar=2000, effort_bar=10)["big bets"] == ["Route planning"]
    assert plan_backlog([low], hourly_rate=RATE, value_bar=2000, effort_bar=10)["money pits"] == ["Route planning"]


@test("Highest priority first within a box")
def _():
    result = plan_backlog([ROUTES, EXCEPTIONS], hourly_rate=RATE, value_bar=2000, effort_bar=40)
    assert result["quick wins"] == ["Delivery exception emails", "Route planning"]


@hidden("The bars themselves count as high value and low effort")
def _():
    # 60 x 20 min = 20 h at 25 = 500, medium weight: exactly 1000
    edge = {"name": "Invoice matching", "runs_per_month": 60, "minutes_per_run": 20, "build_days": 5}
    assert plan_backlog([edge], hourly_rate=RATE, value_bar=1000, effort_bar=5)["quick wins"] == ["Invoice matching"]


@hidden("Ties are broken by name")
def _():
    a = {"name": "Proof of delivery", "runs_per_month": 60, "minutes_per_run": 20, "build_days": 5}
    b = {**a, "name": "Fuel receipts"}
    assert plan_backlog([a, b], hourly_rate=RATE, value_bar=5000, effort_bar=10)["fill-ins"] == [
        "Fuel receipts", "Proof of delivery"]

from decimal import Decimal

from plp import hidden, raises, test
from solution import quote_range

# EXAMPLE estimates, in hours
REPORTS = [
    {"name": "Connect ad platforms", "low": 8, "high": 16,
     "assumption": "The agency gives us API access to both ad accounts"},
    {"name": "Build the report", "low": 12, "high": 18},
    {"name": "AI summaries", "low": 6, "high": 14,
     "assumption": "An account manager reviews each summary before it's sent"},
    {"name": "Handover and training", "low": 4, "high": 6, "assumption": "  "},
]


@test("Quotes the agency's reports as a range")
def _():
    assert quote_range(REPORTS, hourly_rate=60, first_year_value=9600) == {
        "low": Decimal("1800"), "high": Decimal("3750"),
        "assumptions": ["The agency gives us API access to both ad accounts",
                        "An account manager reviews each summary before it's sent"],
        "uncertain": ["Connect ad platforms", "AI summaries"],
        "value_check": "comfortable"}


@test("The low end rounds down and the high end rounds up")
def _():
    tasks = [{"name": "Stock sync", "low": 11, "high": 13}]
    # low 11 x 55 = 605 -> 600; high 13 x 1.15 x 55 = 822.25 -> 850
    result = quote_range(tasks, hourly_rate=55)
    assert (result["low"], result["high"]) == (Decimal("600"), Decimal("850"))


@test("The value check has three levels")
def _():
    assert quote_range(REPORTS, hourly_rate=60, first_year_value=7000)["value_check"] == "tight"
    assert quote_range(REPORTS, hourly_rate=60, first_year_value=3700)["value_check"] == "hard to justify"
    assert quote_range(REPORTS, hourly_rate=60)["value_check"] is None


@test("A task estimated backwards is refused by name")
def _():
    tasks = REPORTS + [{"name": "Slack alerts", "low": 5, "high": 3}]
    raises(ValueError, quote_range, tasks, hourly_rate=60, match="Slack alerts")


@hidden("Exactly half and exactly all of the value are the boundaries")
def _():
    tasks = [{"name": "Returns triage", "low": 10, "high": 20}]
    # high: 20 x 1.25 x 40 = 1000
    result = quote_range(tasks, hourly_rate=40, buffer=Decimal("0.25"), first_year_value=2000)
    assert result["value_check"] == "comfortable"
    assert quote_range(tasks, hourly_rate=40, buffer=Decimal("0.25"), first_year_value=1000)["value_check"] == "tight"


@hidden("Negative hours are refused, and a zero buffer is allowed")
def _():
    raises(ValueError, quote_range, [{"name": "Invoices", "low": -2, "high": 4}], hourly_rate=60, match="Invoices")
    result = quote_range([{"name": "Invoices", "low": 5, "high": 5}], hourly_rate=60, buffer=0)
    assert result == {"low": Decimal("300"), "high": Decimal("300"), "assumptions": [],
                      "uncertain": [], "value_check": None}

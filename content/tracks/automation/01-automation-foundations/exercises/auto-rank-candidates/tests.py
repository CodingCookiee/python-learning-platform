from plp import hidden, test
from solution import rank_candidates

LEAD_INTAKE = {"name": "Lead intake", "runs_per_month": 600, "minutes_per_run": 4, "build_cost": 3000}
INVOICE_CHASING = {
    "name": "Invoice chasing", "runs_per_month": 80, "minutes_per_run": 10, "build_cost": 3400,
    "error_rate": 0.1, "cost_per_error": 50, "running_cost": 30,
}
BOARD_REPORT = {"name": "Board report", "runs_per_month": 1, "minutes_per_run": 600, "build_cost": 8000}


@test("Ranks the agency's backlog")
def _():
    assert rank_candidates([LEAD_INTAKE, INVOICE_CHASING, BOARD_REPORT], hourly_rate=25) == [
        ("Lead intake", 3.0),
        ("Invoice chasing", 4.8),
    ]


@test("Fastest payback comes first, whatever the input order")
def _():
    result = rank_candidates([INVOICE_CHASING, LEAD_INTAKE], hourly_rate=25)
    assert [name for name, _ in result] == ["Lead intake", "Invoice chasing"]


@test("Leaves out processes that aren't stable yet")
def _():
    changing = {**LEAD_INTAKE, "name": "Onboarding", "stable": False}
    assert rank_candidates([changing, INVOICE_CHASING], hourly_rate=25) == [("Invoice chasing", 4.8)]


@test("max_payback sets the cut-off")
def _():
    assert rank_candidates([LEAD_INTAKE, INVOICE_CHASING], hourly_rate=25, max_payback=4) == [("Lead intake", 3.0)]


@hidden("Leaves out candidates that never pay back")
def _():
    costly = {"name": "Stock sync", "runs_per_month": 30, "minutes_per_run": 2, "build_cost": 500, "running_cost": 90}
    assert rank_candidates([costly], hourly_rate=25) == []


@hidden("Ties are broken by name")
def _():
    a = {"name": "Refund queue", "runs_per_month": 60, "minutes_per_run": 10, "build_cost": 1000}
    b = {**a, "name": "Payroll export"}
    assert rank_candidates([a, b], hourly_rate=20) == [("Payroll export", 5.0), ("Refund queue", 5.0)]


@hidden("A payback of exactly max_payback is kept")
def _():
    edge = {"name": "Timesheets", "runs_per_month": 60, "minutes_per_run": 10, "build_cost": 2400}
    assert rank_candidates([edge], hourly_rate=20) == [("Timesheets", 12.0)]

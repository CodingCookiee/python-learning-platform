from plp import hidden, test
from solution import payback_months


@test("The clinic's reminders pay back in 3 months")
def _():
    assert payback_months(
        runs_per_month=400, minutes_per_run=3, hourly_rate=18,
        error_rate=0.02, cost_per_error=60,
        build_cost=2400, running_cost_per_month=40,
    ) == 3.0


@test("Time saved alone, with no errors or running costs")
def _():
    # 120 runs x 5 min = 10 h a month at 30/h = 300 a month
    assert payback_months(runs_per_month=120, minutes_per_run=5, hourly_rate=30, build_cost=1500) == 5.0


@test("Running costs are subtracted from the saving")
def _():
    # 300 a month saved, 100 a month to run: 1500 / 200
    assert payback_months(
        runs_per_month=120, minutes_per_run=5, hourly_rate=30,
        build_cost=1500, running_cost_per_month=100,
    ) == 7.5


@test("Returns None when running costs eat the whole saving")
def _():
    assert payback_months(
        runs_per_month=10, minutes_per_run=6, hourly_rate=20,
        build_cost=800, running_cost_per_month=25,
    ) is None


@hidden("Error cost alone can justify a build")
def _():
    assert payback_months(
        runs_per_month=200, minutes_per_run=0, hourly_rate=25,
        error_rate=0.05, cost_per_error=40, build_cost=1000,
    ) == 2.5


@hidden("Breaking exactly even never pays back")
def _():
    assert payback_months(
        runs_per_month=60, minutes_per_run=10, hourly_rate=20,
        build_cost=500, running_cost_per_month=200,
    ) is None

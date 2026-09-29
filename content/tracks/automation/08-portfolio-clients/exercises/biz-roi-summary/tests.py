from decimal import Decimal

from plp import hidden, raises, test
from solution import roi_summary


@test("The clinic's reminders: payback in 3 months, 300% in the first year")
def _():
    assert roi_summary(build_price=4200, hours_saved_per_month=30, hourly_rate=18,
                       errors_avoided_per_month=6, cost_per_error=90,
                       revenue_enabled_per_month=400, running_cost_per_month=80) == {
        "monthly_benefit": Decimal("1480.00"), "monthly_net": Decimal("1400.00"),
        "payback_months": Decimal("3.0"), "first_year_roi": Decimal("300")}


@test("Payback rounds to one place and ROI to a whole percentage")
def _():
    result = roi_summary(build_price=5000, hours_saved_per_month=30, hourly_rate=18,
                         errors_avoided_per_month=6, cost_per_error=90,
                         revenue_enabled_per_month=400, running_cost_per_month=80)
    assert result["payback_months"] == Decimal("3.6")
    assert result["first_year_roi"] == Decimal("236")


@test("Revenue enabled counts on its own")
def _():
    assert roi_summary(build_price=3000, revenue_enabled_per_month=Decimal("750.50")) == {
        "monthly_benefit": Decimal("750.50"), "monthly_net": Decimal("750.50"),
        "payback_months": Decimal("4.0"), "first_year_roi": Decimal("200")}


@test("Running costs above the benefit: no payback, and a negative ROI")
def _():
    result = roi_summary(build_price=1000, hours_saved_per_month=5, hourly_rate=20, running_cost_per_month=150)
    assert result["monthly_net"] == Decimal("-50.00")
    assert result["payback_months"] is None
    assert result["first_year_roi"] == Decimal("-160")


@hidden("Breaking exactly even never pays back")
def _():
    result = roi_summary(build_price=800, hours_saved_per_month=10, hourly_rate=15, running_cost_per_month=150)
    assert result["payback_months"] is None
    assert result["first_year_roi"] == Decimal("-100")


@hidden("Refuses a build price of zero or less")
def _():
    raises(ValueError, roi_summary, build_price=0, hours_saved_per_month=10, hourly_rate=20)
    raises(ValueError, roi_summary, build_price=-100, hours_saved_per_month=10, hourly_rate=20)


@hidden("Rounds from the unrounded figures, half up")
def _():
    # 7 h at 17.35 = 121.45; 3 errors at 0.335 = 1.005; benefit 122.455 -> 122.46
    result = roi_summary(build_price=500, hours_saved_per_month=7, hourly_rate=Decimal("17.35"),
                         errors_avoided_per_month=3, cost_per_error=Decimal("0.335"))
    assert result["monthly_benefit"] == Decimal("122.46")
    assert result["payback_months"] == Decimal("4.1")
    assert result["first_year_roi"] == Decimal("194")

from decimal import ROUND_HALF_UP, Decimal


def roi_summary(*, build_price, hours_saved_per_month=0, hourly_rate=0, errors_avoided_per_month=0,
                cost_per_error=0, revenue_enabled_per_month=0, running_cost_per_month=0):
    """Monthly benefit and net, payback in months, and first-year ROI as a percentage."""
    benefit = Decimal(hours_saved_per_month) * hourly_rate
    return {
        "monthly_benefit": benefit,
        "monthly_net": benefit,
        "payback_months": build_price / benefit,
        "first_year_roi": benefit * 12 / build_price * 100,
    }

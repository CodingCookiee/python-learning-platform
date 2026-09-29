from decimal import ROUND_HALF_UP, Decimal


def rounded(value, places):
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def roi_summary(*, build_price, hours_saved_per_month=0, hourly_rate=0, errors_avoided_per_month=0,
                cost_per_error=0, revenue_enabled_per_month=0, running_cost_per_month=0):
    """Monthly benefit and net, payback in months, and first-year ROI as a percentage."""
    if build_price <= 0:
        raise ValueError("build_price must be more than 0")
    benefit = (Decimal(hours_saved_per_month) * hourly_rate
               + Decimal(errors_avoided_per_month) * cost_per_error
               + revenue_enabled_per_month)
    net = benefit - running_cost_per_month
    return {
        "monthly_benefit": rounded(benefit, "0.01"),
        "monthly_net": rounded(net, "0.01"),
        "payback_months": rounded(build_price / net, "0.1") if net > 0 else None,
        "first_year_roi": rounded((net * 12 - build_price) / build_price * 100, "1"),
    }

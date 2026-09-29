def payback_months(
    *,
    runs_per_month,
    minutes_per_run,
    hourly_rate,
    build_cost,
    error_rate=0.0,
    cost_per_error=0.0,
    running_cost_per_month=0.0,
):
    """Months until the build pays for itself (1 decimal), or None if it never does."""
    time_value = runs_per_month * minutes_per_run / 60 * hourly_rate
    return round(build_cost / time_value, 1)

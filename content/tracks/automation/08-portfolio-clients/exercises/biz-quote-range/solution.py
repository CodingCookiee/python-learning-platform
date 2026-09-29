from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal


def to_step(amount, rounding, step=50):
    return (amount / step).to_integral_value(rounding=rounding) * step


def quote_range(tasks, *, hourly_rate, buffer=Decimal("0.15"), first_year_value=None):
    """A low-to-high price range, the assumptions behind it, and a check against the project's value."""
    for task in tasks:
        if task["low"] < 0:
            raise ValueError(f"{task['name']}: low can't be negative")
        if task["low"] > task["high"]:
            raise ValueError(f"{task['name']}: low is more than high")

    low_hours = sum(Decimal(task["low"]) for task in tasks)
    high_hours = sum(Decimal(task["high"]) for task in tasks)
    low = to_step(low_hours * hourly_rate, ROUND_FLOOR)
    high = to_step(high_hours * (1 + buffer) * hourly_rate, ROUND_CEILING)

    if first_year_value is None:
        value_check = None
    elif high <= Decimal(first_year_value) / 2:
        value_check = "comfortable"
    elif high <= first_year_value:
        value_check = "tight"
    else:
        value_check = "hard to justify"

    return {
        "low": low,
        "high": high,
        "assumptions": [t["assumption"] for t in tasks if (t.get("assumption") or "").strip()],
        "uncertain": [t["name"] for t in tasks if t["high"] >= 2 * t["low"]],
        "value_check": value_check,
    }

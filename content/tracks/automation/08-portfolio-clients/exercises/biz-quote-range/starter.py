from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal


def quote_range(tasks, *, hourly_rate, buffer=Decimal("0.15"), first_year_value=None):
    """A low-to-high price range, the assumptions behind it, and a check against the project's value."""
    ...

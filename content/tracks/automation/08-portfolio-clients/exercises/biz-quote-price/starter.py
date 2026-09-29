from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal


def quote(*, hours, hourly_rate, risk_buffer, ai_cost_per_month=0, ai_margin=Decimal("0.2"), round_to=50):
    """Build price (buffered, rounded up), AI per month at a margin, and the first-year total."""
    ...

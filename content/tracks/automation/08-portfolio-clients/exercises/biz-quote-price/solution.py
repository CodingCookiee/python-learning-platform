from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal


def round_up(amount, step):
    """The smallest multiple of step that is at least amount."""
    return (amount / step).to_integral_value(rounding=ROUND_CEILING) * step


def quote(*, hours, hourly_rate, risk_buffer, ai_cost_per_month=0, ai_margin=Decimal("0.2"), round_to=50):
    """Build price (buffered, rounded up), AI per month at a margin, and the first-year total."""
    if not 0 <= ai_margin < 1:
        raise ValueError("ai_margin must be at least 0 and less than 1")
    if risk_buffer < 0:
        raise ValueError("risk_buffer can't be negative")
    build = round_up(Decimal(hours) * (1 + risk_buffer) * hourly_rate, round_to)
    ai = (Decimal(ai_cost_per_month) / (1 - ai_margin)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {"build": build, "ai_per_month": ai, "first_year": build + 12 * ai}

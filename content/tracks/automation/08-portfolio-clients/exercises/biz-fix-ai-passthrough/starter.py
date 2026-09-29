from decimal import ROUND_HALF_UP, Decimal


def money(amount):
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def monthly_invoice(*, support_hours, hourly_rate, ai_calls, cost_per_call, ai_margin):
    """This month's invoice lines and total: support time, plus AI usage passed through at a margin."""
    lines = [("Support and monitoring", money(Decimal(support_hours) * hourly_rate))]
    ai_cost = Decimal(ai_calls) * cost_per_call
    ai_price = ai_cost * (1 + ai_margin)
    total = sum(amount for _, amount in lines)
    lines.append(("AI usage (passed through)", money(ai_price)))
    return {"lines": lines, "total": total}

from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal


def money(amount):
    return Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def retainer_invoice(*, fee, included_hours, hours_used, overage_rate, ai_cost=0,
                     ai_margin=Decimal("0.2"), increment=Decimal("0.5")):
    """This month's retainer invoice: the fee, any extra hours, and AI usage passed through."""
    lines = [(f"Maintenance retainer ({included_hours} hours included)", money(fee))]
    extra = Decimal(hours_used) - included_hours
    if extra > 0:
        billed = (extra / increment).to_integral_value(rounding=ROUND_CEILING) * increment
        lines.append((f"Extra support: {billed} hours at {overage_rate}", money(billed * overage_rate)))
    if ai_cost > 0:
        lines.append(("AI and API usage, passed through", money(Decimal(ai_cost) / (1 - ai_margin))))
    return {"lines": lines, "total": sum(amount for _, amount in lines)}

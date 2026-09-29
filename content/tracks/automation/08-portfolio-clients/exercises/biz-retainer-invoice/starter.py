from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal


def retainer_invoice(*, fee, included_hours, hours_used, overage_rate, ai_cost=0,
                     ai_margin=Decimal("0.2"), increment=Decimal("0.5")):
    """This month's retainer invoice: the fee, any extra hours, and AI usage passed through."""
    ...

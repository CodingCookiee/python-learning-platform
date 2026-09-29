from decimal import ROUND_HALF_UP, Decimal

PER_MONTH = {
    "day": Decimal(365) / 12,
    "working day": Decimal(5 * 52) / 12,
    "week": Decimal(52) / 12,
    "month": Decimal(1),
    "year": Decimal(1) / 12,
}


def runs_per_month(count, per):
    """How many times a month something happens `count` times per `per`, to one decimal place."""
    return (count * PER_MONTH[per]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

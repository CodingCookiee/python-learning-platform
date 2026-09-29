from decimal import ROUND_HALF_UP, Decimal

PER_MONTH = {
    "day": Decimal(30),
    "working day": Decimal(30),
    "week": Decimal(4),
    "month": Decimal(1),
    "year": Decimal(1) / 12,
}


def runs_per_month(count, per):
    """How many times a month something happens `count` times per `per`, to one decimal place."""
    return (count * PER_MONTH[per]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

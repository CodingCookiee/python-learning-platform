from decimal import Decimal

GRACE_DAYS = 2
DAILY_FEE = Decimal("0.50")
MAX_FEE = Decimal("15.00")


def late_fee(days_late):
    """The late fee for a library book returned days_late days after it was due."""
    if days_late < 0:
        raise ValueError(f"days_late can't be negative, got {days_late}")
    if days_late <= GRACE_DAYS:
        return Decimal("0.00")
    return min(days_late * DAILY_FEE, MAX_FEE)

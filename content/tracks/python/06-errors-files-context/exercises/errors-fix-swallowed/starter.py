from decimal import Decimal


def total_payments(rows):
    """Add up every row's amount, skipping amounts that aren't numbers."""
    total = Decimal("0")
    for row in rows:
        try:
            total += Decimal(row["amout"])
        except:
            pass
    return total

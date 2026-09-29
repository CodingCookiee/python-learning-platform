from decimal import Decimal, InvalidOperation


def total_payments(rows):
    """Add up every row's amount, skipping amounts that aren't numbers."""
    total = Decimal("0")
    for row in rows:
        try:
            amount = Decimal(row["amount"])
        except InvalidOperation:
            continue
        total += amount
    return total

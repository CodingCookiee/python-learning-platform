def receipt_row(name, quantity, unit_price):
    """Return name (20, left), quantity (4, right) and the line total (10, right, 2 places)."""
    return f"{name[:20]:<20}{quantity:>4}{quantity * unit_price:>10.2f}"

def line_totals(basket):
    """Return quantity * unit_price for each (name, quantity, unit_price), rounded to 2 places."""
    return [round(quantity * unit_price, 2) for name, quantity, unit_price in basket]

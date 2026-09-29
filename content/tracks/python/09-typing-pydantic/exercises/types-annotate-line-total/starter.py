def line_total(quantity, unit_price_cents):
    """The price of one invoice line, in cents."""
    return quantity * unit_price_cents


def format_cents(cents):
    """12345 -> "123.45 EUR"."""
    return f"{cents / 100:.2f} EUR"

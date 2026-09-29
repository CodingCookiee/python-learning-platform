def line_total(quantity: int, unit_price_cents: int) -> int:
    """The price of one invoice line, in cents."""
    return quantity * unit_price_cents


def format_cents(cents: int) -> str:
    """12345 -> "123.45 EUR"."""
    return f"{cents / 100:.2f} EUR"

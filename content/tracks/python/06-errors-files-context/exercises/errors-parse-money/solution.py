import re
from decimal import Decimal, InvalidOperation


def parse_money(text):
    """(Decimal amount, currency code) from text like "12.50 EUR", or ValueError."""
    try:
        amount_text, currency = text.split()
        amount = Decimal(amount_text)
    except (ValueError, InvalidOperation):
        raise ValueError(f"not a money amount: {text!r}") from None
    if not amount.is_finite() or not re.fullmatch("[A-Z]{3}", currency):
        raise ValueError(f"not a money amount: {text!r}")
    return amount, currency

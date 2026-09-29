from decimal import Decimal


def parse_money(text):
    """(Decimal amount, currency code) from text like "12.50 EUR", or ValueError."""
    amount, currency = text.split()
    return Decimal(amount), currency

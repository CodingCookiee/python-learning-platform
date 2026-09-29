import logging
from decimal import Decimal


def apply_discount(total, code, codes):
    """The total after applying a discount code; codes maps each code to a percentage off."""
    if not code:
        return total
    percent = codes.get(code.upper())
    if percent is None:
        return total
    return (total * (100 - percent) / 100).quantize(Decimal("0.01"))

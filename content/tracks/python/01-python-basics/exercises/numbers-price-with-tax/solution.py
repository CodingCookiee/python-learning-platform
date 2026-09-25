from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")


def price_with_tax(price, tax_rate):
    """Return price plus tax as a Decimal, rounded to the cent (half a cent rounds up).

    price and tax_rate are strings, like "19.99" and "0.20".
    """
    total = Decimal(price) * (1 + Decimal(tax_rate))
    return total.quantize(CENT, rounding=ROUND_HALF_UP)
